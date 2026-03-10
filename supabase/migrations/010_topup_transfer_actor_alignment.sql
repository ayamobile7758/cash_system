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
  v_user_id       UUID := fn_require_actor(p_created_by);
  v_topup_id      UUID := gen_random_uuid();
  v_topup_num     VARCHAR;
  v_ledger_income UUID;
  v_ledger_cost   UUID;
  v_cost_amount   DECIMAL(12,3);
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
    jsonb_build_object('amount', p_amount, 'profit', p_profit_amount)
  );

  RETURN jsonb_build_object(
    'topup_id', v_topup_id,
    'topup_number', v_topup_num,
    'ledger_entry_ids', jsonb_build_array(v_ledger_income, v_ledger_cost)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.create_transfer(UUID, UUID, DECIMAL, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_transfer(UUID, UUID, DECIMAL, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.create_transfer(
  p_from_account_id UUID,
  p_to_account_id   UUID,
  p_amount          DECIMAL,
  p_notes           TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_created_by      UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id             UUID := fn_require_admin_actor(p_created_by);
  v_transfer_id         UUID := gen_random_uuid();
  v_transfer_num        VARCHAR;
  v_locked_accounts     INTEGER;
  v_from_balance        DECIMAL(12,3);
  v_from_ledger_balance DECIMAL(12,3);
  v_ledger_from         UUID;
  v_ledger_to           UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'ERR_VALIDATION_NEGATIVE_AMOUNT';
  END IF;

  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'ERR_TRANSFER_SAME_ACCOUNT';
  END IF;

  WITH locked_accounts AS (
    SELECT id, current_balance
    FROM accounts
    WHERE id IN (p_from_account_id, p_to_account_id)
    ORDER BY id
    FOR UPDATE
  )
  SELECT
    COUNT(*),
    MAX(CASE WHEN id = p_from_account_id THEN current_balance END)
  INTO v_locked_accounts, v_from_balance
  FROM locked_accounts;

  IF v_locked_accounts <> 2 OR v_from_balance IS NULL THEN
    RAISE EXCEPTION 'ERR_API_VALIDATION_FAILED';
  END IF;

  v_from_ledger_balance := COALESCE(fn_calc_account_ledger_balance(p_from_account_id), 0);
  IF LEAST(v_from_balance, v_from_ledger_balance) < p_amount THEN
    RAISE EXCEPTION 'ERR_INSUFFICIENT_BALANCE';
  END IF;

  v_transfer_num := fn_generate_number('TRF');

  BEGIN
    INSERT INTO transfers (
      id,
      transfer_number,
      transfer_type,
      amount,
      profit_amount,
      from_account_id,
      to_account_id,
      notes,
      idempotency_key,
      created_by
    )
    VALUES (
      v_transfer_id,
      v_transfer_num,
      'internal',
      p_amount,
      0,
      p_from_account_id,
      p_to_account_id,
      p_notes,
      p_idempotency_key,
      v_user_id
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'ERR_IDEMPOTENCY';
  END;

  v_ledger_from := gen_random_uuid();
  INSERT INTO ledger_entries (
    id,
    account_id,
    entry_type,
    amount,
    adjustment_direction,
    reference_type,
    reference_id,
    description,
    created_by
  )
  VALUES (
    v_ledger_from,
    p_from_account_id,
    'adjustment',
    p_amount,
    'decrease',
    'transfer',
    v_transfer_id,
    'تحويل داخلي إلى حساب آخر — ' || v_transfer_num,
    v_user_id
  );

  UPDATE accounts
  SET current_balance = current_balance - p_amount
  WHERE id = p_from_account_id;

  v_ledger_to := gen_random_uuid();
  INSERT INTO ledger_entries (
    id,
    account_id,
    entry_type,
    amount,
    adjustment_direction,
    reference_type,
    reference_id,
    description,
    created_by
  )
  VALUES (
    v_ledger_to,
    p_to_account_id,
    'adjustment',
    p_amount,
    'increase',
    'transfer',
    v_transfer_id,
    'تحويل داخلي من حساب آخر — ' || v_transfer_num,
    v_user_id
  );

  UPDATE accounts
  SET current_balance = current_balance + p_amount
  WHERE id = p_to_account_id;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'create_transfer',
    'transfers',
    v_transfer_id,
    'تحويل داخلي ' || p_amount || ' د.أ — ' || v_transfer_num,
    jsonb_build_object(
      'from', p_from_account_id,
      'to', p_to_account_id,
      'amount', p_amount,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_num,
    'ledger_entry_ids', jsonb_build_array(v_ledger_from, v_ledger_to)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_topup(UUID, DECIMAL, DECIMAL, UUID, TEXT, UUID, UUID) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.create_transfer(UUID, UUID, DECIMAL, TEXT, UUID, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_topup(UUID, DECIMAL, DECIMAL, UUID, TEXT, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_transfer(UUID, UUID, DECIMAL, TEXT, UUID, UUID) TO service_role;
