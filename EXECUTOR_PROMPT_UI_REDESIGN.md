# Aya Mobile — UI Redesign: Light Professional Theme

## Role and Constraints

You are an expert front-end engineer executing a comprehensive visual redesign of **Aya Mobile**, an Arabic RTL retail store management system built with **Next.js 14 App Router**, **Supabase**, **Zustand 5**, and **Zod**. The UI language is Arabic. The layout direction is RTL.

### Rules

1. **Do not break existing functionality.** Every feature that works today must work identically after your changes — sales, invoices, debts, topups, transfers, reports, settings.
2. **Do not change database schema or RPC functions** unless explicitly instructed in this document.
3. **Do not add new npm dependencies.** Use only what is already installed (Lucide React for icons, sonner for toasts, Zustand for state, etc.).
4. **Do not remove any feature.** Every button, form, and flow must remain functional.
5. **Preserve all existing Arabic copy tone.** New Arabic strings must match the formal-but-concise style.
6. **Test every change** — `npx tsc --noEmit` must pass, `npx vitest run` must pass, `npm run build` must succeed.
7. **Read every file before modifying it.** Understand existing patterns before changing code.
8. **This is a visual + layout restructure, not a feature rewrite.** The underlying business logic stays the same.

---

## Current System Context

| Concept | Location |
|---|---|
| Global CSS | `app/globals.css` (~3435 lines) — CSS custom properties, dashboard layout, POS grid, components, dark theme, responsive breakpoints |
| Dashboard shell (client) | `components/dashboard/dashboard-shell.tsx` — sidebar, topbar, ICONS map, navigation rendering, mobile menu |
| Dashboard layout (server) | `app/(dashboard)/layout.tsx` — 14 navigation items in 3 groups, access control |
| POS workspace | `components/pos/pos-workspace.tsx` (~1040 lines) — product grid, cart, checkout fields, success overlay, held carts |
| POS cart store | `stores/pos-cart.ts` — Zustand with localStorage persistence, items, payments, customer, discount, held carts |
| POS types | `lib/pos/types.ts` — PosCartItem, SaleResponseData, StandardEnvelope |
| Products browser | `components/pos/products-browser.tsx` — product grid, admin management |
| Invoice detail | `components/dashboard/invoice-detail.tsx` |
| Invoices workspace | `components/dashboard/invoices-workspace.tsx` |
| Operations workspace | `components/dashboard/operations-workspace.tsx` |
| Dashboard home | `components/dashboard/dashboard-home.tsx` |
| Search workspace | `components/dashboard/search-workspace.tsx` |
| Settings workspace | `components/dashboard/settings-ops.tsx` |
| Expenses workspace | `components/dashboard/expenses-workspace.tsx` |
| Debts workspace | `components/dashboard/debts-workspace.tsx` |
| POS accounts hook | `hooks/use-pos-accounts.ts` — returns accounts with `type` field (cash, card, etc.) |
| Formatters | `lib/utils/formatters.ts` — formatCurrency(), formatDate() |

### Current CSS Architecture (to be replaced)

The current `globals.css` has:
- Dark theme support via `prefers-color-scheme: dark` (~150 lines) — **will be removed**
- Large border-radius values: 0.95rem/1.25rem/1.7rem (15-27px) — **will be reduced**
- Heavy shadows: blur up to 90px — **will be lightened**
- Sidebar on the LEFT at 280px — **will move to RIGHT at 220px**
- POS grid: `minmax(0, 1.5fr) minmax(320px, 0.9fr)` — **will become 3-column**
- Variable input heights — **will standardize to 44px**
- body font-size: 16px — **will change to 14px (15px in POS)**

---

## Design Tokens

Replace ALL current CSS custom properties in `:root` with these:

