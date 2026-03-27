# Aya Mobile — Type 1 Structural Fixes (Safe Additions)

## Role and Constraints

You are an expert frontend engineer executing precisely scoped fixes on **Aya Mobile**, an Arabic RTL retail store management system built with **Next.js 14 App Router**, **Supabase**, **Zustand 5**, and **Zod**. The UI language is Arabic and the layout direction is RTL.

### Rules

1. **Do not break existing functionality.** Every feature that works today must work identically after your changes.
2. **Do not refactor, rename, or restructure** anything outside the scope of each fix below.
3. **Do not add new npm dependencies.** Use only what is already installed.
4. **Do not modify API routes, database schemas, RPC functions, Zod validation schemas, or middleware.** All fixes are client-side or server-component prop-passing only.
5. **Do not remove existing UI elements.** You may add, reposition, or conditionally hide elements — never delete.
6. **Preserve all existing CSS class naming conventions** (BEM-like: `block__element`, `block--modifier`, `block__element--modifier`). New classes you create must follow this pattern.
7. **Preserve all existing Arabic copy tone.** New Arabic strings must match the formal-but-concise style of the existing UI.
8. **Test every change manually** by verifying the component renders without errors and the user flow completes end-to-end.

---

## System Context (Read-Only Reference)

| Concept | Location | Notes |
|---|---|---|
| POS client workspace | `components/pos/pos-workspace.tsx` (650 lines) | Main sale flow: search, cart, checkout |
| POS cart Zustand store | `stores/pos-cart.ts` (241 lines) | Persisted to `localStorage` under key `aya-mobile-pos-cart` |
| POS types | `lib/pos/types.ts` | `PosProduct`, `PosAccount`, `PosCartItem`, `SaleResponseData`, `StandardEnvelope` |
| Sale validation schema | `lib/validations/sales.ts` | `createSaleSchema` — **DO NOT MODIFY** |
| Sales API route | `app/api/sales/route.ts` | Calls RPC `create_sale`, returns `SaleResponseData` — **DO NOT MODIFY** |
| Permission system | `lib/permissions.ts` | `resolvePermissionContext()` returns `maxDiscountPercentage`, `discountRequiresApproval` |
| Workspace access gate | `app/(dashboard)/access.ts` | `getWorkspaceAccess()` returns full permission context server-side |
| POS server page | `app/(dashboard)/pos/page.tsx` | Server component; calls `getWorkspaceAccess()`, renders `<PosWorkspace />` |
| POS accounts hook | `hooks/use-pos-accounts.ts` | Returns `PosAccount[]` with `type` field (values: `cash`, `visa`, `wallet`, `bank`) |
| Home page | `app/page.tsx` | Login form + quick-access link card to `/pos` |
| Formatters | `lib/utils/formatters.ts` | `formatCurrency()`, `formatCompactNumber()` |
| UI primitives | `components/ui/page-header.tsx`, `components/ui/section-card.tsx`, `components/ui/status-banner.tsx` | Reusable layout components |

---

## Fix 1 — Cash Change Calculation

### Problem

When a customer pays with cash, the cashier has no way to enter the amount received from the customer and see the change to return. The POS checkout area (lines 560–609 in `pos-workspace.tsx`) has fields for payment account, terminal code, and notes — but no `amount_received` input. The `SaleResponseData` type already declares `change: number | null` (line 45 in `lib/pos/types.ts`), and the last-completed-sale card (lines 637–644 in `pos-workspace.tsx`) already renders `lastCompletedSale.change` — but this value comes from the server and is always `null` because the client never sends an `amount_received`.

### What to Do

**This is a purely client-side UX addition. Do NOT modify the API route, the Zod schema, or the RPC call.**

#### A. Add state to `stores/pos-cart.ts`

1. Add a new field `amountReceived: number | null` to the `PosCartStore` interface (after `selectedAccountId` at line 50).
2. Add a setter `setAmountReceived: (amount: number | null) => void` to the interface.
3. Initialize `amountReceived` to `null` in `createDefaultState()` (line 72).
4. Implement `setAmountReceived` in the store (simple set).
5. In `completeSale()` (line 198), reset `amountReceived` to `null` alongside the existing clears.
6. In `clearCart()` (line 179), reset `amountReceived` to `null`.
7. Add `amountReceived` to the `partialize` function (line 231) so it persists across page reloads during an active sale.

#### B. Add UI to `components/pos/pos-workspace.tsx`

