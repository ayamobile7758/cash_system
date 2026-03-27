# Aya Mobile — UI Redesign V2: Light Professional Theme

> **Authority Declaration**: This document is the **sole authoritative source** for the UI redesign. It supersedes `EXECUTOR_PROMPT_UI_REDESIGN.md`, any conflicting statements in the Execution Live Tracker (`31_Execution_Live_Tracker.md`), the PreBuild Verification Matrix (`27_PreBuild_Verification_Matrix.md`), and any prior "frontend redesign complete" claims. If any other document conflicts with this prompt, **this prompt wins**.

---

## Role and Constraints

You are an expert front-end engineer executing a comprehensive visual and structural redesign of **Aya Mobile**, an Arabic RTL retail store management system built with **Next.js 14 App Router**, **Supabase**, **Zustand 5**, and **Zod**. The UI language is Arabic. The layout direction is RTL.

### Rules

1. **Do not break existing functionality.** Every feature that works today must work identically after your changes — sales, invoices, debts, topups, transfers, reports, settings.
2. **Do not change database schema or RPC functions** unless explicitly instructed in this document.
3. **Do not add new npm dependencies.** Use only what is already installed (Lucide React for icons, sonner for toasts, Zustand for state, etc.).
4. **Do not remove any feature.** Every button, form, and flow must remain functional.
5. **Preserve all existing Arabic copy tone.** New Arabic strings must match the formal-but-concise style.
6. **Test every change** — `npx tsc --noEmit` must pass, `npx vitest run` must pass, `npm run build` must succeed.
7. **Read every file before modifying it.** Understand existing patterns before changing code.
8. **This is a visual + layout + checkout restructure, not a full feature rewrite.** Underlying business logic stays the same except where this document explicitly adds new behavior (split payment, debt mode, post-sale closure).
9. **Light theme only.** Remove all dark-mode CSS. Do not add dark-mode support. This is a product decision, not an oversight.
10. **One authoritative truth.** If you encounter a conflict between this document and any other file in the repository (including other documentation, tests, or tracker), follow this document. Update tests to match, not the other way around.

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
| POS accounts hook | `hooks/use-pos-accounts.ts` — returns accounts with `type` field (cash, card, etc.) |
| Products hook | `hooks/use-products.ts` — preloads products, client-side filtering |
| Invoice detail | `components/dashboard/invoice-detail.tsx` |
| Invoices workspace | `components/dashboard/invoices-workspace.tsx` |
| Operations workspace | `components/dashboard/operations-workspace.tsx` |
| Dashboard home | `components/dashboard/dashboard-home.tsx` |
| Search workspace | `components/dashboard/search-workspace.tsx` |
| Settings workspace | `components/dashboard/settings-ops.tsx` |
| Expenses workspace | `components/dashboard/expenses-workspace.tsx` |
| Debts workspace | `components/dashboard/debts-workspace.tsx` |
| Formatters | `lib/utils/formatters.ts` — formatCurrency(), formatDate() |
| Sale API | `app/api/sales/route.ts` — `create_sale` RPC accepts `p_payments` as JSONB array |

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

## Product Decisions (Ratified)

These decisions resolve the ambiguities and contradictions identified in the audit. They are **final** for this implementation wave. Do not deviate from them.

### PD-1: Payment Model

- **Single payment is the default.** The checkout opens with one payment method selected.
- **Split payment is a core requirement**, not a future enhancement. The `create_sale` RPC already accepts `p_payments` as a JSONB array. The UI must expose this capability.
- **Payment method taxonomy**: accounts from `use-pos-accounts` are displayed as chip buttons. The `type` field determines the icon and behavior:
  - `cash` → banknote icon, shows "المبلغ المستلم" input, shows "الباقي للعميل" if overpaid
  - `card` / `visa` / `mastercard` → credit-card icon, no amount-received input needed (assumes exact)
  - `cliq` → CliQ icon or text label, no amount-received input (assumes exact)
  - Any other type → text label from account `name`, no amount-received input
- **Fee visibility**: if an account has `fee_percentage > 0`, display it next to the chip label: e.g., "بطاقة (2.5%)" and show the calculated fee amount in the summary section as a separate line.
- **Account persistence reset**: when a sale completes or the cart is cleared, `selectedAccountId` must reset to the first available account — it must NOT persist from the previous sale silently. This prevents wrong-account carry-over.

### PD-2: Debt Model

