# آية موبايل - تصميم قاعدة البيانات
## 5) Database Design (Supabase)

---

## 📊 نظرة عامة على هيكل قاعدة البيانات

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           آية موبايل - Database Schema                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐                                                          │
│   │    users     │◄──────────────────────────────────────────────┐         │
│   │  (Supabase   │                                               │         │
│   │    Auth)     │                                               │         │
│   └──────┬───────┘                                               │         │
│          │                                                        │         │
│          │ 1:N                                                    │         │
│          ▼                                                        │         │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │         │
│   │   profiles   │    │  audit_logs  │    │daily_snapshots│       │         │
│   │  (امتداد    │    │              │    │              │       │         │
│   │   للمستخدم) │    │              │    │              │       │         │
│   └──────────────┘    └──────────────┘    └──────────────┘       │         │
│                                                                             │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
│   │   products   │◄───│invoice_items │────►│   invoices   │◄─────────────┘
│   │              │    │              │    │              │
│   └──────┬───────┘    └──────────────┘    └──────┬───────┘
│          │                                        │
│          │ 1:N                                    │ 1:N
│          ▼                                        ▼
│   ┌──────────────┐                         ┌──────────────┐
│   │   returns    │                         │   payments   │
│   │              │                         │   (الدفعات   │
│   │              │                         │   داخل الفاتورة)
│   └──────────────┘                         └──────────────┘
│                                                    │
│                                                    │ N:1
│                                                    ▼
│                                             ┌──────────────┐
│                                             │   accounts   │
│                                             │  (الحسابات   │
│                                             │   المالية)   │
│                                             └──────┬───────┘
│                                                    │
│                                                    │ 1:N
│                                                    ▼
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   │debt_customers│◄───│ debt_entries │    │ledger_entries│
│   │              │    │              │    │  (القيود     │
│   │              │    │              │    │   المحاسبية) │
│   └──────┬───────┘    └──────┬───────┘    └──────────────┘
│          │                   │
│          │ 1:N               │ 1:N
│          ▼                   ▼
│   ┌──────────────┐    ┌──────────────┐
│   │debt_payments │    │purchase_orders│
│   │              │    │              │
│   └──────────────┘    └──────┬───────┘
│                              │
│                              │ N:1
│                              ▼
│                       ┌──────────────┐
│                       │   suppliers  │
│                       │              │
│                       └──────────────┘
│
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   │ inventory_   │    │   topups     │    │  transfers   │
│   │   counts     │    │              │    │              │
│   └──────────────┘    └──────────────┘    └──────────────┘
│
│   ┌──────────────┐    ┌──────────────┐
│   │reconciliation│    │   expenses   │
│   │   _entries   │    │              │
│   └──────────────┘    └──────────────┘
│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

**ملاحظة زمنية:** جميع الحسابات اليومية والتجميعات تعتمد على المنطقة الزمنية `Asia/Amman`.

## 📋 تفاصيل الجداول

### جدول 1: profiles (ملفات المستخدمين)

**الهدف:** امتداد لجدول users الافتراضي في Supabase Auth

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key - يرتبط بـ auth.users |
| full_name | VARCHAR(100) | ✅ | - | الاسم الكامل |
| role | ENUM | ✅ | 'pos_staff' | الدور: 'admin' أو 'pos_staff' |
| phone | VARCHAR(20) | ❌ | null | رقم الهاتف |
| is_active | BOOLEAN | ✅ | true | هل الحساب نشط؟ |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |

**Keys:**
- PK: id
- FK: id → auth.users(id) ON DELETE CASCADE

**Indexes:**
- idx_profiles_role (role)
- idx_profiles_is_active (is_active)

**Constraints:**
- CHECK (role IN ('admin', 'pos_staff'))

**RLS:**
- Admin: SELECT, INSERT, UPDATE, DELETE
- POS: SELECT (نفس السجل فقط)

**ملاحظة PX-10:**
- `profiles.role` يبقى coarse role (`admin` / `pos_staff`) فقط.
- الصلاحيات الدقيقة المستقبلية لا تُنمذج بتوسيع هذا العمود، بل عبر جداول مستقلة (`permission_bundles`, `role_assignments`) مع بقاء authority الأساسية كما هي.

---

### جدول 2: products (المنتجات)

**الهدف:** تخزين بيانات المنتجات والخدمات

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| name | VARCHAR(200) | ✅ | - | اسم المنتج |
| category | ENUM | ✅ | - | النوع: 'device', 'accessory', 'sim', 'service_repair', 'service_general' |
| sku | VARCHAR(50) | ❌ | null | كود المنتج (اختياري) |
| description | TEXT | ❌ | null | وصف المنتج |
| sale_price | DECIMAL(12,3) | ✅ | - | سعر البيع |
| cost_price | DECIMAL(12,3) | ❌ | null | آخر تكلفة |
| avg_cost_price | DECIMAL(12,3) | ❌ | null | متوسط التكلفة |
| stock_quantity | INTEGER | ✅ | 0 | الكمية في المخزون |
| min_stock_level | INTEGER | ✅ | 5 | الحد الأدنى للتنبيه |
| track_stock | BOOLEAN | ✅ | true | هل يتم تتبع المخزون؟ |
| is_active | BOOLEAN | ✅ | true | هل المنتج نشط؟ |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |
| created_by | UUID | ✅ | - | من أنشأ المنتج |

**Keys:**
- PK: id
- FK: created_by → profiles(id)

**Indexes:**
- idx_products_name (name)
- idx_products_category (category)
- idx_products_is_active (is_active)
- idx_products_stock_quantity (stock_quantity)

**Constraints:**
- CHECK (category IN ('device', 'accessory', 'sim', 'service_repair', 'service_general'))
- CHECK (sale_price >= 0)
- CHECK (stock_quantity >= 0)
- CHECK (min_stock_level >= 0)
- UNIQUE (sku) WHERE sku IS NOT NULL

**ملاحظة تشغيلية:**
- منتجات `service_repair` تتبع قسم صيانة منفصل مالياً (حسابات `module_scope = 'maintenance'`).

**RLS:**
- Admin: SELECT, INSERT, UPDATE, DELETE
- POS: لا وصول مباشر للجدول
- قراءة POS تتم عبر `v_pos_products` فقط (بدون `cost_price` و `avg_cost_price`) — Blind POS

---

### جدول 3: invoices (الفواتير)

**الهدف:** تخزين رأس الفواتير

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| invoice_number | VARCHAR(20) | ✅ | auto | رقم الفاتورة بصيغة `AYA-YYYY-NNNNN` |
| invoice_date | DATE | ✅ | CURRENT_DATE | تاريخ الفاتورة |
| customer_name | VARCHAR(100) | ❌ | null | اسم العميل (عادي) |
| customer_phone | VARCHAR(20) | ❌ | null | هاتف العميل |
| subtotal | DECIMAL(12,3) | ✅ | 0 | المجموع قبل الخصم |
| discount_amount | DECIMAL(12,3) | ✅ | 0 | مبلغ الخصم |
| discount_by | UUID | ❌ | null | من نفذ الخصم |
| total_amount | DECIMAL(12,3) | ✅ | 0 | الإجمالي بعد الخصم |
| debt_amount | DECIMAL(12,3) | ✅ | 0 | المبلغ المضاف للدين |
| debt_customer_id | UUID | ❌ | null | رقم عميل الدين (إن وجد) |
| status | ENUM | ✅ | 'active' | الحالة: 'active', 'returned', 'partially_returned', 'cancelled' |
| cancel_reason | VARCHAR(255) | ❌ | null | سبب الإلغاء (إلزامي عند الإلغاء) |
| cancelled_by | UUID | ❌ | null | من ألغى الفاتورة (Admin فقط) |
| notes | TEXT | ❌ | null | ملاحظات |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |
| created_by | UUID | ✅ | - | من أنشأ الفاتورة |
| pos_terminal_code | VARCHAR(40) | ❌ | null | كود جهاز نقطة البيع (اختياري) |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار (ADR-033) |

