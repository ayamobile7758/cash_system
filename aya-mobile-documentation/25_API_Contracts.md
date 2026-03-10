# آية موبايل - عقود API
## 25) API Contracts (Request/Response/Error)

---

## الغرض

مرجع تنفيذي موحّد لعقود API قبل البناء، مطابق لـ:
- `13_Tech_Config.md` (API Routes Matrix)
- `15_Seed_Data_Functions.md` (Function Signatures)
- `16_Error_Codes.md` (ERR Catalog)

---

## قواعد عامة لكل المسارات

1. المصادقة عبر `Authorization: Bearer <JWT>`.
2. جميع Responses تتبع `StandardEnvelope`:
```json
{
  "success": true,
  "data": {}
}
```
أو:
```json
{
  "success": false,
  "error": {
    "code": "ERR_*",
    "message": "رسالة عربية",
    "details": {}
  }
}
```
3. مسارات الكتابة تستخدم `service_role` داخليًا فقط (ADR-042/044).
4. العمليات idempotent تستخدم إمّا `idempotency_key` صريحًا أو مفتاحًا طبيعيًا موثقًا (Natural Key).
5. أي قيمة سعرية حساسة من العميل تُتجاهل (ADR-043).

---

## مصفوفة المسارات

| Route | Method | Role | Idempotency |
|------|--------|------|-------------|
| `/api/sales` | POST | Admin, POS | Required |
| `/api/sales/history` | GET | Admin, POS | N/A |
| `/api/reports/export` | GET | Admin | N/A |
| `/api/returns` | POST | Admin, POS | Required |
| `/api/debts/manual` | POST | Admin | Required |
| `/api/payments/debt` | POST | Admin, POS | Required |
| `/api/topups` | POST | Admin, POS | Required |
| `/api/transfers` | POST | Admin | Required |
| `/api/purchases` | POST | Admin | Required |
| `/api/reconciliation` | POST | Admin | No |
| `/api/payments/supplier` | POST | Admin | Required |
| `/api/snapshots` | POST | Admin | Natural-Key (`snapshot_date = CURRENT_DATE`) |
| `/api/maintenance` | POST | Admin, POS | Required |
| `/api/invoices/cancel` | POST | Admin | No |
| `/api/invoices/edit` | POST | Admin | Required |
| `/api/inventory/counts/complete` | POST | Admin | No |
| `/api/settings` | POST | Admin | No |
| `/api/health` | GET | Public/Internal | N/A |

### Canonical Naming (Drift Authority)

| Layer | Canonical |
|------|-----------|
| RPC Function | `fn_verify_balance_integrity()` |
| Admin Route | `POST /api/health/balance-check` |
| Cron Route | `POST /api/cron/balance-check` |
| SOP | `SOP-24 فحص سلامة الأرصدة` |

**Aliases deprecated (ممنوعة):** `check_balance_drift()`, `verify_balance_integrity()`, `/api/cron/verify-integrity`.

### Idempotency Policy Table

| Command / Route | Policy | Authority |
|-----------------|--------|-----------|
| `create_debt_manual` / `POST /api/debts/manual` | Required | `debt_entries.idempotency_key` |
| `create_daily_snapshot` / `POST /api/snapshots` | Natural-Key | `UNIQUE(snapshot_date)` (MVP Single-Branch) |
| `reconcile_account` / `POST /api/reconciliation` | Forbidden | No idempotency_key |
| `cancel_invoice` / `POST /api/invoices/cancel` | Forbidden | No idempotency_key |

---

## عقود المسارات

### 1) `POST /api/sales`
**Body**
```json
{
  "items": [{ "product_id": "uuid", "quantity": 1, "discount_percentage": 0 }],
  "payments": [{ "account_id": "uuid", "amount": 0 }],
  "customer_id": "uuid",
  "pos_terminal_code": "POS-01",
  "notes": "text",
  "idempotency_key": "uuid"
}
```
**Success `200`**
```json
{ "success": true, "data": { "invoice_id": "uuid", "invoice_number": "AYA-2026-00001", "total": 0, "change": 0 } }
```
**Errors**
`ERR_PRODUCT_NOT_FOUND`, `ERR_STOCK_INSUFFICIENT`, `ERR_DISCOUNT_EXCEEDED`, `ERR_PAYMENT_MISMATCH`, `ERR_IDEMPOTENCY`, `ERR_CONCURRENT_STOCK_UPDATE`, `ERR_API_VALIDATION_FAILED`, `ERR_API_ROLE_FORBIDDEN`.