```css
:root {
  /* ─── Surfaces ─── */
  --aya-bg: #F8F9FC;
  --aya-bg-soft: #F1F3F8;
  --aya-panel: #FFFFFF;
  --aya-panel-muted: #F8F9FC;

  /* ─── Borders ─── */
  --aya-line: #E2E6EF;
  --aya-line-strong: #CBD5E1;

  /* ─── Typography ─── */
  --aya-ink: #1E293B;
  --aya-ink-soft: #334155;
  --aya-muted: #64748B;

  /* ─── Primary ─── */
  --aya-primary: #4F46E5;
  --aya-primary-hover: #4338CA;
  --aya-primary-soft: #EEF2FF;
  --aya-primary-ring: 0 0 0 2px #4F46E5;

  /* ─── Semantic ─── */
  --aya-success: #059669;
  --aya-success-soft: #ECFDF5;
  --aya-warning: #D97706;
  --aya-warning-soft: #FFFBEB;
  --aya-danger: #DC2626;
  --aya-danger-soft: #FEF2F2;
  --aya-info: #4F46E5;
  --aya-info-soft: #EEF2FF;

  /* ─── Font ─── */
  --aya-font-body: "Tajawal", "Segoe UI", system-ui, sans-serif;
  --aya-font-mono: "Consolas", "Courier New", monospace;

  /* ─── Spacing scale: 4, 8, 12, 16, 24, 32, 48 ─── */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-12: 48px;

  /* ─── Radii ─── */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* ─── Shadows ─── */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);

  /* ─── Sizing ─── */
  --input-height: 44px;
  --btn-height: 44px;
  --btn-min-width: 44px;
  --sidebar-width: 220px;
  --sidebar-collapsed: 56px;
  --topbar-height: 56px;

  /* ─── POS-specific ─── */
  --pos-body-size: 15px;
  --pos-cart-width: min(320px, 30vw);
}
```

**Remove the entire `@media (prefers-color-scheme: dark)` block.** Light theme only.

---

## Typography Scale

```css
html { font-size: 14px; }
body { font-family: var(--aya-font-body); line-height: 1.6; color: var(--aya-ink); }

h1 { font-size: 22px; font-weight: 600; line-height: 1.3; }
h2 { font-size: 17px; font-weight: 600; line-height: 1.3; }
h3 { font-size: 14px; font-weight: 500; line-height: 1.3; }
.text-small { font-size: 13px; }
.text-caption { font-size: 12px; }

/* POS-specific: larger text for arm's-length reading */
.pos-layout { font-size: var(--pos-body-size); }
```

---

## Task 1 — Sidebar Restructuring

### Current State
- Sidebar is on the **left** (`border-inline-end`), 280px wide
- On tablet: off-canvas fixed, slides from right (RTL)
- On mobile: same off-canvas, 92vw max

### New Behavior

The sidebar moves to the **right** side across all screens.

#### Desktop (≥1280px) — Full sidebar

```css
.dashboard-layout {
  display: grid;
  grid-template-columns: 1fr var(--sidebar-width);  /* content | sidebar */
  grid-template-rows: var(--topbar-height) 1fr;
  min-height: 100vh;
}

.dashboard-sidebar {
  grid-column: 2;
  grid-row: 1 / -1;
  position: sticky;
  top: 0;
  height: 100vh;
  width: var(--sidebar-width);
  border-inline-start: 1px solid var(--aya-line);  /* RIGHT border for RTL */
  padding: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
  overflow-y: auto;
  background: var(--aya-panel);
}
```

Each navigation item shows: **icon + text label**. Active item has `background: var(--aya-primary-soft); color: var(--aya-primary);`. Non-active items have `color: var(--aya-muted);` with hover `background: var(--aya-bg-soft);`.

#### Desktop in POS (≥1280px) — Collapsed sidebar

When the user is on `/pos`, the sidebar collapses to icons only:

```css
.dashboard-layout--pos .dashboard-sidebar {
  width: var(--sidebar-collapsed);
  padding: var(--sp-3);
}

.dashboard-layout--pos .dashboard-nav__label,
.dashboard-layout--pos .dashboard-nav-group__title,
.dashboard-layout--pos .dashboard-sidebar__brand-text,
.dashboard-layout--pos .dashboard-sidebar__footer-text {
  display: none;
}
```

The layout must pass a prop or CSS class to indicate POS mode. In `dashboard-shell.tsx`, detect if the current path is `/pos` and apply `.dashboard-layout--pos`.

#### Tablet (768px–1279px) — Icon-only sidebar

```css
@media (max-width: 1279px) {
  .dashboard-sidebar {
    width: var(--sidebar-collapsed);
    padding: var(--sp-3);
  }
  .dashboard-nav__label,
  .dashboard-nav-group__title { display: none; }
}
```

#### Mobile (<768px) — Bottom bar

The sidebar becomes a fixed bottom navigation bar with 5 icon buttons:

```css
@media (max-width: 767px) {
  .dashboard-sidebar {
    position: fixed;
    bottom: 0;
    right: 0;
    left: 0;
    top: auto;
    height: auto;
    width: 100%;
    flex-direction: row;
    justify-content: space-around;
    padding: var(--sp-2) 0;
    border-top: 1px solid var(--aya-line);
    border-inline-start: none;
    background: var(--aya-panel);
    z-index: 50;
  }
  .dashboard-content {
    padding-bottom: 64px; /* space for bottom bar */
  }
}
```

**Bottom bar items (5 only, in order):**
1. نقطة البيع (pos icon) — highest priority
2. المنتجات (products icon)
3. الفواتير (invoices icon)
4. الجرد (inventory icon)
5. القائمة (menu/hamburger icon) — opens full sidebar overlay

In `dashboard-shell.tsx`, create a `BOTTOM_BAR_ITEMS` array with these 5 items. The "menu" button opens the full sidebar as an overlay (reuse the existing mobile menu logic with `isMenuOpen`).

Navigation items not in the bottom bar are only accessible via the menu overlay.

### Topbar

```css
.dashboard-topbar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-6);
  border-bottom: 1px solid var(--aya-line);
  background: var(--aya-panel);
}

.dashboard-topbar__start {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
/* Contains: breadcrumbs or page title */

.dashboard-topbar__end {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
/* Contains: search icon/input, notification bell with badge, user avatar */
```

---

## Task 2 — POS Layout Redesign

This is the most critical change. The POS screen is used 90% of the time.

### New POS Grid (Desktop ≥1280px)

```css
.pos-layout {
  display: grid;
  grid-template-columns: 1fr var(--pos-cart-width) var(--sidebar-collapsed);
  grid-template-rows: 1fr;
  height: 100vh;
  overflow: hidden;
  font-size: var(--pos-body-size);
}
```

Three columns (RTL, right to left):
1. **Far right (56px)**: Navigation icons (collapsed sidebar — handled by `.dashboard-layout--pos`)
2. **Middle right (min(320px, 30vw))**: Cart + Checkout panel
3. **Left (1fr)**: Products area

### Products Area

```
┌─────────────────────────────────────────────┐
│ [🔍 search input (autofocus)]  [بيع جديد] [محتجز(N)]  │  ← sticky header
├─────────────────────────────────────────────┤
│ [chip: الكل] [chip: إكسسوارات] [chip: ...]  │  ← category filter
├─────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │● name│ │● name│ │● name│ │● name│       │  ← scrollable grid
│ │ price│ │ price│ │ price│ │ price│       │
│ └──────┘ └──────┘ └──────┘ └──────┘       │
│                                             │
└─────────────────────────────────────────────┘
```

#### Products header (sticky top)

- Search input: `type="search"`, autofocus, placeholder "ابحث عن منتج..."
- "بيع جديد" button: clears cart (secondary style)
- "محتجز (N)" button: shows held carts count, opens held carts dropdown

#### Product display toggle

Add a toggle in the products header: two icon buttons for "عرض مدمج" (text-only, default) and "عرض بالصور" (thumbnails). Store preference in `localStorage` under key `aya-pos-product-view`.

- **Text view (default)**: Each product is a button with name (2 lines max, ellipsis), price, and a colored stock dot.
- **Thumbnail view**: Same but with a small image area at top (48px height). If no image URL exists on the product, show a placeholder icon.

#### Product card CSS

```css
.pos-product-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 80px;
  padding: var(--sp-3);
  border: 1px solid var(--aya-line);
  border-radius: var(--radius-md);
  background: var(--aya-panel);
  cursor: pointer;
  transition: border-color 150ms;
}
.pos-product-card:hover { border-color: var(--aya-primary); }
.pos-product-card:focus-visible { box-shadow: var(--aya-primary-ring); outline: none; }

.pos-product-card--quick-add { border-color: var(--aya-primary-soft); }

.pos-product-card__name {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pos-product-card__price { font-size: 14px; font-weight: 600; margin-top: auto; }

.pos-product-card__stock-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.pos-product-card__stock-dot--ok { background: var(--aya-success); }
.pos-product-card__stock-dot--low { background: var(--aya-warning); }
.pos-product-card__stock-dot--out { background: var(--aya-danger); }
```

Grid:
```css
.pos-product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--sp-2);
  overflow-y: auto;
  padding: var(--sp-3);
}
```