- **Debt is an explicit mode, not an implicit underpayment consequence.**
- When the total paid (across all payment rows) is less than the net total:
  - If **no customer is selected**: the "تأكيد البيع" button is **disabled**. Show a message: "يجب اختيار عميل أو إكمال المبلغ" in `var(--aya-danger)`.
  - If **a customer is selected**: show a clear **debt preview panel** above the confirm button:
    ```
    ┌────────────────────────────────────┐
    │ ⚠️ سيتم تسجيل دين                  │
    │ المبلغ المتبقي: 150.00 د.أ         │
    │ على حساب: أحمد محمد                 │
    │ ────────────────────────────────── │
    │ [✓ تأكيد البيع وتسجيل الدين]       │
    └────────────────────────────────────┘
    ```
  - The confirm button text changes to "تأكيد البيع وتسجيل الدين" (warning style: `background: var(--aya-warning); color: white;`) to make the debt action unmistakable.
- **No debt is ever created without the cashier seeing the debt preview.** This is a non-negotiable safety rule.

### PD-3: Receipt Strategy

- **Receipt/print is available but not mandatory.**
- After successful sale, the success screen shows two CTAs:
  1. "طباعة إيصال" (primary) — navigates to `/invoices/[id]?print=1`
  2. "بيع جديد" (secondary) — clears and resets
- The success screen must persist until the cashier explicitly acts. No auto-dismiss.
- "طباعة إيصال" opens the invoice in a new context; the POS stays in success state until "بيع جديد" is clicked.

### PD-4: Post-Sale Completion

The success screen is not merely "sale succeeded." It must be a **complete closure**:
- Large green checkmark animation
- "تم البيع بنجاح" title
- Invoice number: `فاتورة #AYA-2026-XXXXX`
- Total amount (large)
- **Payment breakdown**: each payment method and its amount, listed separately
- **Fee breakdown**: if any payment had fees, show the fee line
- **Change due**: if cash overpayment, show "الباقي للعميل: X د.أ" in green
- **Debt notice**: if debt was created, show "دين مسجل: X د.أ على حساب [اسم العميل]" in warning color
- Customer name if one was selected
- Discount amount if applied

### PD-5: Remaining-to-Settle Concept

- The checkout must always show a **live "المتبقي للسداد"** value:
  ```
  المتبقي للسداد: 150.00 د.أ
  ```
- This value = `netTotal - sum(all payment amounts)`
- When remaining = 0: show "✓ المبلغ مكتمل" in green
- When remaining < 0 (overpayment on cash): show "الباقي للعميل: X د.أ" in green
- When remaining > 0: show the amount in `var(--aya-danger)` color
- The confirm button is disabled unless: (remaining ≤ 0) OR (remaining > 0 AND customer is selected, triggering debt mode)

### PD-6: Dark Mode

- **Light theme only.** This is a deliberate product decision for an operational POS environment.
- Remove all `@media (prefers-color-scheme: dark)` blocks.
- Update any tests that assert dark-mode behavior to assert light-mode-only behavior instead.

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

  /* ─── Safe area (mobile) ─── */
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);

  /* ─── Z-index scale ─── */
  --z-base: 0;
  --z-cart-sheet: 40;
  --z-bottom-bar: 50;
  --z-offline-bar: 60;
  --z-drawer: 70;
  --z-toast: 80;
  --z-dialog: 100;
  --z-fullscreen-checkout: 110;
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