### 2) `GET /api/sales/history`
**Query**
`from_date`, `to_date`, `created_by?`, `status?`, `pos_terminal_code?`, `page?`, `page_size?`

**Success `200`**
```json
{
  "success": true,
  "data": {
    "data": [{ "invoice_id": "uuid", "invoice_number": "AYA-2026-00001", "invoice_date": "2026-03-01", "total": 0, "status": "active" }],
    "total_count": 1,
    "page": 1,
    "page_size": 20
  }
}
```
**Errors**
`ERR_API_SESSION_INVALID`, `ERR_API_ROLE_FORBIDDEN`, `ERR_API_INTERNAL`.

### 3) `GET /api/reports/export`
**Query**
`from_date`, `to_date`, `created_by?`, `status?`, `pos_terminal_code?`, `page?`, `page_size?`

**Success `200`**
- `Content-Type = application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition = attachment; filename="aya-reports-YYYY-MM-DD_to_YYYY-MM-DD.xlsx"`
- الملف يحتوي أوراقًا للتقارير الأساسية والمحسنة (`Summary`, `Profit`, `Sales History`, `Returns`, `Account Movements`, `Accounts`, `Debt Customers`, `Inventory`, `Maintenance`, `Snapshots`).

**Errors**
`ERR_API_SESSION_INVALID`, `ERR_API_ROLE_FORBIDDEN`, `ERR_API_INTERNAL`.

### 4) `POST /api/returns`
**Body**
```json
{
  "invoice_id": "uuid",
  "items": [{ "invoice_item_id": "uuid", "quantity": 1 }],
  "refund_account_id": "uuid",
  "return_type": "full",
  "reason": "text",
  "idempotency_key": "uuid"
}
```
**Success `200`**
```json
{ "success": true, "data": { "return_id": "uuid", "return_number": "AYA-2026-00010", "refunded_amount": 0 } }
```
**Errors**
`ERR_INVOICE_NOT_FOUND`, `ERR_INVOICE_CANCELLED`, `ERR_ITEM_NOT_FOUND`, `ERR_RETURN_QUANTITY`, `ERR_CANCEL_ALREADY`, `ERR_IDEMPOTENCY`, `ERR_RETURN_REFUND_ACCOUNT_REQUIRED`, `ERR_UNAUTHORIZED`.

### 5) `POST /api/debts/manual`
**Body**
```json
{
  "debt_customer_id": "uuid",
  "amount": 0,
  "description": "text",
  "idempotency_key": "uuid"
}
```
**Success `200`**
```json
{ "success": true, "data": { "debt_entry_id": "uuid" } }
```
**Errors**
`ERR_IDEMPOTENCY`, `ERR_VALIDATION_NEGATIVE_AMOUNT`, `ERR_CUSTOMER_NOT_FOUND`, `ERR_UNAUTHORIZED`.

### 6) `POST /api/payments/debt`
**Body**
```json
{
  "debt_customer_id": "uuid",
  "amount": 0,
  "account_id": "uuid",
  "notes": "text",
  "idempotency_key": "uuid",
  "debt_entry_id": "uuid"
}
```
**Success `200`**
```json
{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "receipt_number": "AYA-2026-00020",
    "remaining_balance": 0,
    "allocations": [{ "debt_entry_id": "uuid", "allocated_amount": 0 }]
  }
}
```
**Errors**
`ERR_DEBT_OVERPAY`, `ERR_DEBT_ENTRY_NOT_FOUND`, `ERR_IDEMPOTENCY`, `ERR_VALIDATION_NEGATIVE_AMOUNT`, `ERR_CUSTOMER_NOT_FOUND`, `ERR_UNAUTHORIZED`.

### 7) `POST /api/topups`
**Body**
```json
{
  "account_id": "uuid",
  "amount": 0,
  "profit_amount": 0,
  "supplier_id": "uuid",
  "notes": "text",
  "idempotency_key": "uuid"
}
```
**Success `200`**
```json
{ "success": true, "data": { "topup_id": "uuid", "topup_number": "AYA-2026-00030", "ledger_entry_ids": ["uuid", "uuid"] } }
```
**Errors**
`ERR_IDEMPOTENCY`, `ERR_VALIDATION_NEGATIVE_AMOUNT`, `ERR_API_VALIDATION_FAILED`.