1. Read `amountReceived` and `setAmountReceived` from the store (alongside existing selectors near lines 41–59).
2. Compute a derived value: `const changeToReturn = (amountReceived !== null && amountReceived >= total) ? roundCartAmount(amountReceived - total) : null;` — import `roundCartAmount` is private in the store; instead compute with the same formula: `Math.round((value + Number.EPSILON) * 1000) / 1000` or simply use `Number((amountReceived - total).toFixed(3))`.
3. **Conditionally show** the amount-received input **only when the selected account's `type` is `"cash"`**. Use the already-available `selectedAccount` variable (line 121). If `selectedAccount?.type !== "cash"`, do not render the field.
4. Place the new field immediately **after** the payment account `<select>` (after line 580) and **before** the terminal code field (line 582). Use the same `stack-field` class pattern:

```tsx
{selectedAccount?.type === "cash" ? (
  <label className="stack-field">
    <span>المبلغ المستلم</span>
    <input
      type="number"
      min={0}
      step="0.001"
      value={amountReceived ?? ""}
      onChange={(event) => {
        clearSubmissionFeedback();
        const raw = event.target.value;
        setAmountReceived(raw === "" ? null : Number(raw));
      }}
      placeholder="أدخل المبلغ المدفوع من العميل"
    />
  </label>
) : null}
```

5. Show the computed change **below** the amount-received input, only when `changeToReturn !== null`:

```tsx
{changeToReturn !== null ? (
  <div className="cart-change-display">
    <span>الباقي للعميل</span>
    <strong>{formatCurrency(changeToReturn)}</strong>
  </div>
) : null}
```

6. Add the CSS class `cart-change-display` to the project's stylesheet. It should be a small inline-flex row with the same spacing as `info-strip`, using `color: var(--aya-success, #16a34a)` for the `<strong>` element and `font-size: 0.95rem`.

#### C. Validation

- Do NOT block sale submission if `amountReceived` is null or less than `total`. The field is a **cashier helper**, not a business rule.
- Do NOT send `amountReceived` to the API. The payload in `submitSale()` (lines 164–179) must remain unchanged.

---

## Fix 2 — Prominent Sale-Complete Confirmation State

### Problem

After a successful sale, the only feedback is a small `result-card` at the very bottom of the cart sidebar (lines 637–644 in `pos-workspace.tsx`). On mobile, this card is below the fold. There is no prominent visual confirmation and no clear call-to-action to start a new sale. The cashier may not realize the sale succeeded.

### What to Do

#### A. Replace the bottom result card with a full-cart overlay

When `submissionState === "success"` and `lastCompletedSale` is not null, render a **success overlay** that replaces the entire cart content (items list + checkout fields). This overlay appears **inside** the existing `<SectionCard>` for the cart (the `<aside>` starting at line 451), not as a separate modal or portal.

1. In `pos-workspace.tsx`, locate the cart `<SectionCard>` (lines 452–645).
2. At the top of the SectionCard's children (after line 457), add a conditional branch:

```tsx
{submissionState === "success" && lastCompletedSale ? (
  <div className="cart-success-overlay">
    <div className="cart-success-overlay__icon">
      <ShieldCheck size={48} />
    </div>
    <h3 className="cart-success-overlay__title">تمت العملية بنجاح</h3>
    <dl className="cart-success-overlay__details">
      <div>
        <dt>رقم الفاتورة</dt>
        <dd>{lastCompletedSale.invoice_number}</dd>
      </div>
      <div>
        <dt>الإجمالي</dt>
        <dd>{formatCurrency(lastCompletedSale.total)}</dd>
      </div>
      {lastCompletedSale.change !== null && lastCompletedSale.change > 0 ? (
        <div>
          <dt>الباقي</dt>
          <dd>{formatCurrency(lastCompletedSale.change)}</dd>
        </div>
      ) : null}
    </dl>
    <button
      type="button"
      className="primary-button cart-success-overlay__cta"
      onClick={() => {
        clearCart();
      }}
    >
      بيع جديد
    </button>
  </div>
) : (
  /* ...existing cart content (header, items list, summary, checkout fields, submit button)... */
)}
```

3. `ShieldCheck` is already imported at line 6.
4. **Remove** the old `result-card` block (lines 637–644) since the overlay replaces it.
5. Add CSS for `cart-success-overlay`:
   - Center-aligned flex column, `padding: 2rem 1rem`, `text-align: center`.
   - `cart-success-overlay__icon`: `color: var(--aya-success, #16a34a)`, `margin-bottom: 1rem`.
   - `cart-success-overlay__title`: `font-size: 1.25rem`, `font-weight: 700`, `margin-bottom: 1.5rem`.
   - `cart-success-overlay__details`: same `<dl>` styling as `cart-summary` but centered.
   - `cart-success-overlay__cta`: full-width `primary-button`, `margin-top: 1.5rem`.

#### B. Auto-reset behavior

- Clicking "بيع جديد" calls `clearCart()` which resets items, notes, and idempotency key (already implemented). It also resets `submissionState` to `"idle"` (already in the `clearCart` action).
- **Important**: `clearCart()` currently does NOT reset `submissionState` back to `"idle"` — check `stores/pos-cart.ts` line 179. It sets `submissionState: "idle"` explicitly. Verify this is correct. If `submissionState` remains `"success"` after `clearCart`, the overlay will persist. The current code at line 184 does set `submissionState: "idle"` — so `clearCart()` is sufficient.