/* POS product name: minimum 14px for recognition safety */
.pos-product-card__name { font-size: 14px; font-weight: 600; }
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
    padding-bottom: calc(var(--sp-2) + var(--safe-area-bottom));
    border-top: 1px solid var(--aya-line);
    border-inline-start: none;
    background: var(--aya-panel);
    z-index: var(--z-bottom-bar);
  }
  .dashboard-content {
    padding-bottom: calc(64px + var(--safe-area-bottom)); /* space for bottom bar + safe area */
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
│ │ SKU  │ │ SKU  │ │ SKU  │ │ SKU  │       │
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

- **Text view (default)**: Each product is a button with name (2 lines max, ellipsis), SKU, price, and a colored stock indicator.
- **Thumbnail view**: Same but with a small image area at top (48px height). If no image URL exists on the product, show a placeholder icon.

#### Product Card CSS — Recognition-Safe Design

The audit found that similar Arabic product names (e.g., "سماعة بلوتوث سوداء" vs "سماعة بلوتوث بيضاء") need stronger disambiguation. The product card must show **three** information layers:

```css
.pos-product-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 88px;
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

/* Layer 1: Product name — MOST PROMINENT */
.pos-product-card__name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--aya-ink);
}

/* Layer 2: SKU — disambiguation aid, always visible */
.pos-product-card__sku {
  font-size: 11px;
  font-weight: 400;
  font-family: var(--aya-font-mono);
  color: var(--aya-muted);
  letter-spacing: 0.5px;
  margin-top: var(--sp-1);
  direction: ltr;
  text-align: start;
}

/* Layer 3: Price + Stock indicator */
.pos-product-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--sp-1);
}

.pos-product-card__price { font-size: 14px; font-weight: 600; color: var(--aya-primary); }

.pos-product-card__stock-indicator {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
}
.pos-product-card__stock-indicator--ok { color: var(--aya-success); }
.pos-product-card__stock-indicator--low { color: var(--aya-warning); }
.pos-product-card__stock-indicator--out { color: var(--aya-danger); }
```

**Recognition safety rules:**
- Product name: **14px font-weight 600** (not 13px). On a real counter, 13px Arabic is risky for similar names.
- SKU is **always visible** on every card — it is the ultimate disambiguator between similar products.
- Stock indicator uses **text + color** (not color-dot alone). E.g., "5 متوفر", "2 منخفض", "نفد". This satisfies the audit's accessibility requirement.

Grid:
```css
.pos-product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--sp-2);
  overflow-y: auto;
  padding: var(--sp-3);
}
```

Note: `minmax(130px, 1fr)` instead of `120px` — the extra 10px allows the SKU line and Arabic text to breathe.

### Arabic Search Normalization

The current search is basic `toLowerCase().trim()`. Improve it to handle common Arabic typing inconsistencies. In the filtering logic in `pos-workspace.tsx`:

```typescript
function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Normalize alef variants → ا
    .replace(/[أإآٱ]/g, "ا")
    // Normalize taa marbuta → ه
    .replace(/ة/g, "ه")
    // Remove tashkeel (diacritics)
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // Normalize yaa variants → ي
    .replace(/ى/g, "ي")
    // Remove tatweel (kashida)
    .replace(/ـ/g, "");
}

// Use in search filter:
const normalizedQuery = normalizeArabic(searchTerm);
const matches = products.filter(p =>
  normalizeArabic(p.name).includes(normalizedQuery) ||
  p.sku.toLowerCase().includes(searchTerm.toLowerCase().trim())
);
```

**Search also covers `sku`** — not just `name`. This was missing before.

### Category Labels

Currently POS shows raw category values while product admin maps them to Arabic labels. Fix this:
- In the products area, use the same Arabic category label mapping that product admin uses.
- If a mapping doesn't exist, fall back to the raw value with first-letter capitalization.

---

## Task 3 — Cart Panel: Complete State Model

The cart panel has a component-level state variable:

```typescript
type CartPanelState = "cart" | "checkout" | "processing" | "success";
const [panelState, setPanelState] = useState<CartPanelState>("cart");
```

This is **NOT** stored in Zustand — it's local component state that resets on navigation.

### State Machine

```
cart ──[ادفع click]──→ checkout ──[تأكيد البيع click]──→ processing ──[API success]──→ success
 ↑                        │                                  │                            │
 │                     [رجوع]                           [API error]                  [بيع جديد]
 │                        │                                  │                            │
 └────────────────────────┘                                  ↓                            │
                                                         checkout                         │
                                                      (with error toast)                  │
                                                                                          ↓
                                                                                        cart
                                                                                    (fully reset)
```

**Transition rules:**
- `cart → checkout`: only if cart has items. Does NOT clear any fields.
- `checkout → cart` (رجوع): preserves all checkout data (customer, discount, payment selections). The user can go back and forth without losing data.
- `checkout → processing`: fires on confirm click. Immediately disable all inputs and the confirm button.
- `processing → success`: on successful API response. Store `lastCompletedSale` data.
- `processing → checkout`: on API error. Show `toast.error()` with the error message. Re-enable inputs.
- `success → cart`: on "بيع جديد" click. Full reset: clear cart, clear customer, reset discount, reset selected account to first available, clear split payments, set `panelState = "cart"`.

### State 1: Cart Mode (default)

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
- "ادفع" button: primary style, full width. Clicking it sets `panelState = "checkout"`
- "ادفع" is **disabled** if cart is empty
- "تفريغ السلة": ghost button, clears cart (with confirmation dialog)

### State 2: Checkout Mode

```
┌──────────────────────────┐
│ → رجوع      إتمام البيع  │  ← header with back arrow
├──────────────────────────┤
│ طريقة الدفع              │
│ [كاش 💵] [بطاقة 💳(2.5%)] [CliQ]│  ← account type chips with fee
├──────────────────────────┤
│ المبلغ المستلم            │  ← only for cash
│ [500          ]           │
│ الباقي للعميل: 40.00 د.أ │  ← green, only if overpaid
├──────────────────────────┤
│ + أضف طريقة دفع أخرى    │  ← split payment link
├──────────────────────────┤
│ العميل (اختياري)         │
│ [ابحث عن عميل...]       │
├──────────────────────────┤
│ خصم (اختياري)   حد: 15% │
│ [0             ]%         │
├──────────────────────────┤
│ ملاحظات                  │  ← collapsed by default, expandable
│ [▸ إضافة ملاحظة]        │
├──────────────────────────┤
│ المجموع         460 د.أ  │  ← sticky bottom
│ رسوم بطاقة      11.50 د.أ│  ← fee line, only if applicable
│ خصم فاتورة       0 د.أ  │
│ الصافي          471.50 د.أ│
│ ──────────────────────── │
│ المتبقي للسداد:  0.00 د.أ│  ← LIVE remaining (see PD-5)
│ ┌──────────────────────┐ │
│ │   ✓ تأكيد البيع      │ │  ← PRIMARY or WARNING button
│ └──────────────────────┘ │
└──────────────────────────┘
```

**Critical details:**

**A. Payment method selection**

Display accounts as **chip buttons**. Use the account `type` field to show an appropriate icon:
- `cash` → 💵 or banknote icon
- `card` / `visa` / `mastercard` → 💳 or credit-card icon
- `cliq` or any other → appropriate icon or just text

The first available account is auto-selected. When selected, the chip gets `background: var(--aya-primary); color: white;`.

**Fee display on chips**: If `fee_percentage > 0`, append it to the label: "بطاقة (2.5%)".

**B. Amount received (cash only)**

The "المبلغ المستلم" input appears **only** when the selected account type is `cash`. If amount > total, show "الباقي للعميل: X د.أ" in green.

**C. Split payment**

Clicking "+ أضف طريقة دفع أخرى" adds a second payment row. Each row shows:
- Account type chips (filtered to exclude already-selected accounts in other rows)
- Amount input
- Delete button (×)

The remaining amount updates live: `remaining = netTotal - sum(payment amounts)`.

Maximum split rows: **3** (primary + 2 additional). This prevents UI overflow while covering all real-world scenarios.

**D. Notes field**

The audit found notes are over-prioritized relative to speed-critical payment fields. **Notes are collapsed by default** — show a "▸ إضافة ملاحظة" link that expands to reveal the textarea. This reduces visual competition with payment fields.

**E. Remaining-to-Settle display** (see PD-5)

Always visible in the sticky summary. This is the key indicator the cashier needs to understand the payment state.

**F. Debt preview** (see PD-2)

When remaining > 0 and a customer is selected, show the debt preview panel above the confirm button.

**G. "رجوع" (Back) button**

Clicking "رجوع" sets `panelState = "cart"`. Does NOT clear any fields.

**H. "تأكيد البيع" button states**

| State | Appearance |
|---|---|
| Enabled (remaining ≤ 0) | `background: var(--aya-primary)`, "✓ تأكيد البيع" |
| Enabled (debt mode: remaining > 0 + customer selected) | `background: var(--aya-warning)`, "✓ تأكيد البيع وتسجيل الدين" |
| Disabled (remaining > 0 + no customer) | `opacity: 0.5`, `pointer-events: none`, message below |
| Submitting | `opacity: 0.7`, spinner replaces ✓, "جارٍ التنفيذ...", `pointer-events: none` |

**I. Keyboard shortcuts**

Add keyboard event listeners in `pos-workspace.tsx` (use `useEffect` with `keydown`):

| Key | Action | Condition | Scope |
|---|---|---|---|
| `/` or `F1` | Focus search input | Always | POS only |
| `F2` | Switch to checkout mode | Cart has items, panelState === "cart" | POS only |
| `Escape` | Back to cart mode / close held carts | panelState === "checkout" or held carts open | POS only |

**Scope rule**: All keyboard shortcuts must check that the active element is not an `<input>` or `<textarea>` before firing (except Escape, which always works). This prevents conflicts with typing.

### State 3: Processing

While the sale is being submitted:
- All inputs become `pointer-events: none; opacity: 0.7`
- Confirm button shows spinner + "جارٍ التنفيذ..."
- Back button is disabled
- If the API call fails, return to checkout with `toast.error()`

### State 4: Success Screen

See **PD-4** above for the full specification. Summary:

```
┌──────────────────────────┐
│                          │
│         ✓                │  ← large green circle with checkmark
│      تم البيع بنجاح      │
│                          │
│     533.60 د.أ           │  ← large total
│                          │
│ فاتورة #AYA-2026-00001   │
│                          │
│ ─── تفاصيل الدفع ───     │
│ كاش: 300.00 د.أ          │
│ بطاقة: 233.60 د.أ        │
│ رسوم بطاقة: 5.84 د.أ     │  ← fee line if applicable
│                          │
│ الباقي للعميل: 0.00 د.أ  │
│                          │
│ [if debt:]               │
│ ⚠️ دين مسجل: 150 د.أ     │
│ على حساب: أحمد محمد       │
│                          │
│ ┌──────────────────────┐ │
│ │   🖨 طباعة إيصال     │ │  ← PRIMARY button
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │     بيع جديد         │ │  ← secondary button
│ └──────────────────────┘ │
└──────────────────────────┘
```

- "طباعة إيصال" navigates to `/invoices/[id]?print=1` (invoice detail page detects `?print=1` and triggers `window.print()`)
- "بيع جديد" fully resets: cart, customer, discount, selected account (to first available), split payments, panelState → "cart"
- **Success screen persists until explicit action.** No auto-dismiss.

---

## Task 4 — POS Store Changes (`stores/pos-cart.ts`)

Add to the store interface:

```typescript
// Split payment support
splitPayments: Array<{ accountId: string; amount: number }>;
addSplitPayment: (accountId: string, amount: number) => void;
removeSplitPayment: (index: number) => void;
updateSplitPaymentAmount: (index: number, amount: number) => void;
clearSplitPayments: () => void;
```

Initialize `splitPayments: []` in `createDefaultState()`. Reset in `clearCart()` and `completeSale()`. Add to `partialize` for persistence. Also add to `HeldCart` type.

**Account reset on sale completion**: In `completeSale()` and `clearCart()`, also reset `selectedAccountId` to `""` (empty string). The component will then auto-select the first available account on next render. This prevents wrong-account carry-over between sales.

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

The `create_sale` RPC already accepts `p_payments` as a JSONB array. **No backend changes needed.**

---

## Task 5 — Mobile POS State Model

The audit found that mobile bottom-sheet + fullscreen checkout adds layered state complexity that needs explicit rules. This task defines those rules.

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
  bottom: calc(64px + var(--safe-area-bottom)); /* above bottom nav bar + safe area */
  left: 0;
  right: 0;
  background: var(--aya-panel);
  border-top: 1px solid var(--aya-line);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-md);
  transition: transform 250ms ease;
  z-index: var(--z-cart-sheet);
}

