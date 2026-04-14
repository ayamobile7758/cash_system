# Aya Mobile Restructure Plan

---

## Architectural Decisions

> These decisions are **final** and apply across all restructure plans below.
> Every screen plan must respect these rulings.

### Decision 1: Reconciliation Ownership → الجرد

**Ruling**: `تسوية الحسابات` (Account Reconciliation) belongs to **الجرد (Inventory)** only.

**Rationale**: Reconciliation is a daily operational action performed by the same person running inventory counts. It verifies account balances against system records — this is a counting task, not a governance setting. Placing it inside Settings mixes live operations with long-lived configuration.

**Impact**:
- Inventory keeps Tab 3 "Reconciliation" as defined in its restructure plan.
- Settings **removes** reconciliation from its "Operational Utilities" group entirely.
- Settings "Operational Utilities" group is **deleted** (it no longer has enough items to justify a group).
- Settings becomes 2 groups: "Access & Governance" and "System Oversight".

### Decision 2: Inventory Completion Ownership → الجرد

**Ruling**: `إكمال الجرد` (Inventory Completion) belongs to **الجرد (Inventory)** only.

**Rationale**: Completing an inventory count is the final step of an active count session. The user starts a count in Inventory, edits quantities in Inventory, and should finalize in Inventory — not navigate to Settings to press a button. The duplication was a workaround, not an intentional design.

**Impact**:
- Inventory keeps completion inside Tab 2 "Active Counts" → detail secondary column.
- Settings **removes** the inventory completion section.
- The `إكمال الجرد` confirmation dialog remains in Inventory only.

---

## Responsive Rules for Two-Column Splits

> These rules apply to **every** screen below that uses a two-column split pattern.
> No screen may define its own breakpoints — all must use these shared rules.

### Desktop (≥1200px)
```
Layout:     side-by-side
Primary:    60% width (inline-start)
Secondary:  40% width (inline-end)
Gap:        24px
Behavior:   both columns visible, full-height, independently scrollable
```

### Tablet (768px–1199px)
```
Layout:     stacked vertical
Primary:    100% width, appears first
Secondary:  100% width, appears below primary
Gap:        16px vertical
Behavior:   both visible, page scrolls as one unit
Exception:  if secondary is a detail pane (e.g., Maintenance jobs, Inventory active count),
            show it as a bottom sheet (50vh) triggered by selecting an item in primary
```

### Mobile (<768px)
```
Layout:     primary only visible by default
Secondary:  hidden — appears as a bottom sheet (70vh max) when triggered
Trigger:    selecting an item, clicking "details", or tapping a list row
Dismiss:    swipe down, backdrop tap, or explicit close button
Exception:  POS keeps its existing side-by-side → tab switch behavior at <768px
```

### CSS Implementation Pattern
```css
.split-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 1200px) {
  .split-layout {
    grid-template-columns: 3fr 2fr;
    gap: 24px;
  }
}
```

---

## Cross-Cutting Implementation Specs

> These specs are mandatory prerequisites for any wave that introduces tabs, bottom sheets, or compressed operational layouts.

- `ai-system/BOTTOM_SHEET_SPEC.md` is the canonical contract for every tablet/mobile secondary-detail sheet introduced by this plan.
- `ai-system/ACCESSIBILITY_AUDIT.md` is the execution gate for tabs, accordions, overlays, focus management, and touch-target density across all waves.
- Any section navigator behaving as a single-active-view switcher must be implemented as a tab system, not as an unstructured button row.
- Any two-column restructure must preserve route state, selected item context, and focus restoration when the secondary surface collapses below desktop.

---

## Execution Order

> Screens are ordered by dependency and impact.
> Each wave can run in parallel internally but must complete before the next wave starts.

### Wave 0 — Quick Wins (1–2 days)
| # | Screen | Task | Time |
|---|--------|------|------|
| 0.1 | Dashboard Loading | Fix sidebar skeleton → topbar skeleton | 2h |
| 0.2 | POS | Token migration (hardcoded emerald/amber/destructive → design tokens) | 4h |
| 0.3 | Navigation Shell | Tablet density rules + popover focus management | 3h |

### Wave 1 — Foundation Decisions (1 day)
| # | Task | Time |
|---|------|------|
| 1.1 | Apply Decision 1: Remove reconciliation from Settings | 2h |
| 1.2 | Apply Decision 2: Remove inventory completion from Settings | 1h |
| 1.3 | Merge Settings restructure (now simpler — 2 groups only) | 2h |

### Wave 2A — Decision-Critical Restructures (1 week)
| # | Screen | Pattern | Time | Dependency |
|---|--------|---------|------|------------|
| 2.1 | Settings | Two-column split + Accordion (2 groups) | 2d | Wave 1 |
| 2.2 | Reports | Tabs + Section hierarchy (3 tabs) | 2d | None |
| 2.3 | Shared hardening | Regression sweep + tab/a11y contract + CSS leak check | 1d | 2.1, 2.2 |

### Wave 2B — Supporting High-Complexity Restructures (1–1.5 weeks)
| # | Screen | Pattern | Time | Dependency |
|---|--------|---------|------|------------|
| 2.4 | Suppliers | Tabs + Two-column split + Accordion (4 tabs) | 2d | Wave 2A |
| 2.5 | Portability | Tabs + Progressive disclosure + Accordion | 1.5d | Wave 2A |
| 2.6 | Wave buffer | Mobile/browser regression + targeted fixes | 0.5–1d | 2.4, 2.5 |

