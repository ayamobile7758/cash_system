ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0
    CHECK (invoice_discount_percentage >= 0 AND invoice_discount_percentage <= 100),
  ADD COLUMN IF NOT EXISTS invoice_discount_amount DECIMAL(12,3) NOT NULL DEFAULT 0
    CHECK (invoice_discount_amount >= 0);

CREATE OR REPLACE FUNCTION create_sale(
  p_items                       JSONB,
  p_payments                    JSONB,
  p_customer_name               VARCHAR DEFAULT NULL,
  p_customer_phone              VARCHAR DEFAULT NULL,
  p_debt_customer_id            UUID DEFAULT NULL,
  p_discount_by                 UUID DEFAULT NULL,
  p_pos_terminal                VARCHAR DEFAULT NULL,
  p_notes                       TEXT DEFAULT NULL,
  p_invoice_discount_percentage DECIMAL DEFAULT 0,
  p_idempotency_key             UUID DEFAULT NULL,
  p_created_by                  UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id                  UUID;
  v_invoice_id               UUID;
  v_invoice_number           VARCHAR;
  v_item                     JSONB;
  v_product                  RECORD;
  v_subtotal                 DECIMAL(12,3) := 0;
  v_total_discount           DECIMAL(12,3) := 0;
  v_total_amount             DECIMAL(12,3) := 0;
  v_debt_amount              DECIMAL(12,3) := 0;
  v_item_discount_pct        DECIMAL(5,2);
  v_item_discount_amt        DECIMAL(12,3);
  v_item_total               DECIMAL(12,3);
  v_line_subtotal            DECIMAL(12,3);
  v_payment                  JSONB;
  v_pay_total                DECIMAL(12,3) := 0;
  v_account                  RECORD;
  v_fee                      DECIMAL(12,3);
  v_net                      DECIMAL(12,3);
  v_max_discount             DECIMAL(5,2);
  v_bundle_discount_cap      DECIMAL(5,2);
  v_bundle_needs_approval    BOOLEAN := false;
  v_effective_discount_cap   DECIMAL(5,2);
  v_user_role                user_role;
  v_change                   DECIMAL(12,3) := 0;
  v_low_stock_thresh         INT;
  v_retry_count              INT := 0;
  v_max_retries              INT := 2;
  v_used_discount_override   BOOLEAN := false;
  v_max_applied_discount_pct DECIMAL(5,2) := 0;
  v_invoice_discount_pct     DECIMAL(5,2) := 0;
  v_invoice_discount_amt     DECIMAL(12,3) := 0;
BEGIN
  v_user_id := fn_require_actor(p_created_by);

  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM invoices WHERE idempotency_key = p_idempotency_key) THEN
      RAISE EXCEPTION 'ERR_IDEMPOTENCY';
    END IF;
  END IF;

  SELECT value::DECIMAL INTO v_max_discount
    FROM system_settings WHERE key = 'max_pos_discount_percentage';
  SELECT value::INT INTO v_low_stock_thresh
    FROM system_settings WHERE key = 'low_stock_threshold';
  SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;

  SELECT
    policy.max_discount_percentage,
    policy.discount_requires_approval
  INTO
    v_bundle_discount_cap,
    v_bundle_needs_approval
  FROM fn_get_discount_policy(v_user_id, v_user_role) AS policy;

  v_effective_discount_cap := COALESCE(v_bundle_discount_cap, v_max_discount);

  v_invoice_number := fn_generate_number('INV');
  v_invoice_id := gen_random_uuid();

  INSERT INTO invoices (
    id, invoice_number, customer_name, customer_phone,
    subtotal, discount_amount, invoice_discount_percentage, invoice_discount_amount, discount_by, total_amount,
    debt_amount, debt_customer_id, status,
    pos_terminal_code, notes, idempotency_key, created_by
  ) VALUES (
    v_invoice_id, v_invoice_number, p_customer_name, p_customer_phone,
    0, 0, 0, 0, p_discount_by, 0,
    0, p_debt_customer_id, 'active',
    p_pos_terminal, p_notes, p_idempotency_key, v_user_id
  );

  <<sale_items_retry>>
  LOOP
    BEGIN
      v_subtotal := 0;
      v_total_discount := 0;
      DELETE FROM invoice_items WHERE invoice_id = v_invoice_id;

      FOR v_item IN
        SELECT j.item
        FROM jsonb_array_elements(p_items) AS j(item)
        ORDER BY (j.item->>'product_id')::UUID
      LOOP
        SELECT id, name, sale_price, cost_price, stock_quantity, track_stock
          INTO v_product
          FROM products
          WHERE id = (v_item->>'product_id')::UUID
          FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'ERR_PRODUCT_NOT_FOUND';
        END IF;

        IF v_product.track_stock AND
           v_product.stock_quantity < (v_item->>'quantity')::INT THEN
          RAISE EXCEPTION 'ERR_STOCK_INSUFFICIENT';
        END IF;

        v_item_discount_pct := COALESCE((v_item->>'discount_percentage')::DECIMAL, 0);
        v_max_applied_discount_pct := GREATEST(v_max_applied_discount_pct, v_item_discount_pct);

        IF v_user_role = 'pos_staff' THEN
          IF v_item_discount_pct > v_effective_discount_cap THEN
            RAISE EXCEPTION 'ERR_DISCOUNT_EXCEEDED';
          END IF;

          IF v_item_discount_pct > v_max_discount AND COALESCE(v_bundle_needs_approval, false) THEN
            RAISE EXCEPTION 'ERR_DISCOUNT_APPROVAL_REQUIRED';
          END IF;

          IF v_item_discount_pct > v_max_discount THEN
            v_used_discount_override := true;
          END IF;
        END IF;

        v_line_subtotal := v_product.sale_price * (v_item->>'quantity')::INT;
        v_item_discount_amt := ROUND(v_line_subtotal * v_item_discount_pct / 100, 3);
        v_item_total := v_line_subtotal - v_item_discount_amt;

        INSERT INTO invoice_items (
          id, invoice_id, product_id, product_name_at_time,
          quantity, unit_price, cost_price_at_time,
          discount_percentage, discount_amount, total_price
        ) VALUES (
          gen_random_uuid(), v_invoice_id, v_product.id, v_product.name,
          (v_item->>'quantity')::INT, v_product.sale_price,
          COALESCE(v_product.cost_price, 0),
          v_item_discount_pct, v_item_discount_amt, v_item_total
        );

        IF v_product.track_stock THEN
          UPDATE products
            SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT
            WHERE id = v_product.id;

          IF (v_product.stock_quantity - (v_item->>'quantity')::INT) <= v_low_stock_thresh THEN
            INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
            SELECT p.id, 'low_stock',
              'مخزون منخفض: ' || v_product.name,
              'الكمية المتبقية: ' || (v_product.stock_quantity - (v_item->>'quantity')::INT),
              'product', v_product.id
            FROM profiles p WHERE p.role = 'admin';
          END IF;
        END IF;

        v_subtotal := v_subtotal + v_line_subtotal;
        v_total_discount := v_total_discount + v_item_discount_amt;
      END LOOP;

      EXIT sale_items_retry;
    EXCEPTION
      WHEN deadlock_detected OR lock_not_available THEN
        v_retry_count := v_retry_count + 1;
        IF v_retry_count > v_max_retries THEN
          RAISE EXCEPTION 'ERR_CONCURRENT_STOCK_UPDATE';
        END IF;
        PERFORM pg_sleep(0.05 * v_retry_count);
    END;
  END LOOP;

  v_total_amount := v_subtotal - v_total_discount;
  v_invoice_discount_pct := COALESCE(p_invoice_discount_percentage, 0);

  IF v_invoice_discount_pct < 0 OR v_invoice_discount_pct > 100 THEN
    RAISE EXCEPTION 'ERR_INVALID_INVOICE_DISCOUNT';
  END IF;

  IF v_user_role = 'pos_staff' THEN
    IF v_invoice_discount_pct > v_effective_discount_cap THEN
      RAISE EXCEPTION 'ERR_DISCOUNT_EXCEEDED';
    END IF;

    IF v_invoice_discount_pct > v_max_discount AND COALESCE(v_bundle_needs_approval, false) THEN
      RAISE EXCEPTION 'ERR_DISCOUNT_APPROVAL_REQUIRED';
    END IF;

    IF v_invoice_discount_pct > v_max_discount THEN
      v_used_discount_override := true;
    END IF;
  END IF;

  v_max_applied_discount_pct := GREATEST(v_max_applied_discount_pct, v_invoice_discount_pct);
  v_invoice_discount_amt := ROUND(v_total_amount * v_invoice_discount_pct / 100, 3);
  v_total_amount := v_total_amount - v_invoice_discount_amt;

  IF p_debt_customer_id IS NOT NULL THEN
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
      v_pay_total := v_pay_total + (v_payment->>'amount')::DECIMAL;
    END LOOP;
    v_debt_amount := v_total_amount - v_pay_total;
    IF v_debt_amount < 0 THEN
      v_change := ABS(v_debt_amount);
      v_debt_amount := 0;
    END IF;
  ELSE
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
      v_pay_total := v_pay_total + (v_payment->>'amount')::DECIMAL;
    END LOOP;
    IF v_pay_total < v_total_amount THEN
      RAISE EXCEPTION 'ERR_PAYMENT_MISMATCH';
    END IF;
    v_change := v_pay_total - v_total_amount;
  END IF;

  UPDATE invoices
    SET subtotal = v_subtotal,
        discount_amount = v_total_discount,
        invoice_discount_percentage = v_invoice_discount_pct,
        invoice_discount_amount = v_invoice_discount_amt,
        discount_by = p_discount_by,
        total_amount = v_total_amount,
        debt_amount = v_debt_amount,
        debt_customer_id = p_debt_customer_id,
        customer_name = p_customer_name,
        customer_phone = p_customer_phone,
        pos_terminal_code = p_pos_terminal,
        notes = p_notes
  WHERE id = v_invoice_id;

  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    SELECT id, fee_percentage INTO v_account
      FROM accounts WHERE id = (v_payment->>'account_id')::UUID;

    v_net := (v_payment->>'amount')::DECIMAL;
    IF v_change > 0 AND v_net > v_change THEN
      v_net := v_net - v_change;
      v_change := 0;
    ELSIF v_change > 0 AND v_net <= v_change THEN
      v_change := v_change - v_net;
      v_net := 0;
    END IF;

    IF v_net > 0 THEN
      v_fee := ROUND(v_net * v_account.fee_percentage / 100, 3);
      v_net := v_net - v_fee;

      INSERT INTO payments (invoice_id, account_id, amount, fee_amount, net_amount)
      VALUES (v_invoice_id, v_account.id, v_net + v_fee, v_fee, v_net);

      INSERT INTO ledger_entries (
        account_id, entry_type, amount, reference_type, reference_id, description, created_by
      ) VALUES (
        v_account.id, 'income', v_net, 'invoice', v_invoice_id,
        'فاتورة بيع ' || v_invoice_number, v_user_id
      );

      UPDATE accounts SET current_balance = current_balance + v_net
        WHERE id = v_account.id;
    END IF;
  END LOOP;

  IF v_debt_amount > 0 AND p_debt_customer_id IS NOT NULL THEN
    INSERT INTO debt_entries (
      debt_customer_id, entry_type, invoice_id, amount,
      due_date, remaining_amount, created_by
    ) VALUES (
      p_debt_customer_id, 'from_invoice', v_invoice_id, v_debt_amount,
      CURRENT_DATE + (SELECT due_date_days FROM debt_customers WHERE id = p_debt_customer_id),
      v_debt_amount, v_user_id
    );

    UPDATE debt_customers
      SET current_balance = current_balance + v_debt_amount
      WHERE id = p_debt_customer_id;

    IF (
      SELECT COALESCE(SUM(remaining_amount), 0)
      FROM debt_entries
      WHERE debt_customer_id = p_debt_customer_id
        AND is_paid = false
    ) > (SELECT credit_limit FROM debt_customers WHERE id = p_debt_customer_id) THEN
      INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
      SELECT p.id, 'debt_limit_exceeded',
        'تجاوز حد الدين',
        'العميل تجاوز حد الدين المسموح',
        'invoice', v_invoice_id
      FROM profiles p WHERE p.role = 'admin';
    END IF;
  END IF;

  IF (v_total_discount + v_invoice_discount_amt) > 0 AND p_discount_by IS NOT NULL
     AND ((v_total_discount + v_invoice_discount_amt) / NULLIF(v_subtotal, 0) * 100) >= COALESCE(
       (SELECT value::DECIMAL FROM system_settings WHERE key = 'discount_warning_threshold'), 10
     ) THEN
    INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
    SELECT p.id, 'large_discount',
      'خصم في فاتورة ' || v_invoice_number,
      'مبلغ الخصم: ' || (v_total_discount + v_invoice_discount_amt) || ' د.أ',
      'invoice', v_invoice_id
    FROM profiles p WHERE p.role = 'admin';
  END IF;

  IF v_used_discount_override THEN
    INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
    VALUES (
      v_user_id,
      'discount_override_bundle',
      'invoices',
      v_invoice_id,
      'تجاوز baseline الخصم عبر bundle',
      jsonb_build_object(
        'invoice_number', v_invoice_number,
        'baseline_cap', v_max_discount,
        'bundle_cap', v_bundle_discount_cap,
        'max_applied_discount_percentage', v_max_applied_discount_pct
      )
    );
  END IF;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'create_sale',
    'invoices',
    v_invoice_id,
    'إنشاء فاتورة ' || v_invoice_number,
    jsonb_build_object('total', v_total_amount, 'items_count', jsonb_array_length(p_items))
  );

  RETURN jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'total', v_total_amount,
    'change', v_change
  );
END;
$$;

REVOKE ALL ON FUNCTION create_sale(JSONB, JSONB, VARCHAR, VARCHAR, UUID, UUID, VARCHAR, TEXT, DECIMAL, UUID, UUID)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION create_sale(JSONB, JSONB, VARCHAR, VARCHAR, UUID, UUID, VARCHAR, TEXT, DECIMAL, UUID, UUID)
  TO service_role;