### Cart Panel — Two States

The cart panel has a component-level state variable:

```typescript
const [checkoutMode, setCheckoutMode] = useState<"cart" | "checkout">("cart");
```

This is **NOT** stored in Zustand — it's local component state that resets on navigation.

#### State 1: Cart Mode (default)

```
┌──────────────────────────┐
│    الطلب الحالي           │
├──────────────────────────┤
│ product name       ×1    │
│              100 د.أ     │
│  [−] [1] [+]       [×]  │
├──────────────────────────┤
│ product name       ×2    │
│               80 د.أ     │
├──────────────────────────┤
│ (scrollable area)         │
├──────────────────────────┤
│ الإجمالي:      260 د.أ   │  ← sticky bottom
│ ┌──────────────────────┐ │
│ │    ادفع 260 د.أ      │ │  ← PRIMARY button
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │     تفريغ السلة      │ │  ← ghost button (text only)
│ └──────────────────────┘ │
└──────────────────────────┘
```

- Cart items list: scrollable, each item shows name + quantity controls + line total + delete button
- Quantity buttons (`+`, `−`): min-width and min-height 44px (touch target)
- Summary: single line showing total
- "ادفع" button: primary style, full width. Clicking it sets `checkoutMode = "checkout"`
- "ادفع" is **disabled** if cart is empty or no items
- "تفريغ السلة": ghost button, clears cart

#### State 2: Checkout Mode

When `checkoutMode === "checkout"`, the cart panel transforms:

```
┌──────────────────────────┐
│ → رجوع      إتمام البيع  │  ← header with back arrow
├──────────────────────────┤
│ طريقة الدفع              │
│ [كاش 💵] [بطاقة 💳] [CliQ]│  ← account type chips
├──────────────────────────┤
│ المبلغ المستلم            │  ← only for cash
│ [500          ]           │
│ الباقي للعميل: 40.00 د.أ │  ← green, only if > 0
├──────────────────────────┤
│ + أضف طريقة دفع أخرى    │  ← split payment link
├──────────────────────────┤
│ العميل (اختياري)         │
│ [ابحث عن عميل...]       │
├──────────────────────────┤
│ خصم (اختياري)   حد: 15% │
│ [0             ]%         │
├──────────────────────────┤
│ ملاحظات (اختياري)        │
│ [________________]        │
├──────────────────────────┤
│ المجموع         460 د.أ  │  ← sticky bottom
│ خصم فاتورة       0 د.أ  │
│ الصافي          460 د.أ  │
│ ┌──────────────────────┐ │
│ │   ✓ تأكيد البيع      │ │  ← PRIMARY button
│ └──────────────────────┘ │
└──────────────────────────┘
```

**Critical details:**

**A. Payment method selection**

Instead of a dropdown `<select>` for account, display accounts as **chip buttons** grouped visually. Use the account `type` field to show an appropriate icon:
- `cash` → 💵 or banknote icon
- `card` / `visa` / `mastercard` → 💳 or credit-card icon
- `cliq` or any other → appropriate icon or just text

The first available account is auto-selected. When selected, the chip gets `background: var(--aya-primary); color: white;`.

**B. Amount received (cash only)**

The "المبلغ المستلم" input appears **only** when the selected account type is `cash`. If amount > total, show "الباقي للعميل: X د.أ" in green.

**C. Split payment**

Clicking "+ أضف طريقة دفع أخرى" adds a second payment row. Each row shows:
- Account type chips (filtered to exclude already-selected accounts)
- Amount input
- Delete button (×)

The remaining amount updates live: `remaining = finalTotal - sum(payment amounts)`.

**Implementation in the store** (`stores/pos-cart.ts`):

Add to the store interface:
```typescript
splitPayments: Array<{ accountId: string; amount: number }>;
addSplitPayment: (accountId: string, amount: number) => void;
removeSplitPayment: (index: number) => void;
updateSplitPaymentAmount: (index: number, amount: number) => void;
clearSplitPayments: () => void;
```

Initialize `splitPayments: []` in `createDefaultState()`. Reset in `clearCart()` and `completeSale()`. Add to `partialize` for persistence. Also add to `HeldCart` type.