/* Collapsed state: just a summary bar */
.pos-cart-sheet--collapsed {
  transform: translateY(calc(100% - 56px));
}
/* 56px visible = drag handle + "3 بنود — 460 د.أ" */

/* Expanded state: full cart */
.pos-cart-sheet--expanded {
  transform: translateY(0);
  max-height: calc(100vh - 64px - var(--safe-area-bottom));
  overflow-y: auto;
}
```

- Collapsed: shows item count + total + drag handle
- Tapping the collapsed bar or dragging up expands it
- When user taps "ادفع" in expanded mode: the sheet transitions to full-screen checkout

```css
.pos-cart-sheet--fullscreen {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 0;
  max-height: 100vh;
  z-index: var(--z-fullscreen-checkout);
  padding-bottom: var(--safe-area-bottom);
}
```

### Mobile Layer Stacking Rules

The audit identified that drawer, bottom sheet, held carts, search results, toasts, and dialogs may overlap. Use the z-index scale defined in design tokens:

| Layer | Z-Index | Behavior |
|---|---|---|
| Cart bottom sheet | `var(--z-cart-sheet)` = 40 | Below bottom bar |
| Bottom navigation bar | `var(--z-bottom-bar)` = 50 | Always visible except in fullscreen checkout |
| Offline warning bar | `var(--z-offline-bar)` = 60 | Above bottom bar |
| Menu drawer overlay | `var(--z-drawer)` = 70 | Above offline bar |
| Toast notifications | `var(--z-toast)` = 80 | Above drawer |
| Confirmation dialogs | `var(--z-dialog)` = 100 | Above everything except fullscreen |
| Fullscreen checkout | `var(--z-fullscreen-checkout)` = 110 | Covers everything |

**Rules:**
- When fullscreen checkout is active, the bottom bar is hidden
- Toasts always render above everything except dialogs
- If offline bar is visible, it pushes content down; it does not overlap the bottom bar
- Only one dialog can be open at a time (confirmation dialogs are modal)
- Held carts dropdown uses `var(--z-drawer)` level

### Mobile State Transitions

```
[Products screen + collapsed sheet]
      │
      ↓ (tap collapsed bar)
