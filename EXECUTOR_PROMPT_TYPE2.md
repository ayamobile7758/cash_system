# Aya Mobile — Type 2 Structural & Functional Fixes

## Role and Constraints

You are an expert full-stack engineer executing precisely scoped structural fixes on **Aya Mobile**, an Arabic RTL retail store management system built with **Next.js 14 App Router**, **Supabase (PostgreSQL + RLS)**, **Zustand 5**, and **Zod**. The UI language is Arabic and the layout direction is RTL.

### Rules

1. **Do not break existing functionality.** Every feature that works today must work identically after your changes.
2. **Do not change the visual design language** — keep existing CSS classes, spacing, colors, border-radius, shadows. You may add new classes following existing BEM conventions.
3. **Do not add new npm dependencies.** Use only what is already installed.
4. **Do not remove existing UI elements** unless the spec explicitly says to.
5. **Preserve all existing Arabic copy tone.** New Arabic strings must match the formal-but-concise style.
6. **Test every change** — TypeScript must compile (`tsc --noEmit`), all existing tests must pass (`vitest run`).
7. **Database migrations** must be additive — never DROP or ALTER existing columns/functions destructively. Use `CREATE OR REPLACE` for functions. New migrations go in `supabase/migrations/` with the next sequential number.
8. **Read every file referenced below before modifying it.** Understand the existing patterns before adding code.

---

## System Context

| Concept | Location |
|---|---|
| Dashboard layout (server) | `app/(dashboard)/layout.tsx` |
| Dashboard shell (client) | `components/dashboard/dashboard-shell.tsx` |
| Workspace access gate | `app/(dashboard)/access.ts` — `getWorkspaceAccess()` returns `userId`, `role`, `permissions`, `maxDiscountPercentage`, etc. |
| Permission system | `lib/permissions.ts` — `hasPermission()`, `WorkspaceRole`, `PermissionKey` |
| POS workspace | `components/pos/pos-workspace.tsx` |
| POS cart store | `stores/pos-cart.ts` — Zustand with localStorage persistence |
| POS types | `lib/pos/types.ts` — `PosCartItem`, `SaleResponseData`, `StandardEnvelope` |
| Sale validation | `lib/validations/sales.ts` — `createSaleSchema` (already has optional `customer_id`) |
| Sale API | `app/api/sales/route.ts` — calls RPC `create_sale(p_debt_customer_id)` |
| Sale RPC | `supabase/migrations/004_functions_triggers.sql` line 131 — handles debt calculation when `p_debt_customer_id` is provided |
| Debts workspace | `components/dashboard/debts-workspace.tsx` — customer list, payment, manual debt |
| Debt types | `lib/api/dashboard.ts` — `DebtCustomerOption`, `DebtEntryOption` |
| Invoices workspace | `components/dashboard/invoices-workspace.tsx` |
| Invoice types | `lib/api/dashboard.ts` — `InvoiceOption`, `InvoiceItemOption` |
| Operations workspace | `components/dashboard/operations-workspace.tsx` — topups + transfers |
| Topup validation | `lib/validations/operations.ts` — `createTopupSchema` |
| Topup API | `app/api/topups/route.ts` — calls RPC `create_topup` |
| Topup RPC | `supabase/migrations/004_functions_triggers.sql` line 1072 — creates topup + ledger entries, NO invoice |
| Search API | `app/api/search/global/route.ts` — calls `searchGlobal()` |
| Search library | `lib/api/search.ts` — `searchGlobal()`, `getAlertsSummary()`, `getGlobalSearchPageBaseline()` |
| Search validation | `lib/validations/search.ts` — `globalSearchQuerySchema` |
| Expenses workspace | `components/dashboard/expenses-workspace.tsx` |
| Settings workspace | `components/dashboard/settings-ops.tsx` |
| Products browser | `components/pos/products-browser.tsx` |
| Products page | `app/(dashboard)/products/page.tsx` |
| Global CSS | `app/globals.css` (3325 lines) |
| Formatters | `lib/utils/formatters.ts` — `formatCurrency()`, `formatCompactNumber()`, `formatDate()` |
| DB migrations | `supabase/migrations/001_foundation.sql` through `017_*.sql` |

---

## Fix 1 — Customer Selection & Debt Path in POS

### Problem

The POS checkout has no customer selection field. The `createSaleSchema` already supports optional `customer_id` (line 21 in `lib/validations/sales.ts`). The `create_sale` RPC already accepts `p_debt_customer_id` and computes debt amount automatically (lines 292-312 in `004_functions_triggers.sql`). The API route already passes `payload.customer_id` as `p_debt_customer_id` (line 64 in `app/api/sales/route.ts`). **The entire backend is ready — only the POS UI is missing.**