**Keys:**
- PK: id
- FK: discount_by → profiles(id)
- FK: cancelled_by → profiles(id)
- FK: debt_customer_id → debt_customers(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_invoices_number (invoice_number) UNIQUE
- idx_invoices_date (invoice_date)
- idx_invoices_status (status)
- idx_invoices_created_by (created_by)
- idx_invoices_terminal (pos_terminal_code)

**Constraints:**
- CHECK (subtotal >= 0)
- CHECK (discount_amount >= 0)
- CHECK (discount_amount <= subtotal)
- CHECK (total_amount >= 0)
- CHECK (debt_amount >= 0)
- CHECK (debt_amount <= total_amount)
- CHECK (status IN ('active', 'returned', 'partially_returned', 'cancelled'))
- CHECK (pos_terminal_code IS NULL OR length(trim(pos_terminal_code)) > 0)
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL
- CHECK (total_amount = subtotal - discount_amount)

> **ملاحظة:** التوازن بين `payments` و `total_amount` يُفرض عبر RPC function وليس عبر CHECK constraint.

**ملاحظة تشغيلية:**
- حد الخصم التنبيهي الافتراضي 10% ويُدار من الإعدادات (تنبيه فقط، بدون منع تلقائي).
- `invoice_date` هو تاريخ التشغيل المعتمد للتقارير التاريخية.
- `created_at` يستخدم للتدقيق الزمني الفعلي.
- `pos_terminal_code` يُستخدم لتتبع المبيعات حسب جهاز POS عند التشغيل المتزامن.

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT (فواتيره فقط)
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 4: invoice_items (عناصر الفاتورة)

**الهدف:** تفاصيل منتجات كل فاتورة

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| invoice_id | UUID | ✅ | - | رقم الفاتورة |
| product_id | UUID | ✅ | - | رقم المنتج |
| product_name_at_time | VARCHAR(200) | ✅ | - | اسم المنتج وقت البيع (للتقارير التاريخية — لو تغيّر اسم المنتج لاحقاً) |
| quantity | INTEGER | ✅ | 1 | الكمية |
| unit_price | DECIMAL(12,3) | ✅ | - | السعر عند البيع |
| cost_price_at_time | DECIMAL(12,3) | ✅ | - | التكلفة عند البيع `COALESCE(cost_price, 0)` لحساب الربح (BP-02 Fix) |
| discount_percentage | DECIMAL(5,2) | ✅ | 0 | نسبة الخصم (%) |
| discount_amount | DECIMAL(12,3) | ✅ | 0 | مبلغ الخصم |
| total_price | DECIMAL(12,3) | ✅ | - | الإجمالي بعد الخصم |
| is_returned | BOOLEAN | ✅ | false | هل تم إرجاعه؟ |
| returned_quantity | INTEGER | ✅ | 0 | الكمية المُرجعة |

**Keys:**
- PK: id
- FK: invoice_id → invoices(id) ON DELETE CASCADE
- FK: product_id → products(id) ON DELETE RESTRICT

**Indexes:**
- idx_invoice_items_invoice_id (invoice_id)
- idx_invoice_items_product_id (product_id)

**Constraints:**
- CHECK (quantity > 0)
- CHECK (unit_price >= 0)
- CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
- CHECK (discount_amount >= 0)
- CHECK (returned_quantity <= quantity)
- CHECK (returned_quantity >= 0)

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 5: payments (الدفعات داخل الفاتورة)

**الهدف:** تفاصيل طرق الدفع لكل فاتورة

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| invoice_id | UUID | ✅ | - | رقم الفاتورة |
| account_id | UUID | ✅ | - | رقم الحساب |
| amount | DECIMAL(12,3) | ✅ | - | المبلغ |
| fee_amount | DECIMAL(12,3) | ✅ | 0 | عمولة الطريقة (مثل فيزا) |
| net_amount | DECIMAL(12,3) | ✅ | - | المبلغ بعد العمولة |

**Keys:**
- PK: id
- FK: invoice_id → invoices(id) ON DELETE CASCADE
- FK: account_id → accounts(id) ON DELETE RESTRICT

**Indexes:**
- idx_payments_invoice_id (invoice_id)
- idx_payments_account_id (account_id)

**Constraints:**
- CHECK (amount > 0)
- CHECK (fee_amount >= 0)
- CHECK (net_amount = amount - fee_amount)
- CHECK (fee_amount <= amount)

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 6: accounts (الحسابات المالية)

**الهدف:** تخزين الحسابات (صندوق، فيزا، محافظ)

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| name | VARCHAR(50) | ✅ | - | اسم الحساب |
| type | ENUM | ✅ | - | النوع: 'cash', 'visa', 'wallet', 'bank' |
| module_scope | ENUM | ✅ | 'core' | نطاق الحساب: 'core' أو 'maintenance' |
| fee_percentage | DECIMAL(5,2) | ✅ | 0 | نسبة العمولة (للفيزا) |
| opening_balance | DECIMAL(12,3) | ✅ | 0 | الرصيد الافتتاحي |
| current_balance | DECIMAL(12,3) | ✅ | 0 | الرصيد الحالي |
| is_active | BOOLEAN | ✅ | true | هل الحساب نشط؟ |
| display_order | INTEGER | ✅ | 0 | ترتيب العرض |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |

**Keys:**
- PK: id

**Indexes:**
- idx_accounts_type (type)
- idx_accounts_scope (module_scope)
- idx_accounts_is_active (is_active)
- idx_accounts_display_order (display_order)

**Constraints:**
- CHECK (type IN ('cash', 'visa', 'wallet', 'bank'))
- CHECK (module_scope IN ('core', 'maintenance'))
- CHECK (fee_percentage >= 0 AND fee_percentage <= 100)
- UNIQUE (name)

**RLS:**
- Admin: SELECT, INSERT, UPDATE, DELETE
- POS: لا وصول مباشر للجدول
- قراءة POS تتم عبر `v_pos_accounts` فقط (بدون `opening_balance` و `current_balance`) — Blind POS

**سياسة Source of Truth:**
- المصدر المحاسبي النهائي = `ledger_entries`
- `accounts.current_balance` قيمة Cache مُحدّثة داخل نفس الـ Transaction لتحسين الأداء
- عند أي فرق (`drift`)، المرجع المعتمد هو الرصيد المحسوب من `ledger_entries`

---

### جدول 7: ledger_entries (القيود المحاسبية)

**الهدف:** سجل جميع الحركات المالية (وارد/صادر)

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| entry_date | DATE | ✅ | CURRENT_DATE | تاريخ القيد (اليوم المحاسبي) |
| account_id | UUID | ✅ | - | رقم الحساب |
| entry_type | ENUM | ✅ | - | النوع: 'income', 'expense', 'adjustment' |
| amount | DECIMAL(12,3) | ✅ | - | المبلغ |
| adjustment_direction | ENUM | ❌ | null | اتجاه التسوية عند `adjustment`: 'increase' أو 'decrease' |
| reference_type | VARCHAR(50) | ❌ | null | نوع المرجع: 'invoice', 'return', 'debt_payment', 'topup', 'transfer', 'expense', 'reconciliation', 'purchase', 'manual_debt', 'supplier_payment', 'maintenance_job', 'reversal' |
| reference_id | UUID | ❌ | null | رقم المرجع |
| description | VARCHAR(255) | ✅ | - | الوصف |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء (اللحظة الدقيقة) |
| created_by | UUID | ✅ | - | من أنشأ القيد |

> **ملاحظة M-02:** `entry_date` (DATE) = `CURRENT_DATE` دائماً — **لا يُسمح بالـ Backdating مطلقاً**. أي تصحيح لخطأ سابق يتم عبر إدخال قيد تسوية (adjustment) بتاريخ اليوم الحالي مع مرجع نصي يشير للعملية الأصلية. `created_at` (TIMESTAMPTZ) يمثل لحظة الإدخال الفعلية.

**Keys:**
- PK: id
- FK: account_id → accounts(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_ledger_entries_date (entry_date)
- idx_ledger_entries_account (account_id)
- idx_ledger_entries_type (entry_type)
- idx_ledger_entries_reference (reference_type, reference_id)

**Constraints:**
- CHECK (entry_type IN ('income', 'expense', 'adjustment'))
- CHECK (amount > 0)
- CHECK (
    (entry_type = 'adjustment' AND adjustment_direction IN ('increase', 'decrease'))
    OR (entry_type <> 'adjustment' AND adjustment_direction IS NULL)
  )
- CHECK (reference_type IN ('invoice', 'return', 'debt_payment', 'topup', 'transfer', 'expense', 'reconciliation', 'purchase', 'manual_debt', 'supplier_payment', 'maintenance_job', 'reversal'))

**RLS:**
- Admin: SELECT, INSERT (عبر الدوال فقط)
- POS: لا وصول مباشر (أي عرض محاسبي يتم عبر API مفلتر حسب الدور)
- **لا يُسمح بـ UPDATE أو DELETE لأي مستخدم** (ADR-032: Append-Only Ledger)

---

### جدول 8: debt_customers (عملاء الدين)

**الهدف:** تخزين بيانات عملاء الدين

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| name | VARCHAR(100) | ✅ | - | اسم العميل |
| phone | VARCHAR(20) | ✅ | - | رقم الهاتف |
| national_id | VARCHAR(20) | ❌ | null | رقم هوية اختياري لعميل الدين (Admin only) |
| address | TEXT | ❌ | null | العنوان |
| credit_limit | DECIMAL(12,3) | ✅ | 10 | حد الدين التنبيهي |
| current_balance | DECIMAL(12,3) | ✅ | 0 | الرصيد الحالي |
| due_date_days | INTEGER | ✅ | 30 | أيام الاستحقاق |
| is_active | BOOLEAN | ✅ | true | هل العميل نشط؟ |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |
| created_by | UUID | ✅ | - | من أضاف العميل |

**Keys:**
- PK: id
- FK: created_by → profiles(id)

**Indexes:**
- idx_debt_customers_name (name)
- idx_debt_customers_phone (phone)
- idx_debt_customers_balance (current_balance)

**Constraints:**
- CHECK (credit_limit >= 0)
- CHECK (due_date_days > 0)
- UNIQUE (phone)

**ملاحظة تشغيلية:**
- تجاوز `credit_limit` لا يمنع العملية؛ يتم تسجيل التنبيه وإشعار أحمد فقط.

**RLS:**
- Admin: SELECT, INSERT, UPDATE, DELETE
- POS: لا وصول مباشر للجدول
- قراءة POS تتم عبر `v_pos_debt_customers` فقط (بدون `credit_limit` و`national_id`) — Blind POS

---

### جدول 9: debt_entries (قيود الديون)

**الهدف:** تفاصيل كل دين (من فاتورة أو يدوي)

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| debt_customer_id | UUID | ✅ | - | رقم العميل |
| entry_type | ENUM | ✅ | - | النوع: 'from_invoice', 'manual' |
| invoice_id | UUID | ❌ | null | رقم الفاتورة (إن وجد) |
| amount | DECIMAL(12,3) | ✅ | - | مبلغ الدين |
| due_date | DATE | ✅ | - | تاريخ الاستحقاق |
| description | VARCHAR(255) | ❌ | null | الوصف |
| is_paid | BOOLEAN | ✅ | false | هل تم السداد؟ |
| paid_amount | DECIMAL(12,3) | ✅ | 0 | المبلغ المسدد |
| remaining_amount | DECIMAL(12,3) | ✅ | - | المتبقي |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار لـ `create_debt_manual` (ADR-033) |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |
| created_by | UUID | ✅ | - | من أنشأ القيد |

**Keys:**
- PK: id
- FK: debt_customer_id → debt_customers(id) ON DELETE RESTRICT
- FK: invoice_id → invoices(id) ON DELETE SET NULL
- FK: created_by → profiles(id)

**Indexes:**
- idx_debt_entries_customer (debt_customer_id)
- idx_debt_entries_due_date (due_date)
- idx_debt_entries_is_paid (is_paid)

**Constraints:**
- CHECK (entry_type IN ('from_invoice', 'manual'))
- CHECK (amount > 0)
- CHECK (paid_amount >= 0)
- CHECK (remaining_amount = amount - paid_amount)
- CHECK (paid_amount <= amount)
- CHECK (`entry_type='manual'` => `idempotency_key IS NOT NULL`)
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 10: debt_payments (تسديدات الديون)

**الهدف:** تسجيل تسديدات عملاء الدين

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| debt_customer_id | UUID | ✅ | - | رقم العميل |
| amount | DECIMAL(12,3) | ✅ | - | مبلغ التسديد |
| account_id | UUID | ✅ | - | طريقة الدفع |
| payment_date | DATE | ✅ | CURRENT_DATE | تاريخ التسديد |
| receipt_number | VARCHAR(20) | ✅ | auto | رقم الإيصال بصيغة `AYA-YYYY-NNNNN` |
| notes | VARCHAR(255) | ❌ | null | ملاحظات |
| whatsapp_sent | BOOLEAN | ✅ | false | هل أُرسل واتساب؟ |
| receipt_url | VARCHAR(255) | ❌ | null | رابط الإيصال (V2) |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من سجل التسديد |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار (ADR-033) |

**Keys:**
- PK: id
- FK: debt_customer_id → debt_customers(id) ON DELETE RESTRICT
- FK: account_id → accounts(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_debt_payments_customer (debt_customer_id)
- idx_debt_payments_date (payment_date)
- idx_debt_payments_receipt (receipt_number) UNIQUE

**Constraints:**
- CHECK (amount > 0)
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 11: returns (المرتجعات)

**الهدف:** تسجيل عمليات المرتجع

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| return_number | VARCHAR(20) | ✅ | auto | رقم المرتجع بصيغة `AYA-YYYY-NNNNN` |
| original_invoice_id | UUID | ✅ | - | الفاتورة الأصلية |
| return_date | DATE | ✅ | CURRENT_DATE | تاريخ المرتجع |
| return_type | ENUM | ✅ | - | النوع: 'full', 'partial' |
| total_amount | DECIMAL(12,3) | ✅ | - | إجمالي المرتجع |
| refund_account_id | UUID | ❌ | null | حساب الإرجاع (إلزامي فقط إذا كان `cash_refund > 0`) |
| reason | VARCHAR(255) | ✅ | - | سبب الإرجاع |
| notes | TEXT | ❌ | null | ملاحظات |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من أنشأ المرتجع |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار (ADR-033) |

**Keys:**
- PK: id
- FK: original_invoice_id → invoices(id) ON DELETE RESTRICT
- FK: refund_account_id → accounts(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_returns_number (return_number) UNIQUE
- idx_returns_original_invoice (original_invoice_id)
- idx_returns_date (return_date)

**Constraints:**
- CHECK (return_type IN ('full', 'partial'))
- CHECK (total_amount > 0)
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL
- إذا كان المرتجع يولد `cash_refund > 0` فالحقل `refund_account_id` يصبح إلزامياً (يفرض داخل RPC)

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 12: return_items (عناصر المرتجع)

**الهدف:** تفاصيل منتجات المرتجع

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| return_id | UUID | ✅ | - | رقم المرتجع |
| invoice_item_id | UUID | ✅ | - | عنصر الفاتورة الأصلية |
| quantity | INTEGER | ✅ | - | الكمية المُرجعة |
| unit_price | DECIMAL(12,3) | ✅ | - | السعر الأصلي قبل الخصم (للتوثيق) |
| total_price | DECIMAL(12,3) | ✅ | - | الإجمالي المُسترجع بعد الخصم (الصافي) |

**Keys:**
- PK: id
- FK: return_id → returns(id) ON DELETE CASCADE
- FK: invoice_item_id → invoice_items(id) ON DELETE RESTRICT

**Indexes:**
- idx_return_items_return (return_id)

**Constraints:**
- CHECK (quantity > 0)
- CHECK (unit_price >= 0)

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 13: suppliers (الموردين)

**الهدف:** تخزين بيانات الموردين

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| name | VARCHAR(100) | ✅ | - | اسم المورد |
| phone | VARCHAR(20) | ❌ | null | رقم الهاتف |
| address | TEXT | ❌ | null | العنوان |
| current_balance | DECIMAL(12,3) | ✅ | 0 | رصيد المورد (دين علينا) |
| is_active | BOOLEAN | ✅ | true | هل المورد نشط؟ |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |

**Keys:**
- PK: id

**Indexes:**
- idx_suppliers_name (name)

**Constraints:**
- UNIQUE (name)
<!-- L-03 Fix: تمت إزالة قيد CHECK (current_balance >= 0) للسماح بتصحيح الأخطاء المحاسبية -->

**RLS (Suppliers RLS Contract):**
- Admin: لا `SELECT` مباشر من المتصفح على جدول `suppliers`؛ القراءة التشغيلية تتم عبر `admin_suppliers` View أو API
- POS: لا يملك SELECT مباشر على `suppliers` (منع مباشر عبر RLS/REVOKE)
- أي احتياج تشغيلي للـ POS يتم عبر API فقط وبحقول محدودة: `id`, `name`, `is_active` (بدون `current_balance`, `phone`, `address`)

---

### جدول 14: purchase_orders (أوامر الشراء)

**الهدف:** تسجيل عمليات الشراء

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| purchase_number | VARCHAR(20) | ✅ | auto | رقم أمر الشراء بصيغة `AYA-YYYY-NNNNN` |
| supplier_id | UUID | ❌ | null | رقم المورد |
| purchase_date | DATE | ✅ | CURRENT_DATE | تاريخ الشراء |
| total_amount | DECIMAL(12,3) | ✅ | - | إجمالي الشراء |
| is_paid | BOOLEAN | ✅ | true | هل تم الدفع؟ |
| payment_account_id | UUID | ❌ | null | حساب الدفع |
| notes | TEXT | ❌ | null | ملاحظات |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من أنشأ أمر الشراء |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار (ADR-033) — C-04 Fix |

**Keys:**
- PK: id
- FK: supplier_id → suppliers(id) ON DELETE SET NULL
- FK: payment_account_id → accounts(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_purchase_orders_number (purchase_number) UNIQUE
- idx_purchase_orders_supplier (supplier_id)
- idx_purchase_orders_date (purchase_date)

**Constraints:**
- CHECK (total_amount > 0)
- CHECK ((is_paid = true) OR (supplier_id IS NOT NULL)) -- المورد إلزامي إذا كان الشراء آجل
- CHECK (
    (is_paid = true AND payment_account_id IS NOT NULL)
    OR (is_paid = false AND payment_account_id IS NULL)
  )
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL

**RLS:**
- Admin: SELECT, INSERT, UPDATE, DELETE
- POS: SELECT

---

### جدول 15: purchase_items (عناصر الشراء)

**الهدف:** تفاصيل منتجات الشراء

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| purchase_id | UUID | ✅ | - | رقم أمر الشراء |
| product_id | UUID | ✅ | - | رقم المنتج |
| quantity | INTEGER | ✅ | - | الكمية |
| unit_cost | DECIMAL(12,3) | ✅ | - | تكلفة الوحدة |
| total_cost | DECIMAL(12,3) | ✅ | - | الإجمالي |

**Keys:**
- PK: id
- FK: purchase_id → purchase_orders(id) ON DELETE CASCADE
- FK: product_id → products(id) ON DELETE RESTRICT

**Indexes:**
- idx_purchase_items_purchase (purchase_id)

**Constraints:**
- CHECK (quantity > 0)
- CHECK (unit_cost >= 0)

**RLS:**
- Admin: SELECT, INSERT, UPDATE, DELETE
- POS: SELECT

---

### جدول إضافي: supplier_payments (تسديدات الموردين)

**الهدف:** تسجيل دفعات تسديد رصيد الموردين

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| payment_number | VARCHAR(20) | ✅ | auto | رقم الدفعة بصيغة `AYA-YYYY-NNNNN` |
| supplier_id | UUID | ✅ | - | رقم المورد |
| payment_date | DATE | ✅ | CURRENT_DATE | تاريخ التسديد |
| amount | DECIMAL(12,3) | ✅ | - | مبلغ التسديد |
| account_id | UUID | ✅ | - | الحساب الذي خرجت منه الدفعة |
| notes | VARCHAR(255) | ❌ | null | ملاحظات |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من سجل الدفعة |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار (ADR-033) |

**Keys:**
- PK: id
- FK: supplier_id → suppliers(id) ON DELETE RESTRICT
- FK: account_id → accounts(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_supplier_payments_number (payment_number) UNIQUE
- idx_supplier_payments_supplier (supplier_id)
- idx_supplier_payments_date (payment_date)

**Constraints:**
- CHECK (amount > 0)
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL

**RLS:**
- Admin: SELECT, INSERT, UPDATE, DELETE
- POS: SELECT

---

### جدول إضافي: maintenance_jobs (أوامر الصيانة)

**الهدف:** تسجيل ومتابعة طلبات الصيانة كقسم مستقل

> **ملاحظة (C-02):** الصيانة حالياً بتكلفة إجمالية واحدة (`final_amount`). لا يوجد جدول `maintenance_job_items` لتفصيل (أجور عمالة + قطع غيار) — **مؤجل لـ V2** (D-03 Future Task). التصميم الحالي كافٍ للـ MVP.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| job_number | VARCHAR(20) | ✅ | auto | رقم أمر الصيانة بصيغة `AYA-YYYY-NNNNN` |
| job_date | DATE | ✅ | CURRENT_DATE | تاريخ فتح الطلب |
| customer_name | VARCHAR(100) | ✅ | - | اسم العميل |
| customer_phone | VARCHAR(20) | ❌ | null | هاتف العميل |
| device_type | VARCHAR(100) | ✅ | - | نوع الجهاز |
| issue_description | TEXT | ✅ | - | وصف العطل |
| estimated_cost | DECIMAL(12,3) | ❌ | null | تكلفة تقديرية |
| final_amount | DECIMAL(12,3) | ✅ | 0 | قيمة الخدمة النهائية |
| payment_account_id | UUID | ❌ | null | حساب الدخل عند التسليم |
| status | ENUM | ✅ | 'new' | الحالة: 'new', 'in_progress', 'ready', 'delivered', 'cancelled' |
| notes | TEXT | ❌ | null | ملاحظات |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |
| created_by | UUID | ✅ | - | من أنشأ الطلب |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار (ADR-033) — C-02 Fix |

**Keys:**
- PK: id
- FK: payment_account_id → accounts(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_maintenance_jobs_number (job_number) UNIQUE
- idx_maintenance_jobs_date (job_date)
- idx_maintenance_jobs_status (status)
- idx_maintenance_jobs_phone (customer_phone)

**Constraints:**
- CHECK (final_amount >= 0)
- CHECK (estimated_cost IS NULL OR estimated_cost >= 0)
- CHECK (status IN ('new', 'in_progress', 'ready', 'delivered', 'cancelled'))
- CHECK (
    (status = 'delivered' AND final_amount > 0 AND payment_account_id IS NOT NULL) OR
    (status = 'delivered' AND final_amount = 0) OR
    (status != 'delivered' AND payment_account_id IS NULL)
  )
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 16: topups (الشحن)

**الهدف:** تسجيل عمليات الشحن

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| topup_number | VARCHAR(20) | ✅ | auto | رقم عملية الشحن بصيغة `AYA-YYYY-NNNNN` |
| topup_date | DATE | ✅ | CURRENT_DATE | تاريخ العملية |
| amount | DECIMAL(12,3) | ✅ | - | مبلغ الشحن |
| profit_amount | DECIMAL(12,3) | ✅ | - | الربح |
| account_id | UUID | ✅ | - | طريقة الدفع |
| supplier_id | UUID | ❌ | null | شركة الشحن (زين، أورنج...) — لتحليل أرباح كل شركة. **توضيح (C-03):** يشير لجدول `suppliers` لكنه يمثل شركات الاتصالات (ليس موردي المنتجات) |
| notes | VARCHAR(255) | ❌ | null | ملاحظات |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من سجل العملية |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار (ADR-033) |

**Keys:**
- PK: id
- FK: account_id → accounts(id) ON DELETE RESTRICT
- FK: supplier_id → suppliers(id) ON DELETE SET NULL
- FK: created_by → profiles(id)

**Indexes:**
- idx_topups_number (topup_number) UNIQUE
- idx_topups_date (topup_date)
- idx_topups_supplier (supplier_id)

**Constraints:**
- CHECK (amount > 0)
- CHECK (profit_amount >= 0)
- CHECK (profit_amount <= amount)
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 17: transfers (تحويلات موحّدة: internal / external)

**الهدف:** تسجيل التحويلات المالية الداخلية بين الحسابات، مع قابلية توسعة لتحويل خارجي مستقبلاً في نفس الجدول.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| transfer_number | VARCHAR(30) | ✅ | auto | رقم التحويل بصيغة `AYA-YYYY-NNNNN` |
| transfer_type | VARCHAR(20) | ✅ | `internal` | نوع التحويل: `internal` أو `external` |
| transfer_date | DATE | ✅ | CURRENT_DATE | تاريخ التحويل |
| amount | DECIMAL(12,3) | ✅ | - | المبلغ المحول |
| profit_amount | DECIMAL(12,3) | ✅ | 0 | ربح التحويل (إجباري = 0 في التحويل الداخلي) |
| from_account_id | UUID | ❌ | null | حساب المصدر (للتحويل الداخلي فقط) |
| to_account_id | UUID | ❌ | null | حساب الوجهة (للتحويل الداخلي فقط) |
| account_id | UUID | ❌ | null | حساب التحويل الخارجي (للنموذج external فقط) |
| customer_name | VARCHAR(100) | ❌ | null | اسم العميل (اختياري للتحويل الخارجي) |
| customer_phone | VARCHAR(20) | ❌ | null | هاتف العميل (اختياري للتحويل الخارجي) |
| notes | TEXT | ❌ | null | ملاحظات |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من سجل التحويل |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار (ADR-033) |

**Keys:**
- PK: id
- FK: from_account_id → accounts(id) ON DELETE RESTRICT
- FK: to_account_id → accounts(id) ON DELETE RESTRICT
- FK: account_id → accounts(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_transfers_date (transfer_date)
- idx_transfers_type (transfer_type)
- idx_transfers_from (from_account_id)
- idx_transfers_to (to_account_id)
- idx_transfers_account (account_id)

**Constraints:**
- CHECK (amount > 0)
- CHECK (profit_amount >= 0)
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL
- `ck_transfers_shape`:
  - `internal`: `from_account_id` + `to_account_id` إلزاميان، ومختلفان، و`account_id` = null، و`profit_amount = 0`
  - `external`: `account_id` إلزامي، و`from_account_id`/`to_account_id` = null

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: No direct access (API only)
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 18: expenses (المصروفات)

**الهدف:** تسجيل المصروفات العامة

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| expense_number | VARCHAR(20) | ✅ | server-generated | رقم المصروف بصيغة `AYA-YYYY-NNNNN` |
| expense_date | DATE | ✅ | CURRENT_DATE | تاريخ المصروف |
| account_id | UUID | ✅ | - | من أي حساب |
| category_id | UUID | ✅ | - | فئة المصروف (FK → expense_categories) |
| amount | DECIMAL(12,3) | ✅ | - | المبلغ |
| description | VARCHAR(500) | ✅ | - | الوصف |
| notes | TEXT | ❌ | null | ملاحظات تشغيلية اختيارية |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من سجل المصروف |
| idempotency_key | UUID | ❌ | null | مفتاح منع التكرار (ADR-033) |

**Keys:**
- PK: id
- FK: account_id → accounts(id) ON DELETE RESTRICT
- FK: category_id → expense_categories(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_expenses_number (expense_number) UNIQUE
- idx_expenses_date (expense_date)
- idx_expenses_account (account_id)
- idx_expenses_category (category_id)

**Constraints:**
- CHECK (amount > 0)
- UNIQUE (expense_number)
- UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: own only (`created_by = auth.uid()`)
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

**ملاحظات تشغيلية:**
- `expense_number` يُولّد من السيرفر فقط عبر `fn_generate_number('EXP')`.
- `create_expense()` تعمل عبر `service_role + p_created_by` مع `REVOKE ALL` عن `PUBLIC/authenticated/anon`.
- كل مصروف ينشئ:
  - سجلًا في `expenses`
  - قيد `ledger_entries` من نوع `expense`
  - سجل `audit_logs`

---

### جدول 19: inventory_counts (الجرد)

**الهدف:** تسجيل عمليات الجرد

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| count_date | DATE | ✅ | CURRENT_DATE | تاريخ الجرد |
| count_type | ENUM | ✅ | - | النوع: 'daily', 'weekly', 'monthly' |
| status | ENUM | ✅ | 'in_progress' | الحالة: 'in_progress', 'completed' |
| notes | TEXT | ❌ | null | ملاحظات |
| completed_at | TIMESTAMPTZ | ❌ | null | تاريخ الإكمال |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من بدأ الجرد |

**Keys:**
- PK: id
- FK: created_by → profiles(id)

**Indexes:**
- idx_inventory_counts_date (count_date)
- idx_inventory_counts_type (count_type)

**Constraints:**
- CHECK (count_type IN ('daily', 'weekly', 'monthly'))
- CHECK (status IN ('in_progress', 'completed'))

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 20: inventory_count_items (عناصر الجرد)

**الهدف:** تفاصيل عد كل منتج

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| inventory_count_id | UUID | ✅ | - | رقم الجرد |
| product_id | UUID | ✅ | - | رقم المنتج |
| system_quantity | INTEGER | ✅ | - | الكمية في النظام |
| actual_quantity | INTEGER | ✅ | - | الكمية الفعلية |
| difference | INTEGER | ✅ | - | الفرق |
| reason | VARCHAR(100) | ❌ | null | سبب الفرق |

**Keys:**
- PK: id
- FK: inventory_count_id → inventory_counts(id) ON DELETE CASCADE
- FK: product_id → products(id) ON DELETE RESTRICT

**Indexes:**
- idx_inventory_count_items_count (inventory_count_id)

**Constraints:**
- CHECK (actual_quantity >= 0)
- CHECK (difference = actual_quantity - system_quantity)

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 21: reconciliation_entries (تسويات الحسابات)

**الهدف:** تسجيل عمليات التسوية

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| reconciliation_date | DATE | ✅ | CURRENT_DATE | تاريخ التسوية |
| account_id | UUID | ✅ | - | رقم الحساب |
| expected_balance | DECIMAL(12,3) | ✅ | - | الرصيد المتوقع = `accounts.opening_balance + SUM(ledger_entries WHERE account_id)` |
| actual_balance | DECIMAL(12,3) | ✅ | - | الرصيد الفعلي (يدخله أحمد بالعد المادي) |
| difference | DECIMAL(12,3) | ✅ | - | الفرق |
| difference_reason | VARCHAR(255) | ✅ | - | سبب الفرق |
| is_resolved | BOOLEAN | ✅ | false | هل تم حل الفرق؟ |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من سجل التسوية |

**Keys:**
- PK: id
- FK: account_id → accounts(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_reconciliation_date (reconciliation_date)
- idx_reconciliation_account (account_id)

**Constraints:**
- CHECK (actual_balance >= 0)
- CHECK (difference = actual_balance - expected_balance)

**RLS (ADR-044):**
- قراءة مباشرة: Admin: SELECT all, POS: SELECT
- كتابة: عبر API Routes فقط (service_role) — راجع ADR-042

---

### جدول 27: debt_payment_allocations (توزيع التسديد على الديون)

**الهدف:** تحديد أي دين تحديداً سُدّد من كل دفعة تسديد — لدعم سياسة FIFO (الأقدم أولاً)

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| payment_id | UUID | ✅ | - | رقم دفعة التسديد |
| debt_entry_id | UUID | ✅ | - | رقم قيد الدين المسدّد |
| allocated_amount | DECIMAL(12,3) | ✅ | - | المبلغ الموزّع على هذا الدين |

**Keys:**
- PK: id
- FK: payment_id → debt_payments(id) ON DELETE CASCADE
- FK: debt_entry_id → debt_entries(id) ON DELETE RESTRICT

**Constraints:**
- CHECK (allocated_amount > 0)

**سياسة FIFO (موثقة في الافتراضات):**
- التسديد يُطبّق على الدين الأقدم (`MIN(due_date)`) حتى يصفر ثم التالي
- إذا أراد أحمد التحديد يدوياً: يمكن تحديد `debt_entry_id` من الواجهة (V1)

**RLS (ADR-044):**
- كتابة: عبر API Routes فقط (service_role)

---

### جدول 22: daily_snapshots (اللقطات اليومية)

**الهدف:** حفظ ملخص يومي **idempotent** لليوم الحالي بدون إقفال تشغيلي

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| snapshot_date | DATE | ✅ | CURRENT_DATE | تاريخ اللقطة |
| total_sales | DECIMAL(12,3) | ✅ | 0 | إجمالي المبيعات |
| total_returns | DECIMAL(12,3) | ✅ | 0 | إجمالي المرتجعات |
| net_sales | DECIMAL(12,3) | ✅ | 0 | صافي المبيعات |
| invoice_count | INTEGER | ✅ | 0 | عدد الفواتير |
| return_count | INTEGER | ✅ | 0 | عدد المرتجعات |
| total_debt_added | DECIMAL(12,3) | ✅ | 0 | إجمالي الدين المضاف خلال اليوم |
| total_debt_collected | DECIMAL(12,3) | ✅ | 0 | إجمالي الدين المحصل خلال اليوم |
| total_expenses | DECIMAL(12,3) | ✅ | 0 | إجمالي المصروفات |
| total_purchases | DECIMAL(12,3) | ✅ | 0 | إجمالي المشتريات (Outflow) |
| total_profit | DECIMAL(12,3) | ✅ | 0 | صافي الربح اليومي (محسوب بصيغة: `SUM((quantity - returned_quantity) × (unit_price × (1 - discount%) - cost_price_at_time)) - SUM(payments.fee_amount)`) |
| accounts_snapshot | JSONB | ❌ | null | أرصدة جميع الحسابات لحظة اللقطة: {cash: x, visa: y, wallet: z} |
| notes | TEXT | ❌ | null | ملاحظات |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من أنشأ اللقطة |

**Keys:**
- PK: id
- FK: created_by → profiles(id)

**Indexes:**
- idx_daily_snapshots_date (snapshot_date)
- idx_daily_snapshots_created_at (created_at)

**Constraints:**
- CHECK (snapshot_date = CURRENT_DATE)
- CHECK (total_sales >= 0)
- CHECK (total_returns >= 0)
- CHECK (net_sales = total_sales - total_returns)
- CHECK (total_expenses >= 0)
- CHECK (total_purchases >= 0)
- CHECK (total_profit IS NOT NULL)
- UNIQUE (snapshot_date) -- فرع واحد في MVP: لقطة واحدة لكل يوم
- Branching expansion requires ADR: if branch/tenant is introduced later, natural key must be redefined (e.g., `UNIQUE(snapshot_date, branch_id)`), and all related contracts/RLS updated together.

**ملاحظة:** `create_daily_snapshot()` idempotent على المفتاح الطبيعي (`snapshot_date`). عند تكرار الطلب في نفس اليوم تُعاد نفس اللقطة ولا يتم إنشاء سجل جديد.

**RLS Policy:**
- SELECT: Admin only (`auth.jwt() ->> 'role' = 'admin'`)
- INSERT/UPDATE/DELETE: Admin only

---

### جدول 23: audit_logs (سجل التدقيق)

**الهدف:** تسجيل جميع العمليات الحساسة

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| action_timestamp | TIMESTAMPTZ | ✅ | now() | وقت العملية |
| user_id | UUID | ❌ | null | رقم المستخدم |
| action_type | VARCHAR(50) | ✅ | - | نوع العملية |
| table_name | VARCHAR(50) | ✅ | - | اسم الجدول |
| record_id | UUID | ✅ | - | رقم السجل |
| old_values | JSONB | ❌ | null | القيم القديمة |
| new_values | JSONB | ❌ | null | القيم الجديدة |
| description | VARCHAR(255) | ✅ | - | وصف العملية |
| ip_address | VARCHAR(45) | ❌ | null | عنوان IP |
| user_agent | VARCHAR(255) | ❌ | null | بيانات المتصفح (لإثبات الجهاز) |
| session_id | UUID | ❌ | null | معرف الجلسة (Supabase session) |

**Keys:**
- PK: id
- FK: user_id → profiles(id) ON DELETE SET NULL

**Indexes:**
- idx_audit_logs_timestamp (action_timestamp)
- idx_audit_logs_user (user_id)
- idx_audit_logs_action (action_type)
- idx_audit_logs_table (table_name, record_id)

**RLS Policy:**
- SELECT: Admin only (`auth.jwt() ->> 'role' = 'admin'`)
- INSERT: عبر `SECURITY DEFINER` functions/triggers فقط — لا يمكن لأي مستخدم INSERT مباشرة (C-03 Fix)
- UPDATE/DELETE: ممنوع لجميع المستخدمين — append-only (راجع ADR-039)
  - `CREATE POLICY audit_logs_no_update ON audit_logs FOR UPDATE USING (false);`
  - `CREATE POLICY audit_logs_no_delete ON audit_logs FOR DELETE USING (false);`

---

### جدول 24: system_settings (إعدادات النظام)

**الهدف:** تخزين الإعدادات القابلة للتعديل (حد الخصم، حد الدين الافتراضي، إلخ)

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| key | VARCHAR(50) | ✅ | - | مفتاح الإعداد (فريد) |
| value | TEXT | ✅ | - | القيمة |
| value_type | ENUM | ✅ | 'string' | نوع القيمة: 'string', 'number', 'boolean' |
| description | VARCHAR(255) | ✅ | - | وصف الإعداد |
| updated_at | TIMESTAMPTZ | ✅ | now() | آخر تحديث |
| updated_by | UUID | ❌ | null | من عدّل الإعداد |

**Keys:**
- PK: id
- FK: updated_by → profiles(id)

**Indexes:**
- idx_system_settings_key (key) UNIQUE

**Constraints:**
- CHECK (value_type IN ('string', 'number', 'boolean'))

**RLS Policy:**
- SELECT: Admin only على الجدول المباشر
- POS: لا وصول مباشر لـ `system_settings` (أي إعداد مطلوب للـ POS يُمرر عبر API أو View آمن مخصص)
- INSERT/UPDATE/DELETE: Admin only (`auth.jwt() ->> 'role' = 'admin'`)

**القيم الافتراضية:**

| key | value | value_type | description |
|-----|-------|------------|-------------|
| `max_pos_discount_percentage` | `10` | number | الحد الأقصى لخصم موظف POS (%) — Admin مُستثنى |
| `discount_warning_threshold` | `10` | number | حد التنبيه (إشعار Admin عند خصم يقترب من الحد) |
| `allow_negative_stock` | `false` | boolean | السماح بالبيع عند نفاد المخزون |
| `prevent_sale_below_cost` | `true` | boolean | منع البيع بأقل من التكلفة (POS فقط — Admin مُستثنى) |
| `default_credit_limit` | `100` | number | سقف الدين الافتراضي للعميل الجديد (د.أ) |
| `default_due_date_days` | `30` | number | أيام الاستحقاق الافتراضية لفواتير الدين |
| `invoice_edit_window_hours` | `24` | number | ساعات السماح بتعديل الفاتورة بعد إصدارها |
| `pos_idle_timeout_minutes` | `240` | number | تسجيل خروج تلقائي بعد 4 ساعات عدم نشاط (Frontend) |
| `hide_cost_prices_pos` | `true` | boolean | إخفاء أسعار التكلفة والأرباح عن شاشة POS |
| `require_reason_min_chars` | `50` | number | الحد الأدنى لأحرف سبب الإلغاء/التعديل |
| `max_login_attempts` | `5` | number | عدد المحاولات قبل قفل الحساب مؤقتاً |
| `low_stock_threshold` | `2` | number | حد المخزون المنخفض (عدد القطع) |
| `store_name` | `آية موبايل` | string | اسم المتجر (ترويسة + إيصالات) |
| `store_phone` | `` | string | رقم المتجر |
| `currency_symbol` | `د.أ` | string | رمز العملة |
| `receipt_footer_text` | `` | string | نص أسفل الفاتورة (شروط الإرجاع) |

> **ملاحظة:** الـ Admin يتجاوز جميع القيود المفروضة على POS (متوافق مع ADR-016). كل تغيير إعداد يُسجل في `audit_logs`.

---

### جدول 25: notifications (الإشعارات الداخلية)

**الهدف:** تخزين الإشعارات الداخلية (تجاوز حد الدين، خصم كبير، فروقات التسوية، إلخ)

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| user_id | UUID | ✅ | - | لمن يُرسل الإشعار |
| type | VARCHAR(50) | ✅ | - | نوع الإشعار |
| title | VARCHAR(255) | ✅ | - | عنوان الإشعار |
| body | TEXT | ✅ | - | محتوى الإشعار |
| is_read | BOOLEAN | ✅ | false | هل تم قراءته؟ |
| read_at | TIMESTAMPTZ | ❌ | null | وقت تعليم الإشعار كمقروء |
| reference_type | VARCHAR(50) | ❌ | null | نوع المرجع |
| reference_id | UUID | ❌ | null | رقم المرجع |
| dedupe_key | TEXT | ❌ | null | مفتاح منع التكرار للإشعارات المجدولة |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |

**Keys:**
- PK: id
- FK: user_id → profiles(id) ON DELETE CASCADE

**Indexes:**
- idx_notifications_user (user_id)
- idx_notifications_read (user_id, is_read)
- idx_notifications_type (type)
- idx_notifications_created (created_at)
- uq_notifications_user_type_dedupe (user_id, type, dedupe_key) UNIQUE

**Constraints:**
- CHECK (type IN ('debt_limit_exceeded', 'large_discount', 'reconciliation_difference', 'low_stock', 'invoice_cancelled', 'daily_snapshot', 'debt_due_reminder', 'debt_overdue', 'maintenance_ready'))

**RLS:**
- Admin: SELECT all, UPDATE (mark as read)
- POS: SELECT (own only), UPDATE (own only, mark as read)

**أنواع الإشعارات:**

| النوع | الوصف | يُرسل لـ | إجراء واتساب |
|-------|-------|---------|--------------|
| `debt_limit_exceeded` | تجاوز حد دين عميل | Admin | ✅ زر واتساب |
| `large_discount` | خصم يتجاوز الحد التنبيهي | Admin | ❌ |
| `reconciliation_difference` | فرق في التسوية | Admin | ❌ |
| `low_stock` | مخزون منخفض | Admin | ❌ |
| `invoice_cancelled` | تم إلغاء فاتورة | Admin | ❌ |
| `daily_snapshot` | تم حفظ لقطة يومية | Admin | ❌ |
| `debt_due_reminder` | دين يستحق خلال 3 أيام | Admin | ✅ زر واتساب |
| `debt_overdue` | دين متأخر عن موعد استحقاقه | Admin | ✅ زر واتساب (ضروري) |
| `maintenance_ready` | الجهاز جاهز للتسليم (الصيانة) | Admin + POS | ✅ زر واتساب (إبلاغ العميل) |

---

### جدول V2-01: receipt_link_tokens (روابط الإيصالات العامة)

**الهدف:** إصدار روابط إيصالات عامة read-only بصلاحية محدودة وقابلة للإلغاء.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| invoice_id | UUID | ✅ | - | رقم الفاتورة المرتبط بالرابط |
| token_value | VARCHAR(120) | ✅ | generated | token opaque غير قابل للتخمين |
| channel | VARCHAR(20) | ✅ | `share` | قناة الإصدار: `share` أو `whatsapp` |
| expires_at | TIMESTAMPTZ | ✅ | - | وقت انتهاء صلاحية الرابط |
| revoked_at | TIMESTAMPTZ | ❌ | null | وقت الإلغاء |
| revoked_by | UUID | ❌ | null | من ألغى الرابط |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من أصدر الرابط |

**Keys:**
- PK: id
- FK: invoice_id → invoices(id) ON DELETE CASCADE
- FK: revoked_by → profiles(id)
- FK: created_by → profiles(id)

**Indexes:**
- idx_receipt_link_tokens_invoice (invoice_id, created_at DESC)
- idx_receipt_link_tokens_expires (expires_at)
- UNIQUE (token_value)

**Constraints:**
- CHECK (channel IN ('share', 'whatsapp'))
- CHECK (`revoked_at/revoked_by` يجب أن يكونا معًا null أو معًا non-null)

**Access Model:**
- لا direct table access من المتصفح.
- Admin/POS يصدران/يلغيان الروابط عبر API فقط.
- Public access يتم حصريًا عبر `/r/[token]` وبحقول receipt آمنة فقط.

---

### جدول V2-02: whatsapp_delivery_logs (سجل محاولات واتساب)

**الهدف:** تدقيق محاولات WhatsApp baseline (`wa.me`) دون تخزين raw phone أو ادعاء delivery confirmation خارجي.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| template_key | VARCHAR(50) | ✅ | - | اسم القالب المستخدم |
| target_phone_masked | VARCHAR(30) | ✅ | - | رقم الهاتف مقنّع فقط |
| delivery_mode | VARCHAR(20) | ✅ | `wa_me` | قناة الإرسال الحالية |
| status | VARCHAR(20) | ✅ | `queued` | حالة المحاولة: `queued`, `sent`, `failed` |
| provider_message_id | VARCHAR(100) | ❌ | null | معرف مزود خارجي مستقبلي إن وجد |
| reference_type | VARCHAR(50) | ✅ | - | نوع المرجع: `invoice`, `debt_entry`, `maintenance_job`, `debt_customer` |
| reference_id | UUID | ✅ | - | رقم المرجع |
| idempotency_key | UUID | ✅ | - | منع تكرار تسجيل نفس المحاولة |
| last_error | TEXT | ❌ | null | آخر خطأ معروف |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| created_by | UUID | ✅ | - | من أنشأ السجل |

**Keys:**
- PK: id
- FK: created_by → profiles(id)

**Indexes:**
- idx_whatsapp_delivery_logs_reference (reference_type, reference_id, created_at DESC)
- UNIQUE (idempotency_key)

**Constraints:**
- CHECK (delivery_mode IN ('wa_me'))
- CHECK (status IN ('queued', 'sent', 'failed'))
- CHECK (reference_type IN ('invoice', 'debt_entry', 'maintenance_job', 'debt_customer'))

**ملاحظات خصوصية:**
- لا يُخزن الرقم الخام نهائيًا داخل السجل.
- baseline الحالية لا تستخدم مزود WhatsApp خارجي؛ السجل يثبت intent/audit فقط.
- أي tracking فعلي لحالة التسليم من مزود خارجي يحتاج توسعة تعاقدية لاحقة.

---

### جدول V2-03: permission_bundles (حِزم الصلاحيات الدقيقة)

**الهدف:** تعريف قدرات تشغيلية دقيقة قابلة للتعيين للمستخدمين دون تغيير `profiles.role` الأساسي.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| key | VARCHAR(80) | ✅ | - | مفتاح الحزمة (`inventory_clerk`, `sales_supervisor`, ...) |
| label | VARCHAR(120) | ✅ | - | اسم العرض |
| description | TEXT | ❌ | null | وصف تشغيلي |
| base_role | ENUM(user_role) | ✅ | - | الدور الأساسي الذي يمكن أن يحمل هذه الحزمة |
| permissions | TEXT[] | ✅ | `{}` | قائمة permissions التشغيلية |
| max_discount_percentage | DECIMAL(5,2) | ❌ | null | سقف الخصم لهذه الحزمة إن وُجد |
| discount_requires_approval | BOOLEAN | ✅ | false | هل الخصم فوق baseline يحتاج اعتمادًا؟ |
| is_system | BOOLEAN | ✅ | true | هل هي حزمة نظامية محجوزة |
| is_active | BOOLEAN | ✅ | true | هل الحزمة مفعلة |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |

**Indexes:**
- UNIQUE (key)
- idx_permission_bundles_base_role (base_role, is_active)
- idx_permission_bundles_system (is_system)

**Constraints:**
- CHECK (array_length(permissions, 1) IS NULL OR array_length(permissions, 1) > 0)
- CHECK (max_discount_percentage IS NULL OR (max_discount_percentage >= 0 AND max_discount_percentage <= 100))

**Access Model:**
- لا direct write/read من Browser.
- الإدارة حصريًا عبر Admin API.
- الحزمة لا ترفع authority فوق `base_role` ولا تفتح grants أو RLS مستقلة.

---

### جدول V2-04: role_assignments (تعيين الحِزم للمستخدمين)

**الهدف:** إسناد `permission_bundles` للمستخدمين بشكل auditable مع دعم التعطيل/الإلغاء دون حذف تاريخي.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| user_id | UUID | ✅ | - | المستخدم المستهدف |
| bundle_id | UUID | ✅ | - | الحزمة المسندة |
| notes | TEXT | ❌ | null | سبب/ملاحظة التعيين |
| assigned_by | UUID | ✅ | - | من قام بالتعيين |
| assigned_at | TIMESTAMPTZ | ✅ | now() | وقت التعيين |
| revoked_at | TIMESTAMPTZ | ❌ | null | وقت الإلغاء |
| revoked_by | UUID | ❌ | null | من ألغى التعيين |
| is_active | BOOLEAN | ✅ | true | هل التعيين مفعل |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |

**Keys:**
- PK: id
- FK: user_id → profiles(id) ON DELETE CASCADE
- FK: bundle_id → permission_bundles(id) ON DELETE RESTRICT
- FK: assigned_by → profiles(id)
- FK: revoked_by → profiles(id)

**Indexes:**
- idx_role_assignments_user (user_id, is_active)
- idx_role_assignments_bundle (bundle_id, is_active)
- UNIQUE (user_id, bundle_id) WHERE is_active = true AND revoked_at IS NULL

**Constraints:**
- CHECK ((revoked_at IS NULL AND revoked_by IS NULL) OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL))

**Access Model:**
- Admin-only عبر API.
- لا direct write من Browser.
- أي revoke يعطّل التعيين دون حذف سجل التاريخ.

---

### جدول V2-05: export_packages (حزم التصدير المقيدة)

**الهدف:** إنشاء حزم export داخلية bounded + expirable + revocable بدل أي تنزيل مفتوح أو غير مدقق.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| package_type | VARCHAR(10) | ✅ | - | `json` أو `csv` |
| scope | VARCHAR(30) | ✅ | - | `products`, `reports`, `customers`, `backup` |
| status | VARCHAR(20) | ✅ | `ready` | `ready`, `revoked`, `expired` |
| filters | JSONB | ✅ | `{}` | الفلاتر المطبقة على الحزمة |
| file_name | VARCHAR(200) | ✅ | - | اسم الملف الناتج |
| row_count | INTEGER | ✅ | 0 | عدد السجلات المشمولة |
| content_json | JSONB | ❌ | null | المحتوى عند حزم JSON |
| content_text | TEXT | ❌ | null | المحتوى النصي عند CSV أو JSON serialized |
| expires_at | TIMESTAMPTZ | ✅ | - | وقت انتهاء صلاحية التنزيل |
| revoked_at | TIMESTAMPTZ | ❌ | null | وقت الإبطال |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |
| created_by | UUID | ✅ | - | من أنشأ الحزمة |

**Keys:**
- PK: id
- FK: created_by → profiles(id)

**Indexes:**
- idx_export_packages_scope_created (scope, created_at DESC)
- idx_export_packages_status_expires (status, expires_at)

**Constraints:**
- CHECK (package_type IN ('json', 'csv'))
- CHECK (scope IN ('products', 'reports', 'customers', 'backup'))
- CHECK (status IN ('ready', 'revoked', 'expired'))
- CHECK (row_count >= 0)
- CHECK (scope <> 'backup' OR package_type = 'json')

**Access Model:**
- Admin-only عبر API.
- لا direct read/write من Browser.
- التنزيل يتم فقط عبر route إدارية، والحزمة قابلة للإبطال والانتهاء.

---

### جدول V2-06: import_jobs (سجل الاستيراد مع dry-run / commit)

**الهدف:** الاحتفاظ بنتائج dry-run والاستيراد الفعلي ككيان auditable بدل استيراد مباشر غير قابل للتتبع.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| file_name | VARCHAR(200) | ✅ | - | اسم الملف المرفوع |
| source_format | VARCHAR(10) | ✅ | - | `json` أو `csv` |
| status | VARCHAR(30) | ✅ | - | `dry_run_ready`, `dry_run_failed`, `committed` |
| rows_total | INTEGER | ✅ | 0 | إجمالي الصفوف المقروءة |
| rows_valid | INTEGER | ✅ | 0 | الصفوف الصالحة للالتزام |
| rows_invalid | INTEGER | ✅ | 0 | الصفوف المرفوضة |
| rows_committed | INTEGER | ✅ | 0 | الصفوف التي أُضيفت فعليًا |
| validation_errors | JSONB | ✅ | `[]` | قائمة أخطاء الصفوف |
| source_rows | JSONB | ✅ | `[]` | الصفوف الصالحة الناتجة عن dry-run |
| committed_at | TIMESTAMPTZ | ❌ | null | وقت تنفيذ commit |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |
| created_by | UUID | ✅ | - | من أنشأ عملية الاستيراد |

**Keys:**
- PK: id
- FK: created_by → profiles(id)

**Indexes:**
- idx_import_jobs_status_created (status, created_at DESC)
- idx_import_jobs_created_by (created_by, created_at DESC)

**Constraints:**
- CHECK (source_format IN ('json', 'csv'))
- CHECK (status IN ('dry_run_ready', 'dry_run_failed', 'committed'))
- CHECK (rows_total >= 0 AND rows_valid >= 0 AND rows_invalid >= 0 AND rows_committed >= 0)

**Access Model:**
- Admin-only عبر API.
- لا direct read/write من Browser.
- commit مسموح فقط فوق dry-run صالحة وغير ملتزم بها سابقًا.

---

### جدول V2-07: restore_drills (تجارب الاستعادة المعزولة)

**الهدف:** تشغيل restore drill موثقة على بيئة معزولة فقط مع drift/RTO result بدل أي restore تشغيلية مباشرة.

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| export_package_id | UUID | ✅ | - | حزمة backup المصدر |
| target_env | VARCHAR(40) | ✅ | - | يجب أن تكون `isolated-drill` |
| status | VARCHAR(20) | ✅ | `started` | `started`, `completed`, `failed` |
| drift_count | INTEGER | ❌ | null | عدد حالات drift بعد drill |
| rto_seconds | INTEGER | ❌ | null | زمن الاستعادة المقاس بالثواني |
| result_summary | JSONB | ❌ | null | ملخص النتائج والdrifts |
| completed_at | TIMESTAMPTZ | ❌ | null | وقت الإكمال |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |
| updated_at | TIMESTAMPTZ | ✅ | now() | تاريخ التحديث |
| created_by | UUID | ✅ | - | من شغل drill |
| idempotency_key | UUID | ✅ | - | منع إعادة نفس drill |

**Keys:**
- PK: id
- FK: export_package_id → export_packages(id) ON DELETE RESTRICT
- FK: created_by → profiles(id)

**Indexes:**
- idx_restore_drills_created (created_at DESC)
- idx_restore_drills_package (export_package_id, created_at DESC)
- UNIQUE (idempotency_key)

**Constraints:**
- CHECK (target_env IN ('isolated-drill'))
- CHECK (status IN ('started', 'completed', 'failed'))

**Access Model:**
- Admin/Internal فقط عبر API.
- لا direct read/write من Browser.
- أي restore خارج `isolated-drill` مرفوض تعاقديًا.

---

### جدول 26: expense_categories (فئات المصروفات)

**الهدف:** تصنيف المصروفات (ثابتة/متغيرة) مع إمكانية الإضافة

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | ✅ | auto | Primary Key |
| name | VARCHAR(100) | ✅ | - | اسم الفئة |
| type | ENUM | ✅ | - | النوع: 'fixed', 'variable' |
| is_active | BOOLEAN | ✅ | true | هل الفئة نشطة؟ |
| sort_order | INTEGER | ✅ | 0 | ترتيب العرض |
| created_at | TIMESTAMPTZ | ✅ | now() | تاريخ الإنشاء |

**Keys:**
- PK: id

**Indexes:**
- idx_expense_categories_type (type)
- idx_expense_categories_name (name) UNIQUE

**Constraints:**
- CHECK (type IN ('fixed', 'variable'))

**RLS:**
- Admin: SELECT, INSERT, UPDATE, DELETE
- POS: SELECT (active only)

**القيم الافتراضية:**

| name | type |
|------|------|
| إيجار | fixed |
| رواتب | fixed |
| إنترنت | fixed |
| كهرباء | fixed |
| مواصلات | variable |
| صيانة محل | variable |
| مستلزمات | variable |
| أخرى | variable |

---

## 🔗 العلاقات بين الجداول (Relationships)

### علاقات 1:N (واحد لمتعدد)

| Parent | Child | Foreign Key |
|--------|-------|-------------|
| profiles | invoices | created_by |
| profiles | invoice_items | - (عبر invoices) |
| profiles | returns | created_by |
| profiles | debt_customers | created_by |
| profiles | debt_entries | created_by |
| profiles | debt_payments | created_by |
| profiles | purchase_orders | created_by |
| profiles | topups | created_by |
| profiles | transfers | created_by |
| profiles | expenses | created_by |
| profiles | inventory_counts | created_by |
| profiles | reconciliation_entries | created_by |
| profiles | daily_snapshots | created_by |
| profiles | supplier_payments | created_by |
| profiles | maintenance_jobs | created_by |
| profiles | audit_logs | user_id |
| profiles | notifications | user_id |
| profiles | system_settings | updated_by |
| profiles | invoices | cancelled_by |
| profiles | export_packages | created_by |
| profiles | import_jobs | created_by |
| profiles | restore_drills | created_by |

| products | invoice_items | product_id |
| products | return_items | - (عبر invoice_items) |
| products | purchase_items | product_id |
| products | inventory_count_items | product_id |

| invoices | invoice_items | invoice_id |
| invoices | payments | invoice_id |
| invoices | returns | original_invoice_id |
| invoices | debt_entries | invoice_id |

| invoice_items | return_items | invoice_item_id |

| accounts | payments | account_id |
| accounts | ledger_entries | account_id |
| accounts | debt_payments | account_id |
| accounts | returns | refund_account_id |
| accounts | purchase_orders | payment_account_id |
| accounts | supplier_payments | account_id |
| accounts | topups | account_id |
| accounts | transfers | from_account_id |
| accounts | transfers | to_account_id |
| accounts | transfers | account_id |
| accounts | expenses | account_id |
| accounts | reconciliation_entries | account_id |
| accounts | maintenance_jobs | payment_account_id |

| expense_categories | expenses | category_id |

| debt_customers | invoices | debt_customer_id |
| debt_customers | debt_entries | debt_customer_id |
| debt_customers | debt_payments | debt_customer_id |

| suppliers | purchase_orders | supplier_id |
| suppliers | supplier_payments | supplier_id |
| suppliers | topups | supplier_id |

| inventory_counts | inventory_count_items | inventory_count_id |

| returns | return_items | return_id |

| purchase_orders | purchase_items | purchase_id |
| export_packages | restore_drills | export_package_id |

---

## ⚡ العمليات الأساسية في قاعدة البيانات (DB Operations)

### عملية 1: CreateSale (إنشاء فاتورة بيع)

**ما تفعله:**
1. إنشاء سجل في `invoices`
   - يتضمن `invoice_date` و`pos_terminal_code` (إن تم إرساله من الواجهة)
2. إنشاء سجلات في `invoice_items` (مع تسجيل `cost_price_at_time`)
3. تحديث `stock_quantity` في `products` (تنقيص)
4. إنشاء سجلات في `payments`
5. إنشاء سجلات في `ledger_entries` (وارد لكل حساب)
6. إذا فيه دين: إنشاء سجل في `debt_entries`
7. إذا فيه خصم: تسجيل `discount_by`
8. تسجيل في `audit_logs`

**ما تتحقق منه:**
- توفر المخزون الكافي
- صحة المبالغ (المجموع = مجموع الدفعات + الدين)
- حد الدين (تنبيه فقط عند التجاوز)
- العملية كاملة داخل Transaction مع `SELECT FOR UPDATE` على صفوف المخزون

---

### عملية 1.1: GetSalesHistory (هيستوري المبيعات)

**ما تفعله:**
1. قراءة الفواتير من `invoices` حسب الفترة المطلوبة (`invoice_date` من/إلى)
2. تطبيق فلاتر اختيارية: `created_by`, `status`, `pos_terminal_code`
3. ربط البيانات مع `payments` و`invoice_items` للعرض التفصيلي
4. الترتيب الافتراضي: الأحدث أولاً (`invoice_date` DESC ثم `created_at` DESC)

**ما تتحقق منه:**
- الفلاتر ضمن القيم المسموحة
- صلاحيات الوصول (Admin: كل الفواتير، POS: فواتيره فقط)

---

### عملية 2: CreateReturn (إنشاء مرتجع)

**ما تفعله:**
1. إنشاء سجل في `returns`
2. إنشاء سجلات في `return_items`
3. تحديث `is_returned` و `returned_quantity` في `invoice_items`
4. تحديث `status` في `invoices`
5. إعادة `stock_quantity` في `products`
6. إنشاء سجل في `ledger_entries` (صادر للحساب المُرجع إليه)
7. إذا فيزا: حساب العمولة المستردة
8. تسجيل في `audit_logs`

**ما تتحقق منه:**
- الفاتورة الأصلية موجودة وغير مُلغاة
- الكمية المُرجعة لا تتجاوز المباعة

**قاعدة فواتير الدين (آلية وليست يدوية):**
- إذا الفاتورة مرتبطة بدين (`debt_amount > 0`)، يتم تطبيق قيمة المرتجع على **المتبقي غير المسدد أولاً**:
  - `debt_reduction = MIN(return_total, debt_entry.remaining_amount)`
  - تحديث `debt_entries.remaining_amount` و`paid_amount` و`is_paid` حسب الناتج
  - تحديث `debt_customers.current_balance -= debt_reduction`
- الجزء الزائد عن الدين غير المسدد:
  - `cash_refund = return_total - debt_reduction`
  - إذا `cash_refund > 0`: إنشاء `ledger_entry` صادر بهذا المبلغ من `refund_account_id`
  - إذا `cash_refund = 0`: لا يُنشأ قيد إرجاع نقدي
- إذا كان `cash_refund > 0` و`refund_account_id` غير موجود: `ERR_RETURN_REFUND_ACCOUNT_REQUIRED`

---

### عملية 3: CreateDebtManual (إنشاء دين يدوي)

**ما تفعله:**
1. إنشاء سجل في `debt_entries` (entry_type = 'manual')
2. تحديث `current_balance` في `debt_customers`
3. إذا كان هناك دفع جزئي مُقدّم من العميل وقت تسجيل الدين اليدوي: إنشاء سجل في `ledger_entries` (وارد للحساب المستلم) + سجل في `payments`
4. تسجيل في `audit_logs`

**ما تتحقق منه:**
- حد الدين (تنبيه فقط عند التجاوز)
- العميل نشط

---

### عملية 4: RecordDebtPayment (تسجيل تسديد دين)

**ما تفعله:**
1. إنشاء سجل في `debt_payments`
2. تحديث `paid_amount` و `remaining_amount` في `debt_entries`
3. تحديث `current_balance` في `debt_customers`
4. إنشاء سجل في `ledger_entries` (وارد)
5. تسجيل في `audit_logs`

**ما تتحقق منه:**
- المبلغ لا يتجاوز المتبقي
- الحساب نشط

---

### عملية 5: CreateTopUp (تسجيل شحن)

**ما تفعله:**
1. إنشاء سجل في `topups`
2. إنشاء سجلين في `ledger_entries`:
   - قيد **income** بقيمة `amount` (المبلغ المستلم من العميل)
   - قيد **expense** بقيمة `(amount - profit_amount)` (تكلفة الشحن الفعلية — الصافي = profit_amount)
3. تحديث `current_balance` في `accounts` بفرق القيدين (`net = profit_amount`)
4. تسجيل في `audit_logs`

> **مثال:** شحن 10 د.أ ربح 1 د.أ → income 10 + expense 9 → صافي الحساب +1 د.أ — تقارير الربح دقيقة

**ما تتحقق منه:**
- `profit_amount <= amount` (CHECK constraint)
- الحساب نشط

---

### عملية 6: CreateTransfer (تسجيل تحويل مالي)

**ما تفعله:**
1. إنشاء سجل في `transfers`
2. إنشاء سجلين في `ledger_entries` من نوع `adjustment`:
   - للمصدر: `adjustment_direction = 'decrease'`
   - للوجهة: `adjustment_direction = 'increase'`
3. تحديث `current_balance` في كلا `accounts` (خصم من المصدر، إضافة للوجهة)
4. تسجيل في `audit_logs`

**ملاحظة:** `transfers.profit_amount = 0` دائماً في المرحلة الحالية (تحويل داخلي بدون عمولة).

**ما تتحقق منه:**
- الحسابان `from_account_id != to_account_id`
- الحساب المصدر نشط

---

### عملية 7: CreatePurchase (إنشاء عملية شراء)

**ما تفعله:**
1. إنشاء سجل في `purchase_orders`
2. إنشاء سجلات في `purchase_items`
3. تحديث `stock_quantity` في `products` (زيادة)
4. تحديث `cost_price` و `avg_cost_price` في `products`
5. إذا نقدي (`is_paid = true`): إنشاء سجل في `ledger_entries` (صادر)
6. إذا على الحساب (`is_paid = false`): تحديث `current_balance` في `suppliers` **بدون إنشاء `ledger_entry` عند الإنشاء** (القيد المالي يُسجل عند `RecordSupplierPayment`)
7. تسجيل في `audit_logs`

**ما تتحقق منه:**
- المنتجات موجودة
- الحساب نشط (إن وجد)
- المورد إلزامي إذا كانت العملية شراء آجل

---

### عملية 8: CreateReconciliation (تسوية حساب)

**ما تفعله:**
1. حساب `expected_balance` من `ledger_entries`
2. إنشاء سجل في `reconciliation_entries`
3. إذا فيه فرق: إنشاء سجل في `ledger_entries` (تسوية)
4. تسجيل في `audit_logs`

**ما تتحقق منه:**
- الحساب نشط

---

### عملية 9: RecordSupplierPayment (تسجيل تسديد مورد)

**ما تفعله:**
1. إنشاء سجل في `supplier_payments`
2. تحديث `current_balance` في `suppliers` (تنقيص)
3. إنشاء سجل في `ledger_entries` (صادر)
4. تسجيل في `audit_logs`

**ما تتحقق منه:**
- المورد موجود ونشط
- المبلغ لا يتجاوز الرصيد المستحق (إن تم تفعيل هذا القيد)

---

### عملية 10: GenerateDailySnapshot (إنشاء لقطة يومية)

**ما تفعله:**
1. حساب إجمالي المبيعات والمرتجعات لليوم المطلوب
2. حساب عدد الفواتير والمرتجعات
3. حساب إجمالي الدين المضاف والمحصل
4. إنشاء سجل في `daily_snapshots`
5. تسجيل في `audit_logs`

**ما تتحقق منه:**
- التاريخ ضمن النطاق المسموح
- جميع العمليات محسوبة بمنطقة زمنية `Asia/Amman`

---

### عملية 11: CreateMaintenanceJob (إنشاء أمر صيانة)

**ما تفعله:**
1. إنشاء سجل في `maintenance_jobs`
2. تحديث حالة الطلب أثناء التنفيذ (`new` → `in_progress` → `ready` → `delivered`)
3. **عند تسليم الجهاز (status = 'delivered') وتحصيل المبلغ:** تحديث سجل الطلب بـ `payment_account_id`، وإنشاء قيد في `ledger_entries` بمرجع `reference_type = 'maintenance_job'` ونوع `income` بقيمة `final_amount`
4. استخدام حسابات `module_scope = 'maintenance'` فقط — مثال: "صندوق الصيانة"
5. تسجيل في `audit_logs`

**ملاحظة:** لا يوجد FK من `maintenance_jobs` إلى `payments` لأن دفع الصيانة يُسجل مباشرة كقيد `ledger_entry` على حساب الصيانة عند التسليم، بدون إنشاء فاتورة بيع.

**ما تتحقق منه:**
- البيانات الأساسية للجهاز والعميل مكتملة
- الحساب المستخدم (`payment_account_id`) ينتمي إلى نطاق الصيانة
- `payment_account_id` إلزامي إذا كان `final_amount > 0` عند التسليم

---

### عملية 12: CancelInvoice (إلغاء فاتورة)

**ما تفعله:**
1. تحديث `status` في `invoices` إلى `cancelled`
2. تسجيل `cancel_reason` و `cancelled_by`
3. إعادة `stock_quantity` في `products` للعناصر المباعة
4. إنشاء قيود عكسية في `ledger_entries` (عكس كل حركة أصلية)
5. إذا فيه دين: إلغاء `debt_entries` المرتبطة وتحديث `current_balance` في `debt_customers`
6. إنشاء إشعار في `notifications` (للـ Admin)
7. تسجيل في `audit_logs` (مع old_values و new_values)

**ما تتحقق منه:**
- المستخدم = Admin فقط
- الفاتورة ليست ملغاة مسبقاً
- السبب إلزامي
- لا يوجد مرتجع جزئي أو كامل مرتبط (يجب إلغاء المرتجع أولاً)

---

### عملية 13: EditInvoice (تعديل فاتورة مكتملة)

**ما تفعله:**
1. التحقق من أن الفاتورة ليست ملغاة وليس عليها مرتجع
2. تسجيل `edit_reason` (إلزامي)
3. **عكس العمليات القديمة:**
   - إنشاء قيود عكسية في `ledger_entries` لكل حركة أصلية
   - إعادة `stock_quantity` في `products` للقيم السابقة
   - إذا فيه دين: عكس `debt_entries` القديمة وتحديث `current_balance`
4. **تنفيذ العمليات الجديدة:**
   - تحديث `invoice_items` بالبيانات الجديدة
   - تحديث `payments` بالدفعات الجديدة
   - خصم `stock_quantity` من `products` بالكميات الجديدة
   - إنشاء `ledger_entries` جديدة
   - إذا فيه دين جديد: إنشاء `debt_entries` وتحديث `current_balance`
5. إنشاء إشعار في `notifications` لأحمد
6. تسجيل في `audit_logs` (مع `old_values` و `new_values`)

**ما تتحقق منه:**
- الفاتورة ليست ملغاة (`status != 'cancelled'`)
- لا يوجد مرتجع مرتبط
- السبب إلزامي (5 أحرف على الأقل)
- توفر المخزون الكافي للكميات الجديدة
- صحة المبالغ (المجموع = مجموع الدفعات + الدين)
- العملية كاملة داخل Transaction مع `SELECT FOR UPDATE` على صفوف المخزون

---

### عملية 14: CreatePartialReturn (مرتجع جزئي)

**ما تفعله:**
1. إنشاء سجل في `returns` (مع `return_type = 'partial'`)
2. إنشاء سجلات في `return_items` — فقط المنتجات المُرجعة وبالكميات المحددة
3. تحديث `returned_quantity` في `invoice_items` (زيادة بالكمية المُرجعة)
4. تحديث `is_returned` في `invoice_items` فقط إذا `returned_quantity = quantity`
5. تحديث `status` في `invoices`:
   - إذا لا يزال هناك عناصر غير مُرجعة كاملاً (`returned_quantity < quantity` لأي منتج) → `'partially_returned'`
   - إذا جميع العناصر أصبحت `returned_quantity = quantity` → `'returned'` (M-04 Fix)
6. إعادة الكميات المُرجعة إلى `stock_quantity` في `products`
7. إنشاء سجل في `ledger_entries` (صادر للحساب المُرجع إليه — بقيمة المرتجع الجزئي فقط)
8. إذا الدفع الأصلي فيزا: حساب العمولة المستردة نسبياً
9. تسجيل في `audit_logs`

**ما تتحقق منه:**
- الفاتورة الأصلية موجودة وغير مُلغاة
- الكمية المُرجعة لا تتجاوز (`quantity - returned_quantity`) لكل منتج
- يوجد منتج واحد على الأقل للإرجاع
- العملية كاملة داخل Transaction

**قاعدة الدين في المرتجع الجزئي:**
- نفس قاعدة `CreateReturn` تنطبق حرفياً:
  - تقليل `debt_entries.remaining_amount` أولاً حتى الصفر
  - أي مبلغ متبقٍ يُرد نقداً عبر `refund_account_id` مع قيد `ledger_entries` صادر
  - لا يوجد أي تدخل يدوي في التوزيع

---

### عملية 15: CompleteInventoryCount (إكمال جرد وتحديث المخزون)

**ما تفعله:**
1. التحقق من أن جلسة الجرد بحالة `in_progress`
2. تحديث `status` في `inventory_counts` إلى `completed` + `completed_at = now()`
3. لكل منتج له فرق (`actual_quantity != system_quantity`):
   - تحديث `products.stock_quantity = actual_quantity`
   - تحديث `inventory_count_items.difference = actual_quantity - system_quantity`
4. تسجيل في `audit_logs` (action_type = `complete_inventory_count`)
5. إذا وجد فرق في أي منتج: إنشاء إشعار في `notifications` للـ Admin

> **ملاحظة:** المخزون يُعدَّل بالكمية الفعلية وليس بالفرق — يضمن التطابق الكامل.

**ما تتحقق منه:**
- الجرد بحالة `in_progress` (مُدخَل بالفعل وغير مكتمل)
- جميع المنتجات في جلسة الجرد مُعالَجة (`actual_quantity >= 0`)
- العملية كاملة داخل Transaction مع `SELECT FOR UPDATE` على صفوف المنتجات

---

## 🔒 RLS Policies Summary (ADR-044: Revoke-All-First)


> **المبدأ الأمني (ADR-044):** يتم أولاً سحب جميع الصلاحيات (`REVOKE ALL ON ALL TABLES FROM authenticated, anon`)، ثم إعادة منح SELECT فقط عبر RLS. جميع عمليات الكتابة (INSERT/UPDATE/DELETE) تتم حصرياً عبر API Routes باستخدام `service_role` (ADR-042).

```sql
-- يُنفذ في أول Migration قبل أي سياسة RLS
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
```

| الجدول | Admin (عبر API/service_role) | POS (عبر API/service_role) | قراءة مباشرة (RLS) |
|--------|------------------------------|----------------------------|---------------------|
| profiles | CRUD | — | Admin: SELECT all, POS: SELECT (self) |
| products | CRUD | — | Admin: SELECT all, POS: SELECT via `v_pos_products` (active only, no cost columns) |
| invoices | CRUD | CREATE | Admin: SELECT all, POS: SELECT (own) |
| invoice_items | CRUD | CREATE | Admin: SELECT all, POS: SELECT |
| payments | CRUD | CREATE | Admin: SELECT all, POS: SELECT |
| accounts | CRUD | — | Admin: SELECT all, POS: SELECT via `v_pos_accounts` (without balances) |
| ledger_entries | — | — | Admin: SELECT, POS: No direct access (API only) — لا تعديل (ADR-032) |
| debt_customers | CRUD | — | Admin: SELECT all, POS: SELECT via `v_pos_debt_customers` (without `credit_limit` و `national_id`) |
| debt_entries | CRUD | — | Admin: SELECT all, POS: SELECT |
| debt_payments | CRUD | CREATE | Admin: SELECT all, POS: SELECT |
| returns | CRUD | CREATE | Admin: SELECT all, POS: SELECT |
| return_items | CRUD | CREATE | Admin: SELECT all, POS: SELECT |
| suppliers | CRUD | — | Admin/POS: No direct table read. Admin عبر `admin_suppliers` View أو API، وPOS عبر API محدود فقط |
| purchase_orders | CRUD | — | Admin: SELECT all, POS: No direct access (Admin/API only) |
| purchase_items | CRUD | — | Admin: SELECT all, POS: No direct access (Admin/API only) |
| supplier_payments | CRUD | — | Admin: SELECT all, POS: No direct access (Admin/API only) |
| maintenance_jobs | CRUD | CREATE, UPDATE status | Admin: SELECT all, POS: SELECT |
| topups | CRUD | CREATE | Admin: SELECT all, POS: No direct access (via API only) |
| transfers | CRUD | — | Admin: SELECT all, POS: No direct access (via API only) |
| expenses | CRUD | CREATE | Admin: SELECT all, POS: No direct access (via API only) |
| inventory_counts | CRUD | CREATE, UPDATE | Admin: SELECT all, POS: SELECT |
| inventory_count_items | CRUD | CREATE, UPDATE | Admin: SELECT all, POS: SELECT |
| reconciliation_entries | CRUD | CREATE | Admin: SELECT all, POS: No direct access (via API only) |
| daily_snapshots | CRUD | — | Admin: SELECT, POS: No access |
| audit_logs | — | — | Admin: SELECT, POS: No access (ADR-039) |
| system_settings | UPDATE | — | Admin: SELECT all, POS: No direct access |
| notifications | UPDATE | UPDATE (own) | Admin: SELECT all, POS: SELECT (own) |
| expense_categories | CRUD | — | Admin: SELECT all, POS: SELECT (active) |
| debt_payment_allocations | CRUD | — | Admin: SELECT (via debt payments) |

> **ملاحظة:** عمود "عبر API/service_role" يعني أن العملية تتم عبر Next.js API Route الذي يستدعي دالة RPC بصلاحية `service_role`. المتصفح لا يملك صلاحية INSERT/UPDATE/DELETE مباشرة على أي جدول.

> **Blind POS Enforcement:** إخفاء التكلفة/الأرصدة/حدود الائتمان يُفرض على مستوى البيانات عبر Views آمنة (`v_pos_products`, `v_pos_accounts`, `v_pos_debt_customers`) وليس على مستوى الواجهة فقط.

---

## ⚡ كتالوج Triggers الموصى بها

| # | الجدول | الحدث | الدالة | الغرض |
|---|--------|-------|--------|-------|
| T-01 | `products` | AFTER UPDATE ON `stock_quantity` | `fn_check_low_stock()` | إنشاء إشعار في `notifications` عند وصول المخزون لحد `low_stock_threshold` |
| T-02 | ~~`invoices`~~ | ~~AFTER INSERT~~ | ~~`fn_notify_backdate()`~~ | **مُلغى** — ADR-034 مُعدّل: `invoice_date = CURRENT_DATE` دائماً، لا حاجة لتنبيه |
| T-03 | `debt_entries` | AFTER INSERT | `fn_check_debt_limit()` | إذا `current_balance > credit_limit`: إنشاء إشعار تجاوز حد الدين |
| T-04 | `invoices` | AFTER UPDATE ON `status` | `fn_log_invoice_status()` | تسجيل تغيير حالة الفاتورة في `audit_logs` تلقائياً |
| T-05 | `maintenance_jobs` | AFTER UPDATE ON `status` | `fn_maintenance_delivered()` | عند `status = 'delivered'`: إنشاء `ledger_entry` بقيمة `final_amount` |
| T-06 | `profiles`, `accounts`, `notifications`, `debt_customers`, `debt_entries` | BEFORE UPDATE | `fn_update_timestamp()` | تحديث `updated_at` تلقائياً |
| T-07 | `products` | BEFORE UPDATE | `fn_update_timestamp()` | تحديث `updated_at` تلقائياً |
| T-08 | Scheduled Job (يومي — 8 صباحاً) | Vercel Cron أو Supabase Scheduled | `fn_detect_overdue_debts()` | يفحص `debt_entries WHERE is_paid = false AND due_date <= CURRENT_DATE + 3` — ينشئ إشعار `debt_due_reminder` أو `debt_overdue` لأحمد لكل دين مستحق أو قريب من الاستحقاق |
| T-09 | `invoices` | BEFORE UPDATE | `fn_update_timestamp()` | تحديث `updated_at` تلقائياً عند أي تعديل (إلغاء، تعديل، تغيير حالة) |
| T-10 | Scheduled Job (يومي — منتصف الليل) | Vercel Cron أو Supabase Scheduled | `fn_verify_balance_integrity()` | فحص أرصدة الحسابات مقابل القيود + التحقق من القيد المزدوج. إذا `is_valid=false` → إنشاء إشعار لأحمد |

**ملاحظة:** جميع الـ triggers الحرجة (T-01 إلى T-05) تعمل كـ `AFTER` لضمان اكتمال العملية الأصلية. T-06 وT-07 وT-09 تعمل كـ `BEFORE` لتحديث الطابع الزمني قبل الحفظ. T-08 وT-10 Scheduled Jobs خارجية تعمل بشكل مستقل.

---

## 📈 استراتيجية فهرسة الأداء (Composite Indexes)

بالإضافة للفهارس الفردية المذكورة في كل جدول، هذه الفهارس المركبة مطلوبة للاستعلامات الشائعة:

| نمط الاستعلام | الفهرس المقترح | الجدول |
|---------------|----------------|--------|
| تقرير المبيعات حسب التاريخ والحالة | `idx_invoices_date_status (invoice_date, status)` | invoices |
| استعلام فواتير موظف محدد | `idx_invoices_created_by_date (created_by, invoice_date)` | invoices |
| بحث المنتجات النشطة حسب الفئة | `idx_products_category_active (category, is_active) WHERE is_active = true` | products |
| سجل التدقيق حسب نوع العملية والتاريخ | `idx_audit_logs_action_date (action_type, action_timestamp)` | audit_logs |
| قيود دفتر الأستاذ حسب الحساب والتاريخ | `idx_ledger_account_date (account_id, entry_date)` | ledger_entries |
| ديون العميل النشطة | `idx_debt_entries_customer_status (debt_customer_id, is_paid)` | debt_entries |
| إشعارات غير مقروءة | `idx_notifications_user_unread (user_id, is_read) WHERE is_read = false` | notifications |

### فهارس مركبة إضافية (Composite Indexes)

```sql
CREATE INDEX idx_invoices_date_status ON invoices(invoice_date, status);
CREATE INDEX idx_ledger_date_account ON ledger_entries(entry_date, account_id);
CREATE INDEX idx_audit_logs_action_date ON audit_logs(action_type, action_timestamp);
CREATE INDEX idx_debt_due_paid ON debt_entries(due_date, is_paid);
CREATE INDEX idx_products_category_stock ON products(category, stock_quantity);
```

---

## 🔗 الملفات المرتبطة

- [02_Gaps_Risks_Recommendations.md](./02_Gaps_Risks_Recommendations.md) - الثغرات والتوصيات
- [06_Financial_Ledger.md](./06_Financial_Ledger.md) - النظام المالي بالتفصيل
- [07_Definitions_Glossary.md](./07_Definitions_Glossary.md) - المصطلحات

---

> **ملاحظة عامة حول RLS (M-04):** عمليات الكتابة (INSERT/UPDATE) في الجداول المالية (`ledger_entries`, `audit_logs`, `accounts.current_balance`) تتم **حصراً عبر RPC functions بصلاحية `SECURITY DEFINER`** — RLS المذكور في كل جدول يخص **الوصول المباشر** فقط. المستخدم POS يمكنه تنفيذ البيع (الذي يكتب في ledger_entries) لأن الكتابة تتم عبر RPC وليس مباشرة.

---

**الإصدار:** 3.6
**تاريخ التحديث:** 11 مارس 2026
**التغييرات:** v3.6 — إضافة جداول portability التشغيلية `export_packages`, `import_jobs`, `restore_drills` كعقد PX-12 مع bounded export, dry-run/commit, وrestore drill معزولة. v3.5 — إضافة جدولَي `permission_bundles` و`role_assignments` كعقد PX-10 للصلاحيات الدقيقة مع تثبيت أن `profiles.role` يبقى coarse role. v3.4 — إغلاق P0: إزالة retroactive_edit من `notifications` (LOCK-NoBackdate)، توحيد `suppliers` RLS (no POS direct SELECT)، إضافة `debt_entries.idempotency_key`، وتفعيل Natural-Key idempotency لـ `daily_snapshots` عبر `UNIQUE(snapshot_date)`.
