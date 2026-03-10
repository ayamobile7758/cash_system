-- PX-07-T01: align supplier/purchase mutations with service_role + p_created_by

DROP FUNCTION IF EXISTS public.create_purchase(UUID, JSONB, BOOLEAN, UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_purchase(
  p_supplier_id UUID DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_is_paid BOOLEAN DEFAULT true,
  p_payment_account_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := fn_require_admin_actor(p_created_by);
  v_purchase_id UUID := gen_random_uuid();
  v_purchase_num VARCHAR;
  v_item JSONB;
  v_total DECIMAL(12,3) := 0;
  v_item_total DECIMAL(12,3);
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF p_is_paid AND p_payment_account_id IS NULL THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF NOT p_is_paid AND p_supplier_id IS NULL THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF NOT p_is_paid AND p_payment_account_id IS NOT NULL THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM purchase_orders WHERE idempotency_key = p_idempotency_key) THEN
      RAISE EXCEPTION 'ERR_IDEMPOTENCY';
    END IF;
  END IF;

  v_purchase_num := fn_generate_number('PUR');

  INSERT INTO purchase_orders (
    id,
    purchase_number,
    supplier_id,
    total_amount,
    is_paid,
    payment_account_id,
    notes,
    idempotency_key,
    created_by
  )
  VALUES (
    v_purchase_id,
    v_purchase_num,
    p_supplier_id,
    0,
    p_is_paid,
    p_payment_account_id,
    p_notes,
    p_idempotency_key,
    v_user_id
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_total := (v_item->>'quantity')::INT * (v_item->>'unit_cost')::DECIMAL;
    v_total := v_total + v_item_total;

    INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, total_cost)
    VALUES (
      v_purchase_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INT,
      (v_item->>'unit_cost')::DECIMAL,
      v_item_total
    );

    UPDATE products
    SET
      stock_quantity = stock_quantity + (v_item->>'quantity')::INT,
      cost_price = (v_item->>'unit_cost')::DECIMAL,
      avg_cost_price = CASE
        WHEN COALESCE(stock_quantity, 0) + (v_item->>'quantity')::INT = 0 THEN (v_item->>'unit_cost')::DECIMAL
        ELSE ROUND(
          (
            COALESCE(avg_cost_price, cost_price, 0) * COALESCE(stock_quantity, 0)
            + (v_item->>'unit_cost')::DECIMAL * (v_item->>'quantity')::INT
          ) / (COALESCE(stock_quantity, 0) + (v_item->>'quantity')::INT),
          3
        )
      END
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  UPDATE purchase_orders
  SET
    total_amount = v_total,
    is_paid = p_is_paid,
    payment_account_id = p_payment_account_id,
    notes = p_notes
  WHERE id = v_purchase_id;

  IF p_is_paid THEN
    INSERT INTO ledger_entries (
      account_id,
      entry_type,
      amount,
      reference_type,
      reference_id,
      description,
      created_by
    )
    VALUES (
      p_payment_account_id,
      'expense',
      v_total,
      'purchase',
      v_purchase_id,
      'شراء ' || v_purchase_num,
      v_user_id
    );

    UPDATE accounts
    SET current_balance = current_balance - v_total
    WHERE id = p_payment_account_id;
  ELSE
    UPDATE suppliers
    SET current_balance = current_balance + v_total
    WHERE id = p_supplier_id;
  END IF;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'create_purchase',
    'purchase_orders',
    v_purchase_id,
    'شراء ' || v_purchase_num,
    jsonb_build_object('total', v_total, 'is_paid', p_is_paid)
  );

  RETURN jsonb_build_object(
    'purchase_order_id', v_purchase_id,
    'purchase_number', v_purchase_num,
    'total', v_total
  );
END;
$$;

DROP FUNCTION IF EXISTS public.create_supplier_payment(UUID, UUID, DECIMAL, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_supplier_payment(
  p_supplier_id UUID,
  p_account_id UUID,
  p_amount DECIMAL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := fn_require_admin_actor(p_created_by);
  v_payment_id UUID := gen_random_uuid();
  v_pay_num VARCHAR;
  v_supplier RECORD;
  v_supplier_due DECIMAL(12,3);
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'ERR_VALIDATION_NEGATIVE_AMOUNT';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM supplier_payments WHERE idempotency_key = p_idempotency_key) THEN
      RAISE EXCEPTION 'ERR_IDEMPOTENCY';
    END IF;
  END IF;

  SELECT * INTO v_supplier
  FROM suppliers
  WHERE id = p_supplier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_SUPPLIER_NOT_FOUND';
  END IF;

  SELECT
    COALESCE(
      (SELECT SUM(total_amount) FROM purchase_orders WHERE supplier_id = p_supplier_id AND is_paid = false),
      0
    )
    - COALESCE(
      (SELECT SUM(amount) FROM supplier_payments WHERE supplier_id = p_supplier_id),
      0
    )
  INTO v_supplier_due;

  IF p_amount > v_supplier_due THEN
    RAISE EXCEPTION 'ERR_SUPPLIER_OVERPAY';
  END IF;

  v_pay_num := fn_generate_number('SPY');

  INSERT INTO supplier_payments (
    id,
    payment_number,
    supplier_id,
    amount,
    account_id,
    notes,
    idempotency_key,
    created_by
  )
  VALUES (
    v_payment_id,
    v_pay_num,
    p_supplier_id,
    p_amount,
    p_account_id,
    p_notes,
    p_idempotency_key,
    v_user_id
  );

  UPDATE suppliers
  SET current_balance = current_balance - p_amount
  WHERE id = p_supplier_id;

  UPDATE accounts
  SET current_balance = current_balance - p_amount
  WHERE id = p_account_id;

  INSERT INTO ledger_entries (
    account_id,
    entry_type,
    amount,
    reference_type,
    reference_id,
    description,
    created_by
  )
  VALUES (
    p_account_id,
    'expense',
    p_amount,
    'supplier_payment',
    v_payment_id,
    'تسديد مورد: ' || v_supplier.name,
    v_user_id
  );

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'create_supplier_payment',
    'supplier_payments',
    v_payment_id,
    'تسديد مورد ' || v_pay_num,
    jsonb_build_object('amount', p_amount)
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'payment_number', v_pay_num,
    'remaining_balance', (SELECT current_balance FROM suppliers WHERE id = p_supplier_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_purchase(UUID, JSONB, BOOLEAN, UUID, TEXT, UUID, UUID) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.create_supplier_payment(UUID, UUID, DECIMAL, TEXT, UUID, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_purchase(UUID, JSONB, BOOLEAN, UUID, TEXT, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_supplier_payment(UUID, UUID, DECIMAL, TEXT, UUID, UUID) TO service_role;