### 8) `POST /api/transfers`
**Body**
```json
{
  "from_account_id": "uuid",
  "to_account_id": "uuid",
  "amount": 0,
  "notes": "text",
  "idempotency_key": "uuid"
}
```
**Success `200`**
```json
{ "success": true, "data": { "transfer_id": "uuid", "transfer_number": "AYA-2026-00040", "ledger_entry_ids": ["uuid", "uuid"] } }
```
**Errors**
`ERR_TRANSFER_SAME_ACCOUNT`, `ERR_INSUFFICIENT_BALANCE`, `ERR_IDEMPOTENCY`, `ERR_VALIDATION_NEGATIVE_AMOUNT`.

### 9) `POST /api/purchases`
**Body**
```json
{
  "supplier_id": "uuid",
  "items": [{ "product_id": "uuid", "quantity": 1, "unit_cost": 0 }],
  "is_paid": true,
  "payment_account_id": "uuid",
  "notes": "text",
  "idempotency_key": "uuid"
}
```
**Success `200`**
```json
{ "success": true, "data": { "purchase_order_id": "uuid", "purchase_number": "AYA-2026-00050", "total": 0 } }
```
**Errors**
`ERR_IDEMPOTENCY`, `ERR_VALIDATION_REQUIRED_FIELD`, `ERR_UNAUTHORIZED`.

### 10) `POST /api/reconciliation`
**Body**
```json
{ "account_id": "uuid", "actual_balance": 0, "notes": "text" }
```
**Success `200`**
```json
{ "success": true, "data": { "reconciliation_id": "uuid", "expected": 0, "actual": 0, "difference": 0 } }
```
**Errors**
`ERR_ACCOUNT_NOT_FOUND`, `ERR_RECONCILIATION_UNRESOLVED`, `ERR_UNAUTHORIZED`.

### 11) `POST /api/payments/supplier`
**Body**
```json
{
  "supplier_id": "uuid",
  "account_id": "uuid",
  "amount": 0,
  "notes": "text",
  "idempotency_key": "uuid"
}
```
**Success `200`**
```json
{ "success": true, "data": { "payment_id": "uuid", "payment_number": "AYA-2026-00060", "remaining_balance": 0 } }
```
**Errors**
`ERR_SUPPLIER_NOT_FOUND`, `ERR_SUPPLIER_OVERPAY`, `ERR_IDEMPOTENCY`, `ERR_VALIDATION_NEGATIVE_AMOUNT`, `ERR_UNAUTHORIZED`.

### 12) `POST /api/snapshots`
**Body**
```json
{ "notes": "text" }
```
**Success `200`**
```json
{
  "success": true,
  "data": {
    "snapshot_id": "uuid",
    "total_sales": 0,
    "net_sales": 0,
    "invoice_count": 0,
    "is_replay": false
  }
}
```
**Errors**
`ERR_VALIDATION_SNAPSHOT_DATE`, `ERR_UNAUTHORIZED`, `ERR_DB_TRANSACTION_FAILED`.

### 13) `POST /api/maintenance`
**Body**
```json
{
  "customer_name": "text",
  "customer_phone": "text",
  "device_type": "text",
  "issue_description": "text",
  "estimated_cost": 0,
  "notes": "text",
  "idempotency_key": "uuid"
}
```
**Success `200`**
```json
{ "success": true, "data": { "job_id": "uuid", "job_number": "AYA-2026-00070", "status": "new" } }
```
**Errors**
`ERR_IDEMPOTENCY`, `ERR_VALIDATION_REQUIRED_FIELD`, `ERR_API_VALIDATION_FAILED`.

### 14) `POST /api/invoices/cancel`
**Body**
```json
{ "invoice_id": "uuid", "cancel_reason": "text" }
```
**Success `200`**
```json
{ "success": true, "data": { "success": true, "reversed_entries_count": 0 } }
```
**Errors**
`ERR_CANCEL_ALREADY`, `ERR_CANCEL_HAS_RETURN`, `ERR_CANCEL_REASON`, `ERR_CANNOT_CANCEL_PAID_DEBT`, `ERR_UNAUTHORIZED`.