### Wave 3 — Medium Complexity Restructures (1.5 weeks)
| # | Screen | Pattern | Time | Dependency |
|---|--------|---------|------|------------|
| 3.1 | Inventory | Tabs + Two-column split + Progressive disclosure | 1.5d | Wave 1 |
| 3.2 | Maintenance | Tabs + Two-column split + Search | 1d | None |
| 3.3 | Invoice Detail | Section hierarchy + Progressive disclosure | 1d | None |
| 3.4 | Notifications | Tabs + Progressive disclosure | 1d | None |

### Wave 4 — Lighter Restructures (1 week)
| # | Screen | Pattern | Time | Dependency |
|---|--------|---------|------|------------|
| 4.1 | POS | Progressive disclosure + density refinement | 1d | Wave 0.2 |
| 4.2 | Products | Conditional two-column + button consolidation | 4h | None |
| 4.3 | Debts | Two-column split + Accordion | 4h | None |
| 4.4 | Expenses | Tabs + search enhancement | 4h | None |
| 4.5 | Operations | Tabs + sidebar history rail | 3h | None |
| 4.6 | Invoices List | Sticky filters + active filter chips | 4h | None |

### Wave 5 — Polish (3 days)
| # | Task | Time |
|---|------|------|
| 5.1 | All low-severity visual tweaks (receipt branding, copy, states) | 1d |
| 5.2 | Final responsive audit across all restructured screens | 1d |
| 5.3 | Accessibility pass: focus management, aria, keyboard nav | 1d |

**Wave 2 timeline adjustment**: Split the original Wave 2 into `2A` and `2B`. Settings and Reports now land first because they carry the highest Wave 1 dependency, the heaviest user exposure, and the largest locator risk in existing tests. Suppliers and Portability move behind a hardening checkpoint so shared navigator, accessibility, and scoping regressions are caught before two more complex screens depend on them.

**Revised total estimated time: ~6.5 weeks**

---

## Screen Restructure Plans

### Reports (التقارير) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Cluttered - the screen is information-rich, but too many analytical regions compete without strong compression.

**Root cause**: The route treats filters, KPI bands, charts, tables, and operational watchlists as equal-weight blocks. The screen has the right content, but it lacks a dominant story and a secondary layer.

**Recommended structure**: Use **Tabs + Section hierarchy**. Keep one loaded-state summary tab as the default view, then move deep operational lists into narrower analytical tabs so the user reads the page in a clear sequence: scope summary, headline metrics, one dominant trend, then drill-down.

**Content mapping**:
- Tab 1 "Overview": compact report scope summary, `ملخص المقارنة`, `اتجاه الأداء`, and `مؤشرات سريعة`.
- Tab 2 "Sales & Returns": `تفصيل المقارنة`, `الفواتير`, `المرتجعات`, and `آخر اللقطات`.
- Tab 3 "Accounts & Operations": `الحسابات المالية`, `الديون الحالية`, `المخزون المنخفض`, `حركة الحسابات`, and `الصيانة`.

**Filters behavior**: The filter region is persistent across all tabs but **collapses after submission**. Filters appear as a summary chip row (e.g., `الفترة: أبريل 2026 | المقارنة: مارس`) with a "تعديل الفلاتر" expand button. This prevents filters from overshadowing the analytical story.

**What stays the same**: Keep the existing filters, comparison model, trend visualization, invoice table, return reporting, and maintenance/accounting datasets. The screen should still feel like one reporting module, not multiple unrelated pages.

**DS rules to watch**: DS-RULE-01, DS-RULE-06, DS-RULE-07, DS-RULE-10. Keep the loaded state visually compressed and avoid creating multiple equally loud card surfaces.

---

### Invoices List Filters (سجل الفواتير) — Enhancement Plan

**Current problem**: The invoices list has search and sort anchors, but it still lacks fast operational filtering. Users can scan or reorder the list, yet they cannot narrow it by lifecycle status or recent activity without manual hunting.

**Root cause**: The current list treats search and sort as sufficient control, even though invoice review often starts with a known operational question such as "show returned invoices from this week" or "show canceled invoices above a certain amount".

**Recommended enhancement**: Add a **sticky filter header + active filter chips** above the invoices list. This is a Wave `4.6` enhancement, not a route rewrite. The goal is to improve triage speed without changing invoice detail flows or API contracts.

**Content mapping**:
- `.invoices-page__filters`: sticky header containing status chips, date presets, optional amount-range trigger, and `مسح الكل`.
- `.invoices-page__active-filters`: dismissible active-filter chip row shown only when one or more filters are active.
- `.invoices-page__list`: existing invoice list remains the primary content surface.

**Filter model**:
- Status chips: `الكل`, `نشطة`, `مرتجعة`, `ملغاة`.
- Date presets: `آخر 7 أيام`, `آخر 30 يومًا`, `آخر 90 يومًا`, and `تخصيص`.
- Amount range: optional advanced filter with minimum and maximum values.

**UX impact**:
- The filter bar remains visible while the user scrolls the list.
- Active filters are visible as removable chips directly under the header.
- Search, sort, and filters work together instead of resetting one another.
- `مسح الكل` resets the filter state without clearing the search query unless the user explicitly clears search.

