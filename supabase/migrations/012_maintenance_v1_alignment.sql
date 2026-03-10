ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS chk_notification_type;

ALTER TABLE notifications
  ADD CONSTRAINT chk_notification_type CHECK (
    type IN (
      'debt_limit_exceeded',
      'large_discount',
      'retroactive_edit',
      'reconciliation_difference',
      'low_stock',
      'invoice_cancelled',
      'daily_snapshot',
      'debt_due_reminder',
      'debt_overdue',
      'maintenance_ready'
    )
  );

DROP FUNCTION IF EXISTS create_maintenance_job(VARCHAR, VARCHAR, TEXT, VARCHAR, DECIMAL, TEXT, UUID);
DROP FUNCTION IF EXISTS create_maintenance_job(VARCHAR, VARCHAR, TEXT, VARCHAR, DECIMAL, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION create_maintenance_job(
  p_customer_name     VARCHAR,
  p_device_type       VARCHAR,
  p_issue_description TEXT,
  p_customer_phone    VARCHAR DEFAULT NULL,
  p_estimated_cost    DECIMAL DEFAULT NULL,
  p_notes             TEXT DEFAULT NULL,
  p_idempotency_key   UUID DEFAULT NULL,
  p_created_by        UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id  UUID;
  v_job_id   UUID := gen_random_uuid();
  v_job_num  VARCHAR;
BEGIN
  v_user_id := fn_require_actor(p_created_by);

  IF p_customer_name IS NULL OR btrim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF p_device_type IS NULL OR btrim(p_device_type) = '' THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF p_issue_description IS NULL OR btrim(p_issue_description) = '' THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF p_estimated_cost IS NOT NULL AND p_estimated_cost < 0 THEN
    RAISE EXCEPTION 'ERR_VALIDATION_NEGATIVE_AMOUNT';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM maintenance_jobs WHERE idempotency_key = p_idempotency_key) THEN
      RAISE EXCEPTION 'ERR_IDEMPOTENCY';
    END IF;
  END IF;

  v_job_num := fn_generate_number('MNT');

  INSERT INTO maintenance_jobs (
    id,
    job_number,
    customer_name,
    customer_phone,
    device_type,
    issue_description,
    estimated_cost,
    notes,
    idempotency_key,
    created_by
  ) VALUES (
    v_job_id,
    v_job_num,
    btrim(p_customer_name),
    NULLIF(btrim(p_customer_phone), ''),
    btrim(p_device_type),
    btrim(p_issue_description),
    p_estimated_cost,
    p_notes,
    p_idempotency_key,
    v_user_id
  );

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'create_maintenance_job',
    'maintenance_jobs',
    v_job_id,
    'أمر صيانة ' || v_job_num,
    jsonb_build_object('customer', p_customer_name, 'device', p_device_type)
  );

  RETURN jsonb_build_object('job_id', v_job_id, 'job_number', v_job_num, 'status', 'new');
END;
$$;