When `p_debt_customer_id` is provided, the RPC:
- Sums all payment amounts (`v_pay_total`)
- If `v_pay_total < v_total_amount` → `v_debt_amount = v_total_amount - v_pay_total` (debt recorded)
- If `v_pay_total >= v_total_amount` → `v_change = v_pay_total - v_total_amount` (change returned)
- Creates a `debt_entry` with `entry_type = 'from_invoice'` and updates `debt_customer.current_balance`

### What to Do

#### A. Create a customer search hook

Create `hooks/use-customer-search.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type CustomerSearchResult = {
  id: string;
  name: string;
  phone: string | null;
  current_balance: number;
};

export function useCustomerSearch(query: string) {
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const supabase = createSupabaseBrowserClient();
    const pattern = `%${trimmed}%`;

    supabase
      .from("debt_customers")
      .select("id, name, phone, current_balance")
      .eq("is_active", true)
      .or(`name.ilike.${pattern},phone.ilike.${pattern}`)
      .order("name", { ascending: true })
      .limit(8)
      .then(({ data, error }) => {
        if (cancelled) return;
        setResults(error ? [] : (data ?? []) as CustomerSearchResult[]);
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [query]);

  return { results, isLoading };
}
```

#### B. Add customer selection to the POS cart store

In `stores/pos-cart.ts`:

1. Add `selectedCustomerId: string | null` and `selectedCustomerName: string | null` to the store interface.
2. Add `setSelectedCustomer: (id: string | null, name: string | null) => void` and `clearSelectedCustomer: () => void`.
3. Initialize both to `null` in `createDefaultState()`.
4. Reset both in `clearCart()` and `completeSale()`.
5. Add both to `partialize` for persistence.

#### C. Add customer selection UI in POS workspace

In `components/pos/pos-workspace.tsx`, in the checkout fields area (inside `transaction-checkout-fields`, after the payment account selector):

1. Add a customer search input with autocomplete dropdown.
2. When a customer is selected, show their name and current balance.
3. Add a "بدون عميل" (clear) button to deselect.
4. The field is **always optional** — cashier can complete a sale without selecting a customer.

#### D. Include `customer_id` in the sale payload AND enable partial payment for debt

In `submitSale()` (line 164 in `pos-workspace.tsx`), add `customer_id` and **change the payment amount logic**:

```typescript
customer_id: selectedCustomerId || undefined,
```

**Critical — payment amount for debt path**: The `create_sale` RPC calculates debt as `v_total_amount - v_pay_total`. If the payment amount always equals the total, debt will always be 0 — the feature won't work. You MUST change the payment amount calculation:

```typescript
payments: [
  {
    account_id: selectedAccountId,
    amount: (() => {
      // When a customer is selected and cashier received less than the total,
      // send the actual received amount — the RPC computes debt automatically.
      if (selectedCustomerId && amountReceived != null && amountReceived < finalTotal) {
        return Number(amountReceived.toFixed(3));
      }
      // Otherwise send the full total (no debt path).
      return Number(finalTotal.toFixed(3));
    })()
  }
],
```

Where `finalTotal` is the total after invoice-level discount (from Fix 11). If Fix 11 is not yet applied when you implement Fix 1, use `total` instead of `finalTotal`.

Also add a **validation guard** before submitting: if NO customer is selected AND `amountReceived` is set AND `amountReceived < total`, show an error:

```typescript
if (!selectedCustomerId && amountReceived != null && amountReceived < total) {
  const message = "المبلغ المستلم أقل من الإجمالي. اختر عميلًا لتسجيل الباقي كدين أو عدّل المبلغ.";
  setSubmissionErrorMessage(message);
  toast.error(message);
  return;
}
```

#### E. Show debt info after successful sale

When `lastCompletedSale` is shown in the success overlay, if `selectedCustomerId` was set, add a line showing "مبلغ الدين" if the server returned a debt amount. Check if `SaleResponseData` includes debt info — if not, the current overlay is sufficient. Do NOT modify `SaleResponseData` type.

---

## Fix 2 — Topups Generate Invoices

### Problem

The `create_topup` RPC creates:
- A row in `topups` table
- Two `ledger_entries` (income for full amount, expense for cost)
- Updates `accounts.current_balance`

It does **NOT** create an `invoices` row. Topups are customer-facing sales (selling phone credit) but are invisible in the invoicing system, sales reports, and receipt generation.

**Important — current function location**: The `create_topup` function was originally defined in `004_functions_triggers.sql` (line 1072) but was **replaced** by `supabase/migrations/010_topup_transfer_actor_alignment.sql`. The current version already:
- Accepts `p_created_by UUID DEFAULT NULL` as the last parameter
- Uses `fn_require_actor(p_created_by)` instead of `auth.uid()`
- Has signature: `(UUID, DECIMAL, DECIMAL, UUID, TEXT, UUID, UUID)`