**State and data-flow decision**:
- Wave `4.6` stays client-side. Filtering operates on the already loaded invoice dataset.
- No API changes, schema changes, or pagination changes are introduced in this wave.
- Assumption: the existing loaded dataset remains bounded enough for client filtering. If the route later adopts server pagination or very large datasets, filtering becomes a follow-up server-side refinement rather than part of this enhancement.

**Edge cases**:
- `الكل` behaves as a reset state, not as a second active status.
- `مرتجعة` and `ملغاة` remain mutually exclusive unless the backend exposes a combined state later.
- Custom date range overrides date presets until cleared.
- Amount range validation must reject inverted ranges and incomplete min/max input when the user tries to apply it.
- Empty results keep the filter summary visible so the user knows why the list is empty.

**Test implications**:
- Existing list locators and sort buttons should remain stable.
- New coverage is required for sticky filter visibility, combined search+filter behavior, chip dismissal, and `مسح الكل`.
- Guard tests most likely affected: `tests/e2e/device-qa.spec.ts`, `tests/e2e/px06-device-gate.spec.ts`, `tests/e2e/px16-navigation-ia.spec.ts`, and `tests/e2e/px22-transactional-ux.spec.ts`.

**Rollout notes**:
- Ship behind Wave `4.6` only after Wave 1 and Wave 2 section-navigation changes settle.
- Preserve existing Arabic labels already asserted in tests where possible; add new labels rather than renaming existing sort controls.

**Acceptance criteria**:
- Sticky filter header remains visible while the invoice list scrolls.
- Status, date, and amount filters combine without breaking existing search or sort behavior.
- Each active filter can be removed individually.
- `مسح الكل` resets filters in one action.
- Empty and error states remain understandable with active filters applied.

---

### Inventory (الجرد) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Cluttered - the create/active/history structure is understandable, but the editable count detail can become visually heavy fast.

**Root cause**: The active count mode turns into a long wall of editable item cards, while reconciliation sits beside count workflows inside the same high-level center. The user sees too much operational detail at once once a session is selected.

**Recommended structure**: Use **Tabs + Two-column split + Progressive disclosure**. Keep the existing top-level modes, but make `الجلسات المفتوحة` and the selected session detail a stable split view. Inside the active workspace, show variance summary first, then a structured item table, and reveal row-level reason editing only when the user is working on that item.

**Content mapping**:
- Tab 1 "Create Count": `جلسة جرد جديدة`, scope selection, product picker, and the success result.
- Tab 2 "Active Counts": primary column for `الجلسات المفتوحة`; secondary column for count identity, variance strip, item table, row detail editor, and the `إكمال الجرد` action. **Inventory Completion lives here only** (per Decision 2).
- Tab 3 "Reconciliation": the existing `تسوية الحسابات` form and confirmation flow as a focused finance utility. **This is the single owner** (per Decision 1). Removed from Settings.
- Tab 4 "History": `آخر الجردات` and `آخر التسويات` as stacked accordions instead of parallel competing sections.

**Two-column behavior (Tab 2)**:
- Desktop: sessions list at `inline-start` (40%, visual right in RTL) | detail pane at `inline-end` (60%, visual left in RTL) — reversed ratio because detail is dominant here.
- Tablet: stacked — sessions list first, detail below.
- Mobile: sessions list only → tapping a session opens detail as bottom sheet.

**What stays the same**: Keep the four current modes, the count types, the selected-product flow, the completion confirmation, and the reconciliation action. The restructure is about weight and sequencing, not removing workflows.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-09, DS-RULE-10. Preserve RTL split behavior and keep full-height work areas on `100dvh`.

---

### Suppliers (الموردون) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Cluttered - each sub-flow makes sense, but the module scope is wider than a single calm screen.

**Root cause**: Directory management, purchase creation, payment capture, and history all belong here, but the current workspace gives every mode a large, dense surface. The purchase flow is especially heavy because search, line items, payment settings, and notes all live in one uninterrupted stack.

**Recommended structure**: Use **Tabs + Two-column split + Accordion**. Keep the current mode model, but tighten each mode around one primary action. Use split layouts where the user must compare a list against a detail or draft, and use accordions in history so purchases and payments do not compete at the same visual level.

**Content mapping**:
- Tab 1 "Directory": primary column for supplier search, filters, and list; secondary column for supplier details and the save form.
- Tab 2 "Purchase": primary column for supplier selection, product search, candidate results, and draft line items; secondary column for sticky order summary, payment mode, payment account, notes, and `تأكيد الشراء`.
- Tab 3 "Payment": a focused single-column payment form with the projected balance strip above the amount fields.
- Tab 4 "History": one accordion for purchase orders and one accordion for supplier payments.

**What stays the same**: Keep the existing supplier form fields, the purchase item model, the payment account logic, and the two distinct history feeds. The tab model is already valid and should remain.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-10. Do not introduce new decorative treatments to separate modes; rely on layout hierarchy and borders.

---

### Core Maintenance (الصيانة الأساسية) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Cluttered - the main workflow is understandable, but repeated editable job cards can quickly overload the page.

**Root cause**: The jobs view repeats a large editable card for every maintenance order, and each card can contain notes, money fields, account choices, status actions, and cancellation controls. That makes the queue hard to scan and hard to act on safely.

**Recommended structure**: Use **Tabs + Two-column split**. Keep the current `الملخص`, `طلب جديد`, and `أوامر الصيانة` tabs, but convert the jobs mode into a queue-and-detail workspace so only one order exposes its editable controls at a time.

