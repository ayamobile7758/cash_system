DROP FUNCTION IF EXISTS public.create_topup(UUID, DECIMAL, DECIMAL, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_topup(UUID, DECIMAL, DECIMAL, UUID, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.create_topup(
  p_account_id      UUID,
  p_amount          DECIMAL,
  p_profit_amount   DECIMAL,
  p_supplier_id     UUID DEFAULT NULL,
  p_notes           TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_created_by      UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id           UUID := fn_require_actor(p_created_by);
  v_topup_id          UUID := gen_random_uuid();
  v_topup_num         VARCHAR;
  v_invoice_id        UUID;
  v_invoice_number    VARCHAR;
  v_topup_product_id   UUID;
  v_ledger_income     UUID;
  v_ledger_cost       UUID;
  v_cost_amount       DECIMAL(12,3);
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'ERR_VALIDATION_NEGATIVE_AMOUNT';
  END IF;

  IF p_profit_amount < 0 THEN
    RAISE EXCEPTION 'ERR_VALIDATION_NEGATIVE_AMOUNT';
  END IF;

  IF p_profit_amount > p_amount THEN
    RAISE EXCEPTION 'ERR_API_VALIDATION_FAILED';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM topups WHERE idempotency_key = p_idempotency_key) THEN
      RAISE EXCEPTION 'ERR_IDEMPOTENCY';
    END IF;
  END IF;

  v_topup_num := fn_generate_number('TOP');
  v_cost_amount := p_amount - p_profit_amount;

  INSERT INTO topups (
    id,
    topup_number,
    amount,
    profit_amount,
    account_id,
    supplier_id,
    notes,
    idempotency_key,
    created_by
  )
  VALUES (
    v_topup_id,
    v_topup_num,
    p_amount,
    p_profit_amount,
    p_account_id,
    p_supplier_id,
    p_notes,
    p_idempotency_key,
    v_user_id
  );

  PERFORM pg_advisory_xact_lock(4280001);

  SELECT id
  INTO v_topup_product_id
  FROM products
  WHERE sku = 'AYA-TOPUP-PRODUCT'
  LIMIT 1;

  IF v_topup_product_id IS NULL THEN
    INSERT INTO products (
      name,
      category,
      sku,
      description,
      sale_price,
      cost_price,
      avg_cost_price,
      stock_quantity,
      min_stock_level,
      track_stock,
      is_quick_add,
      is_active,
      created_by
    )
    VALUES (
      'شحن رصيد',
      'service_general',
      'AYA-TOPUP-PRODUCT',
      'منتج محاسبي مخصص لتسجيل فواتير الشحن.',
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      v_user_id
    )
    RETURNING id INTO v_topup_product_id;
  END IF;

  v_invoice_id := gen_random_uuid();
  v_invoice_number := fn_generate_number('INV');

  INSERT INTO invoices (
    id,
    invoice_number,
    subtotal,
    discount_amount,
    total_amount,
    debt_amount,
    status,
    pos_terminal_code,
    notes,
    idempotency_key,
    created_by
  )
  VALUES (
    v_invoice_id,
    v_invoice_number,
    p_amount,
    0,
    p_amount,
    0,
    'active',
    NULL,
    'فاتورة شحن — ' || v_topup_num,
    p_idempotency_key,
    v_user_id
  );

  INSERT INTO invoice_items (
    id,
    invoice_id,
    product_id,
    product_name_at_time,
    quantity,
    unit_price,
    cost_price_at_time,
    discount_percentage,
    discount_amount,
    total_price
  )
  VALUES (
    gen_random_uuid(),
    v_invoice_id,
    v_topup_product_id,
    'شحن رصيد',
    1,
    p_amount,
    0,
    0,
    0,
    p_amount
  );

  v_ledger_income := gen_random_uuid();
  INSERT INTO ledger_entries (
    id,
    account_id,
    entry_type,
    amount,
    reference_type,
    reference_id,
    description,
    created_by
  )
  VALUES (
    v_ledger_income,
    p_account_id,
    'income',
    p_amount,
    'topup',
    v_topup_id,
    'شحن ' || v_topup_num,
    v_user_id
  );

  v_ledger_cost := gen_random_uuid();
  INSERT INTO ledger_entries (
    id,
    account_id,
    entry_type,
    amount,
    reference_type,
    reference_id,
    description,
    created_by
  )
  VALUES (
    v_ledger_cost,
    p_account_id,
    'expense',
    v_cost_amount,
    'topup',
    v_topup_id,
    'تكلفة شحن ' || v_topup_num,
    v_user_id
  );

  UPDATE accounts
  SET current_balance = current_balance + p_profit_amount
  WHERE id = p_account_id;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'create_topup',
    'topups',
    v_topup_id,
    'شحن ' || v_topup_num,
    jsonb_build_object(
      'amount', p_amount,
      'profit', p_profit_amount,
      'invoice_id', v_invoice_id,
      'invoice_number', v_invoice_number
    )
  );

  RETURN jsonb_build_object(
    'topup_id', v_topup_id,
    'topup_number', v_topup_num,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'ledger_entry_ids', jsonb_build_array(v_ledger_income, v_ledger_cost)
  );
END;
$$;