**Read `010_topup_transfer_actor_alignment.sql` first** — that is the actual current function you must base your migration on.

### What to Do

#### A. Create a new database migration

Create `supabase/migrations/018_topup_invoice.sql`:

This migration must `CREATE OR REPLACE FUNCTION create_topup(...)` with the **same signature** as the current function in `010_topup_transfer_actor_alignment.sql` but with additional logic to create an invoice row and an invoice item.

The updated function must:

1. Keep ALL existing logic (topup record, ledger entries, account balance update, audit log).
2. **After** creating the topup record and **before** returning, insert an invoice AND an invoice item:

```sql
-- Generate invoice number
v_invoice_number := fn_generate_number('INV');
v_invoice_id := gen_random_uuid();

INSERT INTO invoices (
  id, invoice_number, subtotal, discount_amount, total_amount,
  debt_amount, status, pos_terminal_code, notes,
  idempotency_key, created_by
) VALUES (
  v_invoice_id, v_invoice_number, p_amount, 0, p_amount,
  0, 'active', NULL,
  'فاتورة شحن — ' || v_topup_num,
  p_idempotency_key, v_user_id
);

-- Insert a single invoice item so the invoice detail page is not empty
INSERT INTO invoice_items (
  id, invoice_id, product_id, product_name,
  quantity, unit_price, discount_percentage, line_total
) VALUES (
  gen_random_uuid(), v_invoice_id, NULL, 'شحن رصيد',
  1, p_amount, 0, p_amount
);
```

**Note**: `product_id` is NULL because topups are not linked to a product. Verify that `invoice_items.product_id` allows NULL — check the column definition in `002_operations.sql`. If it has a NOT NULL constraint, you must add a migration to ALTER it to allow NULL, OR create a dedicated "شحن رصيد" product record and use its ID.

3. Add the invoice_id to the return JSON:

```sql
RETURN jsonb_build_object(
  'topup_id', v_topup_id,
  'topup_number', v_topup_num,
  'invoice_id', v_invoice_id,
  'invoice_number', v_invoice_number,
  'ledger_entry_ids', jsonb_build_array(v_ledger_income, v_ledger_cost)
);
```

4. Declare the new variables: `v_invoice_id UUID`, `v_invoice_number VARCHAR`.

#### B. Update the API response type

In `components/dashboard/operations-workspace.tsx`, update the `TopupResponse` type (line 28):

```typescript
type TopupResponse = {
  topup_id: string;
  topup_number: string;
  invoice_id?: string;
  invoice_number?: string;
  ledger_entry_ids: string[];
};
```

Also update the matching type in `app/api/topups/route.ts` (line 7) to include the new fields.

#### C. Update the API route response

In `app/api/topups/route.ts`, add the new fields to the response JSON (line 44):

```typescript
data: {
  topup_id: data.topup_id,
  topup_number: data.topup_number,
  invoice_id: data.invoice_id,
  invoice_number: data.invoice_number,
  ledger_entry_ids: data.ledger_entry_ids
}
```

#### D. Update the success UI

In `operations-workspace.tsx`, update the topup result card (lines 381-387):

```tsx
{topupResult ? (
  <div className="result-card">
    <h3>تم تسجيل الشحن</h3>
    <p>رقم العملية: {topupResult.topup_number}</p>
    {topupResult.invoice_number ? (
      <p>رقم الفاتورة: {topupResult.invoice_number}</p>
    ) : null}
    <p>عدد القيود: {topupResult.ledger_entry_ids.length}</p>
  </div>
) : null}
```

#### E. Update the toast message

Change line 159:
```typescript
toast.success(`تم تسجيل الشحن ${envelope.data.topup_number} بنجاح — فاتورة ${envelope.data.invoice_number ?? ""}.`);
```

---

## Fix 3 — Dedicated Search Page

### Problem

The search bar in `dashboard-shell.tsx` (`handleSearchSubmit`, line 123) routes to `/notifications?q=...`. The notifications page doubles as a search results page. There's already a full search infrastructure: `lib/api/search.ts` contains `searchGlobal()`, `getGlobalSearchPageBaseline()`, and `getAlertsSummary()`. The API route `app/api/search/global/route.ts` works. The search schema supports entities: `product`, `invoice`, `debt_customer`, `maintenance_job`.

### What to Do

#### A. Create the search page

Create `app/(dashboard)/search/page.tsx` as a **server component**:

1. Call `getWorkspaceAccess()` to get permissions.
2. Read search params (`q`, `entity`, `limit`).
3. Call `getGlobalSearchPageBaseline()` with the viewer context and search params.
4. Render a `SearchWorkspace` client component with the baseline data.