[Products screen + expanded sheet showing cart items]
      │
      ↓ (tap "ادفع")
[Fullscreen checkout — covers everything]
      │
      ├── (tap "رجوع") → [Products + expanded sheet]
      ├── (confirm sale) → [Fullscreen success screen]
      │                         │
      │                         ↓ (tap "بيع جديد")
      │                    [Products + collapsed sheet (empty)]
      └── (API error) → stays in fullscreen checkout with toast
```

### Held Cart Context Safety

The audit found that held carts restore account, customer, and amount context, creating stale-context risk. When restoring a held cart:
- Restore: items, customer, discount, notes
- **Do NOT restore**: `selectedAccountId` (reset to first available), `splitPayments` (clear), `cashReceived` (clear)
- Show a `toast.info("تم استرجاع الطلب المحتجز")` to confirm restoration

---

## Task 6 — Component Library

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

.btn--warning { background: var(--aya-warning); color: #fff; border-color: var(--aya-warning); }
.btn--warning:hover { background: #B45309; }
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

Every badge MUST include either an icon or text — never color alone (accessibility).

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

In all badge usage, ensure there is an icon (Lucide) or descriptive text alongside the color:
- "متوفر" ✓ (text is enough)
- "نفد" with `AlertTriangle` icon + text
- "منخفض" with `AlertCircle` icon + text

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

Skeleton variants:
- `.skeleton--text`: height 14px, width 60-80%
- `.skeleton--card`: height 88px, full width
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
  z-index: var(--z-dialog);
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

All destructive actions (delete, cancel invoice, clear cart) must use this dialog.

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
  z-index: var(--z-offline-bar);
}
```

