# Aya Mobile — POS Professional Polish Wave

> **Role**: You are a senior frontend engineer specializing in retail POS interfaces. You modify only the files listed below. You read every file completely before touching it. You do not skip, combine, or reorder steps.

> **Authority Declaration**: This document is the sole authoritative source for this execution wave. It does NOT override `CLAUDE.md` or `docs/PROTECTED_STRINGS.md`.

> **Critical Warning**: A previous executor claimed to complete a similar wave but did NOT produce visible results. The code changes were superficial — they added class names and structure but the visual output did not change. This wave requires **verifiable visual changes**. Every task has a "How to verify" section. If you cannot verify the change visually or via grep, the task is NOT done.

---

## Context

The POS screen at `/pos` currently looks like a basic form with flat styling. The goal is to make it look like a **professional retail POS system** — fast, dense, visually structured — while keeping the current functionality intact.

**You are modifying exactly 2 files:**
- `components/pos/pos-workspace.tsx` — JSX structure
- `app/globals.css` — CSS styles

**You are NOT modifying**: any other component, any store, any API route, any test file, any other page.

---

## Pre-Change Safety Protocol

Before writing any code:

1. Read `components/pos/pos-workspace.tsx` completely (2039 lines)
2. Read `app/globals.css` completely
3. Read `docs/PROTECTED_STRINGS.md` if it exists
4. Search `tests/e2e/` for: `pos-topbar`, `pos-cart-sheet`, `تأكيد البيع`, `السلة الحالية`, `ادفع`, `pos-product-card`
5. Read every matching test file completely
6. Confirm your changes do not break any test assertion

---

## Global Rules

1. No npm dependencies added or removed
2. No database or API changes
3. No changes to business logic — only JSX structure and CSS
4. TypeScript must compile: `npx tsc --noEmit --pretty false` → zero output
5. All tests must pass: `npx vitest run` → all pass
6. Build must succeed: `npm run build` → no errors
7. Read every file before modifying it
8. Light theme only — zero dark mode CSS
9. RTL native — every layout must be RTL-correct
10. Before changing any Arabic string: search `tests/e2e/` for that exact string
11. Do not change `"تأكيد البيع"`, `"تأكيد البيع وتسجيل الدين"`, `"جارٍ التنفيذ..."` — these are tested

---

## Task 1 — Product Cards: Compact Professional Style

**Current state** (line ~1060-1110 in pos-workspace.tsx): Products are displayed as either text rows or thumbnail cards. Both styles are basic and flat.

**Required change**: Make product cards compact and professional — each card should be ~60px tall with:
- Right side: small product image/icon (40×40px, rounded corners, subtle border)
- Middle: product name (14px, bold) on first line, SKU in monospace (12px, muted) on second line
- Left side: price (bold, primary color) on first line, stock indicator on second line
- Stock indicator colors: green = "متوفر", orange = "منخفض" (≤5), red = "نفد" (0)
- Hover: subtle background change (`--aya-bg-soft`)
- Click: add to cart (existing behavior — do not change the onClick)

**CSS to add** in `app/globals.css`:

```css
/* --- Product Card Compact --- */
.pos-product-card--compact {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  min-height: 60px;
  background: var(--aya-panel);
  border: 1px solid var(--aya-line);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 100ms, border-color 100ms;
}

.pos-product-card--compact:hover {
  background: var(--aya-bg-soft);
  border-color: var(--aya-line-strong);
}

.pos-product-card--compact:active {
  background: var(--aya-primary-soft);
}

.pos-product-card__thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--aya-line);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--aya-bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--aya-muted);
}

.pos-product-card__info {
  flex: 1;
  min-width: 0;
}

.pos-product-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--aya-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pos-product-card__sku {
  font-size: 12px;
  font-family: var(--aya-font-mono, monospace);
  color: var(--aya-muted);
}

.pos-product-card__pricing {
  text-align: start;
  flex-shrink: 0;
}

.pos-product-card__price {
  font-size: 14px;
  font-weight: 600;
  color: var(--aya-primary);
  display: block;
}

.pos-product-card__stock {
  font-size: 11px;
  font-weight: 500;
}

.pos-product-card__stock--available {
  color: var(--aya-success);
}

.pos-product-card__stock--low {
  color: var(--aya-warning);
}

.pos-product-card__stock--out {
  color: var(--aya-danger);
}
```

**JSX to use** for each product card (replace the current card rendering):