#### B. Create the search workspace component

Create `components/dashboard/search-workspace.tsx`:

1. Display search results grouped by entity (using the `groups` array from baseline).
2. Show entity filter chips: "الكل", "المنتجات", "الفواتير", "الديون", "الصيانة" — filtered by `allowedEntities`.
3. Each result item links to its detail page:
   - `product` → `/products` (or show inline)
   - `invoice` → `/invoices` (with the invoice ID as a filter parameter)
   - `debt_customer` → `/debts` (with customer preselected)
   - `maintenance_job` → `/maintenance`
4. Show "لا توجد نتائج" when items are empty and query is present.
5. Show the error message from baseline if present.
6. Follow the existing workspace layout pattern (PageHeader + SectionCard).

#### C. Update the dashboard shell search routing

In `components/dashboard/dashboard-shell.tsx`, modify `handleSearchSubmit` (line 123):

**Replace** the URL construction:

```typescript
// OLD:
router.push(`/notifications?${params.toString()}`);

// NEW:
const params = new URLSearchParams({ q: trimmed });
router.push(`/search?${params.toString()}`);
```

Change the empty-search fallback at line 127:

```typescript
// OLD:
router.push("/notifications");

// NEW:
router.push("/search");
```

**Do NOT** remove the notifications navigation item or page. Notifications keeps its own purpose.

#### D. Add navigation item

In `app/(dashboard)/layout.tsx`, the navigation array already has "الإشعارات" at `/notifications`. **Do NOT add search to the sidebar** — search is accessed via the topbar search icon, not as a navigation item.

---

## Fix 4 — Admin Home Dashboard

### Problem

`app/(dashboard)/page.tsx` does not exist. When an admin navigates to the dashboard root, there's no landing page with daily KPIs, alerts, or recent activity.

### What to Do

#### A. Create the dashboard page

**Important**: `app/page.tsx` already serves the `/` path (login page). Next.js route groups like `(dashboard)` do NOT change the URL. So you must NOT create `app/(dashboard)/page.tsx` — it would conflict with `app/page.tsx`. Instead, create the dashboard at `/home`.

Create `app/(dashboard)/home/page.tsx` as a **server component**:

1. Call `getWorkspaceAccess()`.
2. If `pos_staff` → `redirect("/pos")` (import from `next/navigation`).
3. If `admin`:
   - Call `getAlertsSummary()` from `lib/api/search.ts` — it already returns `low_stock`, `overdue_debts`, `reconciliation_drift`, `maintenance_ready`, `unread_notifications`.
   - Query today's sales summary: count and total from `invoices` table where `invoice_date = CURRENT_DATE`.
   - Query recent 5 invoices.
   - Pass all data to a `DashboardHome` client component.

#### B. Create the dashboard home component

Create `components/dashboard/dashboard-home.tsx`:

1. **Alert cards row**: Show alert counts from `AlertsSummary` — each card clickable (links to relevant page):
   - مخزون منخفض → `/inventory`
   - ديون متأخرة → `/debts`
   - انحراف أرصدة → `/settings` (reconciliation)
   - صيانة جاهزة → `/maintenance`
   - إشعارات غير مقروءة → `/notifications`
2. **Today's summary cards**: Sales count, total revenue (use `formatCurrency`/`formatCompactNumber`).
3. **Recent invoices table**: Last 5 invoices with number, date, total, status.
4. Use existing CSS patterns: `PageHeader`, `SectionCard`, `data-table`, `transaction-page__meta-card`.

#### C. Add navigation item and icon

The navigation array in `app/(dashboard)/layout.tsx` does NOT include a home/dashboard item. Add one at the **start** of the array:

```typescript
{
  href: "/home",
  label: "لوحة المتابعة",
  description: "نظرة يومية على المبيعات والتنبيهات والأداء.",
  icon: "home",
  group: "management",
  adminOnly: true
}
```

In `components/dashboard/dashboard-shell.tsx`, add `"home"` to the `ICONS` map (`Home` is already imported at line 13):

```typescript
home: Home,
```

---

## Fix 5 — Hold / Park Cart

### Problem

There's no way to save a cart in progress and start a new sale. If a customer steps away, the cashier must either complete or discard the current cart.

### What to Do

#### A. Add held carts to the store

In `stores/pos-cart.ts`:

1. Define a type:

```typescript
type HeldCart = {
  id: string;
  label: string;
  items: PosCartItem[];
  selectedAccountId: string | null;
  selectedCustomerId: string | null;
  selectedCustomerName: string | null;
  amountReceived: number | null;
  notes: string;
  heldAt: string; // ISO timestamp
};
```