**Content mapping**:
- Tab 1 "Overview": summary cards, maintenance accounts, and non-blocking result feedback.
- Tab 2 "New Order": the existing create form and success state.
- Tab 3 "Jobs": primary column for the job queue with status/customer/device summary; secondary column for the selected job detail, notes, amount fields, payment account, primary status actions, and a separated cancel action.

**Missing feature — Queue search**: Add a search/filter bar at the top of the Jobs primary column. Filter by customer name, device, job number, or status. This is essential for shops with 20+ active jobs where scrolling is impractical.

**What stays the same**: Keep the current order statuses, account settlement logic, create flow, and cancel confirmation. The screen still needs to support the full maintenance lifecycle in one module.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-10. Status actions must keep safe spacing and clear separation from destructive actions.

---

### Notifications (الإشعارات) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Cluttered - the modes are useful but too broad for one center without careful visual separation.

**Root cause**: Inbox handling, alert summaries, and cross-module search are all valid tasks, but they carry different mental models. The current workspace risks making filters, queue content, and search results feel equally primary.

**Recommended structure**: Use **Tabs + Progressive disclosure**. Keep the existing three modes, but tighten each one around a single primary reading pattern: queue, alert summary, or search result stack. Secondary controls should collapse into supporting panels instead of sharing equal width with the main result area.

**Content mapping**:
- Tab 1 "Inbox": main region for `صندوق الإشعارات`; secondary filter panel for `فلاتر المتابعة`, collapsed on mobile and narrow on desktop.
- Tab 2 "Alerts": compact alert chips or summary cards only, with follow-up work routed back into the inbox or source screen.
- Tab 3 "Search": top search toolbar for query/entity/limit, followed by grouped results; error and empty states remain inline below the form.

**What stays the same**: Keep the inbox, alert chips, grouped search results, and the same notification actions. The existing top-level tab model is already the correct IA boundary.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-10. Do not let filters visually outweigh the active queue or result list.

---

### Invoice Detail (تفاصيل الفاتورة) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Cluttered - the invoice summary is clear, but too many important actions compete in the side rail.

**Root cause**: Sharing, public receipt management, returns, and destructive admin cancellation all live next to the invoice summary, so routine and exceptional actions feel equally urgent. The returns flow also becomes visually long when every item opens as an editable block.

**Recommended structure**: Use **Section hierarchy + Progressive disclosure**. Keep the existing `overview`, `returns`, and `admin` sections, but reduce the side rail to one ordered action stack per mode. In returns, show selection first and reveal settings/history after the user defines the return scope.

**Content mapping**:
- Section 1 "Overview": main invoice card stays primary; secondary rail becomes one ordered output panel with link state, sharing actions, and WhatsApp actions grouped under one heading.
- Section 2 "Returns": selected invoice stays primary; returnable items become a selectable list first, then the return form and financial options appear below it; historical returns move into a collapsible history block.
- Section 3 "Admin": the cancellation flow stays isolated in its own danger-focused panel.

**What stays the same**: Keep the invoice summary, item list, payments list, share-link logic, return processing, and admin authorization behavior. The current three-way section split is good and only needs hierarchy tightening.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-10. Keep routine actions visually subordinate to the invoice facts and isolate danger actions with spacing, not new visual effects.

---

### Settings (الإعدادات) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Confusing - the screen mixes governance, finance integrity, and inventory execution in one place.

**Root cause**: Permissions, snapshots, integrity checks, reconciliation, inventory completion, and policies are not one mental model. The workspace mixes long-lived governance settings with live operational utilities, so the user has no clear first-level grouping.

**Recommended structure**: Use **Two-column split + Accordion**. The `inline-start` column becomes a category navigator with a single active selection, and the `inline-end` column becomes the only detail surface.

**Content mapping** (updated per Decisions 1 & 2):
- `inline-start` navigator group "Access & Governance": `permissions` and `policies`.
- `inline-start` navigator group "System Oversight": `snapshot` and `integrity`.
- `inline-end` detail pane: one active section only, with its existing form/list/result content preserved.

**Removed from Settings** (per architectural decisions):
- ~~Reconciliation~~ → moved to Inventory Tab 3
- ~~Inventory Completion~~ → moved to Inventory Tab 2

**Two-column behavior**:
- Desktop: navigator at `inline-start` (25%, visual right in RTL) | detail pane at `inline-end` (75%, visual left in RTL).
- Tablet: navigator collapses into a horizontal tab bar at the top; detail pane is full-width below.
- Mobile: same as tablet — horizontal tabs + full-width detail.

**What stays the same**: Keep the permissions panel, snapshot creation and recent snapshots, integrity check, and policy cards. The recommendation changes the container IA, not the underlying tools.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-08, DS-RULE-10. This restructure should remove outdated mixed-purpose weight, not add another competing shell inside the page.

---

### Portability (النقل والاستيراد والاستعادة) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Confusing - the actions are individually clear, but the module combines too many risky jobs in one frame.

**Root cause**: Export, import, restore, revoke, and historical audit all belong to portability, but they have very different risk levels and success criteria. The current screen keeps too many high-risk surfaces visible at once, especially when result cards and history compete with live action forms.