```tsx
<button
  key={product.id}
  type="button"
  className="pos-product-card--compact"
  onClick={() => handleAddToCart(product)}
  disabled={product.track_stock && product.stock_quantity <= 0}
>
  <div className="pos-product-card__thumb">
    {product.image_url ? (
      <img src={product.image_url} alt="" className="pos-product-card__thumb" />
    ) : (
      <ImageIcon size={18} />
    )}
  </div>
  <div className="pos-product-card__info">
    <span className="pos-product-card__name">{product.name}</span>
    {product.sku ? (
      <span className="pos-product-card__sku">{product.sku}</span>
    ) : null}
  </div>
  <div className="pos-product-card__pricing">
    <span className="pos-product-card__price">
      {formatCurrency(product.sale_price)}
    </span>
    <span className={
      !product.track_stock || product.stock_quantity > 5
        ? "pos-product-card__stock pos-product-card__stock--available"
        : product.stock_quantity > 0
          ? "pos-product-card__stock pos-product-card__stock--low"
          : "pos-product-card__stock pos-product-card__stock--out"
    }>
      {!product.track_stock
        ? "متوفر"
        : product.stock_quantity > 5
          ? `${product.stock_quantity} متوفر`
          : product.stock_quantity > 0
            ? `${product.stock_quantity} فقط`
            : "نفد"}
    </span>
  </div>
</button>
```

**Important**: Keep the existing `productView` toggle (`"text"` / `"thumbnail"`) working. Use the compact card for BOTH views. The `thumbnail` view can show a slightly larger image (56×56) but same layout. If this is too complex, use the compact card for both and remove the toggle.

**How to verify**:
```bash
grep "pos-product-card--compact" components/pos/pos-workspace.tsx
# Expected: 1 or more results
grep "pos-product-card__stock" app/globals.css
# Expected: 3 or more results (available, low, out)
```

---

## Task 2 — Cart Panel: Remove Duplicate Summary, Fix Button Text

**Current state**:
- Line 1489-1505: Cart mode shows "الإجمالي" + button "ادفع X"
- Line 1927-2017: Checkout mode shows full summary + "تأكيد البيع"
- The button "ادفع {formatCurrency(netTotal)}" at line 1503 is the cart-mode proceed button

**Required changes**:

2a. Change the cart-mode button text from `ادفع {formatCurrency(netTotal)}` to just `متابعة الدفع` (line 1503). This button opens the checkout panel — it does NOT complete the sale. The actual sale confirmation button ("تأكيد البيع") is already correct at line 2014.

**IMPORTANT**: Before changing "ادفع", search tests for this exact string:
```bash
grep -rn "ادفع" tests/e2e/
```
If any test asserts this string, do NOT change it. If no test asserts it, proceed.

2b. Make the cart summary sticky at the bottom of the cart panel. Add CSS:

```css
.pos-cart-mode-summary {
  position: sticky;
  bottom: 0;
  background: var(--aya-panel);
  border-top: 1px solid var(--aya-line);
  padding: var(--sp-3);
  margin-top: auto;
}
```

**How to verify**:
```bash
grep "متابعة الدفع" components/pos/pos-workspace.tsx
# Expected: 1 result (or "ادفع" if tests blocked the change)
grep "pos-cart-mode-summary" app/globals.css
# Expected: 1 or more results
```

---

## Task 3 — Visual Depth: Shadows and Backgrounds

**Current state**: The layout is flat — no visual separation between products area and cart area.

**Required changes**: Add subtle visual depth to distinguish the two panels.

```css
/* Products panel background */
.pos-products {
  background: var(--aya-bg);
}

/* Cart panel — elevated card feel */
.pos-layout > aside {
  background: var(--aya-panel);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
  border-inline-start: 1px solid var(--aya-line);
}

/* Product cards grid — tighter gap for compact cards */
.pos-product-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-2);
  padding: var(--sp-2);
}

/* Cart line items — subtle separator */
.cart-line-card {
  border-bottom: 1px solid var(--aya-line);
  padding-bottom: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.cart-line-card:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
```

**Important**: Check if `.pos-products` and `.pos-layout > aside` already have background/shadow CSS. If yes, modify the existing rules instead of adding duplicates. Use `grep` to find existing rules before adding new ones.

**How to verify**:
```bash
grep "box-shadow" app/globals.css | grep -i "pos\|aside"
# Expected: 1 or more results
```

---

## Task 4 — Cart Header: Clean Action Bar

**Current state** (lines 1341-1371): The cart header has "تعليق" + "السلال المعلقة" buttons on one side and "تفريغ السلة" on the other. They look like random buttons.