2. Add to the store interface:
   - `heldCarts: HeldCart[]`
   - `holdCurrentCart: (label: string) => void`
   - `restoreHeldCart: (cartId: string) => void`
   - `discardHeldCart: (cartId: string) => void`

3. Initialize `heldCarts: []` in `createDefaultState()`.

4. Implement `holdCurrentCart`:
   - If `items.length === 0`, do nothing.
   - Create a `HeldCart` snapshot with current items, account, customer, notes, and `new Date().toISOString()`.
   - Push to `heldCarts` array.
   - Clear current cart (items, notes, amountReceived) — same as `clearCart()` behavior but also generates new idempotency key.
   - Maximum 5 held carts. If at limit, reject with no action (the UI should disable the button).

5. Implement `restoreHeldCart`:
   - Find cart by ID, restore items/account/customer/notes to current state.
   - Remove from `heldCarts` array.
   - Generate new idempotency key.

6. Implement `discardHeldCart`:
   - Remove from `heldCarts` by ID.

7. Add `heldCarts` to `partialize` for persistence.

8. **Do NOT reset `heldCarts` in `clearCart()` or `completeSale()`.** Only `resetStore()` clears them.

#### B. Add hold/restore UI in POS workspace

In the cart panel header area (near the "تفريغ السلة" button):

1. Add a "تعليق" button that opens a simple prompt (or inline input) for a label, then calls `holdCurrentCart`.
2. Add a "المعلقات" indicator showing count of held carts (badge). When clicked, show a dropdown/list of held carts with:
   - Label
   - Item count
   - Held time (relative — use `formatDate` or a simple "منذ X دقيقة")
   - "استعادة" button → `restoreHeldCart`
   - "حذف" button → `discardHeldCart`
3. Disable "تعليق" if cart is empty or `heldCarts.length >= 5`.

---

## Fix 6 — Products Page: Admin Management

### Problem

The `/products` page (`components/pos/products-browser.tsx`) is a read-only product browser that duplicates POS search functionality without adding value for cashiers.

### What to Do

#### A. For admin users: Add product management capabilities

1. In `app/(dashboard)/products/page.tsx`, pass the `role` from `getWorkspaceAccess()` to the component (it already passes `role`).
2. In the products browser component, when `role === "admin"`:
   - Add a "منتج جديد" button that opens an inline form (inside the same page, not a new page).
   - The form fields: name, category (select from existing categories), SKU, description, sale_price, cost_price, stock_quantity, min_stock_level, track_stock (checkbox), is_quick_add (checkbox).
   - On submit, POST to a new API route `/api/products` that inserts into the `products` table.
   - Add edit capability: clicking a product card opens the same form pre-filled. On submit, PATCH to `/api/products/[id]`.
   - Add deactivate: a toggle that sets `is_active = false`.

3. Create the API routes:
   - `app/api/products/route.ts` — POST (create product, admin only)
   - `app/api/products/[id]/route.ts` — PATCH (update product, admin only)

4. Create validation schemas in `lib/validations/products.ts`.

#### B. For pos_staff: Keep as-is

The existing read-only view remains useful for checking stock without entering POS.

---

## Fix 7 — Invoice Detail Page

### Problem

The invoices workspace (`components/dashboard/invoices-workspace.tsx`, ~837 lines) contains: invoice list, invoice detail, print, receipt link creation, WhatsApp send, returns flow, admin cancel — all in one component with tab switching.

### What to Do

#### A. Create an invoice detail route

Create `app/(dashboard)/invoices/[id]/page.tsx` as a server component:

1. Call `getWorkspaceAccess()`.
2. Fetch the invoice by ID from Supabase (including items, payments, returns).
3. Render an `InvoiceDetail` client component.

#### B. Create the invoice detail component

Create `components/dashboard/invoice-detail.tsx`:

1. Move the following logic from `invoices-workspace.tsx` into this component:
   - Invoice header info (number, date, customer, terminal, status)
   - Items table
   - Payments breakdown
   - Receipt link management (create, copy, revoke)
   - WhatsApp send
   - Return form (for the "returns" tab section)
   - Admin cancel form (for the "admin" tab section)
2. Use the same CSS classes and layout patterns.
3. **Invoice-level discount display** (if Fix 11 is already applied): The invoice record may have `invoice_discount_percentage` and `invoice_discount_amount`. In the invoice summary section, after the line-level discount total (`discount_amount`), show the invoice-level discount if it is > 0:
   - "خصم البنود: {discount_amount}" (existing)
   - "خصم الفاتورة ({invoice_discount_percentage}%): {invoice_discount_amount}" (new, only if > 0)
   - "الإجمالي النهائي: {total_amount}" (existing — this already reflects both discounts)

   If Fix 11 is not yet applied when you implement Fix 7, add a conditional check: only render the invoice discount line if the `invoice_discount_amount` field exists and is > 0.