Show "لا يوجد اتصال بالإنترنت" with `WifiOff` icon when `navigator.onLine === false`. Listen to `online`/`offline` events. Render this in the dashboard shell.

When offline bar is visible, push the page content down by 36px (do not overlap).

---

## Task 7 — Permission-Restricted UI

For elements the current user doesn't have permission for:

- **Show the element as disabled** (not hidden). Add `opacity: 0.5; pointer-events: none;`.
- Add a `title` attribute with "لا تملك صلاحية لهذا الإجراء" as tooltip.
- Distinguish disabled reasons visually:
  - Permission-disabled: `opacity: 0.5` + lock icon overlay or tooltip
  - State-disabled (e.g., empty cart, incomplete payment): `opacity: 0.5` without lock icon
- This applies to: discount input (if no discount permission), admin-only actions visible to pos_staff, etc.

**Exception**: Navigation items that are admin-only should remain **hidden** (not shown disabled) to avoid confusing pos_staff with features they can never access.

---

## Task 8 — Apply to All Dashboard Pages

After the foundation CSS is rewritten, every workspace component needs class updates:

| Component | Key Changes |
|---|---|
| `dashboard-home.tsx` | Stat cards use `.stat-card`. Alert cards use `.badge`. Tables use `.data-table`. |
| `invoices-workspace.tsx` | Table uses `.data-table`. Chips use `.badge--*`. Search uses `.field-input`. |
| `invoice-detail.tsx` | Summary uses definition list with `.text-small` labels. Buttons use `.btn--*`. Add `?print=1` detection for auto-print. |
| `operations-workspace.tsx` | Form fields use `.field-input` + `.field-label`. Result cards use `.stat-card`. |
| `expenses-workspace.tsx` | Same pattern — fields, labels, tables, badges. |
| `debts-workspace.tsx` | Customer list, payment form, badges. |
| `settings-ops.tsx` | Section chips use `.badge--*` or `.btn--ghost`. Forms use `.field-input`. |
| `products-browser.tsx` | Product cards use `.pos-product-card` pattern. Admin form uses `.field-input`. |
| `search-workspace.tsx` | Results use `.data-table` or card pattern. Entity chips use `.badge--*`. |