When submitting the sale, construct the payments array:
```typescript
// If no split payments, use the primary selectedAccountId
// If split payments exist, combine primary + additional
const payments = splitPayments.length > 0
  ? [
      { account_id: selectedAccountId, amount: primaryPaymentAmount },
      ...splitPayments.map(p => ({ account_id: p.accountId, amount: p.amount }))
    ].filter(p => p.amount > 0)
  : [{ account_id: selectedAccountId, amount: paymentAmount }];
```

The `create_sale` RPC already accepts `p_payments` as a JSONB array and loops through multiple payments. **No backend changes needed.**

**D. "رجوع" (Back) button**

Clicking "رجوع" sets `checkoutMode = "cart"`. Does NOT clear any fields — the user can go back and forth without losing data.

**E. "تأكيد البيع" button states**

| State | Appearance |
|---|---|
| Enabled | `background: var(--aya-primary)`, "✓ تأكيد البيع" |
| Disabled (remaining > 0 or no account) | `opacity: 0.5`, `pointer-events: none` |
| Submitting | `opacity: 0.7`, spinner icon replaces ✓, text "جارٍ التنفيذ...", `pointer-events: none` |

**F. Keyboard shortcuts**

Add keyboard event listeners in `pos-workspace.tsx` (use `useEffect` with `keydown`):

| Key | Action | Condition |
|---|---|---|
| `/` or `F1` | Focus search input | Always |
| `F2` | Switch to checkout mode | Cart has items |
| `Escape` | Back to cart mode / close held carts | In checkout mode or held carts open |

#### State 3: Success Screen

After successful sale submission, show the success overlay:

```
┌──────────────────────────┐
│                          │
│         ✓                │  ← large green circle with checkmark
│      تم البيع             │
│                          │
│  تمت عملية البيع بنجاح    │
│     533.60 د.أ           │  ← large total
│                          │
│ فاتورة #AYA-2026-00001   │
│                          │
│ كاش: 300  بطاقة: 233.60  │  ← payment breakdown
│                          │
│ الباقي للعميل: 0.00 د.أ  │
│                          │
│ ┌──────────────────────┐ │
│ │   🖨 طباعة إيصال     │ │  ← PRIMARY button
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │     بيع جديد         │ │  ← secondary button
│ └──────────────────────┘ │
└──────────────────────────┘
```

- Show invoice_number and total from `lastCompletedSale`
- Show payment breakdown if split payment was used
- Show change amount if > 0
- "طباعة إيصال" button: navigates to `/invoices/[id]` with a `?print=1` query param (the invoice detail page should detect this and trigger `window.print()` on load)
- "بيع جديد" button: clears cart, resets to cart mode

### POS on Tablet (768px–1279px)

```css
@media (max-width: 1279px) {
  .pos-layout {
    grid-template-columns: 1fr var(--pos-cart-width);
    /* Navigation sidebar collapses to 56px icon-only, handled by sidebar CSS */
  }
}

@media (max-width: 1023px) {
  .pos-layout {
    grid-template-columns: 1fr;
  }
}
```

On tablet (1024-1279px): 2 columns — products and cart. Sidebar is icon-only 56px.
On small tablet (768-1023px): 1 column. Cart becomes a bottom sheet.

### POS on Mobile (<768px)

The cart becomes a **bottom sheet**:

```css
.pos-cart-sheet {
  position: fixed;
  bottom: 64px; /* above bottom nav bar */
  left: 0;
  right: 0;
  background: var(--aya-panel);
  border-top: 1px solid var(--aya-line);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-md);
  transition: transform 250ms ease;
  z-index: 40;
}

/* Collapsed state: just a summary bar */
.pos-cart-sheet--collapsed {
  transform: translateY(calc(100% - 56px));
}
/* 56px visible = drag handle + "3 بنود — 460 د.أ" */

/* Expanded state: full cart */
.pos-cart-sheet--expanded {
  transform: translateY(0);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
}
```

- Collapsed: shows item count + total + drag handle
- Tapping the collapsed bar or dragging up expands it
- When user taps "ادفع" in expanded mode: the sheet transitions to full-screen checkout (not a new modal)

```css
.pos-cart-sheet--fullscreen {
  top: 0;
  bottom: 0;
  border-radius: 0;
  max-height: 100vh;
}
```

---

## Task 3 — Component Library

Standardize all UI components across the system. These CSS classes replace their existing counterparts.