**Recommended structure**: Use **Tabs + Progressive disclosure + Accordion**. Keep the current four top-level modes, but show only one risky action path at a time and demote result/history review into secondary surfaces. Commit and restore actions should appear only after the user completes the prerequisite review state.

**Content mapping**:
- Tab 1 "Export": package scope form first, last export result second.
- Tab 2 "Import": upload and dry-run review first, commit action only after dry-run success, final result after commit.
- Tab 3 "Restore": restore selection and warnings first, restore confirmation second, result summary last.
- Tab 4 "History": one accordion for package history and one accordion for import/restore history.

**What stays the same**: Keep the four current workflows, the monitoring notice, the revoke/commit/restore confirmations, and the same result logs. The screen still acts as one controlled portability center.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-10. Risk separation should come from ordered states and accordions, not stronger colors or shadows.

---

### Dashboard Loading Screen (شاشة التحميل العامة) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Confusing - the skeleton suggests an outdated shell structure that no longer exists.

**Root cause**: The loading state still draws a sidebar-oriented shell even though the product now uses a topbar plus popover navigation. That makes the first visual frame structurally wrong before real content even loads.

**Recommended structure**: Use **Section hierarchy**. Replace the sidebar skeleton with a shell-aligned loading frame: topbar skeleton first, summary/loading header second, then one or two content panels that match the active dashboard page pattern. The skeleton should represent the current navigation model rather than a legacy layout.

**Content mapping**:
- Top shell row: menu button skeleton, title/context skeleton, and action button skeletons.
- Secondary summary row: 3 to 4 stat-card skeletons or one wide summary strip.
- Main content region: one dominant panel skeleton plus subordinate table/card skeletons depending on the route.

**What stays the same**: Keep the neutral Aya shell surfaces, the existing skeleton language, and the general loading rhythm. The change is only the shell structure and the priority order of placeholders.

**DS rules to watch**: DS-RULE-07, DS-RULE-08, DS-RULE-09, DS-RULE-10. The loading shell must match the live shell and use full-height containers correctly.

---

### POS (نقطة البيع) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Clear but dense — the core split (products vs cart) is correct, but secondary features (held carts, split payments, discounts, recovery banners, customer search) crowd the workspace without clear hierarchy.

**Root cause**: The POS is the highest-frequency screen in the system. Every feature added to it fights for space in a already tight layout. The problem is not the feature set — it is correct — but the lack of progressive disclosure. All options are visible at once regardless of the current workflow stage.

**Recommended structure**: Use **Progressive disclosure** within the existing split layout. Do not change the fundamental split: products at `inline-start` (visual right in RTL) and cart at `inline-end` (visual left in RTL). Hide complexity until the user needs it.

**Content mapping**:
- **Products area** (inline-start): search bar + category chips + product grid/list. No changes needed.
- **Cart area** (inline-end): restructure into 3 progressive states:
  - **State 1 "Empty cart"**: placeholder prompt + held carts button (if any held).
  - **State 2 "Building"**: item list + subtotal strip. Customer selection and discount fields appear as **collapsible sections** below the item list, not as persistent visible inputs.
  - **State 3 "Checkout"**: sticky total + payment method(s) + confirm button. Split payment toggle only appears when user requests it, not by default.
- **Held carts**: trigger from a badge button in cart header → opens as **bottom sheet** listing held carts. Not inline panel.
- **Mobile behavior**: keeps the existing tab switch (Products tab / Cart tab). Cart sheet on mobile uses the same progressive states.

**Missing feature — Offline indicator**: When cached/offline, show a persistent but compact status chip in the topbar area (e.g., `وضع عدم الاتصال 🟡`) rather than a full-width banner that pushes content down.

**Missing interaction — Keyboard shortcuts**: POS should support:
- `F2` or `/` → focus search
- `Escape` → clear search
- `Enter` on product → add to cart
- `F9` → open checkout

**Token migration**: Replace hardcoded emerald/amber/destructive validation utility colors at `pos-workspace.tsx:199` with `var(--color-success)`, `var(--color-warning)`, `var(--color-danger)` and their background variants. This is a **DS-RULE-01 violation** — fix in Wave 0.

**What stays the same**: Keep the products/cart split, the held-carts feature, split payments, customer search, category chips, and recovery banners. The screen keeps its existing functionality — only the visibility hierarchy changes.

**DS rules to watch**: DS-RULE-01, DS-RULE-06, DS-RULE-07, DS-RULE-10. The POS must remain the fastest screen in the system — every progressive disclosure step must open in <100ms.

---

### Products (المنتجات) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Clear but has competing interactions — in admin mode, the product card is fully clickable while also containing explicit edit/disable buttons, creating redundant hit targets. The admin form and product grid share the same viewport and compete visually on narrow widths.

**Root cause**: The screen serves two roles (browsing and admin management) but treats both with equal visual weight. The admin form should be subordinate to the catalog grid since browsing is the primary action even in admin mode.

**Recommended structure**: Use **Conditional two-column** for admin mode. Normal browsing is single-column (grid only). Admin mode activates a secondary form column.

**Content mapping**:
- **Browsing mode** (default): full-width product grid with search/filter bar + category chips. Product cards are not clickable — they display info only.
- **Admin mode**: 
  - Primary column: product grid (same as browsing, but cards show an explicit `تحرير` icon button only — no full-card click, no inline `تعطيل`).
  - Secondary column: admin form (appears when `تحرير` is clicked or `منتج جديد` is triggered). Contains all edit fields + save + disable actions.
  - If no product is selected: secondary column shows an empty state ("اختر منتجًا للتعديل").

