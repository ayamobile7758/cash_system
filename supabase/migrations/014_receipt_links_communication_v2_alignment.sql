ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_type_dedupe
  ON notifications(user_id, type, dedupe_key);

CREATE TABLE IF NOT EXISTS receipt_link_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  token_value VARCHAR(120) NOT NULL UNIQUE,
  channel     VARCHAR(20)  NOT NULL DEFAULT 'share',
  expires_at  TIMESTAMPTZ  NOT NULL,
  revoked_at  TIMESTAMPTZ,
  revoked_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by  UUID         NOT NULL REFERENCES profiles(id),
  CONSTRAINT chk_receipt_link_channel CHECK (channel IN ('share', 'whatsapp')),
  CONSTRAINT chk_receipt_link_revocation CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL) OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_receipt_link_tokens_invoice
  ON receipt_link_tokens(invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipt_link_tokens_expires
  ON receipt_link_tokens(expires_at);

CREATE TABLE IF NOT EXISTS whatsapp_delivery_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key        VARCHAR(50)  NOT NULL,
  target_phone_masked VARCHAR(30)  NOT NULL,
  delivery_mode       VARCHAR(20)  NOT NULL DEFAULT 'wa_me',
  status              VARCHAR(20)  NOT NULL DEFAULT 'queued',
  provider_message_id VARCHAR(100),
  reference_type      VARCHAR(50)  NOT NULL,
  reference_id        UUID         NOT NULL,
  idempotency_key     UUID         NOT NULL UNIQUE,
  last_error          TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by          UUID         NOT NULL REFERENCES profiles(id),
  CONSTRAINT chk_whatsapp_delivery_mode CHECK (delivery_mode IN ('wa_me')),
  CONSTRAINT chk_whatsapp_delivery_status CHECK (status IN ('queued', 'sent', 'failed')),
  CONSTRAINT chk_whatsapp_delivery_reference CHECK (
    reference_type IN ('invoice', 'debt_entry', 'maintenance_job', 'debt_customer')
  )
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_delivery_logs_reference
  ON whatsapp_delivery_logs(reference_type, reference_id, created_at DESC);

CREATE OR REPLACE FUNCTION fn_generate_receipt_token()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token VARCHAR;
BEGIN
  v_token := replace(replace(encode(gen_random_bytes(24), 'base64'), '/', '_'), '+', '-');
  v_token := replace(v_token, '=', '');
  RETURN v_token;
END;
$$;

DROP FUNCTION IF EXISTS issue_receipt_link(UUID, VARCHAR, INTEGER, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION issue_receipt_link(
  p_invoice_id         UUID,
  p_channel            VARCHAR DEFAULT 'share',
  p_expires_in_hours   INTEGER DEFAULT 168,
  p_force_reissue      BOOLEAN DEFAULT false,
  p_created_by         UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id            UUID;
  v_actor_role         user_role;
  v_invoice            RECORD;
  v_existing_token     receipt_link_tokens%ROWTYPE;
  v_token_id           UUID := gen_random_uuid();
  v_token_value        VARCHAR;
  v_expires_at         TIMESTAMPTZ;
  v_is_reissued        BOOLEAN := false;
  v_had_unrevoked      BOOLEAN := false;
BEGIN
  v_user_id := fn_require_actor(p_created_by);

  IF p_expires_in_hours IS NULL OR p_expires_in_hours < 1 OR p_expires_in_hours > 720 THEN
    RAISE EXCEPTION 'ERR_VALIDATION_OUT_OF_RANGE';
  END IF;

  IF p_channel IS NULL OR p_channel NOT IN ('share', 'whatsapp') THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  SELECT role INTO v_actor_role
  FROM profiles
  WHERE id = v_user_id;

  SELECT
    id,
    invoice_number,
    created_by
  INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INVOICE_NOT_FOUND';
  END IF;

  IF v_actor_role <> 'admin' AND v_invoice.created_by <> v_user_id THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED';
  END IF;

  SELECT *
  INTO v_existing_token
  FROM receipt_link_tokens
  WHERE invoice_id = p_invoice_id
    AND revoked_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_had_unrevoked := true;

    IF v_existing_token.expires_at > now() AND p_force_reissue IS NOT TRUE THEN
      RETURN jsonb_build_object(
        'token_id', v_existing_token.id,
        'token', v_existing_token.token_value,
        'expires_at', v_existing_token.expires_at,
        'is_reissued', false
      );
    END IF;

    UPDATE receipt_link_tokens
    SET revoked_at = now(),
        revoked_by = v_user_id
    WHERE id = v_existing_token.id
      AND revoked_at IS NULL;

    INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, old_values)
    VALUES (
      v_user_id,
      'revoke_receipt_link',
      'receipt_link_tokens',
      v_existing_token.id,
      'إلغاء رابط إيصال سابق للفواتير',
      jsonb_build_object(
        'invoice_id', p_invoice_id,
        'previous_token_id', v_existing_token.id
      )
    );
  END IF;

  v_token_value := fn_generate_receipt_token();
  v_expires_at := now() + make_interval(hours => p_expires_in_hours);
  v_is_reissued := v_had_unrevoked;

  INSERT INTO receipt_link_tokens (
    id,
    invoice_id,
    token_value,
    channel,
    expires_at,
    created_by
  ) VALUES (
    v_token_id,
    p_invoice_id,
    v_token_value,
    p_channel,
    v_expires_at,
    v_user_id
  );

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'issue_receipt_link',
    'receipt_link_tokens',
    v_token_id,
    'إصدار رابط إيصال عام للفواتير',
    jsonb_build_object(
      'invoice_id', p_invoice_id,
      'channel', p_channel,
      'expires_at', v_expires_at,
      'is_reissued', v_is_reissued
    )
  );

  RETURN jsonb_build_object(
    'token_id', v_token_id,
    'token', v_token_value,
    'expires_at', v_expires_at,
    'is_reissued', v_is_reissued
  );
END;
$$;

DROP FUNCTION IF EXISTS revoke_receipt_link(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION revoke_receipt_link(
  p_token_id     UUID DEFAULT NULL,
  p_invoice_id   UUID DEFAULT NULL,
  p_created_by   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id      UUID;
  v_actor_role   user_role;
  v_token        RECORD;
BEGIN
  v_user_id := fn_require_actor(p_created_by);

  IF p_token_id IS NULL AND p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  SELECT role INTO v_actor_role
  FROM profiles
  WHERE id = v_user_id;

  SELECT
    receipt_link_tokens.id,
    receipt_link_tokens.invoice_id,
    receipt_link_tokens.token_value,
    receipt_link_tokens.expires_at,
    invoices.created_by AS invoice_created_by
  INTO v_token
  FROM receipt_link_tokens
  JOIN invoices ON invoices.id = receipt_link_tokens.invoice_id
  WHERE (
      (p_token_id IS NOT NULL AND receipt_link_tokens.id = p_token_id)
      OR
      (p_token_id IS NULL AND p_invoice_id IS NOT NULL AND receipt_link_tokens.invoice_id = p_invoice_id)
    )
    AND receipt_link_tokens.revoked_at IS NULL
  ORDER BY receipt_link_tokens.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_RECEIPT_LINK_INVALID';
  END IF;

  IF v_actor_role <> 'admin' AND v_token.invoice_created_by <> v_user_id THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED';
  END IF;

  UPDATE receipt_link_tokens
  SET revoked_at = now(),
      revoked_by = v_user_id
  WHERE id = v_token.id
    AND revoked_at IS NULL;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, old_values)
  VALUES (
    v_user_id,
    'revoke_receipt_link',
    'receipt_link_tokens',
    v_token.id,
    'إلغاء رابط إيصال عام',
    jsonb_build_object(
      'invoice_id', v_token.invoice_id,
      'token_id', v_token.id
    )
  );

  RETURN jsonb_build_object(
    'token_id', v_token.id,
    'invoice_id', v_token.invoice_id,
    'revoked', true
  );
END;
$$;

DROP FUNCTION IF EXISTS run_debt_reminder_scheduler(VARCHAR, DATE, UUID);

CREATE OR REPLACE FUNCTION run_debt_reminder_scheduler(
  p_mode         VARCHAR,
  p_as_of_date   DATE DEFAULT CURRENT_DATE,
  p_created_by   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id               UUID;
  v_entry                 RECORD;
  v_notification_type     VARCHAR(50);
  v_dedupe_key            TEXT;
  v_rows_inserted         INTEGER;
  v_processed_count       INTEGER := 0;
  v_created_count         INTEGER := 0;
  v_suppressed_duplicates INTEGER := 0;
BEGIN
  v_user_id := fn_require_admin_actor(p_created_by);

  IF p_mode NOT IN ('due', 'overdue') THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  v_notification_type := CASE
    WHEN p_mode = 'due' THEN 'debt_due_reminder'
    ELSE 'debt_overdue'
  END;

  FOR v_entry IN
    SELECT
      debt_entries.id,
      debt_entries.due_date,
      debt_entries.remaining_amount,
      debt_entries.debt_customer_id,
      debt_customers.name AS customer_name
    FROM debt_entries
    JOIN debt_customers ON debt_customers.id = debt_entries.debt_customer_id
    WHERE debt_entries.is_paid = false
      AND debt_entries.remaining_amount > 0
      AND (
        (p_mode = 'due' AND debt_entries.due_date BETWEEN p_as_of_date AND (p_as_of_date + 3))
        OR
        (p_mode = 'overdue' AND debt_entries.due_date < p_as_of_date)
      )
    ORDER BY debt_entries.due_date ASC, debt_entries.created_at ASC
  LOOP
    v_processed_count := v_processed_count + 1;
    v_dedupe_key := v_notification_type || ':' || v_entry.id::TEXT || ':' || p_as_of_date::TEXT;

    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      reference_type,
      reference_id,
      dedupe_key
    )
    SELECT
      profiles.id,
      v_notification_type,
      CASE
        WHEN v_notification_type = 'debt_due_reminder' THEN 'دين يستحق قريبًا'
        ELSE 'دين متأخر'
      END,
      CASE
        WHEN v_notification_type = 'debt_due_reminder' THEN
          'العميل ' || v_entry.customer_name || ' لديه دين يستحق بتاريخ ' || v_entry.due_date::TEXT ||
          ' بقيمة ' || v_entry.remaining_amount::TEXT || ' د.أ'
        ELSE
          'العميل ' || v_entry.customer_name || ' لديه دين متأخر منذ ' || v_entry.due_date::TEXT ||
          ' بقيمة ' || v_entry.remaining_amount::TEXT || ' د.أ'
      END,
      'debt_entry',
      v_entry.id,
      v_dedupe_key
    FROM profiles
    WHERE profiles.is_active = true
      AND profiles.role = 'admin'
    ON CONFLICT (user_id, type, dedupe_key) DO NOTHING;

    GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

    IF v_rows_inserted > 0 THEN
      v_created_count := v_created_count + 1;
    ELSE
      v_suppressed_duplicates := v_suppressed_duplicates + 1;
    END IF;
  END LOOP;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'run_debt_reminder_scheduler',
    'notifications',
    gen_random_uuid(),
    'تشغيل مجدول تذكيرات الديون',
    jsonb_build_object(
      'mode', p_mode,
      'as_of_date', p_as_of_date,
      'processed_count', v_processed_count,
      'created_count', v_created_count,
      'suppressed_duplicates', v_suppressed_duplicates
    )
  );

  RETURN jsonb_build_object(
    'processed_count', v_processed_count,
    'created_count', v_created_count,
    'suppressed_duplicates', v_suppressed_duplicates
  );
END;
$$;

DROP FUNCTION IF EXISTS create_whatsapp_delivery_log(VARCHAR, VARCHAR, VARCHAR, UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION create_whatsapp_delivery_log(
  p_template_key     VARCHAR,
  p_target_phone     VARCHAR,
  p_reference_type   VARCHAR,
  p_reference_id     UUID,
  p_idempotency_key  UUID,
  p_created_by       UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id              UUID;
  v_delivery_log_id      UUID := gen_random_uuid();
  v_clean_phone          TEXT;
  v_target_phone_masked  TEXT;
BEGIN
  v_user_id := fn_require_admin_actor(p_created_by);

  IF p_template_key IS NULL OR btrim(p_template_key) = '' THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF p_target_phone IS NULL OR btrim(p_target_phone) = '' THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF p_reference_type IS NULL OR btrim(p_reference_type) = '' OR p_reference_id IS NULL THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM whatsapp_delivery_logs
    WHERE idempotency_key = p_idempotency_key
  ) THEN
    RAISE EXCEPTION 'ERR_IDEMPOTENCY';
  END IF;

  v_clean_phone := regexp_replace(p_target_phone, '[^0-9]', '', 'g');
  IF length(v_clean_phone) < 8 THEN
    RAISE EXCEPTION 'ERR_VALIDATION_REQUIRED_FIELD';
  END IF;

  v_target_phone_masked := repeat('*', GREATEST(length(v_clean_phone) - 4, 0)) || right(v_clean_phone, 4);

  INSERT INTO whatsapp_delivery_logs (
    id,
    template_key,
    target_phone_masked,
    status,
    reference_type,
    reference_id,
    idempotency_key,
    created_by
  ) VALUES (
    v_delivery_log_id,
    btrim(p_template_key),
    v_target_phone_masked,
    'queued',
    btrim(p_reference_type),
    p_reference_id,
    p_idempotency_key,
    v_user_id
  );

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'create_whatsapp_delivery_log',
    'whatsapp_delivery_logs',
    v_delivery_log_id,
    'تسجيل محاولة واتساب',
    jsonb_build_object(
      'template_key', p_template_key,
      'reference_type', p_reference_type,
      'reference_id', p_reference_id,
      'target_phone_masked', v_target_phone_masked
    )
  );

  RETURN jsonb_build_object(
    'delivery_log_id', v_delivery_log_id,
    'status', 'queued'
  );
END;
$$;

REVOKE ALL ON FUNCTION issue_receipt_link(UUID, VARCHAR, INTEGER, BOOLEAN, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION issue_receipt_link(UUID, VARCHAR, INTEGER, BOOLEAN, UUID) TO service_role;

REVOKE ALL ON FUNCTION revoke_receipt_link(UUID, UUID, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION revoke_receipt_link(UUID, UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION run_debt_reminder_scheduler(VARCHAR, DATE, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION run_debt_reminder_scheduler(VARCHAR, DATE, UUID) TO service_role;

REVOKE ALL ON FUNCTION create_whatsapp_delivery_log(VARCHAR, VARCHAR, VARCHAR, UUID, UUID, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION create_whatsapp_delivery_log(VARCHAR, VARCHAR, VARCHAR, UUID, UUID, UUID) TO service_role;
