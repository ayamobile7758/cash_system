CREATE TABLE IF NOT EXISTS permission_bundles (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                        VARCHAR(80) NOT NULL UNIQUE,
  label                      VARCHAR(120) NOT NULL,
  description                TEXT,
  base_role                  user_role NOT NULL,
  permissions                TEXT[] NOT NULL DEFAULT '{}',
  max_discount_percentage    DECIMAL(5,2),
  discount_requires_approval BOOLEAN NOT NULL DEFAULT false,
  is_system                  BOOLEAN NOT NULL DEFAULT true,
  is_active                  BOOLEAN NOT NULL DEFAULT true,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_permission_bundles_permissions_nonempty CHECK (
    array_length(permissions, 1) IS NULL OR array_length(permissions, 1) > 0
  ),
  CONSTRAINT chk_permission_bundles_discount_cap CHECK (
    max_discount_percentage IS NULL OR (max_discount_percentage >= 0 AND max_discount_percentage <= 100)
  )
);

CREATE TABLE IF NOT EXISTS role_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bundle_id    UUID NOT NULL REFERENCES permission_bundles(id) ON DELETE RESTRICT,
  notes       TEXT,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,
  revoked_by  UUID REFERENCES profiles(id),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_role_assignments_revocation CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL) OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_permission_bundles_base_role
  ON permission_bundles(base_role, is_active);

CREATE INDEX IF NOT EXISTS idx_permission_bundles_system
  ON permission_bundles(is_system);