**Button consolidation**:
- Remove full-card-click behavior in admin mode. Rely on explicit `تحرير` icon button only.
- Move `تعطيل` action into the admin form (bottom, danger zone) — not on the card itself.
- This eliminates accidental edit triggers when the user just wants to browse.

**Two-column behavior (admin mode)**:
- Desktop: grid (60%) | form (40%).
- Tablet: stacked — grid first, form below (form stays visible when a product is selected).
- Mobile: grid only → tapping `تحرير` opens form as bottom sheet.

**What stays the same**: Keep the product card design, search/filter/category behavior, quick-add cards, admin form fields, create/edit/disable functionality. The restructure changes interaction targets and layout, not data flow.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-10. Product cards in admin mode must visually indicate they are actionable (subtle hover state on the edit button, not on the full card).

---

### Debts (الديون) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Clear but vertically heavy — the customer-centric anchor is strong, but ledger review, manual debt creation, and payment capture all stack into one long column after a customer is selected.

**Root cause**: Three distinct workflows (view debt entries, create manual debt, process payment) live in the same vertical space with no compression or mode separation. For customers with 10+ open entries, the page becomes a wall of content.

**Recommended structure**: Use **Two-column split + Accordion** within the selected customer detail area.

**Content mapping**:
- **Primary column** (inline-start): customer list with search. Same as current behavior — selecting a customer updates the detail.
- **Secondary column** (inline-end): selected customer summary cards at top (balance, limit, due days), followed by an **accordion** with 3 sections:
  - Accordion 1 "سجل الديون" (default open): debt entries list with remaining/due info.
  - Accordion 2 "دين يدوي" (collapsed): manual debt form — expands when admin clicks `+ دين يدوي`.
  - Accordion 3 "التسديد" (collapsed): payment form with FIFO allocation — expands when user clicks `التسديد`.
  - Only one accordion section can be expanded at a time (exclusive accordion).

**Missing feature — Aging buckets**: Add a compact aging strip above the debt entries list:
```
| فوري (اليوم) | 1-7 أيام | 8-14 يوم | 15-30 يوم | +30 يوم |
| 0.000 د.أ    | 45.500   | 120.000  | 0.000     | 300.000 |
```
This gives the user instant prioritization context without adding a new screen or mode.

**Two-column behavior**:
- Desktop: customer list (35%) | detail (65%).
- Tablet: stacked — customer list first, detail below.
- Mobile: customer list only → selecting a customer opens detail as bottom sheet.

**What stays the same**: Keep the customer list, debt entry display, manual debt form, payment form, FIFO logic, and all action confirmations. The restructure compresses existing content, not removing it.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-10. Aging buckets use semantic color tokens: `--color-success` for zero/healthy, `--color-warning` for 8-30 days, `--color-danger` for 30+.

---

### Expenses (المصروفات) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Clear but admin mode is list-heavy — the create flow is readable, but category management becomes a long series of inline editable cards with no filter, search, or grouping.

**Root cause**: Category management was designed for a handful of categories. Once a store has 15+ categories, the admin tab becomes an unmanageable wall of cards. Additionally, the separation between `create`, `recent`, and `categories` tabs means the user can't see category options while filling the create form.

**Recommended structure**: Use **Tabs + Progressive disclosure**. Keep the current tab model but enhance each tab's internal behavior.

**Content mapping**:
- Tab 1 "Create": expense form + inline read-only category chip list (for quick reference without switching tabs) + success result card. Recent expenses appear as a compact 3-row preview below the form.
- Tab 2 "Recent": full recent expenses list with `تحميل المزيد`. Add a simple filter by category chip row at the top.
- Tab 3 "Categories" (admin only): add a **search bar** at the top. Categories display as a compact table (not large cards):
  ```
  | الفئة | النوع | الترتيب | الحالة | إجراء |
  ```
  Clicking `تعديل` on a category row expands an inline edit form below that row (progressive disclosure). This replaces the current pattern of every category being a large editable card.

**Missing feature — Category search**: The categories tab must include a search bar that filters by category name. Essential for stores with 15+ categories.

**Missing feature — Category preview in create tab**: Show category names as read-only chips in the create tab so the user can see valid options without switching to the categories tab.

**What stays the same**: Keep the expense form fields, category model, payment account logic, and the basic tab structure. The restructure improves density and adds discovery tools, not new data flows.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-10. Category table rows must use compact 44px row height, not card-style surfaces.

---

### Operations (الشحن والتحويلات) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Clear but history disconnected — top-up and transfer forms have strong anchors, but historical context disappears entirely when the user is in a create mode, forcing unnecessary mode switching.

**Root cause**: The tab structure separates creation from history completely. A user submitting a top-up cannot see their recent top-ups for reference (e.g., "did I already do this one?"). The non-admin transfer blocked state also creates dead space inside an active tab.

**Recommended structure**: Use **Tabs + Sidebar history rail**. Keep the current tab model but add a persistent mini-history rail in create tabs.

**Content mapping**:
- Tab 1 "Top-up": inline-start: top-up form (provider, account, amount, projected cost). Inline-end: **compact recent history rail** showing the last 5 top-ups (number, amount, date only — no full cards). Success result appears above the form after submit.
- Tab 2 "Transfer" (admin only): single-column transfer form with projected balance strip. For non-admin: show a clear permission-required empty state with a descriptive message and a link to request access (not blank dead space).
- Tab 3 "History": full history tables for top-ups and transfers, displayed as stacked sections (not competing side-by-side).