#### C. Simplify the invoices workspace

1. The invoices workspace becomes a **list-only** component:
   - Search, filters, status chips
   - Invoice list (table or cards) — each row shows invoice_number, date, total_amount, status. If `invoice_discount_amount > 0` (Fix 11), optionally show a small badge or note indicating "خصم فاتورة" so the admin can identify discounted invoices at a glance.
   - Clicking an invoice navigates to `/invoices/[id]`
2. Remove the inline detail rendering, receipt management, return form, and cancel form from the workspace.
3. Keep the section tabs only if they add value for list-level filtering (e.g., filter by status).

#### D. Back navigation

In the invoice detail page, add a back link to `/invoices` using the existing `ChevronLeft` icon pattern visible in the dashboard.

---

## Fix 8 — Settings Tabs Organization

### Problem

`components/dashboard/settings-ops.tsx` contains 6 unrelated sections (permissions, snapshot, integrity check, reconciliation, inventory completion, policies) all in one scrollable page.

### What to Do

1. Add a section navigation using the same `chip-button` pattern used in `operations-workspace.tsx` (line 246):

```typescript
type SettingsSection = "snapshot" | "integrity" | "reconciliation" | "inventory" | "permissions" | "policies";
```

2. Show only the active section's content. Default to `"snapshot"` (most frequent admin action).
3. Each tab renders its existing form/content — no logic changes, only wrapped in conditional rendering.
4. **Do not create new files** — this is a reorganization within the existing component.

---

## Fix 9 — Expense Categories as Separate Tab

### Problem

In `components/dashboard/expenses-workspace.tsx`, the expense category management (add/edit categories — admin only) is in the same tab flow as daily expense creation. Cashiers with expense permissions see the categories tab even though it's admin-gated.

### What to Do

1. The workspace already has `ExpensesSection = "create" | "recent" | "categories"`.
2. Add permission gating: hide the "categories" tab chip for `pos_staff` users. Pass `role` from the page if not already passed.
3. In `app/(dashboard)/expenses/page.tsx`, ensure `role` is passed to the workspace component.
4. In the workspace, conditionally render the "الفئات" tab button:

```tsx
{role === "admin" ? (
  <button className={...} onClick={() => setActiveSection("categories")}>
    إدارة الفئات
  </button>
) : null}
```

5. If the user is `pos_staff` and somehow navigates to `categories` section, show the default `"create"` section instead.

---

## Fix 10 — Hide Receipt Expiry Hours from Cashier

### Problem

In the invoices workspace, when generating a receipt sharing link, the "ساعات الانتهاء" (expiry hours) technical field is visible to all users including cashiers.

### What to Do

1. In the receipt link creation section of the invoice detail (or current invoices workspace if Fix 7 is not yet applied):
   - If `role === "pos_staff"`: hide the expiry hours input field and use a default value (e.g., `48` hours).
   - If `role === "admin"`: show the field as-is.
2. The `role` must be available in the component — pass it from the page if not already passed.

---

## Fix 11 — Invoice-Level Discount

### Problem

Currently, discounts can only be applied per line item (per product in the cart). There is no way to apply a single discount to the entire invoice. The `invoices` table has `discount_amount` but it stores the **sum of line-level discounts** — there is no invoice-level discount column or mechanism.

### Current Discount Flow

1. **Client**: Each cart item has `discount_percentage` (0-100), clamped by `effectiveMaxDiscount`.
2. **Payload**: Each item sends `discount_percentage` in `items[]`.
3. **RPC `create_sale`**: For each item, calculates `v_item_discount_amt = ROUND(v_line_subtotal * v_item_discount_pct / 100, 3)`. Sums into `v_total_discount`. Final: `v_total_amount = v_subtotal - v_total_discount`.
4. **Invoice record**: `subtotal` = sum of line subtotals, `discount_amount` = sum of line discounts, `total_amount` = subtotal - discount_amount.

### What to Do

#### A. Database migration

Create `supabase/migrations/019_invoice_level_discount.sql`:

```sql
-- Add invoice-level discount columns to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0
    CHECK (invoice_discount_percentage >= 0 AND invoice_discount_percentage <= 100),
  ADD COLUMN IF NOT EXISTS invoice_discount_amount DECIMAL(12,3) NOT NULL DEFAULT 0
    CHECK (invoice_discount_amount >= 0);
```

This is additive — existing invoices get `0` for both columns.

#### B. Update the `create_sale` RPC

In a new migration (or same `019_` file), `CREATE OR REPLACE FUNCTION create_sale(...)` with an additional parameter:

```sql
p_invoice_discount_percentage DECIMAL DEFAULT 0,
```

Add it AFTER `p_notes` and BEFORE `p_idempotency_key` to minimize signature disruption. However, since PostgreSQL uses named parameters in the Supabase RPC call, position doesn't matter for the API — but for consistency, add it at the end before `p_created_by`:

```sql
CREATE OR REPLACE FUNCTION create_sale(
  p_items                      JSONB,
  p_payments                   JSONB,
  p_customer_name              VARCHAR DEFAULT NULL,
  p_customer_phone             VARCHAR DEFAULT NULL,
  p_debt_customer_id           UUID DEFAULT NULL,
  p_discount_by                UUID DEFAULT NULL,
  p_pos_terminal               VARCHAR DEFAULT NULL,
  p_notes                      TEXT DEFAULT NULL,
  p_invoice_discount_percentage DECIMAL DEFAULT 0,
  p_idempotency_key            UUID DEFAULT NULL,
  p_created_by                 UUID DEFAULT NULL
)
```

In the function body, after computing `v_total_amount = v_subtotal - v_total_discount` (line 290), apply the invoice-level discount:

```sql
-- ═══ خصم على مستوى الفاتورة ═══
v_invoice_discount_pct := COALESCE(p_invoice_discount_percentage, 0);
IF v_invoice_discount_pct < 0 OR v_invoice_discount_pct > 100 THEN
  RAISE EXCEPTION 'ERR_INVALID_INVOICE_DISCOUNT';
END IF;

-- التحقق من حد الخصم للموظف
IF v_user_role = 'pos_staff' AND v_invoice_discount_pct > v_max_discount THEN
  RAISE EXCEPTION 'ERR_DISCOUNT_EXCEEDED';
END IF;

v_invoice_discount_amt := ROUND(v_total_amount * v_invoice_discount_pct / 100, 3);
v_total_amount := v_total_amount - v_invoice_discount_amt;
```

Declare the new variables:
```sql
v_invoice_discount_pct DECIMAL(5,2);
v_invoice_discount_amt DECIMAL(12,3) := 0;
```

Update the invoice UPDATE statement to include the new columns:
```sql
UPDATE invoices
  SET subtotal = v_subtotal,
      discount_amount = v_total_discount,
      invoice_discount_percentage = v_invoice_discount_pct,
      invoice_discount_amount = v_invoice_discount_amt,
      discount_by = p_discount_by,
      total_amount = v_total_amount,
      ...
```

#### C. Update the Zod validation schema

In `lib/validations/sales.ts`, add to `createSaleSchema`:

```typescript
invoice_discount_percentage: z
  .number()
  .min(0, "خصم الفاتورة لا يمكن أن يكون سالبًا")
  .max(100, "خصم الفاتورة لا يمكن أن يتجاوز 100%")
  .default(0),
```

#### D. Update the API route

In `app/api/sales/route.ts`, add to the RPC call parameters (line 61):

```typescript
p_invoice_discount_percentage: payload.invoice_discount_percentage ?? 0,
```

#### E. Update the POS cart store

In `stores/pos-cart.ts`:

1. Add `invoiceDiscountPercentage: number` to the store interface.
2. Add `setInvoiceDiscountPercentage: (percentage: number) => void`.
3. Initialize to `0` in `createDefaultState()`.
4. Reset to `0` in `clearCart()` and `completeSale()`.
5. Add to `partialize` for persistence.

#### F. Update the POS workspace UI

In `components/pos/pos-workspace.tsx`:

1. Read `invoiceDiscountPercentage` and `setInvoiceDiscountPercentage` from the store.
2. Update `calculateCartTotal` usage: the displayed total should reflect the invoice discount. Add a derived value:

```typescript
const invoiceDiscountAmount = total > 0
  ? Number((total * invoiceDiscountPercentage / 100).toFixed(3))
  : 0;
const finalTotal = Number((total - invoiceDiscountAmount).toFixed(3));
```

3. In the cart summary `<dl>` (after "الإجمالي النهائي"), add:

```tsx
{invoiceDiscountPercentage > 0 ? (
  <>
    <div>
      <dt>خصم الفاتورة ({invoiceDiscountPercentage}%)</dt>
      <dd>{formatCurrency(invoiceDiscountAmount)}</dd>
    </div>
    <div className="cart-summary__total">
      <dt>الصافي بعد الخصم</dt>
      <dd>{formatCurrency(finalTotal)}</dd>
    </div>
  </>
) : null}
```

4. Add the invoice discount input in the checkout fields (after the line items, before or inside the summary):