---

## Fix 3 — Lock POS Terminal Code as Device Setting

### Problem

The `posTerminalCode` field is displayed as an editable text input in every sale's checkout area (lines 582–594 in `pos-workspace.tsx`). The value defaults to `"POS-01"` (line 76 in `stores/pos-cart.ts`) and persists via `localStorage`. However, it is always visible and editable, meaning a cashier can accidentally change it mid-shift. The terminal code identifies the physical device — it should be set once and then locked.

### What to Do

#### A. Add a `terminalCodeLocked` field to `stores/pos-cart.ts`

1. Add `terminalCodeLocked: boolean` to the `PosCartStore` interface (after `posTerminalCode` at line 52).
2. Add `lockTerminalCode: () => void` and `unlockTerminalCode: () => void` to the interface.
3. Initialize `terminalCodeLocked: false` in `createDefaultState()`.
4. Implement:
   - `lockTerminalCode`: `set({ terminalCodeLocked: true })`
   - `unlockTerminalCode`: `set({ terminalCodeLocked: false })`
5. Add `terminalCodeLocked` to the `partialize` function so it persists.
6. **Do NOT reset `terminalCodeLocked` or `posTerminalCode` in `clearCart()` or `completeSale()`** — these must survive across sales.
7. In `resetStore()` (line 209), the full `createDefaultState()` is applied which will reset `terminalCodeLocked` to `false` — this is correct because `resetStore` is an intentional full reset.

#### B. Modify the terminal code UI in `pos-workspace.tsx`

1. Read `terminalCodeLocked` and `lockTerminalCode` from the store.
2. Replace the current terminal code field (lines 582–594) with:

```tsx
<div className="stack-field terminal-code-field">
  <span>رمز الجهاز</span>
  {terminalCodeLocked ? (
    <div className="terminal-code-field__locked">
      <strong>{posTerminalCode}</strong>
    </div>
  ) : (
    <div className="terminal-code-field__edit">
      <input
        type="text"
        maxLength={30}
        value={posTerminalCode}
        onChange={(event) => {
          clearSubmissionFeedback();
          setPosTerminalCode(event.target.value);
        }}
        placeholder="POS-01"
      />
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          if (posTerminalCode.trim()) {
            lockTerminalCode();
          }
        }}
        disabled={!posTerminalCode.trim()}
      >
        تثبيت
      </button>
    </div>
  )}
</div>
```

3. The locked state shows the code as plain bold text — no input. There is no "unlock" button in the normal POS flow. Unlocking is only possible via `resetStore()` (which is an admin/settings action) or by clearing localStorage.
4. Add CSS:
   - `terminal-code-field__locked`: `display: flex; align-items: center; padding: 0.5rem 0; font-size: 0.95rem;`
   - `terminal-code-field__edit`: `display: flex; gap: 0.5rem; align-items: center;`

#### C. First-use behavior

- On a fresh device (no localStorage), `terminalCodeLocked` is `false` and `posTerminalCode` is `"POS-01"`.
- The cashier types their device code and clicks "تثبيت" to lock it.
- On all subsequent sales, the code is displayed as read-only text.

---

## Fix 4 — Enforce `maxDiscountPercentage` from Permission Context

### Problem

The permission system resolves `maxDiscountPercentage` per user (via `resolvePermissionContext()` in `lib/permissions.ts`, line 135). The `getWorkspaceAccess()` function in `app/(dashboard)/access.ts` returns this value (line 13 in the `WorkspaceAccessResult` type). However, the POS server page at `app/(dashboard)/pos/page.tsx` renders `<PosWorkspace />` **without any props** (line 32). The discount input in `pos-workspace.tsx` has `max={100}` hardcoded (line 530). The store's `setDiscountPercentage` also clamps to `Math.min(Math.max(discountPercentage, 0), 100)` (line 162 in `stores/pos-cart.ts`).

This means **any cashier can set a 100% discount regardless of their permission bundle's `maxDiscountPercentage` limit**.

### What to Do

#### A. Pass `maxDiscountPercentage` from server page to client component

1. In `app/(dashboard)/pos/page.tsx`, when `access.state === "ok"`, pass the discount limit as a prop:

```tsx
return <PosWorkspace maxDiscountPercentage={access.maxDiscountPercentage} />;
```

2. In `components/pos/pos-workspace.tsx`, add a props type:

```tsx
type PosWorkspaceProps = {
  maxDiscountPercentage: number | null;
};

export function PosWorkspace({ maxDiscountPercentage }: PosWorkspaceProps) {
```

3. Compute the effective max inside the component:

```tsx
const effectiveMaxDiscount = maxDiscountPercentage ?? 100;
```

#### B. Enforce in the discount input

1. Replace the hardcoded `max={100}` on the discount input (line 530) with `max={effectiveMaxDiscount}`.
2. Clamp the value in the `onChange` handler:

```tsx
onChange={(event) => {
  clearSubmissionFeedback();
  const raw = Number(event.target.value);
  const clamped = Math.min(raw, effectiveMaxDiscount);
  setDiscountPercentage(item.product_id, clamped);
}}
```

#### C. Enforce in the store

1. `setDiscountPercentage` in `stores/pos-cart.ts` currently clamps to 100 (line 162). **Do not change the store** — the store is a shared module and does not have access to the permission context. The clamping to 100 remains as a safety floor. The tighter permission-based clamp happens in the UI component (step B above).

#### D. Visual feedback

1. If `maxDiscountPercentage` is not null and is less than 100, show a hint below the discount input:

```tsx
{effectiveMaxDiscount < 100 ? (
  <span className="field-hint">الحد الأقصى للخصم: {effectiveMaxDiscount}%</span>
) : null}
```

2. Add CSS for `field-hint`: `font-size: 0.8rem; color: var(--aya-muted, #6b7280); margin-top: 0.25rem;`

---

## Fix 5 — Correct Misleading Home Page Copy

### Problem

The home page (`app/page.tsx`, lines 23–25) contains a link card to `/pos` with the text:

```
ابدأ البيع فوراً والوصول لشاشة نقطة البيع بدون الحاجة للدخول الكامل لمساحة العمل.
```

Translation: "Start selling immediately and access the POS without needing full workspace login."

This is **false**. The `/pos` route is inside the `(dashboard)` route group, and `app/(dashboard)/pos/page.tsx` calls `getWorkspaceAccess()` which requires authentication. An unauthenticated user clicking this link sees the `PosAccessRequired` fallback, not the POS.

### What to Do

1. In `app/page.tsx`, replace the `<p>` text on line 24 with accurate copy:

**Replace:**
```
ابدأ البيع فوراً والوصول لشاشة نقطة البيع بدون الحاجة للدخول الكامل لمساحة العمل.
```

**With:**
```
سجّل الدخول وانتقل مباشرة إلى شاشة البيع — الطريق الأسرع لبدء عملية بيع جديدة.
```

This accurately describes the flow: log in first, then go directly to POS.

2. **Do not change the link `href="/pos"`**, the heading text, the icon, or the CTA text at the bottom of the card. Only change the `<p>` description.

---

## Execution Order

Execute the fixes in this order to minimize merge conflicts:

1. **Fix 5** (home page copy) — isolated single-line change, zero risk.
2. **Fix 3** (terminal code lock) — store + UI changes, no overlap with other fixes.
3. **Fix 1** (cash change) — store + UI changes, extends the checkout area.
4. **Fix 4** (discount enforcement) — page prop + UI changes, touches the cart line items.
5. **Fix 2** (sale-complete overlay) — largest UI change, wraps existing cart content in a conditional.

---

## CSS Delivery

All new CSS classes must be added to the project's existing stylesheet. Locate the main CSS file by searching for the existing class `cart-summary` or `transaction-checkout-summary`. Add the new classes in the same file, grouped together under a comment `/* Type 1 structural fixes */`.

---

## Completion Report

After all fixes are implemented, produce a report in **exactly** this structure:

```markdown
# Execution Report — Type 1 Structural Fixes

## Summary
- Total fixes attempted: 5
- Fixes completed: [N]/5
- Fixes skipped (with reason): [list or "none"]

## Fix-by-Fix Status

### Fix 1 — Cash Change Calculation
- **Status**: [completed / partial / skipped]
- **Files modified**: [list every file path changed]
- **Lines added**: [approximate count]
- **Lines removed**: [approximate count]
- **What was done**: [2-3 sentence description of actual changes]
- **Deviation from spec**: [any deviation from the instructions above, or "none"]
- **Verification**: [describe how you verified the fix works — e.g., "component renders without errors, cash account shows amount_received field, non-cash accounts hide it"]

### Fix 2 — Sale-Complete Confirmation State
- [same structure]

### Fix 3 — Terminal Code Lock
- [same structure]

### Fix 4 — Discount Enforcement
- [same structure]

### Fix 5 — Home Page Copy
- [same structure]

## Side Effects
- [List any unintended changes, import additions, or behavioral shifts observed]
- [Or "None observed"]

## Files Changed (Complete List)
| File | Action | Description |
|---|---|---|
| [path] | modified / created | [one-line summary] |

## Warnings
- [Any concerns, edge cases, or things the reviewer should manually verify]
- [Or "None"]
```

**Do not skip any section of the report. Do not abbreviate. The report is the primary artifact used for review.**