**History rail behavior**:
- Desktop: form (65%) | mini history rail (35%).
- Tablet: form (100%). Mini history appears as a collapsible section below the form.
- Mobile: form only. History accessible via Tab 3 or a "آخر العمليات" link below the form.

**Missing interaction — Non-admin state**: The transfer tab for non-admin users currently shows blank space. Replace with:
```
عنوان: "التحويلات الداخلية"
نص: "هذه العملية تتطلب صلاحية إدارية. تواصل مع مديرك للوصول."
زر ثانوي: "العودة للشحن" → switches to Tab 1
```

**What stays the same**: Keep the top-up form, transfer form, payment account logic, projected cost/balance strips, and history records. The restructure adds reference context and fixes empty states, not new workflows.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-10. History rail items use compact typography (font-size: 0.8125rem) and one-line layout.

---

### Navigation Shell (هيكل التنقل العام) — Restructuring Plan

**Current problem**: **Information Hierarchy Rating**: Clear but fragile at edge sizes — menu, title, search, notifications, and account controls all share one topbar, creating compression risk at tablet widths. The nav popover also lacks proper focus management.

**Root cause**: The topbar is designed for desktop comfort (plenty of horizontal space) but does not define degradation rules for narrower viewports. The popover behaves like a visual overlay but does not trap focus, handle Escape, or manage backdrop clicks consistently.

**Recommended structure**: Use **Responsive compression + Focus management patterns**.

**Topbar compression rules**:
```
Desktop (≥1200px):
  All elements visible: menu | title | search | notifications | account chip
  
Tablet (768px–1199px):
  Compress: hide account chip text (show avatar only)
  Search: keep icon, hide text label if present
  Notifications: keep icon + badge
  Menu: keep icon
  Title: truncate with ellipsis at max-width: 200px

Mobile (<768px):
  Topbar: menu icon | centered title (truncated) | notifications icon
  Search: moves to bottom bar or inside nav popover
  Account: moves inside nav popover only
  Bottom bar: maintains existing 5-item layout
```

**Nav popover focus management**:
```
Opening:
  1. Trigger button sets aria-expanded="true"
  2. Popover sets role="dialog", aria-modal="true"
  3. Focus moves to first focusable element inside popover
  4. Backdrop overlay appears with z-index per DS z-index table

While open:
  1. Tab/Shift+Tab cycles through popover items only (focus trap)
  2. Escape → closes popover, returns focus to trigger button
  3. Backdrop click → closes popover, returns focus to trigger button
  4. Nav item click → navigates, closes popover

Closing:
  1. Trigger button sets aria-expanded="false"
  2. focus returns to trigger button
  3. Backdrop removed

Mobile bottom sheet variant:
  Same focus rules, but sheet slides up from bottom with touch-dismiss support
```

**Missing interaction — Keyboard navigation**:
- `Alt+M` or `F10` → open/close menu popover
- Arrow keys inside popover → navigate between nav items
- `Home`/`End` inside popover → jump to first/last item

**What stays the same**: Keep the current topbar layout, bottom bar items, popover content structure, and account chip. The restructure adds resilience rules and accessibility, not new elements.

**DS rules to watch**: DS-RULE-06, DS-RULE-07, DS-RULE-08, DS-RULE-09, DS-RULE-10. The shell is the highest z-index layer — popover must coordinate with confirmation dialogs and cart sheets.

---

## Missing Features & Interaction Patterns Registry

> Features and patterns identified during the restructure analysis that are **not layout changes** but **must be implemented** alongside the restructure work.

### Token & Style Fixes

| # | Screen | Issue | Action | Wave |
|---|--------|-------|--------|------|
| F-01 | POS | Hardcoded emerald/amber/destructive colors | Replace with `--color-success/warning/danger` tokens | 0.2 |

### Missing Features

| # | Screen | Feature | Description | Wave |
|---|--------|---------|-------------|------|
| F-02 | Maintenance | Queue search/filter | Search by customer, device, job number, status | 3.2 |
| F-03 | Debts | Aging buckets | Compact strip showing debt aging (today/7d/14d/30d/30d+) | 4.3 |
| F-04 | Expenses | Category search | Search bar in categories admin tab | 4.4 |
| F-05 | Expenses | Category preview in create | Read-only category chips visible in create tab | 4.4 |
| F-06 | Operations | Non-admin transfer state | Descriptive permission-required message instead of blank | 4.5 |
| F-07 | POS | Offline indicator | Compact status chip instead of full-width banner | 4.1 |
| F-08 | Invoices List | Sticky filters | Status/date/amount filters + active chips + clear all | 4.6 |

### Interaction Patterns

| # | Screen | Pattern | Description | Wave |
|---|--------|---------|-------------|------|
| I-01 | Shell | Focus trap for popover | aria-modal, focus cycling, Escape handler | 0.3 |
| I-02 | Shell | Keyboard nav for popover | Arrow keys, Home/End, Alt+M | 0.3 |
| I-03 | POS | Keyboard shortcuts | F2/search, Escape/clear, Enter/add, F9/checkout | 4.1 |
| I-04 | Debts | Exclusive accordion | Only one section open at a time in customer detail | 4.3 |
| I-05 | All two-column | Mobile bottom sheet | Consistent sheet pattern for secondary columns on mobile | All waves |
| I-06 | Reports | Collapsible filters | Filters collapse to chip summary after submission | 2.2 |