**Do not rewrite component logic.** Only update className strings and adjust JSX structure where the new layout requires it.

### SectionCard Pattern

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

## Task 9 — Cleanup

1. **Delete the entire dark theme block** in `globals.css` (everything inside `@media (prefers-color-scheme: dark)`).
2. **Update dark-mode tests**: any E2E or unit test that asserts dark-mode behavior (e.g., `px18-visual-accessibility.spec.ts` line 116) must be updated to assert light-mode-only behavior.
3. **Delete old animation/transition CSS** that is no longer referenced.
4. **Replace all hardcoded color values** in components with CSS variable references. Search for `#` in tsx files and replace with `var(--aya-*)` where appropriate.
5. **Replace all hardcoded spacing values** (e.g., `margin: 16px`, `padding: 1.5rem`) with `var(--sp-*)` values.
6. **Replace all hardcoded border-radius values** with `var(--radius-*)`.
7. **Remove unused CSS classes** that are no longer referenced by any component.
8. **Replace all hardcoded z-index values** with `var(--z-*)` tokens from the z-index scale.

---

## Execution Order

Execute in this order to minimize breakage:

1. **Design tokens** — Replace `:root` variables in globals.css. Remove dark theme. Add z-index scale and safe-area tokens.
2. **Typography** — Update html/body/heading sizes and line-heights. Set POS product name to 14px/600.
3. **Component library CSS** — Add new `.btn`, `.field-input`, `.data-table`, `.badge`, `.stat-card`, `.empty-state`, `.skeleton`, `.confirm-dialog`, `.offline-bar` classes. Add `.btn--warning`.
4. **Sidebar restructuring** — Modify `dashboard-shell.tsx` and sidebar CSS. Move to right side, add collapse logic, add bottom bar for mobile with safe-area.
5. **Dashboard layout** — Update `layout.tsx` grid, topbar, content area.
6. **POS layout** — Restructure `pos-workspace.tsx` with 3-column grid, four-state cart panel (cart/checkout/processing/success), payment method chips with fee display, split payment, Arabic search normalization, recognition-safe product cards, keyboard shortcuts.
7. **POS store changes** — Add `splitPayments` to `pos-cart.ts`. Add account reset on sale completion. Add held-cart context safety rules.
8. **Mobile POS** — Implement bottom sheet, fullscreen checkout, safe-area handling, layer stacking rules.
9. **Payment model** — Implement remaining-to-settle display, debt preview panel, confirm button state variations.
10. **Dashboard pages** — Update all workspace components with new class names.
11. **Cleanup** — Remove dead CSS, hardcoded values, unused classes, dark-mode tests, stale z-index values.
12. **Verification** — `tsc`, `vitest`, `build`, browser check.

---

## Verification Checklist

After all tasks are complete, verify each of these explicitly:

- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` passes (update failing tests to match new behavior, do not disable them)
- [ ] `npm run build` succeeds
- [ ] No dark-mode CSS remains in `globals.css`
- [ ] No dark-mode assertions remain in tests
- [ ] All z-index values use `var(--z-*)` tokens
- [ ] All buttons have min 44px touch targets
- [ ] Product cards show name (14px/600) + SKU + price + stock text indicator
- [ ] Search normalizes Arabic characters and covers both name and sku
- [ ] Cart → Checkout → Processing → Success state machine works correctly
- [ ] Split payment adds/removes rows correctly (max 3)
- [ ] Debt mode shows preview panel when remaining > 0 with customer selected
- [ ] Debt mode is blocked when remaining > 0 with no customer
- [ ] Account selection resets on sale completion
- [ ] Success screen shows full payment breakdown
- [ ] Success screen persists until explicit action
- [ ] Mobile bottom sheet collapses/expands correctly
- [ ] Mobile fullscreen checkout covers entire screen
- [ ] Safe-area-bottom is respected on mobile bottom bar and cart sheet
- [ ] Notes field is collapsed by default in checkout
- [ ] Fee percentage is visible on payment chips and in summary
- [ ] Held cart restoration does NOT restore payment account or amount received
- [ ] Category labels use Arabic mapping (not raw values)
- [ ] Offline bar renders above bottom bar and pushes content down

---

## Completion Report

After all tasks are complete, produce a report in **exactly** this structure:

```markdown
# Execution Report — UI Redesign V2: Light Professional Theme

## Summary
- Tasks completed: [N]/9
- Total files modified: [count]
- Total CSS lines before: ~3435
- Total CSS lines after: [count]
- New components added: [count]
- Product decisions implemented: [list PD-1 through PD-6]

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
- **Key decisions**: [sidebar behavior, breakpoints, bottom bar items, safe-area]