### 15) `POST /api/invoices/edit`
**Body**
```json
{
  "invoice_id": "uuid",
  "items": [{ "product_id": "uuid", "quantity": 1, "discount_percentage": 0 }],
  "payments": [{ "account_id": "uuid", "amount": 0 }],
  "customer_id": "uuid",
  "edit_reason": "text",
  "idempotency_key": "uuid"
}
```
**Success `200`**
```json
{ "success": true, "data": { "invoice_id": "uuid", "invoice_number": "AYA-2026-00080", "total": 0 } }
```
**Errors**
`ERR_CANCEL_ALREADY`, `ERR_CANCEL_HAS_RETURN`, `ERR_CANCEL_REASON`, `ERR_STOCK_INSUFFICIENT`, `ERR_PAYMENT_MISMATCH`, `ERR_UNAUTHORIZED`.

### 16) `POST /api/inventory/counts/complete`
**Body**
```json
{
  "inventory_count_id": "uuid",
  "items": [{ "inventory_count_item_id": "uuid", "actual_quantity": 0, "reason": "text" }]
}
```
**Success `200`**
```json
{ "success": true, "data": { "count_id": "uuid", "adjusted_products": 0, "total_difference": 0 } }
```
**Errors**
`ERR_COUNT_NOT_FOUND`, `ERR_COUNT_ALREADY_COMPLETED`, `ERR_VALIDATION_NEGATIVE_QUANTITY`, `ERR_UNAUTHORIZED`.

### 17) `POST /api/settings`
**Body**
```json
{
  "updates": [{ "key": "max_pos_discount_percentage", "value": "10" }]
}
```
**Success `200`**
```json
{ "success": true, "data": { "success": true, "updated_keys": 1 } }
```
**Errors**
`ERR_UNAUTHORIZED`, `ERR_SETTING_NOT_FOUND`, `ERR_VALIDATION_INCORRECT_TYPE`, `ERR_VALIDATION_OUT_OF_RANGE`.

### 18) `GET /api/health`
**Success `200`**
```json
{ "status": "ok", "timestamp": "2026-03-01T10:00:00Z" }
```
**Degraded `503`**
```json
{ "status": "degraded", "timestamp": "2026-03-01T10:00:00Z" }
```

### 19) `POST /api/health/balance-check`

**الصلاحية:** Admin فقط
**الدالة:** `fn_verify_balance_integrity()`

**Request Body**
```json
{}
```
*لا يحتاج مدخلات — يفحص جميع الحسابات تلقائياً.*

**Success `200` (ok)**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "accounts": [
      { "account_id": "uuid", "account_name": "الصندوق", "expected": 12500, "actual": 12500, "diff": 0 }
    ],
    "checked_at": "2026-03-05T10:30:00Z"
  }
}
```

**Success `200` (drift)**
```json
{
  "success": true,
  "data": {
    "status": "drift",
    "drifts": [
      { "account_id": "uuid", "account_name": "الصندوق", "expected": 12500, "actual": 12350, "diff": -150 }
    ],
    "checked_at": "2026-03-05T10:30:00Z"
  }
}
```

**Errors**
`ERR_API_ROLE_FORBIDDEN`, `ERR_API_INTERNAL`

---

## ملاحظات تنفيذية مهمة

1. في `create_sale` و`edit_invoice`: أي `unit_price` مرسل من العميل يجب تجاهله.
2. في `create_return`: `refund_account_id` اختياري مشروط فقط عند `cash_refund > 0`.
3. في أخطاء `409` الناتجة عن idempotency: يُعاد نفس ناتج العملية السابقة ولا تُنشأ عملية جديدة.
4. في `ERR_CONCURRENT_STOCK_UPDATE`: إعادة المحاولة يجب أن تكون بمفتاح `idempotency_key` جديد.
5. أي محاولة تعديل/حذف مباشر لسجلات Append-Only (`ledger_entries`, `audit_logs`, `daily_snapshots`) يجب أن تُعاد كـ `ERR_APPEND_ONLY_VIOLATION`.

---

**الإصدار:** 1.3  
**تاريخ التحديث:** 5 مارس 2026  
**التغييرات:** v1.3 — إضافة تغطية `ERR_RECONCILIATION_UNRESOLVED` و`ERR_CANNOT_CANCEL_PAID_DEBT` و`ERR_APPEND_ONLY_VIOLATION` في العقود. v1.2 — توحيد Drift Authority (`fn_verify_balance_integrity`) + توثيق Idempotency Policy (`create_debt_manual` required, `create_daily_snapshot` natural-key). v1.1 — إضافة عقد `POST /api/health/balance-check`.