CREATE INDEX IF NOT EXISTS idx_role_assignments_user
  ON role_assignments(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_role_assignments_bundle
  ON role_assignments(bundle_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_assignments_active
  ON role_assignments(user_id, bundle_id)
  WHERE is_active = true AND revoked_at IS NULL;

DROP TRIGGER IF EXISTS trg_permission_bundles_updated_at ON permission_bundles;
CREATE TRIGGER trg_permission_bundles_updated_at
  BEFORE UPDATE ON permission_bundles
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_role_assignments_updated_at ON role_assignments;
CREATE TRIGGER trg_role_assignments_updated_at
  BEFORE UPDATE ON role_assignments
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

ALTER TABLE permission_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permission_bundles_no_select ON permission_bundles;
CREATE POLICY permission_bundles_no_select
ON permission_bundles FOR SELECT TO authenticated, anon USING (false);

DROP POLICY IF EXISTS permission_bundles_no_insert ON permission_bundles;
CREATE POLICY permission_bundles_no_insert
ON permission_bundles FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS permission_bundles_no_update ON permission_bundles;
CREATE POLICY permission_bundles_no_update
ON permission_bundles FOR UPDATE TO authenticated, anon USING (false);

DROP POLICY IF EXISTS permission_bundles_no_delete ON permission_bundles;
CREATE POLICY permission_bundles_no_delete
ON permission_bundles FOR DELETE TO authenticated, anon USING (false);

DROP POLICY IF EXISTS role_assignments_no_select ON role_assignments;
CREATE POLICY role_assignments_no_select
ON role_assignments FOR SELECT TO authenticated, anon USING (false);

DROP POLICY IF EXISTS role_assignments_no_insert ON role_assignments;
CREATE POLICY role_assignments_no_insert
ON role_assignments FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS role_assignments_no_update ON role_assignments;
CREATE POLICY role_assignments_no_update
ON role_assignments FOR UPDATE TO authenticated, anon USING (false);

DROP POLICY IF EXISTS role_assignments_no_delete ON role_assignments;
CREATE POLICY role_assignments_no_delete
ON role_assignments FOR DELETE TO authenticated, anon USING (false);

REVOKE ALL ON TABLE permission_bundles, role_assignments FROM PUBLIC, authenticated, anon;

INSERT INTO permission_bundles (
  key,
  label,
  description,
  base_role,
  permissions,
  max_discount_percentage,
  discount_requires_approval,
  is_system,
  is_active
)
VALUES
  (
    'expenses_clerk',
    'مسؤول مصروفات',
    'يسمح بتسجيل المصروفات التشغيلية وقراءة شاشة المصروفات.',
    'pos_staff',
    ARRAY['expenses.read', 'expenses.create']::TEXT[],
    NULL,
    false,
    true,
    true
  ),
  (
    'inventory_clerk',
    'مسؤول جرد',
    'يسمح بقراءة شاشة الجرد وبدء/إكمال العد دون تسويات مالية.',
    'pos_staff',
    ARRAY['inventory.read', 'inventory.count.start', 'inventory.count.complete']::TEXT[],
    NULL,
    false,
    true,
    true
  ),
  (
    'operations_clerk',
    'مسؤول شحن',
    'يسمح بقراءة شاشة العمليات وتنفيذ الشحن فقط دون التحويل الداخلي.',
    'pos_staff',
    ARRAY['operations.read', 'topups.create']::TEXT[],
    NULL,
    false,
    true,
    true
  ),
  (
    'maintenance_clerk',
    'مسؤول صيانة',
    'يسمح بقراءة أوامر الصيانة وإنشائها وتحديث حالتها التشغيلية.',
    'pos_staff',
    ARRAY['maintenance.read', 'maintenance.create', 'maintenance.status.update']::TEXT[],
    NULL,
    false,
    true,
    true
  ),
  (
    'sales_discount_guarded',
    'مبيعات بخصم مع اعتماد',
    'يسمح بتجاوز baseline الخصم حتى 15% لكن مع إعادة ERR_DISCOUNT_APPROVAL_REQUIRED لطلب اعتماد أعلى.',
    'pos_staff',
    ARRAY['sales.discount.override']::TEXT[],
    15,
    true,
    true,
    true
  ),
  (
    'sales_supervisor',
    'مشرف مبيعات',
    'يسمح بتجاوز baseline الخصم حتى 15% دون اعتماد إضافي مع audit override.',
    'pos_staff',
    ARRAY['sales.discount.override']::TEXT[],
    15,
    false,
    true,
    true
  )
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    base_role = EXCLUDED.base_role,
    permissions = EXCLUDED.permissions,
    max_discount_percentage = EXCLUDED.max_discount_percentage,
    discount_requires_approval = EXCLUDED.discount_requires_approval,
    is_system = EXCLUDED.is_system,
    is_active = EXCLUDED.is_active,
    updated_at = now();

DROP FUNCTION IF EXISTS assign_permission_bundle(UUID, VARCHAR, TEXT, UUID);

CREATE OR REPLACE FUNCTION assign_permission_bundle(
  p_user_id      UUID,
  p_bundle_key   VARCHAR,
  p_notes        TEXT DEFAULT NULL,
  p_created_by   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_id       UUID;
  v_target_profile RECORD;
  v_bundle         permission_bundles%ROWTYPE;
  v_assignment     role_assignments%ROWTYPE;
BEGIN
  v_actor_id := fn_require_admin_actor(p_created_by);

  SELECT id, role, is_active
  INTO v_target_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND OR v_target_profile.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ERR_ROLE_ASSIGNMENT_INVALID';
  END IF;

  SELECT *
  INTO v_bundle
  FROM permission_bundles
  WHERE key = p_bundle_key
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_PERMISSION_BUNDLE_NOT_FOUND';
  END IF;

  IF v_target_profile.role <> v_bundle.base_role THEN
    RAISE EXCEPTION 'ERR_ROLE_ASSIGNMENT_INVALID';
  END IF;

  SELECT *
  INTO v_assignment
  FROM role_assignments
  WHERE user_id = p_user_id
    AND bundle_id = v_bundle.id
  ORDER BY assigned_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND AND v_assignment.is_active = true AND v_assignment.revoked_at IS NULL THEN
    RETURN jsonb_build_object(
      'assignment_id', v_assignment.id,
      'bundle_key', v_bundle.key,
      'base_role', v_bundle.base_role,
      'is_active', true
    );
  END IF;

  IF FOUND THEN
    UPDATE role_assignments
    SET notes = NULLIF(btrim(COALESCE(p_notes, '')), ''),
        assigned_by = v_actor_id,
        assigned_at = now(),
        revoked_at = NULL,
        revoked_by = NULL,
        is_active = true
    WHERE id = v_assignment.id;
  ELSE
    INSERT INTO role_assignments (
      user_id,
      bundle_id,
      notes,
      assigned_by
    ) VALUES (
      p_user_id,
      v_bundle.id,
      NULLIF(btrim(COALESCE(p_notes, '')), ''),
      v_actor_id
    )
    RETURNING * INTO v_assignment;
  END IF;

  SELECT *
  INTO v_assignment
  FROM role_assignments
  WHERE user_id = p_user_id
    AND bundle_id = v_bundle.id
    AND is_active = true
    AND revoked_at IS NULL
  ORDER BY assigned_at DESC
  LIMIT 1;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_actor_id,
    'assign_permission_bundle',
    'role_assignments',
    v_assignment.id,
    'إسناد حزمة صلاحيات ' || v_bundle.label,
    jsonb_build_object(
      'target_user_id', p_user_id,
      'bundle_key', v_bundle.key,
      'base_role', v_bundle.base_role
    )
  );

  RETURN jsonb_build_object(
    'assignment_id', v_assignment.id,
    'bundle_key', v_bundle.key,
    'base_role', v_bundle.base_role,
    'is_active', true
  );
END;
$$;

DROP FUNCTION IF EXISTS revoke_permission_bundle(UUID, VARCHAR, TEXT, UUID);

CREATE OR REPLACE FUNCTION revoke_permission_bundle(
  p_user_id      UUID,
  p_bundle_key   VARCHAR,
  p_notes        TEXT DEFAULT NULL,
  p_created_by   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_id       UUID;
  v_bundle         permission_bundles%ROWTYPE;
  v_assignment     role_assignments%ROWTYPE;
BEGIN
  v_actor_id := fn_require_admin_actor(p_created_by);

  SELECT *
  INTO v_bundle
  FROM permission_bundles
  WHERE key = p_bundle_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_PERMISSION_BUNDLE_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_assignment
  FROM role_assignments
  WHERE user_id = p_user_id
    AND bundle_id = v_bundle.id
    AND is_active = true
    AND revoked_at IS NULL
  ORDER BY assigned_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_ROLE_ASSIGNMENT_INVALID';
  END IF;

  UPDATE role_assignments
  SET notes = COALESCE(NULLIF(btrim(COALESCE(p_notes, '')), ''), notes),
      revoked_at = now(),
      revoked_by = v_actor_id,
      is_active = false
  WHERE id = v_assignment.id;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, old_values)
  VALUES (
    v_actor_id,
    'revoke_permission_bundle',
    'role_assignments',
    v_assignment.id,
    'إلغاء حزمة صلاحيات ' || v_bundle.label,
    jsonb_build_object(
      'target_user_id', p_user_id,
      'bundle_key', v_bundle.key
    )
  );

  RETURN jsonb_build_object(
    'assignment_id', v_assignment.id,
    'bundle_key', v_bundle.key,
    'base_role', v_bundle.base_role,
    'is_active', false
  );
END;
$$;

REVOKE ALL ON FUNCTION assign_permission_bundle(UUID, VARCHAR, TEXT, UUID) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION revoke_permission_bundle(UUID, VARCHAR, TEXT, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION assign_permission_bundle(UUID, VARCHAR, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION revoke_permission_bundle(UUID, VARCHAR, TEXT, UUID) TO service_role;

DROP FUNCTION IF EXISTS fn_get_discount_policy(UUID, user_role);

CREATE OR REPLACE FUNCTION fn_get_discount_policy(
  p_user_id UUID,
  p_role    user_role
)
RETURNS TABLE (
  max_discount_percentage DECIMAL(5,2),
  discount_requires_approval BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    MAX(pb.max_discount_percentage) AS max_discount_percentage,
    COALESCE(BOOL_OR(pb.discount_requires_approval), false) AS discount_requires_approval
  FROM role_assignments ra
  JOIN permission_bundles pb ON pb.id = ra.bundle_id
  WHERE ra.user_id = p_user_id
    AND ra.is_active = true
    AND ra.revoked_at IS NULL
    AND pb.is_active = true
    AND pb.base_role = p_role
    AND 'sales.discount.override' = ANY(pb.permissions);
$$;

REVOKE ALL ON FUNCTION fn_get_discount_policy(UUID, user_role) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION fn_get_discount_policy(UUID, user_role) TO service_role;

DROP FUNCTION IF EXISTS create_sale(JSONB, JSONB, VARCHAR, VARCHAR, UUID, UUID, VARCHAR, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION create_sale(
  p_items            JSONB,
  p_payments         JSONB,
  p_customer_name    VARCHAR DEFAULT NULL,
  p_customer_phone   VARCHAR DEFAULT NULL,
  p_debt_customer_id UUID DEFAULT NULL,
  p_discount_by      UUID DEFAULT NULL,
  p_pos_terminal     VARCHAR DEFAULT NULL,
  p_notes            TEXT DEFAULT NULL,
  p_idempotency_key  UUID DEFAULT NULL,
  p_created_by       UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id             UUID;
  v_invoice_id          UUID;
  v_invoice_number      VARCHAR;
  v_item                JSONB;
  v_product             RECORD;
  v_subtotal            DECIMAL(12,3) := 0;
  v_total_discount      DECIMAL(12,3) := 0;
  v_total_amount        DECIMAL(12,3) := 0;
  v_debt_amount         DECIMAL(12,3) := 0;
  v_item_discount_pct   DECIMAL(5,2);
  v_item_discount_amt   DECIMAL(12,3);
  v_item_total          DECIMAL(12,3);
  v_line_subtotal       DECIMAL(12,3);
  v_payment             JSONB;
  v_pay_total           DECIMAL(12,3) := 0;
  v_account             RECORD;
  v_fee                 DECIMAL(12,3);
  v_net                 DECIMAL(12,3);
  v_max_discount        DECIMAL(5,2);
  v_bundle_discount_cap DECIMAL(5,2);
  v_bundle_needs_approval BOOLEAN := false;
  v_effective_discount_cap DECIMAL(5,2);
  v_user_role           user_role;
  v_change              DECIMAL(12,3) := 0;
  v_low_stock_thresh    INT;
  v_retry_count         INT := 0;
  v_max_retries         INT := 2;
  v_used_discount_override BOOLEAN := false;
  v_max_applied_discount_pct DECIMAL(5,2) := 0;
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
    subtotal, discount_amount, discount_by, total_amount,
    debt_amount, debt_customer_id, status,
    pos_terminal_code, notes, idempotency_key, created_by
  ) VALUES (
    v_invoice_id, v_invoice_number, p_customer_name, p_customer_phone,
    0, 0, p_discount_by, 0,
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

  IF v_total_discount > 0 AND p_discount_by IS NOT NULL
     AND (v_total_discount / NULLIF(v_subtotal, 0) * 100) >= COALESCE(
       (SELECT value::DECIMAL FROM system_settings WHERE key = 'discount_warning_threshold'), 10
     ) THEN
    INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
    SELECT p.id, 'large_discount',
      'خصم في فاتورة ' || v_invoice_number,
      'مبلغ الخصم: ' || v_total_discount || ' د.أ',
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

REVOKE ALL ON FUNCTION create_sale(JSONB, JSONB, VARCHAR, VARCHAR, UUID, UUID, VARCHAR, TEXT, UUID, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION create_sale(JSONB, JSONB, VARCHAR, VARCHAR, UUID, UUID, VARCHAR, TEXT, UUID, UUID) TO service_role;
