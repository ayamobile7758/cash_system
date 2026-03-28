# Aya Mobile — UX Restructure Wave: Cashier-First Interface

> **Authority Declaration**: This document is the **sole authoritative source** for this execution wave. It supersedes all prior execution reports, live trackers, and verification matrices. Any conflict between this prompt and any other file in the repository resolves in favor of **this prompt**. Agents execute without requesting clarification. If an agent determines that a deviation from these instructions serves the system's operational interest better, it executes the deviation and documents it explicitly in its report — it does not stop and ask.

---

## Executive Summary

This wave is a **cashier-first UX restructure** of the entire Aya Mobile interface. It is not a feature addition, not a bug fix, and not a visual polish pass. It is a fundamental UX decision: every screen must serve its primary user — the cashier at a Jordanian phone store counter — with zero cognitive overhead. Anything that does not serve that user in the moment they need it is removed or collapsed.

The prior V2 wave (UI_REDESIGN_V2_EXECUTION_REPORT_2026-03-27.md) established the correct structural and logical foundation. This wave builds on it by stripping every layer of UX noise that survived V2, restructuring the POS surface to prioritize speed and recognition, and enforcing formal professional Arabic throughout.

**This wave produces four sequential outputs from four specialized agents.**

---

## System Context

| Item | Location |
|---|---|
| Main CSS | `app/globals.css` (4538 lines post-CSS-completion) |
| POS workspace | `components/pos/pos-workspace.tsx` |
| POS cart store | `stores/pos-cart.ts` |
| POS types | `lib/pos/types.ts` |
| Dashboard shell | `components/dashboard/dashboard-shell.tsx` |
| Dashboard layout | `app/(dashboard)/layout.tsx` |
| Dashboard home | `components/dashboard/dashboard-home.tsx` |
| Invoices workspace | `components/dashboard/invoices-workspace.tsx` |
| Invoice detail | `components/dashboard/invoice-detail.tsx` |
| Operations workspace | `components/dashboard/operations-workspace.tsx` |
| Expenses workspace | `components/dashboard/expenses-workspace.tsx` |
| Debts workspace | `components/dashboard/debts-workspace.tsx` |
| Settings workspace | `components/dashboard/settings-ops.tsx` |
| Search workspace | `components/dashboard/search-workspace.tsx` |
| Products browser | `components/pos/products-browser.tsx` |
| UI components | `components/ui/` |
| Prior audit | `UI_REDESIGN_AUDIT_REPORT_2026-03-27.md` |
| V2 execution report | `UI_REDESIGN_V2_EXECUTION_REPORT_2026-03-27.md` |
| CSS completion report | `CSS_COMPLETION_REPORT_2026-03-27.md` |

---

## Design Reference System

### Color Tokens (already in `:root` — do not redefine)

```
Surfaces:      --aya-bg #F8F9FC  |  --aya-bg-soft #F1F3F8  |  --aya-panel #FFFFFF
Borders:       --aya-line #E2E6EF  |  --aya-line-strong #CBD5E1
Text:          --aya-ink #1E293B  |  --aya-ink-soft #334155  |  --aya-muted #64748B
Primary:       --aya-primary #4F46E5  |  --aya-primary-soft #EEF2FF
Success:       --aya-success #059669  |  --aya-success-soft #ECFDF5
Warning:       --aya-warning #D97706  |  --aya-warning-soft #FFFBEB
Danger:        --aya-danger #DC2626   |  --aya-danger-soft #FEF2F2
```

### Spacing Scale (do not deviate)

`4px · 8px · 12px · 16px · 24px · 32px · 48px`

No intermediate values. Every gap, padding, and margin uses this scale.

### Typography

```
Base body:     14px / 400 / line-height 1.6
POS body:      15px (--pos-body-size) inside .pos-layout
h1:            22px / 600
h2:            17px / 600
h3:            14px / 500
label/caption: 12px / 400
Product name:  14px / 600 (recognition-critical)
SKU:           12px / 400 / monospace
Confirm CTA:   16px / 600 / min-height 54px
```

### Z-Index Scale (do not deviate)

```
--z-cart-sheet: 40  |  --z-bottom-bar: 50  |  --z-offline-bar: 60
--z-drawer: 70      |  --z-toast: 80       |  --z-dialog: 100
--z-fullscreen-checkout: 110
```