### Task 3 — POS Layout & State Machine
- **Status**: [completed / partial / skipped]
- **Files modified**: [list]
- **What was done**: [description]
- **State machine**: [cart/checkout/processing/success — all implemented?]
- **Product recognition**: [name 14px, SKU visible, stock text — all implemented?]
- **Arabic search normalization**: [implemented / skipped with reason]
- **Category labels**: [Arabic mapping implemented?]

### Task 4 — POS Store Changes
- **Status**: [completed / partial / skipped]
- **Split payment store**: [implemented / skipped]
- **Account reset on completion**: [implemented / skipped]
- **Held cart context safety**: [implemented / skipped]

### Task 5 — Mobile POS
- **Status**: [completed / partial / skipped]
- **Bottom sheet**: [implemented / skipped]
- **Fullscreen checkout**: [implemented / skipped]
- **Safe-area handling**: [implemented / skipped]
- **Layer stacking**: [z-index scale applied?]

### Task 6 — Payment Model
- **Status**: [completed / partial / skipped]
- **Payment chips with fees**: [implemented?]
- **Split payment UI**: [implemented? max 3 rows?]
- **Remaining-to-settle display**: [implemented?]
- **Debt preview panel**: [implemented?]
- **Confirm button variations**: [all 4 states implemented?]

### Task 7 — Component Library
- **Status**: [completed / partial / skipped]
- **Components standardized**: [list]
- **Skeleton loading**: [where applied]
- **Empty states**: [where applied]
- **Warning button variant**: [added?]

### Task 8 — Dashboard Pages
- **Status**: [completed / partial / skipped]
- **Pages updated**: [list]
- **Invoice print detection**: [?print=1 implemented?]

### Task 9 — Cleanup
- **Status**: [completed / partial / skipped]
- **CSS lines removed**: [count]
- **Dark theme removed**: [yes/no]
- **Dark-mode tests updated**: [yes/no]
- **Z-index tokens applied**: [yes/no]

## Verification Summary
- TypeScript compilation: [pass/fail]
- Existing tests: [pass/fail with count]
- Build: [pass/fail]
- Browser verification: [pages checked]
- Verification checklist: [X/22 items passed]

## Screenshots or Descriptions
- POS cart mode: [description]
- POS checkout mode with split payment: [description]
- POS checkout mode with debt preview: [description]
- POS success screen with payment breakdown: [description]
- Dashboard home: [description]
- Sidebar desktop: [description]
- Sidebar mobile (bottom bar): [description]
- Mobile POS bottom sheet collapsed: [description]
- Mobile POS fullscreen checkout: [description]

## Warnings
- [Any concerns, edge cases, or things requiring manual verification]

## Audit Issues Addressed
| Audit Issue | Status | How Addressed |
|---|---|---|
| Authoritative baseline conflict | Resolved | V2 prompt declared as sole authority |
| Split payment absent | [Resolved/Partial] | [description] |
| Single payment account persistence | [Resolved/Partial] | [description] |
| Implicit debt creation | [Resolved/Partial] | [description] |
| No remaining-to-settle state | [Resolved/Partial] | [description] |
| Fee-bearing methods opaque | [Resolved/Partial] | [description] |
| Payment-type taxonomy undefined | [Resolved/Partial] | [description] |
| Receipt closure unresolved | [Resolved/Partial] | [description] |
| Success overlay too thin | [Resolved/Partial] | [description] |
| Notes field over-prioritized | [Resolved/Partial] | [description] |
| Weak Arabic search normalization | [Resolved/Partial] | [description] |
| Category labels inconsistent | [Resolved/Partial] | [description] |
| Long Arabic names unresolved | [Resolved/Partial] | [description] |
| Similar-product disambiguation | [Resolved/Partial] | [description] |
| Mobile bottom-sheet state risk | [Resolved/Partial] | [description] |
| Modal and layer stacking risk | [Resolved/Partial] | [description] |
| Safe-area handling not specified | [Resolved/Partial] | [description] |
| Light-only vs dark-mode contradiction | [Resolved/Partial] | [description] |
| Acceptance tests shallow | [Resolved/Partial] | [description] |

## Files Changed (Complete List)
| File | Action | Description |
|---|---|---|
| [path] | modified / created | [one-line summary] |
```

**Do not skip any section. Do not abbreviate. The report is the primary review artifact.**