**Required change**: Style them as a clean, compact action bar:

```css
.cart-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--aya-line);
  background: var(--aya-bg-soft);
  min-height: 40px;
}

.cart-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.cart-panel__actions .secondary-button {
  font-size: 12px;
  padding: var(--sp-1) var(--sp-2);
  min-height: 28px;
}

.cart-panel__header .ghost-button {
  font-size: 12px;
  color: var(--aya-danger);
}
```

**Important**: Check if `.cart-panel__header` already exists in CSS. If yes, modify the existing rule.

**How to verify**:
```bash
grep "cart-panel__header" app/globals.css
# Expected: 1 or more results with the new styles
```

---

## Task 5 — Checkout Confirm Button: 54px Professional CTA

**Current state** (line 1987-2016): The confirm button uses generic `.primary-button` styling.

**Required change**: Make the confirm button visually dominant — this is the most important button in the entire POS:

```css
.transaction-checkout-button {
  min-height: 54px;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--radius-md);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  letter-spacing: 0.3px;
}
```

**How to verify**:
```bash
grep "min-height: 54px" app/globals.css
# Expected: 1 result for the checkout button
```

---

## Task 6 — Success Screen: Visual Hierarchy

**Current state** (lines 1268-1337): Success screen shows icon + title + total + invoice + payment breakdown + buttons. The visual weight is flat.

**Required change**: Make the total amount the dominant visual element:

```css
.pos-success-screen__total {
  font-size: 32px;
  font-weight: 700;
  color: var(--aya-success);
  display: block;
  margin: var(--sp-3) 0;
}

.pos-success-screen__invoice {
  font-family: var(--aya-font-mono, monospace);
  font-size: 13px;
  color: var(--aya-muted);
  letter-spacing: 0.5px;
  padding: var(--sp-1) var(--sp-2);
  background: var(--aya-bg-soft);
  border-radius: var(--radius-sm);
  display: inline-block;
  margin-bottom: var(--sp-4);
}

.cart-success-overlay__icon {
  color: var(--aya-success);
  margin-bottom: var(--sp-3);
}

.cart-success-overlay__icon svg {
  width: 64px;
  height: 64px;
}
```

**Important**: Check if these classes already have CSS rules. If yes, update them. Do not duplicate.

**How to verify**:
```bash
grep "font-size: 32px" app/globals.css
# Expected: 1 result for the success total
```

---

## Task 7 — Topbar Polish

**Current state** (lines 956-982): The `pos-topbar` exists but is visually flat — blends with the content below it.

**Required change**: Make it visually distinct as a header bar:

```css
.pos-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--aya-panel);
  border-bottom: 2px solid var(--aya-primary);
  min-height: 48px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.pos-topbar__label {
  font-size: 16px;
  font-weight: 700;
  color: var(--aya-ink);
  margin: 0;
}

.pos-topbar__account {
  font-size: 12px;
  font-weight: 500;
  color: var(--aya-primary);
  padding: 2px var(--sp-2);
  background: var(--aya-primary-soft);
  border-radius: var(--radius-sm);
}

.pos-topbar__actions .secondary-button {
  font-size: 12px;
  padding: var(--sp-1) var(--sp-3);
  min-height: 30px;
}
```

**Important**: These CSS rules already exist (lines ~4166-4493 in globals.css). **Update the existing rules** — do NOT add duplicates. Use grep to find them first:

```bash
grep -n "\.pos-topbar" app/globals.css
```

**Also**: Change the `<h1>` at line 958 from `"نقطة البيع السريعة"` to `"نقطة البيع"` — this matches the page title and is simpler.

**Before changing this string, check tests:**
```bash
grep -rn "نقطة البيع السريعة" tests/e2e/
```
If found in tests, do NOT change it.

**How to verify**:
```bash
grep "border-bottom: 2px solid" app/globals.css | grep topbar
# Expected: 1 result
```

---

## Task 8 — Product Grid: Responsive Compact Layout

**Current state**: Products grid uses whatever default layout exists. On desktop (wide screen), single-column compact cards waste horizontal space.

**Required change**: On wider screens, show 2 columns of compact cards:

```css
@media (min-width: 900px) {
  .pos-product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1400px) {
  .pos-product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Important**: Find the existing product grid container class name in the code (it may be `pos-product-grid`, `pos-products__list`, or similar). Use grep to find it:

```bash
grep -n "product.*grid\|product.*list\|pos-products__" components/pos/pos-workspace.tsx
```

Apply the responsive rules to whatever class name the grid actually uses.

**How to verify**:
```bash
grep "grid-template-columns: repeat" app/globals.css | grep -c "2\|3"
# Expected: 2 results (2-column and 3-column breakpoints)
```

---

## Verification Checklist

Run these commands after all tasks. Every check must pass.

```bash
# AC-1: TypeScript clean
npx tsc --noEmit --pretty false
# Expected: zero output

# AC-2: All unit tests pass
npx vitest run
# Expected: all pass

# AC-3: Build succeeds
npm run build
# Expected: no Error lines

# AC-4: Compact product cards exist
grep "pos-product-card--compact" components/pos/pos-workspace.tsx
# Expected: 1 or more results

# AC-5: Stock indicators exist
grep "pos-product-card__stock--" app/globals.css
# Expected: 3 results (available, low, out)

# AC-6: Cart summary is sticky
grep "pos-cart-mode-summary" app/globals.css
# Expected: 1 or more results with "sticky"

# AC-7: Visual depth exists
grep "box-shadow" app/globals.css | grep -c "pos\|aside"
# Expected: 1 or more

# AC-8: Checkout button is 54px
grep "min-height: 54px" app/globals.css
# Expected: 1 result

# AC-9: Success total is 32px
grep "font-size: 32px" app/globals.css
# Expected: 1 result

# AC-10: No e2e test broken — verify protected strings
grep -rn "ادفع" tests/e2e/
# If results found: "ادفع" must NOT have been changed in source
grep "تأكيد البيع" components/pos/pos-workspace.tsx
# Expected: 2 results (normal + debt variant)

# AC-11: No dark mode CSS added
grep -c "prefers-color-scheme\|dark-mode\|\.dark" app/globals.css
# Expected: 0

# AC-12: Topbar has primary accent border
grep "border-bottom.*2px.*solid" app/globals.css | grep topbar
# Expected: 1 result

# AC-13: Responsive product grid
grep "grid-template-columns: repeat" app/globals.css | grep -c "2\|3"
# Expected: 2 results

# AC-14: Only 2 source files modified
git diff --name-only
# Expected: exactly components/pos/pos-workspace.tsx and app/globals.css
```

---

## Execution Order

1. Read `components/pos/pos-workspace.tsx` completely
2. Read `app/globals.css` completely
3. Search `tests/e2e/` for all strings you plan to change
4. Read every matching test file
5. Execute Task 1 (product cards)
6. Execute Task 2 (cart summary)
7. Execute Task 3 (visual depth)
8. Execute Task 4 (cart header)
9. Execute Task 5 (checkout button)
10. Execute Task 6 (success screen)
11. Execute Task 7 (topbar polish)
12. Execute Task 8 (responsive grid)
13. Run verification checklist (AC-1 through AC-14)
14. Fix any failures
15. Create report: `POS_POLISH_REPORT_[DATE].md`
16. `git add components/pos/pos-workspace.tsx app/globals.css POS_POLISH_REPORT_[DATE].md`
17. Commit: `feat(pos): apply professional visual polish to POS interface`
18. Push: `git push origin main`

---

## Post-Execution Report

Create `POS_POLISH_REPORT_[DATE].md` containing:

- Screenshot description of each visual change (describe what changed)
- Result for each AC (AC-1 through AC-14): pass / fail
- List of every CSS rule added or modified
- List of every JSX element changed
- Any deviations from instructions with explanation
- Confirmation that no e2e test strings were broken

---

## Acceptance Criteria Summary

| AC | Criterion | Verification |
|----|-----------|-------------|
| AC-1 | TypeScript clean | `npx tsc --noEmit` → 0 |
| AC-2 | Tests pass | `npx vitest run` → all pass |
| AC-3 | Build succeeds | `npm run build` → no errors |
| AC-4 | Compact product cards | grep in tsx → found |
| AC-5 | Stock indicators CSS | grep in css → 3 variants |
| AC-6 | Sticky cart summary | grep in css → sticky |
| AC-7 | Visual depth (shadow) | grep in css → found |
| AC-8 | 54px checkout button | grep in css → found |
| AC-9 | 32px success total | grep in css → found |
| AC-10 | E2E strings intact | grep tests → unchanged |
| AC-11 | No dark mode | grep css → 0 |
| AC-12 | Topbar accent border | grep css → found |
| AC-13 | Responsive grid | grep css → 2 breakpoints |
| AC-14 | Only 2 source files modified | git diff → 2 files |