### UX Reference Mockups (translate to code — do not copy literally)

The following describe the intended UX flow from validated mockups. Agents translate these into working code using the token system above.

**Checkout — Single Payment (Cash):**
```
[كاش ✓]  [بطاقة]  [CliQ]        ← payment chips, first element, full-width row
──────────────────────────────
المبلغ المستلم: [500         ]   ← appears ONLY for cash type
الباقي للعميل: 40.00 د.أ ✓      ← success color, live
──────────────────────────────
+ أضف طريقة دفع أخرى            ← ghost button
──────────────────────────────
▸ إضافة عميل (اختياري)          ← collapsed by default
▸ إضافة خصم (اختياري)           ← collapsed by default
▸ إضافة ملاحظة (اختياري)        ← collapsed by default
══════════════════════════════
المجموع     460.00 د.أ
الصافي      460.00 د.أ
رسوم الدفع   0.00 د.أ           ← hidden when 0
══════════════════════════════
[    ✓ تأكيد البيع    ]          ← 54px, full width, primary
```

**Checkout — Split Payment:**
```
[كاش ✓]           [300.00    ]  ← primary row: chip badge + amount field
[بطاقة]           [233.60    ]  ← split row: chip selector + amount field
+ أضف طريقة أخرى               ← disabled when 3 rows reached
──────────────────────────────
المتبقي للسداد: 0.00 ✓          ← success when settled
```
**Key rule**: in split mode, the primary account appears as a selected badge + amount field ONLY — never a repeated full chip row.

**Success Screen:**
```
         ✓ (56px, --aya-success)
      تم البيع بنجاح
    533.60 د.أ                  ← largest text on screen, --aya-success
   فاتورة #AYA-2026-00817       ← badge style, --aya-muted

┌─────────────────────────────┐
│ كاش              300.00 د.أ │
│ بطاقة            233.60 د.أ │
│ رسوم الدفع         0.00 د.أ │  ← hidden when 0
│ الباقي للعميل     40.00 د.أ │  ← hidden when ≤ 0
│ دين مسجل         50.00 د.أ  │  ← warning color, hidden when 0
└─────────────────────────────┘

[ طباعة إيصال ]   [ بيع جديد ]
```

---

## Global Rules — All Agents

1. **No npm dependencies.** Use only what is installed.
2. **No database schema changes.**
3. **No changes to API routes** unless explicitly instructed.
4. **No changes to business logic** in stores or hooks unless explicitly instructed.
5. **TypeScript must compile clean**: `npx tsc --noEmit --pretty false` → zero errors.
6. **All existing tests must pass**: `npx vitest run` → 70 pass / 200 pass.
7. **Build must succeed**: `npm run build` → no Error lines.
8. **Read every file before modifying it.**
9. **Light theme only.** Zero tolerance for dark mode CSS.
10. **RTL is native.** Every layout decision must be RTL-correct.
11. **Autonomous execution.** No stopping to ask questions. Deviate when necessary and document it.

---

## Agent Definitions

---

### Agent C — UX Cashier Auditor

**Role**: You are a senior UX researcher embedded as a simulated Jordanian phone store cashier. You have 3 years of daily POS experience, serve approximately 40 customers per shift, and are intimately familiar with the operational pressures of a busy retail counter. You do not care about code quality or design system compliance. You care exclusively about whether the interface lets you do your job fast, accurately, and without hesitation.

**Skills to apply**:
- Cashier workflow simulation and friction analysis
- Retail POS mental model evaluation (speed, recognition, error recovery)
- Before/after audit interpretation
- Jordanian retail operations context
- UX heuristic evaluation from an end-user perspective

**Inputs to read (in this order)**:
1. `UI_REDESIGN_AUDIT_REPORT_2026-03-27.md` — the pre-V2 problem inventory
2. `UI_REDESIGN_V2_EXECUTION_REPORT_2026-03-27.md` — what V2 claimed to fix
3. `CSS_COMPLETION_REPORT_2026-03-27.md` — what CSS was completed after V2
4. `components/pos/pos-workspace.tsx` — the actual implemented POS
5. `stores/pos-cart.ts` — the actual implemented store logic
6. `app/globals.css` lines 4140–4538 — the POS-specific CSS

**Your task**:

Run the following six cashier scenarios mentally against the **actual implemented code** (not against intentions or reports):