### Buttons

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  height: var(--btn-height);
  min-width: var(--btn-min-width);
  padding: 0 var(--sp-4);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  border: 1px solid transparent;
}
.btn:focus-visible { box-shadow: var(--aya-primary-ring); outline: none; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

.btn--primary { background: var(--aya-primary); color: #fff; border-color: var(--aya-primary); }
.btn--primary:hover { background: var(--aya-primary-hover); }

.btn--secondary { background: var(--aya-panel); color: var(--aya-ink); border-color: var(--aya-line); }
.btn--secondary:hover { background: var(--aya-bg-soft); }

.btn--ghost { background: transparent; color: var(--aya-muted); }
.btn--ghost:hover { background: var(--aya-bg-soft); color: var(--aya-ink); }

.btn--danger { background: var(--aya-danger-soft); color: var(--aya-danger); border-color: #FECACA; }
.btn--danger:hover { background: #FEE2E2; }
```

**Rule**: Only ONE `btn--primary` per visible screen area. All other actions use secondary/ghost.

### Inputs

```css
.field-input {
  height: var(--input-height);
  width: 100%;
  border: 1px solid var(--aya-line);
  border-radius: var(--radius-md);
  padding: 0 var(--sp-3);
  font-size: 14px;
  font-family: inherit;
  background: var(--aya-panel);
  color: var(--aya-ink);
  transition: border-color 150ms;
}
.field-input:focus { border-color: var(--aya-primary); box-shadow: 0 0 0 3px var(--aya-primary-soft); outline: none; }
.field-input--error { border-color: var(--aya-danger); }
.field-input--error:focus { box-shadow: 0 0 0 3px var(--aya-danger-soft); }

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--aya-ink-soft);
  margin-bottom: var(--sp-1);
}
.field-error {
  font-size: 12px;
  color: var(--aya-danger);
  margin-top: var(--sp-1);
}
.field-hint {
  font-size: 12px;
  color: var(--aya-muted);
  margin-top: var(--sp-1);
}
```

Label is ALWAYS above the field, never inside as placeholder. Placeholder is supplementary only.

### Tables

```css
.data-table { width: 100%; border-collapse: collapse; }
.data-table thead { background: var(--aya-bg-soft); }
.data-table th {
  padding: var(--sp-3) var(--sp-4);
  font-size: 13px;
  font-weight: 500;
  color: var(--aya-muted);
  text-align: start;
  border: none;
}
.data-table td {
  padding: var(--sp-3) var(--sp-4);
  font-size: 14px;
  border-bottom: 1px solid var(--aya-bg-soft);
}
.data-table tr:hover td { background: var(--aya-panel-muted); }
/* No zebra striping */
```

### Badges

Every badge MUST include either an icon or text — never color alone (accessibility for color-vision deficiency).

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
}
.badge--success { background: var(--aya-success-soft); color: var(--aya-success); }
.badge--warning { background: var(--aya-warning-soft); color: var(--aya-warning); }
.badge--danger { background: var(--aya-danger-soft); color: var(--aya-danger); }
.badge--info { background: var(--aya-info-soft); color: var(--aya-info); }
```

In all badge usage across the codebase, ensure there is an icon (Lucide) or descriptive text alongside the color. For example:
- Stock badge "متوفر" ✓ (text is enough)
- Stock badge "نفد" with `AlertTriangle` icon + text
- Stock badge "منخفض" with `AlertCircle` icon + text

### Stat Cards

```css
.stat-card {
  background: var(--aya-panel);
  border: 1px solid var(--aya-line);
  border-radius: var(--radius-lg);
  padding: var(--sp-6);
}
.stat-card__value { font-size: 28px; font-weight: 600; line-height: 1.2; }
.stat-card__label { font-size: 13px; color: var(--aya-muted); margin-top: var(--sp-1); }
.stat-card__trend { font-size: 12px; font-weight: 500; margin-top: var(--sp-2); }
.stat-card__trend--up { color: var(--aya-success); }
.stat-card__trend--down { color: var(--aya-danger); }
```

### Toasts (sonner configuration)

In the root layout or the component that renders `<Toaster>`, configure sonner:

```tsx
<Toaster
  position="top-right"
  dir="rtl"
  toastOptions={{
    duration: 4000,
    style: {
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'var(--aya-font-body)',
    },
  }}
/>
```

Four types: `toast.success()`, `toast.warning()`, `toast.error()`, `toast.info()`. No modals for simple notifications.

### Empty States

Every page/section that can be empty must show:

```tsx
<div className="empty-state">
  <LucideIcon className="empty-state__icon" />
  <h3 className="empty-state__title">لا توجد فواتير</h3>
  <p className="empty-state__description">أنشئ فاتورة جديدة من نقطة البيع</p>
  <button className="btn btn--secondary">+ فاتورة جديدة</button>
</div>
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-12) var(--sp-6);
  text-align: center;
}
.empty-state__icon { width: 48px; height: 48px; color: var(--aya-muted); opacity: 0.5; }
.empty-state__title { font-size: 17px; font-weight: 600; }
.empty-state__description { font-size: 13px; color: var(--aya-muted); max-width: 300px; }
```

### Skeleton Loading

Replace all spinner-based loading with skeleton shimmer:

```css
.skeleton {
  background: linear-gradient(90deg, var(--aya-bg-soft) 25%, var(--aya-line) 50%, var(--aya-bg-soft) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Create skeleton variants:
- `.skeleton--text`: height 14px, width 60-80%
- `.skeleton--card`: height 80px, full width
- `.skeleton--stat`: height 100px
- `.skeleton--row`: height 48px, full width

### Confirmation Dialog

```css
.confirm-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.confirm-dialog {
  background: var(--aya-panel);
  border-radius: var(--radius-lg);
  padding: var(--sp-6);
  max-width: 400px;
  width: calc(100% - var(--sp-8));
  box-shadow: var(--shadow-md);
}
.confirm-dialog__title { font-size: 17px; font-weight: 600; }
.confirm-dialog__body { font-size: 14px; color: var(--aya-muted); margin: var(--sp-4) 0; }
.confirm-dialog__actions { display: flex; gap: var(--sp-2); justify-content: flex-start; }
```

All destructive actions (delete, cancel invoice, clear cart) must use this dialog. The primary action button shows a spinner when processing (disabled state with inline spinner icon).

### Offline Warning Bar

```css
.offline-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 36px;
  background: var(--aya-warning-soft);
  color: var(--aya-warning);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  font-size: 13px;
  font-weight: 500;
  z-index: 200;
}
```

Show "لا يوجد اتصال بالإنترنت" with `WifiOff` icon when `navigator.onLine === false`. Listen to `online`/`offline` events. Render this in the dashboard shell.

---

## Task 4 — Permission-Restricted UI

For elements the current user doesn't have permission for:

- **Show the element as disabled** (not hidden). Add `opacity: 0.5; pointer-events: none;`.
- Add a `title` attribute with "لا تملك صلاحية لهذا الإجراء" as tooltip.
- This applies to: discount input (if no discount permission), admin-only actions visible to pos_staff, etc.

**Exception**: Navigation items that are admin-only should remain **hidden** (not shown disabled) to avoid confusing pos_staff with features they can never access.

---

## Task 5 — Apply to All Dashboard Pages

After the foundation CSS is rewritten, every workspace component needs class updates. For each component listed below, replace old class names with the new standardized ones:

| Component | Key Changes |
|---|---|
| `dashboard-home.tsx` | Stat cards use `.stat-card`. Alert cards use `.badge`. Tables use `.data-table`. |
| `invoices-workspace.tsx` | Table uses `.data-table`. Chips use `.badge--*`. Search uses `.field-input`. |
| `invoice-detail.tsx` | Summary uses definition list with `.text-small` labels. Buttons use `.btn--*`. |
| `operations-workspace.tsx` | Form fields use `.field-input` + `.field-label`. Result cards use `.stat-card`. |
| `expenses-workspace.tsx` | Same pattern — fields, labels, tables, badges. |
| `debts-workspace.tsx` | Customer list, payment form, badges. |
| `settings-ops.tsx` | Section chips use `.badge--*` or `.btn--ghost`. Forms use `.field-input`. |
| `products-browser.tsx` | Product cards use `.pos-product-card` pattern. Admin form uses `.field-input`. |
| `search-workspace.tsx` | Results use `.data-table` or card pattern. Entity chips use `.badge--*`. |

**Do not rewrite component logic.** Only update className strings and adjust JSX structure where the new layout requires it (e.g., wrapping elements in new containers).

### SectionCard Pattern

The existing `SectionCard` component wraps content in a white card. Update its CSS:

```css
.section-card {
  background: var(--aya-panel);
  border: 1px solid var(--aya-line);
  border-radius: var(--radius-lg);
  padding: var(--sp-6);
}
```

### PageHeader Pattern

```css
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
}
.page-header__title { font-size: 22px; font-weight: 600; }
.page-header__actions { display: flex; gap: var(--sp-2); }
```

---

## Task 6 — Cleanup

1. **Delete the entire dark theme block** in `globals.css` (everything inside `@media (prefers-color-scheme: dark)`).
2. **Delete old animation/transition CSS** that is no longer referenced.
3. **Replace all hardcoded color values** in components with CSS variable references. Search for `#` in tsx files and replace with `var(--aya-*)` where appropriate.
4. **Replace all hardcoded spacing values** (e.g., `margin: 16px`, `padding: 1.5rem`) with `var(--sp-*)` values using the spacing scale.
5. **Replace all hardcoded border-radius values** with `var(--radius-*)`.
6. **Remove unused CSS classes** that are no longer referenced by any component.