### Accessibility Requirements

| # | Screen | Requirement | Wave |
|---|--------|-------------|------|
| A-01 | Shell | Popover: role="dialog", aria-modal="true", aria-expanded on trigger | 0.3 |
| A-02 | All tabs | Tab panels: role="tablist", role="tab", aria-selected, role="tabpanel" | All waves |
| A-03 | All accordions | Accordion: aria-expanded, aria-controls, keyboard Enter/Space toggle | All waves |
| A-04 | All bottom sheets | Sheet: role="dialog", aria-modal="true", touch-dismiss + Escape | All waves |
| A-05 | Section navigators | Single-active section rows use the shared tab contract and focus restoration rules | Wave 1+ |

---

## Shared CSS Scoping Rules

> These rules prevent layout and state styles from leaking between restructured screens that share similar naming families.

**Current assessment**: The project already uses shared naming families such as `.operational-*`, `.configuration-*`, `.transaction-*`, and `.analytical-*`. This is useful for primitives, but it becomes risky when screen-specific spacing, split ratios, hover states, or disclosure behavior are attached to generic selectors.

**Architectural rule set**:
1. Global scope is reserved for tokens, low-level primitives, and test-protected structural contracts.
2. Any screen-specific layout, spacing, density, or interactive-state rule must be parent-scoped by the route surface class.
3. Shared families stay legal only when the rule is truly shared across three or more screens without changing interaction meaning.
4. State modifiers (`.is-active`, `.is-open`, `.is-danger`) must decorate an already scoped base selector rather than a naked global family selector.

**Naming and isolation strategy**:
- Good:
  - `.inventory-page .operational-list-card`
  - `.suppliers-page .operational-sidebar`
  - `.settings-page .configuration-panel`
- Bad:
  - `.operational-list-card`
  - `.configuration-panel.is-expanded`
  - `.transaction-summary button`

**Shared-style handling**:
- Tokens, type scales, borders, and focus rings may stay globally shared.
- Layout ratios, sticky positioning, accordion spacing, and selection visuals must live under the screen parent.
- If a pattern becomes shared across three or more screens with identical behavior, promote it deliberately instead of by accidental copy-paste.

**Precedence and overrides**:
- Lowest: tokens and base primitives.
- Next: shared family primitive selectors.
- Next: screen parent scope selectors.
- Highest: state modifiers scoped under the screen parent.
- `!important` is not allowed for restructure work.

**Maintainability guidance**:
- Prefer one stable parent route class per screen as the scoping anchor.
- Avoid deep descendant chains longer than three levels.
- Edit existing selectors before adding duplicate ones that compete in the cascade.
- Preserve test-protected class names; add parent scope instead of renaming stable selectors.

**Risks and anti-patterns**:
- Adding screen layout rules to naked `.operational-*` selectors will create cross-screen regressions.
- Moving component-specific rules into `globals.css` without a shared behavioral reason will increase leakage.
- Styling by heading text, DOM order, or generic `button` descendants will make restructure waves brittle.

**Acceptance criteria**:
- No Wave 1 to Wave 4 restructure relies on an unscoped screen-specific selector family.
- Shared selectors retained in `globals.css` are primitive or explicitly documented as cross-screen contracts.
- Screen-specific overrides remain parent-scoped and do not require `!important`.
- Protected classes used in e2e tests remain stable.

---

## Summary Table

| Screen | Current Rating | Recommended Pattern | Complexity | Wave |
|---|---|---|---|---|
| Dashboard Loading Screen | Confusing | Section hierarchy | Low | 0.1 |
| POS (tokens only) | Token violation | Token migration | Low | 0.2 |
| Navigation Shell | Clear (fragile) | Responsive compression + Focus management | Medium | 0.3 |
| Settings | Confusing | Two-column split + Accordion (2 groups) | High | 2.1 / 2A |
| Reports | Cluttered | Tabs + Section hierarchy | High | 2.2 / 2A |
| Suppliers | Cluttered | Tabs + Two-column split + Accordion | High | 2.4 / 2B |
| Portability | Confusing | Tabs + Progressive disclosure + Accordion | High | 2.5 / 2B |
| Inventory | Cluttered | Tabs + Two-column split + Progressive disclosure | High | 3.1 |
| Core Maintenance | Cluttered | Tabs + Two-column split + Search | Medium | 3.2 |
| Invoices List | Missing fast triage filters | Sticky filters + active chips | Low | 4.6 |
| Invoice Detail | Cluttered | Section hierarchy + Progressive disclosure | Medium | 3.3 |
| Notifications | Cluttered | Tabs + Progressive disclosure | Medium | 3.4 |
| POS (layout) | Clear (dense) | Progressive disclosure | Medium | 4.1 |
| Products | Clear (competing) | Conditional two-column + Button consolidation | Medium | 4.2 |
| Debts | Clear (heavy) | Two-column split + Accordion | Medium | 4.3 |
| Expenses | Clear (list-heavy) | Tabs + Progressive disclosure + Search | Low | 4.4 |
| Operations | Clear (disconnected) | Tabs + Sidebar history rail | Low | 4.5 |