```
Scenario 1 — Simple cash sale
  Customer buys one product. Cash payment. No discount. No customer record.

Scenario 2 — Multi-item card payment with discount
  4 products. Card payment (fee-bearing account). 10% invoice discount.

Scenario 3 — Split payment (cash + CliQ)
  2 products. Primary: cash. Secondary: CliQ. No overpayment.

Scenario 4 — Debt sale
  Customer underpays. Customer record exists. Debt must be registered.

Scenario 5 — Held cart restoration under pressure
  Cart was held for Customer A. Customer B arrives and is served.
  Customer A returns. Restore held cart correctly.

Scenario 6 — Peak hour: fast sequential sales
  3 customers in queue. Cashier must complete each sale and reset in
  under 30 seconds. No mistakes on payment method carry-over.
```

For each scenario, document:
- What works correctly in the current implementation
- What creates friction, confusion, or hesitation
- What is missing or broken

Then produce a **Before/After Analysis**:
- Problems listed in the audit report that V2 actually fixed (verified against code)
- Problems listed in the audit report that V2 did NOT fix (still present in code)
- New friction points introduced by V2 that were not in the original audit

Finally, produce a **Prioritized Friction Inventory** for Agent A, ordered by operational impact:
- CRITICAL: causes wrong outcome or blocks the sale
- HIGH: adds 5+ seconds per transaction or causes frequent hesitation
- MEDIUM: noticeable but recoverable friction
- LOW: polish issue with minimal operational impact

**Output**: Write your complete analysis to `UX_CASHIER_AUDIT_2026-03-27.md`.

**Do not modify any code. This is an analysis-only role.**

---

### Agent A — UX Restructure Engineer

**Role**: You are a senior frontend engineer specializing in high-velocity retail POS systems. You have deep expertise in Next.js App Router, Zustand state management, RTL layout systems, and accessibility for operational interfaces. You have read Agent C's cashier audit report and internalized its findings. You execute the restructure wave.

**Skills to apply**:
- Next.js 14 App Router component patterns
- Zustand store integration and state flow
- RTL-native CSS layout (grid, flexbox, logical properties)
- Accessible interactive component patterns (ARIA, focus management, keyboard navigation)
- Information architecture reduction (removing cognitive load without removing functionality)
- Operational UX patterns for retail POS

**Inputs to read**:
1. `UX_CASHIER_AUDIT_2026-03-27.md` — Agent C's findings (primary input)
2. `components/pos/pos-workspace.tsx` — current POS implementation
3. `stores/pos-cart.ts` — current store
4. `app/globals.css` — current CSS
5. `components/dashboard/dashboard-shell.tsx` — shell
6. All workspace files in `components/dashboard/`
7. `components/ui/` — shared UI components

**Your mandate**:

#### Task A-1 — Strip All Explanatory UI Text

Remove every string from the interface that explains HOW to use the system. The cashier already knows. These strings are noise, not information.

**Remove unconditionally**:
- All `description` props on `<SectionCard>` components across every page
- All `description` props on `<PageHeader>` components across every page
- Any Arabic text in the UI that starts with: "يمكنك", "استخدم", "ابدأ بـ", "راجع", "اختر", "انتقل"
- Footer hints inside cards (e.g., "استخدم / أو F1 للتركيز على البحث")
- Any `<p>` or `<span>` that describes an action rather than naming it

**Keep unconditionally**:
- All field labels (`<label>`, `<span className="field-label">`)
- All button text
- All error and warning messages
- All toast notification text
- All status indicators and badge text
- Section titles (h2, h3) if they identify the section — not if they re-explain it

**Judgment rule**: if removing the text would make it impossible to understand WHAT something is (not HOW to use it), keep it. If it only explains HOW, remove it.

#### Task A-2 — Replace POS PageHeader with Minimal Sticky Toolbar

The `<PageHeader>` component in `app/(dashboard)/pos/page.tsx` or `components/pos/pos-workspace.tsx` takes 100–150px of vertical space for a title, description, and three meta cards. On a POS surface, this is wasted space.

**Replace with a minimal sticky toolbar**:

```tsx
<div className="pos-topbar">
  <div className="pos-topbar__identity">
    <span className="pos-topbar__label">نقطة البيع</span>
    {selectedAccount && (
      <span className="pos-topbar__account">{selectedAccount.name}</span>
    )}
  </div>
  <div className="pos-topbar__actions">
    <button onClick={handleStartNewSale} className="secondary-button">
      بيع جديد
    </button>
    <button onClick={() => setIsHeldCartsOpen(v => !v)} className="secondary-button">
      محتجز ({heldCarts.length})
    </button>
  </div>
</div>
```

The toolbar is `48px` tall, sticky, and contains only what the cashier needs to see at a glance. The meta cards (items count, net total) are removed — this information is visible in the cart panel.

CSS for `pos-topbar` must be added to `globals.css` in the POS section.

#### Task A-3 — Collapse Optional Checkout Fields by Default

The checkout panel currently shows customer search, discount field, terminal code, and notes as visible fields at all times. These are rarely needed and compete with payment-critical inputs.

**New behavior**:
- Customer search: collapsed behind a button `▸ إضافة عميل (اختياري)` — expands on click
- Invoice discount: collapsed behind `▸ إضافة خصم (اختياري)` — expands on click
- Terminal code: collapsed behind `▸ رمز الجهاز (اختياري)` — expands on click
- Notes: already collapsed correctly — verify this is working

The expand state for each field is local component state, does not persist. When the cashier clicks "بيع جديد" or completes a sale, all collapsed.

**Exception**: if a customer is already selected (e.g., from a held cart), the customer field auto-expands to show the selected customer.

#### Task A-4 — Fix Split Mode Chip Row Duplication

In split payment mode, the code currently renders a full chip row for the primary account **inside** the `.pos-split-payments` block in addition to the chip row already rendered above it. This means the cashier sees the payment chips twice.

**Correct behavior**:
- The primary account chip row renders **once**, above the split block
- Inside `.pos-split-payments`, the primary account is shown as a **selected badge** + amount field only:

```tsx
{isSplitMode && (
  <div className="pos-split-payments">
    {/* Primary row: badge + amount, no chip selector */}
    <div className="pos-split-payment-row pos-split-payment-row--primary">
      <span className="chip chip--active pos-payment-chip is-selected">
        <Icon size={14} />
        {selectedAccount?.name}
      </span>
      <label className="stack-field">
        <span className="field-label">المبلغ</span>
        <input type="number" ... />
      </label>
    </div>
    {/* Additional split rows */}
    {splitPayments.map((payment, index) => (
      <div className="pos-split-payment-row" ...>
        {/* chip selector for non-primary accounts */}
        ...
      </div>
    ))}
  </div>
)}
```

The chip row for selecting the primary account method (shown above the split block) must be hidden when split mode is active, because changing the primary method inside split mode is controlled by the badge interaction, not the chip row.

#### Task A-5 — Add Product Search Empty State

When `filteredProducts.length === 0` and the user has entered a search query (`normalizedQuery` is non-empty), display:

```tsx
<div className="empty-state pos-search-empty">
  <Search className="empty-state__icon" size={32} />
  <h3 className="empty-state__title">لا توجد نتائج</h3>
  <p className="empty-state__description">
    لم يُعثر على منتج يطابق "{searchInput}"
  </p>
  <button className="secondary-button" onClick={() => setSearchInput("")}>
    مسح البحث
  </button>
</div>
```

This must appear inside the product grid container, not as a page-level state.

#### Task A-6 — Add Stock Indicator to Quick-Add Cards

Quick-add product cards (`pos-product-card--quick-add`) currently show name and price only. They must show the same stock indicator as the main product grid cards:

```tsx
<div className="pos-product-card__footer">
  <span className="pos-product-card__price">{formatCurrency(product.sale_price)}</span>
  <span className={`pos-product-card__stock-indicator pos-product-card__stock-indicator--${stockTone}`}>
    {stockLabel}
  </span>
</div>
```

Use the same `stockLabel` and `stockTone` logic already present for the main grid cards.

#### Task A-7 — Restructure Success Screen Hierarchy

The success screen must communicate closure, not just confirmation. Restructure the visual weight:

**Hierarchy (top to bottom)**:
1. Icon: `<CheckCircle2 size={64} />` in `--aya-success` — the largest visual element
2. Title: "تم البيع بنجاح" — `17px / 600`
3. Total: the net_total — `32px / 700 / --aya-success` — this is the emotional confirmation
4. Invoice number: displayed as a monospace badge — `13px / --aya-muted`
5. Payment breakdown: left-aligned `<dl>` with `<dt>/<dd>` pairs
   - Each payment method + amount
   - Fees line — **hidden when fee total is 0**
   - Change due — **hidden when ≤ 0**
   - Debt registered — warning color, **hidden when 0**
