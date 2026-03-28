# Aya Mobile — Visual Overhaul & Cleanup Wave

> **Authority Declaration**: This document is the **sole authoritative source** for this execution wave. It supersedes all prior execution reports, live trackers, and verification matrices. Any conflict between this prompt and any other file in the repository resolves in favor of **this prompt**. Agents execute without requesting clarification.

---

## Executive Summary

This wave addresses three categories of defects discovered during post-implementation quality review:

1. **Color System Overhaul** — The current color palette causes visual fatigue. Every surface token is near-white with a cold blue undertone. Research (ISO 9241, Berman et al. 2006, Shih & Huang 2006) shows that warm-toned surfaces at 93–97% lightness reduce eye strain by 15–20% compared to cool-tinted pure whites. The new palette shifts from "cold blue-white" to "warm stone" — a premium, banking-grade aesthetic used by Mercury, Wise, and Apple's HIG.

2. **POS Layout Dimension Fixes** — Five CSS bugs that cause incorrect sizing, missing `display` declarations, and viewport overflow on the `/pos` page.

3. **Dead Description Props Cleanup** — 65 `description=""` props scattered across all workspace components that are never rendered (both `PageHeader` and `SectionCard` accept but ignore `description`). These are dead code that adds noise and confusion for maintainers.

---

## System Context

| Item | Location |
|---|---|
| Global CSS | `app/globals.css` (4846 lines) |
| Root layout | `app/layout.tsx` (themeColor at line 43) |
| POS workspace | `components/pos/pos-workspace.tsx` |
| Dashboard shell | `components/dashboard/dashboard-shell.tsx` |
| PageHeader component | `components/ui/page-header.tsx` |
| SectionCard component | `components/ui/section-card.tsx` |
| All dashboard workspaces | `components/dashboard/*.tsx` |
| Products browser | `components/pos/products-browser.tsx` |

---

## Global Rules

1. **No npm dependencies added or removed.**
2. **No database schema changes.**
3. **No changes to API routes.**
4. **No changes to business logic** in stores or hooks.
5. **TypeScript must compile clean**: `npx tsc --noEmit --pretty false` → zero errors.
6. **All existing tests must pass**: `npx vitest run`.
7. **Build must succeed**: `npm run build` → no Error lines.
8. **Read every file before modifying it.**
9. **Light theme only.** Zero dark mode CSS. Zero `prefers-color-scheme`.
10. **RTL is native.** Every layout decision must be RTL-correct.
11. **Do not rewrite or restructure components.** This wave is surgical: change token values, fix CSS properties, remove dead props.

---

## Part 1 — Color System Overhaul

### 1.1 Design Rationale