---

## Execution Order

Execute in this order to minimize breakage:

1. **Design tokens** — Replace `:root` variables in globals.css. Remove dark theme.
2. **Typography** — Update html/body/heading sizes and line-heights.
3. **Component library CSS** — Add new `.btn`, `.field-input`, `.data-table`, `.badge`, `.stat-card`, `.empty-state`, `.skeleton`, `.confirm-dialog`, `.offline-bar` classes.
4. **Sidebar restructuring** — Modify `dashboard-shell.tsx` and sidebar CSS. Move to right side, add collapse logic, add bottom bar for mobile.
5. **Dashboard layout** — Update `layout.tsx` grid, topbar, content area.
6. **POS layout** — Restructure `pos-workspace.tsx` with 3-column grid, two-state cart, payment method chips, split payment, success screen, keyboard shortcuts, product cards.
7. **POS store changes** — Add `splitPayments` to `pos-cart.ts`.
8. **Dashboard pages** — Update all workspace components with new class names.
9. **Cleanup** — Remove dead CSS, hardcoded values, unused classes.
10. **Verification** — `tsc`, `vitest`, `build`, browser check.

---

## Completion Report

After all tasks are complete, produce a report in **exactly** this structure:

```markdown
# Execution Report — UI Redesign: Light Professional Theme

## Summary
- Tasks completed: [N]/6
- Total files modified: [count]
- Total CSS lines before: ~3435
- Total CSS lines after: [count]
- New components added: [count]

## Task-by-Task Status

### Task 1 — Design Tokens & Typography
- **Status**: [completed / partial / skipped]
- **Files modified**: [list]
- **What was done**: [description]
- **Deviation from spec**: [any or "none"]

### Task 2 — Sidebar & Layout
- **Status**: [completed / partial / skipped]
- **Files modified**: [list]
- **What was done**: [description]
- **Key decisions**: [sidebar behavior, breakpoints, bottom bar items]

### Task 3 — POS Layout
- **Status**: [completed / partial / skipped]
- **Files modified**: [list]
- **What was done**: [description]
- **Split payment**: [implemented / skipped with reason]
- **Keyboard shortcuts**: [implemented / skipped with reason]
- **Bottom sheet mobile**: [implemented / skipped with reason]

### Task 4 — Component Library
- **Status**: [completed / partial / skipped]
- **Components standardized**: [list]
- **Skeleton loading**: [where applied]
- **Empty states**: [where applied]

### Task 5 — Dashboard Pages
- **Status**: [completed / partial / skipped]
- **Pages updated**: [list]

### Task 6 — Cleanup
- **Status**: [completed / partial / skipped]
- **CSS lines removed**: [count]
- **Dark theme removed**: [yes/no]

## Verification Summary
- TypeScript compilation: [pass/fail]
- Existing tests: [pass/fail with count]
- Build: [pass/fail]
- Browser verification: [pages checked]

## Screenshots or Descriptions
- POS cart mode: [description of what it looks like]
- POS checkout mode: [description]
- POS success screen: [description]
- Dashboard home: [description]
- Sidebar desktop: [description]
- Sidebar mobile: [description]

## Warnings
- [Any concerns, edge cases, or things requiring manual verification]

## Files Changed (Complete List)
| File | Action | Description |
|---|---|---|
| [path] | modified / created | [one-line summary] |
```

**Do not skip any section. Do not abbreviate. The report is the primary review artifact.**
