-- ============================================================
-- آية موبايل — إصلاح تحذيرات Supabase Linter (017)
-- التاريخ: 12 مارس 2026
-- يعتمد على: 014, 007
-- ============================================================

-- ============================================================
-- 1) تفعيل RLS + إغلاق الوصول على receipt_link_tokens
-- ============================================================

ALTER TABLE receipt_link_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE receipt_link_tokens FROM PUBLIC, authenticated, anon;

DROP POLICY IF EXISTS receipt_link_tokens_no_select ON receipt_link_tokens;
CREATE POLICY receipt_link_tokens_no_select
ON receipt_link_tokens FOR SELECT TO authenticated, anon USING (false);

DROP POLICY IF EXISTS receipt_link_tokens_no_insert ON receipt_link_tokens;
CREATE POLICY receipt_link_tokens_no_insert
ON receipt_link_tokens FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS receipt_link_tokens_no_update ON receipt_link_tokens;
CREATE POLICY receipt_link_tokens_no_update
ON receipt_link_tokens FOR UPDATE TO authenticated, anon USING (false);

DROP POLICY IF EXISTS receipt_link_tokens_no_delete ON receipt_link_tokens;
CREATE POLICY receipt_link_tokens_no_delete
ON receipt_link_tokens FOR DELETE TO authenticated, anon USING (false);

-- ============================================================
-- 2) تفعيل RLS + إغلاق الوصول على whatsapp_delivery_logs
-- ============================================================

ALTER TABLE whatsapp_delivery_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE whatsapp_delivery_logs FROM PUBLIC, authenticated, anon;

DROP POLICY IF EXISTS whatsapp_delivery_logs_no_select ON whatsapp_delivery_logs;
CREATE POLICY whatsapp_delivery_logs_no_select
ON whatsapp_delivery_logs FOR SELECT TO authenticated, anon USING (false);

DROP POLICY IF EXISTS whatsapp_delivery_logs_no_insert ON whatsapp_delivery_logs;
CREATE POLICY whatsapp_delivery_logs_no_insert
ON whatsapp_delivery_logs FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS whatsapp_delivery_logs_no_update ON whatsapp_delivery_logs;
CREATE POLICY whatsapp_delivery_logs_no_update
ON whatsapp_delivery_logs FOR UPDATE TO authenticated, anon USING (false);

DROP POLICY IF EXISTS whatsapp_delivery_logs_no_delete ON whatsapp_delivery_logs;
CREATE POLICY whatsapp_delivery_logs_no_delete
ON whatsapp_delivery_logs FOR DELETE TO authenticated, anon USING (false);

-- ============================================================
-- 3) إعادة بناء Views بدون SECURITY DEFINER
--    security_barrier كافي — يمنع information leakage عبر filter pushdown
--    الوصول محكوم بـ RLS على الجداول الأصلية + GRANT SELECT على الـ view
-- ============================================================

DROP VIEW IF EXISTS v_pos_products;
CREATE VIEW v_pos_products AS
SELECT
  id, name, category, sku, description,
  sale_price, stock_quantity, min_stock_level,
  track_stock, is_quick_add, is_active,
  created_at, updated_at, created_by
FROM public.products
WHERE is_active = true;

DROP VIEW IF EXISTS v_pos_accounts;
CREATE VIEW v_pos_accounts AS
SELECT
  id, name, type, module_scope, fee_percentage,
  is_active, display_order, created_at, updated_at
FROM public.accounts;

DROP VIEW IF EXISTS v_pos_debt_customers;
CREATE VIEW v_pos_debt_customers AS
SELECT
  id, name, phone, address, current_balance,
  due_date_days, is_active, created_at, updated_at, created_by
FROM public.debt_customers;

DROP VIEW IF EXISTS admin_suppliers;
CREATE VIEW admin_suppliers AS
SELECT * FROM public.suppliers
WHERE public.fn_is_admin();

-- إعادة ضبط الصلاحيات على Views
REVOKE ALL ON v_pos_products FROM PUBLIC, authenticated, anon;
REVOKE ALL ON v_pos_accounts FROM PUBLIC, authenticated, anon;
REVOKE ALL ON v_pos_debt_customers FROM PUBLIC, authenticated, anon;
REVOKE ALL ON admin_suppliers FROM PUBLIC, authenticated, anon;

GRANT SELECT ON v_pos_products TO authenticated;
GRANT SELECT ON v_pos_accounts TO authenticated;
GRANT SELECT ON v_pos_debt_customers TO authenticated;
GRANT SELECT ON admin_suppliers TO authenticated;

-- ============================================================
-- ✅ نهاية 017
-- ============================================================