| Scientific Finding | Impact on Palette |
|---|---|
| Pure white (#FFFFFF) causes "dazzle effect" and retinal fatigue (Berman et al., 2006) | Panel surface drops from #FFFFFF to #FDFCFA |
| Warm tones reduce eye fatigue ~15–20% vs cool tones of equal luminance (Shih & Huang, 2006) | All surfaces shift from cold blue (#F8F9**FC**) to warm stone (#F5F4**F1**) |
| Optimal background lightness is 93–97% HSL (ISO 9241-303) | Canvas at 96%, bg-soft at 93% |
| Optimal text contrast is 8:1–12:1, not maximum 21:1 (Hall & Hanna, 2004) | Ink stays near-black (#1C1C1E, ~14:1) for Arabic readability |
| Banking-grade UX (Mercury, Wise) uses warm canvas + white cards for depth | Same layering pattern adopted |

### 1.2 Token Replacement Table

Replace **every value** in the `:root` block of `app/globals.css` (lines 1–94) according to this table. **Do not add or remove tokens.** Only change values.

#### Surfaces

| Token | Old Value | New Value | Reason |
|---|---|---|---|
| `--aya-bg` | `#F8F9FC` | `#F5F4F1` | Warm stone canvas, 96% lightness |
| `--aya-bg-soft` | `#F1F3F8` | `#EFEEE9` | Clear layer separation from canvas |
| `--aya-panel` | `#FFFFFF` | `#FDFCFA` | Near-white without glare |
| `--aya-panel-muted` | `#F8F9FC` | `#F8F7F4` | Visible intermediate layer |
| `--aya-panel-strong` | `#FFFFFF` | `#FFFFFF` | **Keep** — modals/dialogs stay pure white |

Also update the hardcoded `background` on line 3:
```css
/* Line 3 — change: */
background: #F8F9FC;
/* to: */
background: #F5F4F1;
```

#### Borders

| Token | Old Value | New Value | Reason |
|---|---|---|---|
| `--aya-line` | `#E2E6EF` | `#E0DDD6` | Warm, visibly distinct from surfaces |
| `--aya-line-strong` | `#CBD5E1` | `#C8C4BB` | Warm, clear separation |

#### Typography

| Token | Old Value | New Value | Reason |
|---|---|---|---|
| `--aya-ink` | `#1E293B` | `#1C1C1E` | Apple standard near-black, ~14:1 contrast |
| `--aya-ink-soft` | `#334155` | `#3A3A3C` | Warm neutral secondary |
| `--aya-muted` | `#64748B` | `#8E8E93` | Apple system gray, less cold |

Also update the hardcoded `color` on line 4:
```css
/* Line 4 — change: */
color: #1E293B;
/* to: */
color: #1C1C1E;
```

#### Primary Accent

| Token | Old Value | New Value | Reason |
|---|---|---|---|
| `--aya-primary` | `#4F46E5` | `#1A3A5C` | Deep navy — trust, finance, professionalism |
| `--aya-primary-hover` | `#4338CA` | `#153050` | Darker on hover |
| `--aya-primary-soft` | `#EEF2FF` | `#E8EFF5` | Pale blue tint, clearly visible |
| `--aya-primary-ring` | `0 0 0 2px #4F46E5` | `0 0 0 2px #1A3A5C` | Match primary |
| `--aya-info` | `#4F46E5` | `#1A3A5C` | Same as primary |
| `--aya-info-soft` | `#EEF2FF` | `#E8EFF5` | Same as primary-soft |

#### Semantic Colors (minor warmth adjustment)

| Token | Old Value | New Value | Reason |
|---|---|---|---|
| `--aya-success` | `#059669` | `#059669` | **Keep** — already good |
| `--aya-success-soft` | `#ECFDF5` | `#E8F5EE` | Slightly warmer |
| `--aya-warning` | `#D97706` | `#D97706` | **Keep** |
| `--aya-warning-soft` | `#FFFBEB` | `#FBF6E6` | Slightly warmer |
| `--aya-danger` | `#DC2626` | `#DC2626` | **Keep** |
| `--aya-danger-soft` | `#FEF2F2` | `#F9EDEC` | Slightly warmer |

#### Compatibility Aliases (line 85–94)

| Token | Old Value | New Value |
|---|---|---|
| `--aya-page-accent` | `rgba(79, 70, 229, 0.08)` | `rgba(26, 58, 92, 0.08)` |
| `--aya-page-leaf` | `rgba(5, 150, 105, 0.06)` | `rgba(5, 150, 105, 0.06)` — **Keep** |
| `--aya-accent` | `var(--aya-primary)` | **Keep** (inherits new value) |
| `--aya-accent-deep` | `var(--aya-ink)` | **Keep** |
| `--aya-cyan` | `var(--aya-primary)` | **Keep** |
| `--aya-cyan-soft` | `var(--aya-primary-soft)` | **Keep** |
| `--aya-chart-grid` | `rgba(30, 41, 59, 0.08)` | `rgba(28, 28, 30, 0.08)` |

### 1.3 Hardcoded rgba() Values to Update

Throughout `globals.css`, there are ~31 hardcoded `rgba(29, 78, 216, ...)` values (the old indigo primary). These must be updated to use the new navy primary `rgb(26, 58, 92)`.

**Search-and-replace rule:**
- `rgba(29, 78, 216,` → `rgba(26, 58, 92,` (all ~20 instances)
- `rgba(79, 70, 229,` → `rgba(26, 58, 92,` (all ~6 instances — these are the old indigo-600)
- `rgba(23, 48, 65,` → `rgba(26, 58, 92,` (all ~4 instances — old dark-blue)

**Do not change** any `rgba(220, 38, 38,` (danger), `rgba(217, 119, 6,` (warning), `rgba(5, 150, 105,` (success), or `rgba(15, 23, 42,` (overlay/backdrop) values.

### 1.4 Layout themeColor Update

In `app/layout.tsx` line 43:
```typescript
// Change:
themeColor: "#4F46E5"
// To:
themeColor: "#1A3A5C"
```

### 1.5 Verification

After completing all color changes:

```bash
# Must return 0 — no old primary color remaining
grep -c "#4F46E5\|#4338CA\|#EEF2FF\|#F8F9FC\|#F1F3F8" app/globals.css

# Must return 0 — no old primary in layout
grep -c "#4F46E5" app/layout.tsx

# Must return 0 — no dark mode
grep -c "prefers-color-scheme\|dark-mode\|\.dark" app/globals.css
```

---

## Part 2 — POS Layout Dimension Fixes

### 2.1 Fix: Remove phantom third column from `.pos-layout`

**File:** `app/globals.css` lines 4142–4148

**Problem:** `.pos-layout` defines `grid-template-columns: 1fr var(--pos-cart-width) var(--sidebar-collapsed)`. The third column (`56px`) creates dead space because the sidebar is already outside `.pos-layout` — it's managed by `dashboard-shell`. This wastes 56px on desktop.

**Fix:**
```css
/* Change line 4144 from: */
grid-template-columns: 1fr var(--pos-cart-width) var(--sidebar-collapsed);
/* To: */
grid-template-columns: 1fr var(--pos-cart-width);
```

Also update the `@media (max-width: 1279px)` block (around line 4697–4700). The rule that changes `.pos-layout` to `1fr var(--pos-cart-width)` is now redundant since that's already the default — **remove the `.pos-layout` override inside that media query** or leave it (it's harmless but redundant).

### 2.2 Fix: Viewport height doesn't account for topbar

**File:** `app/globals.css` line 4146

**Problem:** `height: 100vh` makes `.pos-layout` span the full viewport, but it sits below `dashboard-topbar` (56px). Content overflows by 56px.

**Fix:**
```css
/* Change line 4146 from: */
height: 100vh;
/* To: */
height: calc(100vh - var(--topbar-height));
```

### 2.3 Fix: Cart panel height also ignores topbar

**File:** `app/globals.css` lines 4319–4326

**Problem:** `.pos-cart-panel` has `height: 100vh` — same overflow issue.

**Fix:**
```css
/* Change line 4324 from: */
height: 100vh;
/* To: */
height: calc(100vh - var(--topbar-height));
```

### 2.4 Fix: `.pos-payment-chip-row` missing `display: flex`

**File:** `app/globals.css` line 4396

**Problem:** The rule has `flex-wrap: wrap` but no `display: flex`, so `flex-wrap` has no effect.

**Fix:**
```css
.pos-payment-chip-row {
  display: flex;          /* ADD THIS LINE */
  flex-wrap: wrap;
  gap: var(--sp-2);
}
```

### 2.5 Fix: `.pos-success-screen__details` missing `display: grid`

**File:** `app/globals.css` line 4572

**Problem:** The rule uses `gap` but has no `display: grid` or `display: flex`, so `gap` has no effect and items don't flow correctly.

**Fix:**
```css
.pos-success-screen__details {
  display: grid;          /* ADD THIS LINE */
  width: 100%;
  /* ... rest unchanged ... */
}
```

### 2.6 Verification

```bash
# pos-layout must NOT have sidebar-collapsed in grid-template-columns
grep "sidebar-collapsed" app/globals.css | grep "pos-layout"
# Must return 0 results

# pos-layout must use calc for height
grep -A5 "\.pos-layout {" app/globals.css | grep "calc(100vh"
# Must return 1 result

# chip-row must have display: flex
grep -A3 "\.pos-payment-chip-row" app/globals.css | grep "display: flex"
# Must return 1 result

# success-screen details must have display: grid
grep -A3 "\.pos-success-screen__details {" app/globals.css | grep "display: grid"
# Must return 1 result
```

---

## Part 3 — Dead Description Props Cleanup

### 3.1 Context

Both `components/ui/page-header.tsx` and `components/ui/section-card.tsx` declare a `description?: string` prop in their type definitions but **never render it in JSX**. This means all 65 `description="..."` props in the codebase are dead code — they pass a string that is silently ignored.

### 3.2 Task

**Step 1:** Remove the `description` prop from both component type definitions:

**File: `components/ui/page-header.tsx` line 6:**
```typescript
// Remove this line:
description?: string;
```

**File: `components/ui/section-card.tsx` line 8:**
```typescript
// Remove this line:
description?: string;
```

Also remove `description` from the destructured props in `section-card.tsx` line 16:
```typescript
// Change:
description,
// Remove this line from the destructuring
```

**Step 2:** Remove every `description="..."` prop from every component call across the codebase. Here is the complete list of files and the number of instances to remove:

| File | Count |
|---|---|
| `components/dashboard/portability-workspace.tsx` | 12 |
| `components/dashboard/notifications-workspace.tsx` | 8 |
| `components/dashboard/reports-overview.tsx` | 6 |
| `components/dashboard/settings-ops.tsx` | 7 |
| `components/pos/products-browser.tsx` | 6 |
| `components/dashboard/permissions-panel.tsx` | 5 |
| `components/dashboard/invoice-detail.tsx` | 5 |
| `components/dashboard/dashboard-home.tsx` | 3 |
| `components/dashboard/debts-workspace.tsx` | 3 |
| `components/dashboard/inventory-workspace.tsx` | 3 |
| `components/dashboard/invoices-workspace.tsx` | 2 |
| `components/dashboard/maintenance-workspace.tsx` | 2 |
| `components/dashboard/expenses-workspace.tsx` | 1 |
| `components/dashboard/operations-workspace.tsx` | 1 |
| `components/dashboard/search-workspace.tsx` | 3 |
| `components/dashboard/suppliers-workspace.tsx` | 1 |
| `components/pos/pos-workspace.tsx` | 1 |
| **Total** | **~68** |

**Execution method:** For each file, open it, find every line containing `description="`, and remove the entire `description="..."` prop (the attribute and its value). Do not remove or modify anything else on that line.

### 3.3 Visible Instructional Text to Remove

The following text is **rendered and visible** to the user. Remove these specific elements:

#### `operational-page__meta-hint` spans (explanatory hints under meta cards)

Remove the **content** of these spans where the text is instructional (starts with "راجع", "استخدم", "تعرض", "يشمل", "يعرض"). Keep hints that show **data** (like dates or numbers).

**Remove these (instructional):**
- `products-browser.tsx:305` — "العدد يتغير مباشرة بحسب البحث والتصنيف الحاليين."
- `products-browser.tsx:310` — "يعرض المنتجات التي تحتاج متابعة سريعة قبل نفاد الكمية."
- `products-browser.tsx:315-316` — the entire `<span>` content
- `notifications-workspace.tsx:295` — "يشمل هذا الرقم الفلاتر الحالية والنتائج الملائمة للدور الحالي."
- `notifications-workspace.tsx:300` — "الرسائل غير المقروءة المتاحة للمتابعة."
- `notifications-workspace.tsx:305` — "أقسام مركز الإشعارات."
- `suppliers-workspace.tsx:368` — "راجع الموردين بحسب الرصيد، النشاط، أو آخر تحديث."
- `suppliers-workspace.tsx:378` — "تعرض القائمة أحدث أوامر الشراء وتفاصيل الأصناف المرتبطة بها."
- `suppliers-workspace.tsx:402` — "أقسام الموردين والمشتريات."
- `reports-overview.tsx:507` — "يعرض الكمية الحالية مقابل حد التنبيه."

**Keep these (data-bearing or short labels):**
- Hints that show actual numbers, dates, or counts (e.g., line 638 in inventory: "عدد البنود: ...")
- Hints that are factual labels for meta cards (e.g., "إجمالي ربح الشحن خلال آخر 30 يومًا.")

#### Instructional `<p>` and `<strong>` tags in empty states

**Remove or simplify these:**
- `invoices-workspace.tsx:61` — Remove `<strong>اضغط على أي فاتورة لفتح التفاصيل</strong>`
- `invoices-workspace.tsx:90` — Remove `<p>غيّر نص البحث أو امسحه لعرض الفواتير المتاحة.</p>`
- `debts-workspace.tsx:502` — Remove `<p>اختر عميلًا من القائمة لعرض التفاصيل.</p>`

#### `operational-section-nav__hint` spans

Remove all instances — these explain navigation sections that are self-evident:
- `notifications-workspace.tsx:305`
- `suppliers-workspace.tsx:402`

### 3.4 Verification

```bash
# description prop must not exist in component types
grep -n "description?" components/ui/page-header.tsx components/ui/section-card.tsx
# Must return 0 results

# No description props remaining in component calls
grep -rn 'description="' components/ --include="*.tsx" | grep -v "issue_description\|meta-description\|aria-description"
# Must return 0 results

# TypeScript must compile
npx tsc --noEmit --pretty false
# Must be empty
```

---

## Execution Order

```
Phase 1:  Color token replacement in :root block (Part 1.2)
Phase 2:  Hardcoded rgba() replacements throughout globals.css (Part 1.3)
Phase 3:  themeColor update in layout.tsx (Part 1.4)
Phase 4:  POS dimension fixes in globals.css (Part 2.1–2.5)
Phase 5:  Remove description prop from component types (Part 3.2 Step 1)
Phase 6:  Remove all description="" props from TSX files (Part 3.2 Step 2)
Phase 7:  Remove visible instructional text (Part 3.3)
Phase 8:  Verification (Parts 1.5, 2.6, 3.4)
Phase 9:  Full build verification (tsc + vitest + build)
```

---

## Acceptance Criteria

### AC-1 — Clean Build
```bash
npx tsc --noEmit --pretty false   # empty output
npx vitest run                    # all tests pass
npm run build                     # no Error: lines
```

### AC-2 — No Old Primary Color
```bash
grep -c "#4F46E5\|#4338CA\|#EEF2FF" app/globals.css
grep -c "#4F46E5" app/layout.tsx
```
Both must return **0**.

### AC-3 — No Old Cold Surface Colors
```bash
grep -c "#F8F9FC\|#F1F3F8" app/globals.css
```
Must return **0** (old cold blue-white surfaces fully replaced).

### AC-4 — No Dark Mode
```bash
grep -c "prefers-color-scheme\|dark-mode\|\.dark" app/globals.css
```
Must return **0**.

### AC-5 — No Old rgba Indigo Values
```bash
grep -c "rgba(29, 78, 216\|rgba(79, 70, 229" app/globals.css
```
Must return **0**.

### AC-6 — POS Layout Correct
```bash
# No phantom third column
grep "sidebar-collapsed" app/globals.css | grep "pos-layout"
# Must return 0

# Height uses calc
grep -A5 "\.pos-layout {" app/globals.css | grep "calc"
# Must return result
```

### AC-7 — No Description Props
```bash
grep -rn 'description="' components/ --include="*.tsx" | grep -v "issue_description\|meta-description\|aria-description"
```
Must return **0 results**.

### AC-8 — Display Properties Present
```bash
grep -A2 "\.pos-payment-chip-row {" app/globals.css | grep "display: flex"
grep -A2 "\.pos-success-screen__details {" app/globals.css | grep "display: grid"
```
Both must return results.

---

## Report Structure

Write the execution report to `VISUAL_OVERHAUL_REPORT_2026-03-27.md`:

```markdown
# Visual Overhaul Report — 2026-03-27

## Summary
- Color tokens updated: [N]
- rgba() values updated: [N]
- POS CSS fixes applied: [N/5]
- Description props removed: [N]
- Instructional text elements removed: [N]
- Files modified: [list]

## Color System
- Old palette: cold blue-white (#F8F9FC canvas, #4F46E5 primary)
- New palette: warm stone (#F5F4F1 canvas, #1A3A5C primary)
- All rgba() values migrated: yes/no

## POS Dimension Fixes
[List each fix and its verification result]

## Dead Code Cleanup
- description props removed from types: 2 files
- description props removed from calls: [N] across [N] files
- Instructional text removed: [N] instances

## Verification Results
- tsc: pass/fail
- vitest: N pass
- build: pass/fail
- AC-1 through AC-8: [results]

## Deviations from Instructions
[Any case where a different approach was chosen — explain why]
```

---

## What This Wave Does NOT Change

- No TypeScript logic or store behavior
- No API routes
- No database schema
- No test files
- No new components
- No new npm dependencies
- No dark mode
- No component restructuring — only token values, CSS properties, and dead prop removal