6. Customer name — if selected, shown as info strip
7. Actions row: [طباعة إيصال] [بيع جديد]

**Do not show**: any value that is zero or null. Zero change, zero fees, zero debt — all hidden.

#### Task A-8 — Dashboard Pages: Remove Decorative Descriptions

For every workspace page in `components/dashboard/`, apply the same principle as Task A-1:

- Remove all `description` props from `<PageHeader>` and `<SectionCard>`
- Remove `eyebrow` props where the eyebrow is not a meaningful section identifier (e.g., "تصفح سريع", "المخزون المعروض" are fine as section context; "راجع" or instructional phrases are not)
- Keep `title` props — they identify what the section is
- Remove any `<p>` elements inside cards that explain how to use the interface

#### Task A-9 — POS `pos-layout__body` Class Cleanup

The POS layout uses `className="pos-layout pos-layout__body"` but `pos-layout__body` is not defined in CSS (it's a modifier that was never implemented). Remove `pos-layout__body` from the class list — keep only `pos-layout`. This prevents any unexpected future collision.

#### Task A-10 — Remaining Balance Logic Correction

The `.pos-remaining-balance` block currently applies `--success` modifier whenever `remainingToSettle <= 0`. But at the moment the checkout opens and before the cashier has entered any amount, `remainingToSettle = netTotal` which is a positive number (danger state), so this is already correct. However, there is an edge case:

When `netTotal === 0` (all items are free/100% discounted), `remainingToSettle = 0` immediately, which triggers `--success`. This is correct behavior. Verify this edge case is handled and document the finding in the report.

**Verify**: the success state only shows when `remainingToSettle <= 0` — never when payment chips have just been rendered with no amounts entered.

**After completing all tasks**:
- Run `npx tsc --noEmit --pretty false` → must be empty
- Run `npx vitest run` → must be 70/200 pass
- Run `npm run build` → must succeed
- Write complete execution report to `UX_RESTRUCTURE_AGENT_A_REPORT_2026-03-27.md`

---

### Agent B — Visual Polish Engineer

**Role**: You are a CSS systems engineer specializing in RTL layout, design token application, and operational interface polish. You work after Agent A has completed the structural restructure. Your job is to ensure that the restructured layout looks professionally finished, with correct spacing, correct visual weight, and no layout artifacts from removed elements.

**Skills to apply**:
- CSS custom property systems and design token application
- RTL-native flexbox and grid layout
- Responsive design at 3 breakpoints (mobile <768px, tablet 768–1279px, desktop ≥1280px)
- Accessibility: contrast ratios, focus visibility, touch target sizing
- Operational interface visual hierarchy (not decorative design)

**Inputs to read**:
1. `UX_RESTRUCTURE_AGENT_A_REPORT_2026-03-27.md` — what Agent A changed
2. `app/globals.css` — current CSS state after Agent A
3. `components/pos/pos-workspace.tsx` — current JSX after Agent A

**Your tasks**:

#### Task B-1 — Add `pos-topbar` CSS

Agent A created a `pos-topbar` component. Add its CSS to `globals.css` in the POS section (after line ~4538):

```css
.pos-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: var(--aya-panel);
  border-bottom: 1px solid var(--aya-line);
  min-height: 48px;
  position: sticky;
  top: 0;
  z-index: calc(var(--z-base) + 2);
}

.pos-topbar__identity {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.pos-topbar__label {
  font-size: 15px;
  font-weight: 600;
  color: var(--aya-ink);
}

.pos-topbar__account {
  font-size: 13px;
  font-weight: 500;
  color: var(--aya-primary);
  padding: 2px var(--sp-2);
  background: var(--aya-primary-soft);
  border-radius: var(--radius-sm);
}

.pos-topbar__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
```

#### Task B-2 — Add `pos-split-payment-row--primary` CSS

Agent A introduced a `--primary` modifier for the primary split payment row. Add:

```css
.pos-split-payment-row--primary {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--aya-primary-soft);
  border-radius: var(--radius-md);
}

.pos-split-payment-row--primary .stack-field {
  flex: 1;
}
```

#### Task B-3 — Add `pos-search-empty` CSS

Agent A introduced a search empty state. Add:

```css
.pos-search-empty {
  padding: var(--sp-8) var(--sp-4);
  text-align: center;
}

.pos-search-empty .empty-state__icon {
  color: var(--aya-muted);
  margin-bottom: var(--sp-3);
}
```

#### Task B-4 — Success Screen Visual Weight

After Agent A's restructuring of the success screen, verify that:
- The total amount text has `font-size: 32px; font-weight: 700; color: var(--aya-success)` — update `.pos-success-screen__total` if needed
- The invoice number displays as a monospace badge: `font-family: var(--aya-font-mono); font-size: 13px; color: var(--aya-muted); letter-spacing: 0.5px`
- The payment breakdown `<dl>` items are left-aligned (start-aligned in RTL): `text-align: start; justify-items: start`
- The success overlay icon has `color: var(--aya-success)` and adequate bottom margin (`var(--sp-4)`)

#### Task B-5 — Collapsed Field Expand Button Styling

Agent A added `▸ إضافة عميل (اختياري)` expand buttons. These should be visually de-emphasized but clearly interactive:

```css
.pos-optional-field-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) 0;
  background: transparent;
  border: none;
  color: var(--aya-muted);
  font-size: 13px;
  cursor: pointer;
  transition: color 120ms;
}

.pos-optional-field-toggle:hover {
  color: var(--aya-primary);
}
```

#### Task B-6 — Spacing Audit After Text Removal

After descriptions and eyebrow texts are removed, some cards will have unexpected top/bottom padding that was sized for the removed content. Audit these locations:

- `<SectionCard>` with no description: verify the card title gets correct top padding
- `<PageHeader>` with no description: verify the header does not have a large bottom gap
- POS product section: after `pos-topbar` replaces `PageHeader`, verify there is no double-border between the topbar and the first card

Fix any spacing artifacts using `margin` or `padding` adjustments on the affected containers.

**After completing all tasks**:
- Run `npx tsc --noEmit --pretty false` → empty
- Run `npx vitest run` → 70/200 pass
- Run `npm run build` → succeed
- Write `UX_RESTRUCTURE_AGENT_B_REPORT_2026-03-27.md`

---

### Agent D — Arabic Language Editor

**Role**: You are a professional Arabic language editor with expertise in formal Jordanian business Arabic. You do not write code. You review every user-facing Arabic string in the codebase and ensure it meets the standard of a professional retail management system operating in Jordan. Your standard is: every string must sound like it was written by a senior Jordanian business professional — formal, unambiguous, and precise. No colloquialisms. No dialect words. No grammatically loose constructions.

**Skills to apply**:
- Modern Standard Arabic (MSA) writing standards
- Jordanian formal business vocabulary
- Retail and financial terminology in Arabic
- UI microcopy best practices in Arabic (concise, scannable, action-oriented)
- Gender-neutral formal address where appropriate

**Language standards you enforce**:

| Reject | Accept | Reason |
|---|---|---|
| "الفلوس" / "المصاري" | "المبلغ" / "الرصيد" | Colloquial |
| "الورقة" / "الوصل" | "الفاتورة" / "الإيصال" | Imprecise |
| "الزبون" | "العميل" | Less formal (both used in Jordan; العميل is the business standard) |
| "تمام" / "اوكي" | "تأكيد" / "موافق" | Colloquial |
| "شيلة" / "منتج جديد" (vague) | "إضافة منتج" | Unclear action |
| "خطأ صار" | "تعذر تنفيذ الإجراء" | Informal error phrasing |
| "بدك تتأكد؟" | "هل تريد تأكيد هذا الإجراء؟" | Dialect question form |

**Inputs to read**:
1. `UX_RESTRUCTURE_AGENT_A_REPORT_2026-03-27.md` — list of changed strings
2. All TSX/TSX files in `components/` — scan for Arabic strings
3. `lib/error-messages.ts` — Arabic error message mappings
4. `app/globals.css` — no Arabic strings expected, skip

**Scanning scope**:

Search for Arabic strings (any text containing Arabic Unicode range `\u0600-\u06FF`) in:
- `components/pos/pos-workspace.tsx`
- `components/dashboard/*.tsx`
- `components/auth/*.tsx`
- `components/ui/*.tsx`
- `lib/error-messages.ts`
- `app/(dashboard)/*/page.tsx`

**For each Arabic string found**:
1. Assess: does it meet the formal Jordanian business standard?
2. If yes: leave it unchanged
3. If no: replace it with the correct formal version
4. Document every change in your report

**Special attention areas**:

- **Error messages** in `lib/error-messages.ts`: these must be formal, specific, and not alarming. "تعذر" (it was difficult to) is better than "فشل" (failed) for transient errors. "غير مصرح" (unauthorized) is better than "ممنوع" (forbidden).
- **Button labels**: must use the imperative verb form in MSA. "تأكيد" not "موافق". "حفظ" not "خزّن". "إلغاء" not "ارجع".
- **Field labels**: must be concise nouns. "اسم العميل" not "اكتب اسم العميل هنا".
- **Empty states**: must be helpful without being chatty. One line stating what is empty, one line suggesting an action.
- **Success messages**: must state the outcome, not celebrate it. "تم إنشاء الفاتورة بنجاح" is better than "أحسنت! تم البيع".
- **Confirmation dialogs**: must state exactly what will happen, not ask rhetorically.

**After completing all tasks**:
- Run `npx tsc --noEmit --pretty false` → empty
- Run `npx vitest run` → 70/200 pass (strings are in JSX, tests may reference some — verify)
- Run `npm run build` → succeed
- Write `UX_RESTRUCTURE_AGENT_D_REPORT_2026-03-27.md`

---

## Execution Order

```
Phase 1:  Agent C runs → produces UX_CASHIER_AUDIT_2026-03-27.md
Phase 2:  Agent A reads Agent C's output → executes restructure → produces Agent A report
Phase 3:  Agent B reads Agent A's output → executes visual polish → produces Agent B report
Phase 4:  Agent D reads Agent A's output → executes language review → produces Agent D report
```

Agents B and D may run in parallel after Agent A completes, as they touch different concerns (CSS vs TSX strings) with minimal overlap risk. If run in parallel, each must read the current file state before editing.

---

## Acceptance Criteria

All four of the following must be true after all agents complete:

### AC-1 — Clean Build
```bash
npx tsc --noEmit --pretty false   # empty output
npx vitest run                    # 70 pass / 200 pass
npm run build                     # no Error: lines
```

### AC-2 — No Explanatory UI Text
```bash
grep -rn "يمكنك\|استخدم.*للبحث\|ابدأ بإضافة\|راجع.*ثم\|اختر.*أولًا" components/
```
Output must be **0 results**. (These phrases indicate instructional text.)

### AC-3 — No Dark Mode
```bash
grep -c "prefers-color-scheme\|dark-mode\|\.dark" app/globals.css
```
Output must be **0**.

### AC-4 — POS Topbar Present
```bash
grep -n "pos-topbar" components/pos/pos-workspace.tsx
grep -n "pos-topbar" app/globals.css
```
Both must return results.

### AC-5 — No Split Mode Chip Duplication
```bash
grep -n "pos-payment-chip-row" components/pos/pos-workspace.tsx
```
Must return **2 or fewer** results — one for the single payment mode, one for the add-split button area. Not three or more (which would indicate duplication).

### AC-6 — Success Screen Hides Zero Values
In `components/pos/pos-workspace.tsx`, verify that:
- `change` display is guarded by `> 0`
- `fee_amount` sum display is guarded by `> 0`
- `debt_amount` display is guarded by `> 0`

### AC-7 — No PageHeader in POS
```bash
grep -n "PageHeader" components/pos/pos-workspace.tsx
```
Output must be **0 results**.

---

## Report Structure (all agents)

Each agent writes its report using this structure:

```markdown
# [Agent Role] Report — UX Restructure Wave — 2026-03-27

## Summary
- Tasks completed: N/N
- Files modified: [list]
- Key decisions made autonomously: [list with reasoning]

## Task-by-Task Results
[For each task: what was done, any deviation and why]

## Verification Results
- tsc: pass / fail
- vitest: N/N pass
- build: pass / fail
- AC checks: [results per applicable AC]

## Deviations from Instructions
[Any case where the agent chose a better approach — must explain why]

## Remaining Concerns
[Anything the agent observed but did not fix, with reasoning]
```