DROP FUNCTION IF EXISTS update_maintenance_job_status(UUID, maintenance_status, DECIMAL, UUID, TEXT);
DROP FUNCTION IF EXISTS update_maintenance_job_status(UUID, maintenance_status, DECIMAL, UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION update_maintenance_job_status(
  p_job_id             UUID,
  p_new_status         maintenance_status,
  p_final_amount       DECIMAL DEFAULT NULL,
  p_payment_account_id UUID DEFAULT NULL,
  p_notes              TEXT DEFAULT NULL,
  p_created_by         UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id         UUID;
  v_actor_role      user_role;
  v_job             maintenance_jobs%ROWTYPE;
  v_ledger_entry_id UUID := NULL;
  v_effective_total DECIMAL(12,3);
BEGIN
  v_user_id := fn_require_actor(p_created_by);

  SELECT role
    INTO v_actor_role
    FROM profiles
   WHERE id = v_user_id;

  SELECT *
    INTO v_job
    FROM maintenance_jobs
   WHERE id = p_job_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_ITEM_NOT_FOUND';
  END IF;

  IF v_job.status = p_new_status THEN
    RAISE EXCEPTION 'ERR_MAINTENANCE_INVALID_STATUS';
  END IF;

  IF p_new_status = 'cancelled' AND v_actor_role <> 'admin' THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED';
  END IF;

  IF NOT (
    (v_job.status = 'new' AND p_new_status IN ('in_progress', 'cancelled')) OR
    (v_job.status = 'in_progress' AND p_new_status IN ('ready', 'cancelled')) OR
    (v_job.status = 'ready' AND p_new_status IN ('delivered', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'ERR_MAINTENANCE_INVALID_STATUS';
  END IF;

  IF p_new_status = 'delivered' THEN
    IF p_final_amount IS NULL THEN
      RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
    END IF;

    IF p_final_amount < 0 THEN
      RAISE EXCEPTION 'ERR_VALIDATION_NEGATIVE_AMOUNT';
    END IF;

    v_effective_total := p_final_amount;

    IF v_effective_total > 0 THEN
      IF p_payment_account_id IS NULL THEN
        RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
      END IF;

      PERFORM 1
        FROM accounts
       WHERE id = p_payment_account_id
         AND module_scope = 'maintenance'
         AND is_active = true
       FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'ERR_ACCOUNT_NOT_FOUND';
      END IF;

      v_ledger_entry_id := gen_random_uuid();

      INSERT INTO ledger_entries (
        id,
        account_id,
        entry_type,
        amount,
        reference_type,
        reference_id,
        description,
        created_by
      ) VALUES (
        v_ledger_entry_id,
        p_payment_account_id,
        'income',
        v_effective_total,
        'maintenance_job',
        p_job_id,
        'صيانة ' || v_job.job_number || ' - ' || v_job.device_type,
        v_user_id
      );

      UPDATE accounts
         SET current_balance = current_balance + v_effective_total
       WHERE id = p_payment_account_id;
    END IF;

    UPDATE maintenance_jobs
       SET status = 'delivered',
           final_amount = v_effective_total,
           payment_account_id = CASE WHEN v_effective_total > 0 THEN p_payment_account_id ELSE NULL END,
           notes = COALESCE(p_notes, notes),
           delivered_at = now()
     WHERE id = p_job_id;
  ELSIF p_new_status = 'ready' THEN
    UPDATE maintenance_jobs
       SET status = 'ready',
           notes = COALESCE(p_notes, notes)
     WHERE id = p_job_id;

    INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
    SELECT
      p.id,
      'maintenance_ready',
      'طلب صيانة جاهز للتسليم',
      'أمر الصيانة ' || v_job.job_number || ' أصبح جاهزًا للتسليم.',
      'maintenance_job',
      p_job_id
    FROM profiles p
    WHERE p.is_active = true
      AND p.role IN ('admin', 'pos_staff');
  ELSE
    UPDATE maintenance_jobs
       SET status = p_new_status,
           notes = COALESCE(p_notes, notes)
     WHERE id = p_job_id;
  END IF;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'update_maintenance_status',
    'maintenance_jobs',
    p_job_id,
    'تحديث حالة أمر الصيانة ' || v_job.job_number || ' إلى ' || p_new_status,
    jsonb_build_object(
      'from_status', v_job.status,
      'to_status', p_new_status,
      'final_amount', COALESCE(p_final_amount, v_job.final_amount),
      'payment_account_id', p_payment_account_id
    )
  );

  RETURN jsonb_build_object(
    'job_id', p_job_id,
    'job_number', v_job.job_number,
    'status', p_new_status,
    'final_amount', COALESCE(p_final_amount, v_job.final_amount, 0),
    'ledger_entry_id', v_ledger_entry_id
  );
END;
$$;

REVOKE ALL ON FUNCTION create_maintenance_job(VARCHAR, VARCHAR, TEXT, VARCHAR, DECIMAL, TEXT, UUID, UUID) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION update_maintenance_job_status(UUID, maintenance_status, DECIMAL, UUID, TEXT, UUID) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION create_maintenance_job(VARCHAR, VARCHAR, TEXT, VARCHAR, DECIMAL, TEXT, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_maintenance_job_status(UUID, maintenance_status, DECIMAL, UUID, TEXT, UUID) TO service_role;