```tsx
<label className="stack-field">
  <span>خصم الفاتورة %</span>
  <input
    type="number"
    min={0}
    max={effectiveMaxDiscount}
    value={invoiceDiscountPercentage}
    onChange={(event) => {
      clearSubmissionFeedback();
      const raw = Number(event.target.value);
      const clamped = Number.isNaN(raw) ? 0 : Math.min(Math.max(raw, 0), effectiveMaxDiscount);
      setInvoiceDiscountPercentage(clamped);
    }}
  />
  {effectiveMaxDiscount < 100 ? (
    <span className="field-hint">الحد الأقصى للخصم: {effectiveMaxDiscount}%</span>
  ) : null}
</label>
```

5. Update the payload in `submitSale()`:

```typescript
invoice_discount_percentage: invoiceDiscountPercentage || undefined,
```

6. **Important**: The `total` displayed for the "تأكيد البيع" button must use `finalTotal`, not `total`. Also update the base amount used in the payment calculation. If Fix 1 is already applied, the payment logic uses a conditional for debt path — update it to use `finalTotal` instead of `total` as the base:

```typescript
// The payment amount must be based on finalTotal (after invoice discount).
// If Fix 1's debt-aware payment logic is present, replace `total` with `finalTotal` in that logic.
// If Fix 1 is not yet applied, use:
payments: [
  {
    account_id: selectedAccountId,
    amount: Number(finalTotal.toFixed(3))
  }
],
```

---

## Execution Order

Execute fixes in this order to minimize merge conflicts and build on dependencies:

1. **Fix 8** — Settings tabs (self-contained reorganization)
2. **Fix 9** — Expense categories tab (self-contained)
3. **Fix 10** — Receipt expiry hide (small conditional)
4. **Fix 3** — Search page (new page + shell change)
5. **Fix 4** — Admin dashboard (new page, depends on Fix 3's navigation pattern)
6. **Fix 2** — Topup invoices (DB migration + API + UI)
7. **Fix 11** — Invoice-level discount (DB migration + RPC + Schema + Store + UI — do before Fix 1 so `finalTotal` is available for the debt payment logic)
8. **Fix 1** — Customer selection in POS (store + UI + new hook — depends on Fix 11's `finalTotal` for the debt payment amount)
9. **Fix 5** — Hold cart (store + UI, builds on Fix 1's customer fields)
10. **Fix 7** — Invoice detail page (largest refactor — moves code between files; must come after Fix 11 so invoice discount display is included)
11. **Fix 6** — Products admin management (new API routes + UI)

---

## Completion Report

After all fixes are implemented, produce a report in **exactly** this structure:

```markdown
# Execution Report — Type 2 Structural & Functional Fixes

## Summary
- Total fixes attempted: 11
- Fixes completed: [N]/11
- Fixes skipped (with reason): [list or "none"]
- New files created: [count]
- Database migrations created: [count]

## Fix-by-Fix Status

### Fix 1 — Customer Selection in POS
- **Status**: [completed / partial / skipped]
- **Files created**: [list]
- **Files modified**: [list]
- **Database changes**: [migration file name or "none"]
- **What was done**: [3-5 sentence description]
- **Deviation from spec**: [any deviation, or "none"]
- **Verification**: [how you verified]

### Fix 2 — Topup Invoices
- [same structure]
- **IMPORTANT**: Include the exact SQL migration content in the report

### Fix 3 — Dedicated Search Page
- [same structure]

### Fix 4 — Admin Dashboard
- [same structure]

### Fix 5 — Hold Cart
- [same structure]

### Fix 6 — Products Admin Management
- [same structure]

### Fix 7 — Invoice Detail Page
- [same structure]
- **IMPORTANT**: List exactly which code blocks were moved from invoices-workspace to invoice-detail

### Fix 8 — Settings Tabs
- [same structure]

### Fix 9 — Expense Categories Tab
- [same structure]

### Fix 10 — Receipt Expiry Hide
- [same structure]

### Fix 11 — Invoice-Level Discount
- [same structure]
- **IMPORTANT**: Include the exact SQL migration content and the updated RPC function signature

## New Files Created
| File | Purpose |
|---|---|
| [path] | [description] |

## Database Migrations
| File | Changes |
|---|---|
| [path] | [description of schema changes] |

## Side Effects
- [List any unintended changes or behavioral shifts]
- [Or "None observed"]

## Files Changed (Complete List)
| File | Action | Description |
|---|---|---|
| [path] | created / modified | [one-line summary] |

## Verification Summary
- TypeScript compilation: [pass/fail]
- Existing tests: [pass/fail with count]
- New tests added: [count, or "none"]

## Warnings
- [Edge cases, concerns, or things requiring manual verification]
- [Or "None"]
```

**Do not skip any section. Do not abbreviate. The report is the primary review artifact.**
