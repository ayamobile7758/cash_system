# CSS Bridge

Generated for Task `2026-04-06-005` on 2026-04-07.

## Section 1 — Component Class Mapping

| Library Class | Real Codebase Class | File Where Used | Match Type | Notes |
|---------------|--------------------|-----------------|-----------|-------|
| `.library-layout` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.sidebar-nav` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.nav-title` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.nav-link` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.content-area` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.section-block` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.component-group` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.component-label` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.demo-box` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.demo-row` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.helper-note` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.shell-demo` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.dialog-demo-area` | `N/A` | `New/component-library.html` | `NEW` | Component-library documentation scaffold only; no runtime equivalent in the app shell. |
| `.topbar` | `.dashboard-topbar` | `app/globals.css` | `EXACT` | Primary Aya shell header. |
| `.topbar-right` | `.dashboard-topbar__start` | `app/globals.css` | `EXACT` | RTL start cluster; visually the right-hand side of the topbar. |
| `.topbar-left` | `.dashboard-topbar__end` | `app/globals.css` | `EXACT` | RTL action cluster; visually the left-hand side of the topbar. |
| `.app-name` | `.dashboard-header-title` | `app/globals.css` | `PATTERN` | Topbar surfaces page context in `.dashboard-header-title`; brand text lives in `.dashboard-brandmark__copy` inside the popover. |
| `.popover-anchor` | `.dashboard-nav-trigger` | `app/globals.css` | `EXACT` | Relative anchor for the menu button and the mega popover. |
| `.nav-popover` | `.dashboard-nav-popover` | `app/globals.css` | `EXACT` | Mega popover navigation surface. |
| `.nav-popover-label` | `N/A` | `components/dashboard/dashboard-shell.tsx` | `NEW` | Current popover has grouped sections and no standalone label row. |
| `.nav-item` | `.dashboard-nav__item` | `app/globals.css` | `EXACT` | Primary workspace navigation link. |
| `.nav-footer` | `.dashboard-nav-popover__footer` | `app/globals.css` | `EXACT` | Footer region for account chip and logout/action. |
| `.user-chip` | `.dashboard-sidebar__account` | `app/globals.css` | `EXACT` | Popover account chip in the current shell footer. |
| `.user-info` | `.dashboard-sidebar__account`, `.dashboard-user-chip` | `app/globals.css` | `PATTERN` | Identity info is expressed by the popover account chip and the topbar user chip rather than a separate inner wrapper. |
| `.user-avatar` | `.dashboard-sidebar__account-avatar` | `app/globals.css` | `EXACT` | Avatar token inside the account chip. |
| `.user-text` | `.dashboard-sidebar__account-copy` | `app/globals.css` | `EXACT` | Copy stack inside the account chip. |
| `.user-name` | `.dashboard-sidebar__account-copy` | `app/globals.css` | `PATTERN` | Name is rendered by the `strong` child inside `.dashboard-sidebar__account-copy` or `.dashboard-user-chip__copy`. |
| `.user-role` | `.dashboard-sidebar__account-copy` | `app/globals.css` | `PATTERN` | Role/secondary line is rendered by the `small` child inside the account-copy wrapper. |
| `.notif-badge-container` | `.dashboard-topbar__notifications` | `app/globals.css` | `EXACT` | Notification trigger container. |
| `.notif-dot` | `.dashboard-topbar__notifications-badge` | `app/globals.css` | `EXACT` | Unread badge on the notification trigger. |
| `.topbar-search` | `.dashboard-quick-search-minimal` | `app/globals.css` | `EXACT` | Compact topbar search surface. |
| `.topbar-search-panel` | `N/A` | `components/dashboard/dashboard-shell.tsx` | `NEW` | Current shell uses an always-inline minimal search control, not a collapsible panel wrapper. |
| `.topbar-search-input` | `.dashboard-quick-search-minimal` | `app/globals.css` | `PATTERN` | Input is the child `input` inside `.dashboard-quick-search-minimal`; no dedicated input class exists. |
| `.mobile-bottom-bar` | `.dashboard-bottom-bar` | `app/globals.css` | `EXACT` | Mobile workspace bottom navigation. |
| `.bot-item` | `.dashboard-bottom-bar__item` | `app/globals.css` | `EXACT` | Bottom-bar navigation item. |
| `.active` | `.is-active`, `.chip--active`, `.is-selected` | `app/globals.css` | `PATTERN` | State is expressed through modifier classes instead of a generic `.active` utility. |
| `.ghost` | `.ghost-button`, `.btn--ghost` | `app/globals.css` | `PATTERN` | Ghost state is split between button primitives and icon-button variants. |
| `.icon-btn` | `.icon-button` | `app/globals.css` | `EXACT` | Shared icon button primitive. |
| `.btn` | `.btn` | `app/globals.css` | `EXACT` | Shared button foundation class. |
| `.btn-primary` | `.btn--primary` | `app/globals.css` | `EXACT` | Primary button variant paired with `.primary-button` in JSX. |
| `.btn-ghost` | `.btn--ghost` | `app/globals.css` | `EXACT` | Ghost/quiet button variant. |
| `.btn-danger` | `.btn--danger` | `app/globals.css` | `EXACT` | Destructive button variant. |
| `.btn-success` | `.transaction-checkout-button` | `app/globals.css` | `EXACT` | Success-colored CTA exists as the checkout/complete-sale button rather than a generic button modifier. |
| `.btn-sm` | `N/A` | `app/globals.css` | `NEW` | No reusable small button size modifier exists in the live button system. |
| `.btn-lg` | `.transaction-checkout-button` | `app/globals.css` | `PATTERN` | Large button treatment is applied through checkout CTA classes instead of a generic size-only modifier. |
| `.loader` | `.spin` | `app/globals.css` | `EXACT` | Animated spinner utility used inside submit buttons. |
| `.form-group` | `.input-group`, `.stack-field` | `app/globals.css` | `PATTERN` | Form grouping is split between auth-specific `.input-group` and the general `.stack-field` layout. |
| `.form-label` | `.field-label` | `app/globals.css` | `EXACT` | Shared field label primitive. |
| `.input-base` | `.field-input` | `app/globals.css` | `EXACT` | Shared field/input primitive. |
| `.input-error` | `.field-input`, `.field-error` | `app/globals.css` | `PATTERN` | Error styling is applied by combining the input primitive with the `.field-error` message block. |
| `.error-text` | `.field-error` | `app/globals.css` | `EXACT` | Inline validation/error text. |
| `.select-wrapper` | `N/A` | `app/globals.css` | `NEW` | Live forms rely on native selects without a dedicated wrapper class. |
| `.select-arrow` | `N/A` | `app/globals.css` | `NEW` | Live selects do not render a custom arrow class. |
| `.search-wrapper` | `.workspace-search` | `app/globals.css` | `EXACT` | Shared search-field wrapper. |
| `.search-icon` | `.search-icon` | `app/globals.css` | `EXACT` | Shared inline search icon class. |
| `.search-input` | `.workspace-search`, `.dashboard-quick-search-minimal`, `.pos-search-field__input` | `app/globals.css`, `components/pos/view/pos-toolbar.tsx` | `PATTERN` | Search input styling is expressed by wrapper classes plus child `input` selectors. |
| `.search-clear` | `.pos-search-clear` | `app/globals.css` | `EXACT` | Clear-search control in POS/product discovery. |
| `.cat-chips` | `.chip-row` | `app/globals.css` | `EXACT` | Shared horizontal chip row. |
| `.chip` | `.chip` | `app/globals.css` | `EXACT` | Shared chip primitive. |
| `.is-open` | `.pos-cart-sheet--expanded`, `.is-active` | `app/globals.css` | `PATTERN` | Open state is expressed with component-specific modifiers rather than a shared `.is-open` class. |
| `.is-visible` | `N/A` | `app/globals.css` | `NEW` | Visibility toggles are handled by conditional rendering or component-specific selectors, not a shared utility class. |
| `.is-dismissing` | `N/A` | `app/globals.css` | `NEW` | Current app delegates transient toast dismissal to `sonner`; there is no owned dismissing class. |
| `.tabular` | `N/A` | `app/globals.css` | `NEW` | Numeric alignment is handled by `font-variant-numeric` and formatter patterns, not a `.tabular` utility class. |
| `.ltr-value` | `N/A` | `components/pos/view/pos-cart-rail.tsx` | `NEW` | LTR isolation is handled with `<bdi dir="ltr">` rather than a dedicated utility class. |
| `.stat-card` | `.stat-card` | `app/globals.css` | `EXACT` | Shared KPI/stat card surface. |
| `.stat-top` | `.stat-card` | `app/globals.css` | `PATTERN` | Current stat cards rely on direct child order and do not expose a separate header wrapper class. |
| `.stat-label` | `.stat-card__label` | `app/globals.css` | `EXACT` | Label line inside a stat card. |
| `.stat-num` | `.stat-card__value` | `app/globals.css` | `EXACT` | Primary numeric value inside a stat card. |
| `.stat-icon` | `.dashboard-home__kpi-icon`, `.lp-stat-card svg` | `app/globals.css` | `PATTERN` | Icon treatments exist in route-specific KPI cards rather than a shared `.stat-card__icon` contract. |
| `.trend-badge` | `.stat-card__trend` | `app/globals.css` | `EXACT` | Trend pill inside stat cards. |
| `.status-badge` | `.status-badge` | `app/globals.css` | `EXACT` | Shared status badge component. |
| `.badge-success` | `.badge--success` | `app/globals.css` | `EXACT` | Success badge modifier. |
| `.badge-danger` | `.badge--danger` | `app/globals.css` | `EXACT` | Danger badge modifier. |
| `.badge-warning` | `.badge--warning` | `app/globals.css` | `EXACT` | Warning badge modifier. |
| `.badge-neutral` | `.badge--neutral` | `app/globals.css` | `EXACT` | Neutral badge modifier. |
| `.data-table-wrap` | `.table-wrap` | `app/globals.css` | `EXACT` | Scrollable table wrapper. |
| `.data-table` | `.data-table` | `app/globals.css` | `EXACT` | Shared data-table primitive. |
| `.empty-state` | `.empty-state` | `app/globals.css` | `EXACT` | Shared empty-state surface. |
| `.empty-icon` | `.empty-state__icon` | `app/globals.css` | `EXACT` | Icon inside the empty state. |
| `.empty-title` | `.empty-state__title` | `app/globals.css` | `EXACT` | Heading inside the empty state. |
| `.empty-desc` | `.empty-state__description` | `app/globals.css` | `EXACT` | Supporting copy inside the empty state. |
| `.tab-demo` | `.reports-page__sections`, `.settings-page__sections`, `.notifications-page__sections`, `.inventory-page__sections` | `components/dashboard/reports-overview.tsx`, `components/dashboard/settings-ops.tsx`, `components/dashboard/notifications-workspace.tsx`, `components/dashboard/inventory-workspace.tsx` | `PATTERN` | The live app expresses tabbed sections as route-specific section-nav groups rather than a single demo wrapper. |
| `.tab-bar` | `.operational-section-nav`, `.configuration-section-nav`, `.chip-row` | `app/globals.css` | `PATTERN` | Section/tab bars are implemented through operational/config navigation wrappers. |
| `.tab-item` | `.chip`, `.chip-button` | `app/globals.css` | `PATTERN` | Interactive tabs are rendered as chips or chip-buttons depending on the workspace. |
| `.tab-panel` | `.settings-page__panel`, `.inventory-page__detail`, `.notifications-page__inbox`, `.suppliers-page__detail` | `components/dashboard/settings-ops.tsx`, `components/dashboard/inventory-workspace.tsx`, `components/dashboard/notifications-workspace.tsx`, `components/dashboard/suppliers-workspace.tsx` | `PATTERN` | Active tab content is expressed as route-specific detail/panel containers. |
| `.section-nav-layout` | `.operational-layout--split`, `.configuration-shell--split` | `app/globals.css` | `PATTERN` | Split layouts replace the prototype side-nav/content demo. |
| `.section-nav-list` | `.operational-sidebar`, `.notifications-page__sidebar`, `.inventory-page__sidebar`, `.configuration-list-shell` | `app/globals.css` | `PATTERN` | List/navigation columns are route-specific sidebar shells. |
| `.sn-item` | `.chip-button`, `.list-card--interactive`, `.operational-list-card--interactive` | `app/globals.css` | `PATTERN` | Section nav items are implemented as chips or interactive list cards depending on the workspace. |
| `.section-nav-content` | `.operational-content`, `.settings-page__panel`, `.dashboard-content` | `app/globals.css` | `PATTERN` | Content pane equivalents span shared operational content and shell content containers. |
| `.section-title` | `.section-heading`, `.dashboard-header-title`, `.page-header__title` | `app/globals.css` | `PATTERN` | Heading treatment is split between section headings, dashboard headers, and page headers. |
| `.toast-stack` | `N/A` | `app/globals.css` | `NEW` | The live app delegates transient toast UI to `sonner`; there is no repo-owned toast class contract. |
| `.toast` | `N/A` | `app/globals.css` | `NEW` | The live app delegates transient toast UI to `sonner`; there is no repo-owned toast class contract. |
| `.toast-success` | `N/A` | `app/globals.css` | `NEW` | The live app delegates transient toast UI to `sonner`; there is no repo-owned toast class contract. |
| `.toast-danger` | `N/A` | `app/globals.css` | `NEW` | The live app delegates transient toast UI to `sonner`; there is no repo-owned toast class contract. |
| `.toast-warning` | `N/A` | `app/globals.css` | `NEW` | The live app delegates transient toast UI to `sonner`; there is no repo-owned toast class contract. |
| `.toast-content` | `N/A` | `app/globals.css` | `NEW` | The live app delegates transient toast UI to `sonner`; there is no repo-owned toast class contract. |
| `.toast-title` | `N/A` | `app/globals.css` | `NEW` | The live app delegates transient toast UI to `sonner`; there is no repo-owned toast class contract. |
| `.toast-desc` | `N/A` | `app/globals.css` | `NEW` | The live app delegates transient toast UI to `sonner`; there is no repo-owned toast class contract. |
| `.toast-close` | `N/A` | `app/globals.css` | `NEW` | The live app delegates transient toast UI to `sonner`; there is no repo-owned toast class contract. |
| `.dialog-overlay` | `.confirm-dialog-backdrop` | `app/globals.css` | `EXACT` | Backdrop for the shared confirmation dialog. |
| `.confirm-dialog` | `.confirm-dialog` | `app/globals.css` | `EXACT` | Shared confirmation dialog surface. |
| `.cd-title` | `.confirm-dialog__title` | `app/globals.css` | `EXACT` | Confirmation dialog title slot. |
| `.cd-desc` | `.confirm-dialog__body` | `app/globals.css` | `EXACT` | Confirmation dialog body/copy slot. |
| `.cd-actions` | `.confirm-dialog__actions` | `app/globals.css` | `EXACT` | Confirmation dialog action row. |
| `.alert-stack` | `N/A` | `app/globals.css` | `NEW` | Status banners render inline; no dedicated stacked alert container exists. |
| `.alert-banner` | `.status-banner` | `app/globals.css` | `EXACT` | Shared status/notice banner. |
| `.alert-success` | `.status-banner--success` | `app/globals.css` | `EXACT` | Success status banner modifier. |
| `.alert-warning` | `.status-banner--warning` | `app/globals.css` | `EXACT` | Warning status banner modifier. |
| `.alert-danger` | `.status-banner--danger` | `app/globals.css` | `EXACT` | Danger status banner modifier. |
| `.alert-info` | `.status-banner--offline`, `.info-strip` | `app/globals.css` | `PATTERN` | Info-like messaging is split between the offline banner tone and inline `.info-strip` callouts. |
| `.pos-workspace` | `.pos-workspace` | `app/globals.css` | `EXACT` | Top-level POS workspace shell. |
| `.pos-products-panel` | `styles.productsPane` | `components/pos/pos-view.module.css` | `MODULE` | Rendered as `styles.productsPane` and paired with the global `.pos-products` hook class in `pos-surface-shell.tsx`. |
| `.pos-toolbar` | `styles.discoveryToolbar` | `components/pos/pos-view.module.css` | `MODULE` | Rendered as `styles.discoveryToolbar` and combined with `.transaction-toolbar` / `.pos-discovery-toolbar`. |
| `.pos-toolbar-top` | `styles.productPanelHeader` | `components/pos/pos-view.module.css` | `MODULE` | Prototype top summary row maps to the live product-panel header/title block. |
| `.pos-search-field` | `styles.searchField` | `components/pos/pos-view.module.css` | `MODULE` | Rendered as `styles.searchField` and paired with the stable `.pos-search-field` hook class. |
| `.pos-grid` | `styles.productGrid` | `components/pos/pos-view.module.css` | `MODULE` | Rendered as `styles.productGrid` and combined with `.transaction-product-grid` / `.pos-product-grid`. |
| `.p-card` | `styles.root`, `.pos-product-card` | `components/pos/product-grid-item.module.css`, `app/globals.css` | `PATTERN` | Live product cards combine CSS-module layout (`styles.root`) with global visual hooks (`.pos-product-card*`). |
| `.p-thumb` | `.pos-product-card__thumb` | `app/globals.css` | `EXACT` | Product thumbnail surface. |
| `.pt-screen` | `.pos-product-card__thumb--device` | `app/globals.css` | `EXACT` | Device thumbnail tone. |
| `.pt-acc` | `.pos-product-card__thumb--accessory` | `app/globals.css` | `EXACT` | Accessory thumbnail tone. |
| `.pt-sim` | `.pos-product-card__thumb--sim` | `app/globals.css` | `EXACT` | SIM thumbnail tone. |
| `.pt-charger` | `.pos-product-card__thumb--accessory` | `app/globals.css` | `EXACT` | Chargers are currently folded into the accessory tone instead of a dedicated charger class. |
| `.pt-audio` | `.pos-product-card__thumb--accessory` | `app/globals.css` | `EXACT` | Audio accessories currently reuse the accessory tone instead of a dedicated audio class. |
| `.p-body` | `styles.content`, `styles.info`, `styles.pricing` | `components/pos/product-grid-item.module.css` | `PATTERN` | Card body is split between module layout helpers plus global info/pricing hooks. |
| `.p-meta` | `.pos-product-card__sku`, `.pos-product-card__stock` | `app/globals.css` | `PATTERN` | Metadata is split into SKU and stock rows instead of a single combined meta class. |
| `.p-name` | `.pos-product-card__name` | `app/globals.css` | `EXACT` | Product title text. |
| `.p-price` | `.pos-product-card__price` | `app/globals.css` | `EXACT` | Product price text. |
| `.p-add-btn` | `.pos-product-card__add-button` | `app/globals.css` | `EXACT` | Quick add button on product cards. |
| `.cart-summary-panel` | `.pos-cart-surface` | `app/globals.css` | `EXACT` | Main cart/checkout panel surface. |
| `.cart-header` | `.pos-cart-card__header` | `components/pos/view/pos-cart-rail.tsx` | `EXACT` | Top cart header with title, count, and clear action. |
| `.cart-title` | `.pos-cart-card__title` | `components/pos/view/pos-cart-rail.tsx` | `EXACT` | Cart title text. |
| `.cart-count` | `.pos-cart-card__count` | `components/pos/view/pos-cart-rail.tsx` | `EXACT` | Cart item-count badge. |
| `.cart-clear` | `.pos-cart-card__clear` | `components/pos/view/pos-cart-rail.tsx` | `EXACT` | Clear-cart icon action. |
| `.cart-items` | `.cart-line-list` | `components/pos/view/pos-cart-rail.tsx` | `EXACT` | Scrollable cart line-item list. |
| `.cart-empty` | `.empty-state`, `.transaction-empty-panel` | `components/pos/view/pos-cart-rail.tsx` | `PATTERN` | Empty cart state uses the shared empty-state surface plus the POS transaction-empty modifier. |
| `.cr-del` | `.cart-line-card__remove` | `app/globals.css` | `EXACT` | Remove-line action. |
| `.cr-item` | `.cart-line-card` | `app/globals.css` | `EXACT` | Cart line-item card. |
| `.cr-name` | `.cart-line-card__copy` | `app/globals.css` | `PATTERN` | Line-item name is rendered by the `strong` child inside `.cart-line-card__copy`. |
| `.cr-qb` | `.cart-line-card__quantity-button` | `app/globals.css` | `EXACT` | Quantity stepper button. |
| `.cr-qty-out` | `.cart-line-card__quantity` | `app/globals.css` | `EXACT` | Quantity control shell. |
| `.cr-tot` | `.cart-line-card__line-total` | `app/globals.css` | `EXACT` | Per-line total amount. |
| `.cr-val` | `.cart-line-card__quantity-value` | `app/globals.css` | `EXACT` | Rendered quantity value. |
| `.cs-body` | `.pos-cart-summary` | `app/globals.css` | `EXACT` | Checkout summary block under the cart. |
| `.cs-div` | `.cart-summary__total.pos-amount-due` | `app/globals.css` | `PATTERN` | The live summary uses the bordered total row instead of a standalone divider class. |
| `.cs-lbl` | `.pos-cart-summary`, `.field-label` | `app/globals.css` | `PATTERN` | Summary labels are rendered through `dt` elements inside `.pos-cart-summary` and field labels elsewhere in checkout. |
| `.cs-pay-chips` | `.pos-payment-chip-row` | `app/globals.css` | `EXACT` | Payment-method chip row. |
| `.cs-rec-in` | `.field-input` | `app/globals.css` | `EXACT` | Received-amount input uses the shared field primitive. |
| `.cs-row` | `.pos-cart-summary` | `app/globals.css` | `PATTERN` | Rows are rendered as `dl > div` within `.pos-cart-summary`, not with a standalone row class. |
| `.cs-tot-lbl` | `.cart-summary__total.pos-amount-due` | `app/globals.css` | `PATTERN` | Total label is rendered by the `dt` inside the amount-due block. |
| `.cs-tot-val` | `.cart-summary__total.pos-amount-due` | `app/globals.css` | `PATTERN` | Total value is rendered by the `dd` inside the amount-due block. |
| `.cs-val` | `.pos-cart-summary` | `app/globals.css` | `PATTERN` | Values are rendered as `dd` elements inside `.pos-cart-summary`. |
| `.pay-button` | `.transaction-checkout-button` | `app/globals.css` | `EXACT` | Primary checkout/complete-sale CTA. |
| `.pay-chip` | `.pos-payment-chip` | `app/globals.css` | `EXACT` | Payment-method chip. |

## Section 2 — Test-Protected Selectors

### Auth & Access

| Selector / Locator | Type | Test File | Line | Status |
|--------------------|------|-----------|------|--------|
| page.getByLabel(EMAIL_LABEL) | Label / aria-label | helpers/local-runtime.ts | 95 | PROTECTED — dynamic/constant-backed label locator |
| page.getByLabel(PASSWORD_LABEL, { exact: true }) | Label / aria-label | helpers/local-runtime.ts | 96 | PROTECTED — dynamic/constant-backed label locator |
| page.getByRole("button", { name: LOGIN_BUTTON }) | Role | helpers/local-runtime.ts | 97 | PROTECTED — dynamic/constant-backed role locator |
| page.locator(".status-banner") | CSS selector | helpers/local-runtime.ts | 134 | PROTECTED — do not rename |
| page.getByRole("heading", { name: "تسجيل الدخول" }) | Role | smoke.spec.ts | 14 | PROTECTED — do not change role/name |
| page.getByRole("link", { name: "نقطة البيع المباشرة" }) | Role | smoke.spec.ts | 15 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "يلزم تسجيل الدخول لقراءة المنتجات" }) | Role | smoke.spec.ts | 42 | PROTECTED — do not change role/name |
| page.getByText("سجّل الدخول لعرض قائمة المنتجات المتاحة للبيع من الحساب المصرح له.") | Text | smoke.spec.ts | 43 | PROTECTED — do not change string |
| page.getByRole("heading", { name: "يلزم تسجيل الدخول لفتح نقطة البيع" }) | Role | smoke.spec.ts | 49 | PROTECTED — do not change role/name |
| page.getByText("سجّل الدخول بحساب مخصص للبيع") | Text | smoke.spec.ts | 50 | PROTECTED — do not change string |
| page.getByRole("heading", { name: route.title }) | Role | smoke.spec.ts | 62 | PROTECTED — dynamic/constant-backed role locator |
| page.getByText("سجّل الدخول أولًا") | Text | smoke.spec.ts | 63 | PROTECTED — do not change string |
| page.getByRole("heading", { name: "تسجيل الدخول" }) | Role | smoke.spec.ts | 70 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "تسجيل الدخول" }) | Role | smoke.spec.ts | 71 | PROTECTED — do not change role/name |

### Device Gate, POS & Payments

| Selector / Locator | Type | Test File | Line | Status |
|--------------------|------|-----------|------|--------|
| page.getByPlaceholder(CUSTOMER_SEARCH_PLACEHOLDER) | Placeholder | device-qa.spec.ts | 234 | PROTECTED — dynamic/constant-backed placeholder locator |
| page.locator("button.list-card--interactive") | CSS selector | device-qa.spec.ts | 235 | PROTECTED — do not rename |
| page.locator("button.list-card--interactive").filter({ hasText: customerName }) | Filter + text | device-qa.spec.ts | 235 | PROTECTED — do not change filter text |
| page .locator(".debts-page__sections") | CSS selector | device-qa.spec.ts | 236 | PROTECTED — do not rename |
| page .locator(".debts-page__sections") .getByRole("button", { name: PAYMENT_SECTION_BUTTON, exact: true }) | Role | device-qa.spec.ts | 236 | PROTECTED — dynamic/constant-backed role locator |
| page.getByLabel(PAYMENT_AMOUNT_LABEL, { exact: true }) | Label / aria-label | device-qa.spec.ts | 240 | PROTECTED — dynamic/constant-backed label locator |
| page.getByRole("button", { name: CONFIRM_DEBT_PAYMENT_BUTTON, exact: true }) | Role | device-qa.spec.ts | 241 | PROTECTED — dynamic/constant-backed role locator |
| page.locator(".result-card") | CSS selector | device-qa.spec.ts | 247 | PROTECTED — do not rename |
| page.locator(".result-card").filter({ hasText: "الرصيد المتبقي:" }) | Filter + text | device-qa.spec.ts | 247 | PROTECTED — do not change filter text |
| page.locator(".pos-cart-sheet") | CSS selector | device-qa.spec.ts | 262 | PROTECTED — do not rename |
| page.getByRole("searchbox") | Role | device-qa.spec.ts | 265 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: new RegExp(seed.productName) }) | Role | device-qa.spec.ts | 267 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("complementary") | Role | device-qa.spec.ts | 270 | PROTECTED — do not change role/name |
| page.getByRole("complementary").getByText(seed.productName) | Text | device-qa.spec.ts | 270 | PROTECTED — dynamic/constant-backed text locator |
| page .getByRole("button", { name: REVIEW_PAYMENT_BUTTON, exact: true }) | Role | device-qa.spec.ts | 271 | PROTECTED — dynamic/constant-backed role locator |
| page.getByText(PAYMENT_METHOD_TITLE, { exact: true }) | Text | device-qa.spec.ts | 274 | PROTECTED — dynamic/constant-backed text locator |
| page.getByLabel(RECEIVED_AMOUNT_LABEL) | Label / aria-label | device-qa.spec.ts | 275 | PROTECTED — dynamic/constant-backed label locator |
| page .locator(".pos-cart-surface") | CSS selector | device-qa.spec.ts | 276 | PROTECTED — do not rename |
| page .locator(".pos-cart-surface") .getByRole("button", { name: COMPLETE_SALE_BUTTON, exact: true }) | Role | device-qa.spec.ts | 276 | PROTECTED — dynamic/constant-backed role locator |
| page.getByText(SALE_SUCCESS_MESSAGE) | Text | device-qa.spec.ts | 281 | PROTECTED — dynamic/constant-backed text locator |
| page.getByRole("button", { name: PRINT_RECEIPT_BUTTON, exact: true }) | Role | device-qa.spec.ts | 282 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("link", { name: OPEN_INVOICE_LINK }) | Role | device-qa.spec.ts | 286 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: RETURN_BUTTON, exact: true }) | Role | device-qa.spec.ts | 288 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true }) | Role | device-qa.spec.ts | 289 | PROTECTED — dynamic/constant-backed role locator |
| page.getByLabel(RETURN_QUANTITY_LABEL) | Label / aria-label | device-qa.spec.ts | 291 | PROTECTED — dynamic/constant-backed label locator |
| page.getByLabel(RETURN_REASON_LABEL) | Label / aria-label | device-qa.spec.ts | 292 | PROTECTED — dynamic/constant-backed label locator |
| page.getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true }) | Role | device-qa.spec.ts | 293 | PROTECTED — dynamic/constant-backed role locator |
| page .getByRole("dialog") | Role | device-qa.spec.ts | 294 | PROTECTED — do not change role/name |
| page .getByRole("dialog") .getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true }) | Role | device-qa.spec.ts | 294 | PROTECTED — dynamic/constant-backed role locator |
| page.locator(".result-card") | CSS selector | device-qa.spec.ts | 298 | PROTECTED — do not rename |
| page.locator(".result-card").filter({ hasText: "الإجمالي:" }) | Filter + text | device-qa.spec.ts | 298 | PROTECTED — do not change filter text |
| page.getByRole("button", { name: FILTER_REPORTS_BUTTON, exact: true }) | Role | device-qa.spec.ts | 309 | PROTECTED — dynamic/constant-backed role locator |
| page .locator(".settings-page__sections") | CSS selector | device-qa.spec.ts | 314 | PROTECTED — do not rename |
| page .locator(".settings-page__sections") .getByRole("button", { name: BALANCE_INTEGRITY_SECTION, exact: true }) | Role | device-qa.spec.ts | 314 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: RECHECK_SETTINGS_BUTTON, exact: true }) | Role | device-qa.spec.ts | 318 | PROTECTED — dynamic/constant-backed role locator |
| page .locator(".settings-page__sections") | CSS selector | device-qa.spec.ts | 349 | PROTECTED — do not rename |
| page .locator(".settings-page__sections") .getByRole("button", { name: BALANCE_INTEGRITY_SECTION, exact: true }) | Role | device-qa.spec.ts | 349 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: RECHECK_SETTINGS_BUTTON, exact: true }) | Role | device-qa.spec.ts | 354 | PROTECTED — dynamic/constant-backed role locator |
| page.getByPlaceholder(CUSTOMER_SEARCH_PLACEHOLDER) | Placeholder | px06-device-gate.spec.ts | 125 | PROTECTED — dynamic/constant-backed placeholder locator |
| page.locator("button.list-card--interactive") | CSS selector | px06-device-gate.spec.ts | 126 | PROTECTED — do not rename |
| page.locator("button.list-card--interactive").filter({ hasText: customerName }) | Filter + text | px06-device-gate.spec.ts | 126 | PROTECTED — do not change filter text |
| page .locator(".debts-page__sections") | CSS selector | px06-device-gate.spec.ts | 127 | PROTECTED — do not rename |
| page .locator(".debts-page__sections") .getByRole("button", { name: PAYMENT_SECTION_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 127 | PROTECTED — dynamic/constant-backed role locator |
| page.getByLabel(PAYMENT_AMOUNT_LABEL, { exact: true }) | Label / aria-label | px06-device-gate.spec.ts | 131 | PROTECTED — dynamic/constant-backed label locator |
| page.getByRole("button", { name: CONFIRM_DEBT_PAYMENT_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 132 | PROTECTED — dynamic/constant-backed role locator |
| page.locator(".result-card") | CSS selector | px06-device-gate.spec.ts | 138 | PROTECTED — do not rename |
| page.locator(".result-card").filter({ hasText: "الرصيد المتبقي:" }) | Filter + text | px06-device-gate.spec.ts | 138 | PROTECTED — do not change filter text |
| posPage.locator(".pos-cart-sheet") | CSS selector | px06-device-gate.spec.ts | 159 | PROTECTED — do not rename |
| posPage.locator(".pos-cart-sheet") | CSS selector | px06-device-gate.spec.ts | 165 | PROTECTED — do not rename |
| posPage.getByRole("searchbox") | Role | px06-device-gate.spec.ts | 171 | PROTECTED — do not change role/name |
| posPage .getByRole("button", { name: new RegExp(seed.productName) }) | Role | px06-device-gate.spec.ts | 173 | PROTECTED — dynamic/constant-backed role locator |
| posPage.getByRole("complementary") | Role | px06-device-gate.spec.ts | 178 | PROTECTED — do not change role/name |
| posPage.getByRole("complementary").getByText(seed.productName) | Text | px06-device-gate.spec.ts | 178 | PROTECTED — dynamic/constant-backed text locator |
| posPage .getByRole("button", { name: REVIEW_PAYMENT_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 179 | PROTECTED — dynamic/constant-backed role locator |
| posPage.getByText(PAYMENT_METHOD_TITLE, { exact: true }) | Text | px06-device-gate.spec.ts | 182 | PROTECTED — dynamic/constant-backed text locator |
| posPage.getByLabel(RECEIVED_AMOUNT_LABEL) | Label / aria-label | px06-device-gate.spec.ts | 183 | PROTECTED — dynamic/constant-backed label locator |
| posPage .locator(".pos-cart-surface") | CSS selector | px06-device-gate.spec.ts | 184 | PROTECTED — do not rename |
| posPage .locator(".pos-cart-surface") .getByRole("button", { name: COMPLETE_SALE_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 184 | PROTECTED — dynamic/constant-backed role locator |
| posPage.getByText(SALE_SUCCESS_MESSAGE) | Text | px06-device-gate.spec.ts | 189 | PROTECTED — dynamic/constant-backed text locator |
| posPage.getByRole("button", { name: PRINT_RECEIPT_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 190 | PROTECTED — dynamic/constant-backed role locator |
| posPage.getByRole("link", { name: OPEN_INVOICE_LINK }) | Role | px06-device-gate.spec.ts | 194 | PROTECTED — dynamic/constant-backed role locator |
| posPage.getByRole("button", { name: RETURN_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 196 | PROTECTED — dynamic/constant-backed role locator |
| posPage.getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 197 | PROTECTED — dynamic/constant-backed role locator |
| posPage.getByLabel(RETURN_QUANTITY_LABEL) | Label / aria-label | px06-device-gate.spec.ts | 199 | PROTECTED — dynamic/constant-backed label locator |
| posPage.getByLabel(RETURN_REASON_LABEL) | Label / aria-label | px06-device-gate.spec.ts | 200 | PROTECTED — dynamic/constant-backed label locator |
| posPage.getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 201 | PROTECTED — dynamic/constant-backed role locator |
| posPage .getByRole("dialog") | Role | px06-device-gate.spec.ts | 202 | PROTECTED — do not change role/name |
| posPage .getByRole("dialog") .getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 202 | PROTECTED — dynamic/constant-backed role locator |
| posPage.locator(".result-card") | CSS selector | px06-device-gate.spec.ts | 206 | PROTECTED — do not rename |
| posPage.locator(".result-card").filter({ hasText: "الإجمالي:" }) | Filter + text | px06-device-gate.spec.ts | 206 | PROTECTED — do not change filter text |
| adminPage.getByRole("button", { name: FILTER_REPORTS_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 223 | PROTECTED — dynamic/constant-backed role locator |
| adminPage .locator(".settings-page__sections") | CSS selector | px06-device-gate.spec.ts | 228 | PROTECTED — do not rename |
| adminPage .locator(".settings-page__sections") .getByRole("button", { name: BALANCE_INTEGRITY_SECTION, exact: true }) | Role | px06-device-gate.spec.ts | 228 | PROTECTED — dynamic/constant-backed role locator |
| adminPage.getByRole("button", { name: RECHECK_SETTINGS_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 232 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: INSTALL_BUTTON, exact: true }) | Role | px06-device-gate.spec.ts | 255 | PROTECTED — dynamic/constant-backed role locator |
| page.locator(".install-status") | CSS selector | px06-device-gate.spec.ts | 257 | PROTECTED — do not rename |
| page.locator(".install-status") | CSS selector | px06-device-gate.spec.ts | 286 | PROTECTED — do not rename |
| posSession.page.getByPlaceholder(POS_SEARCH_PLACEHOLDER) | Placeholder | px06-uat.spec.ts | 502 | PROTECTED — dynamic/constant-backed placeholder locator |
| posSession.page.locator(".transaction-product-grid .pos-product-card--compact") | CSS selector | px06-uat.spec.ts | 504 | PROTECTED — do not rename |
| posSession.page.locator(".transaction-product-grid .pos-product-card--compact") | CSS selector | px06-uat.spec.ts | 561 | PROTECTED — do not rename |

### Reports, Settings & Portability

| Selector / Locator | Type | Test File | Line | Status |
|--------------------|------|-----------|------|--------|
| page.locator("main") | CSS selector | px11-reports.spec.ts | 121 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "التقارير" }) | Role | px11-reports.spec.ts | 121 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "تطبيق الفلاتر" }) | Role | px11-reports.spec.ts | 123 | PROTECTED — do not change role/name |
| page.getByText("ملخص المقارنة") | Text | px11-reports.spec.ts | 124 | PROTECTED — do not change string |
| page.getByText("اتجاه الأداء") | Text | px11-reports.spec.ts | 125 | PROTECTED — do not change string |
| page.locator("main") | CSS selector | px11-reports.spec.ts | 127 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "تفكيك البعد الحالي" }) | Role | px11-reports.spec.ts | 127 | PROTECTED — do not change role/name |
| page.getByLabel("من تاريخ المقارنة") | Label / aria-label | px11-reports.spec.ts | 130 | PROTECTED — do not change label |
| page.getByLabel("إلى تاريخ المقارنة") | Label / aria-label | px11-reports.spec.ts | 131 | PROTECTED — do not change label |
| page.getByLabel("التجميع") | Label / aria-label | px11-reports.spec.ts | 132 | PROTECTED — do not change label |
| page.getByLabel("بعد التحليل") | Label / aria-label | px11-reports.spec.ts | 133 | PROTECTED — do not change label |
| page.getByRole("button", { name: "تطبيق الفلاتر" }) | Role | px11-reports.spec.ts | 134 | PROTECTED — do not change role/name |
| page.getByRole("link", { name: "تصدير Excel" }) | Role | px11-reports.spec.ts | 137 | PROTECTED — do not change role/name |
| page.locator(".dashboard-topbar .dashboard-header-title") | CSS selector | px24-analytical-config.spec.ts | 24 | PROTECTED — do not rename |
| page.getByRole("button", { name: "تطبيق الفلاتر" }) | Role | px24-analytical-config.spec.ts | 25 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "نطاق التقرير" }) | Role | px24-analytical-config.spec.ts | 26 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "ملخص المقارنة" }) | Role | px24-analytical-config.spec.ts | 27 | PROTECTED — do not change role/name |
| page.locator("main") | CSS selector | px24-analytical-config.spec.ts | 35 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "الإعدادات" }) | Role | px24-analytical-config.spec.ts | 35 | PROTECTED — do not change role/name |
| page.getByLabel("أقسام شاشة الإعدادات") | Label / aria-label | px24-analytical-config.spec.ts | 36 | PROTECTED — do not change label |
| sectionNav.getByRole("button", { name: "الصلاحيات" }) | Role | px24-analytical-config.spec.ts | 37 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "اللقطة اليومية" }) | Role | px24-analytical-config.spec.ts | 38 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "السياسات" }) | Role | px24-analytical-config.spec.ts | 39 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "السياسات" }) | Role | px24-analytical-config.spec.ts | 41 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "الطباعة" }) | Role | px24-analytical-config.spec.ts | 42 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "الوصول من الأجهزة" }) | Role | px24-analytical-config.spec.ts | 43 | PROTECTED — do not change role/name |
| page.locator("main") | CSS selector | px24-analytical-config.spec.ts | 54 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "مركز النقل والاستيراد والاستعادة التجريبية" }) | Role | px24-analytical-config.spec.ts | 54 | PROTECTED — do not change role/name |
| page.getByLabel("أقسام شاشة النقل والنسخ") | Label / aria-label | px24-analytical-config.spec.ts | 59 | PROTECTED — do not change label |
| sectionNav.getByRole("button", { name: "إنشاء الحزم" }) | Role | px24-analytical-config.spec.ts | 60 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "فحص الاستيراد" }) | Role | px24-analytical-config.spec.ts | 61 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "الاستعادة التجريبية" }) | Role | px24-analytical-config.spec.ts | 62 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "السجل الأخير" }) | Role | px24-analytical-config.spec.ts | 63 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "فحص الاستيراد" }) | Role | px24-analytical-config.spec.ts | 65 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "افحص الملف أولًا ثم اعتمد الصفوف السليمة" }) | Role | px24-analytical-config.spec.ts | 67 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "الاستعادة التجريبية" }) | Role | px24-analytical-config.spec.ts | 70 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "استعادة معزولة داخل بيئة الاختبار" }) | Role | px24-analytical-config.spec.ts | 71 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "السجل الأخير" }) | Role | px24-analytical-config.spec.ts | 73 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "سجل الحزم الجاهزة والملغاة" }) | Role | px24-analytical-config.spec.ts | 74 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "فحوص الاستيراد وتجارب الاستعادة" }) | Role | px24-analytical-config.spec.ts | 75 | PROTECTED — do not change role/name |

### Search, Navigation & Shell

| Selector / Locator | Type | Test File | Line | Status |
|--------------------|------|-----------|------|--------|
| page.getByText("البحث الشامل", { exact: true }) | Text | px13-search-alerts.spec.ts | 280 | PROTECTED — do not change string |
| page.getByText("صندوق الإشعارات", { exact: true }) | Text | px13-search-alerts.spec.ts | 281 | PROTECTED — do not change string |
| page.getByText(seed.productName, { exact: true }) | Text | px13-search-alerts.spec.ts | 282 | PROTECTED — dynamic/constant-backed text locator |
| page.getByText(seed.invoiceNumber, { exact: true }) | Text | px13-search-alerts.spec.ts | 283 | PROTECTED — dynamic/constant-backed text locator |
| page.getByText(seed.debtCustomerName, { exact: true }) | Text | px13-search-alerts.spec.ts | 284 | PROTECTED — dynamic/constant-backed text locator |
| page.getByText(seed.maintenanceJobNumber, { exact: true }) | Text | px13-search-alerts.spec.ts | 285 | PROTECTED — dynamic/constant-backed text locator |
| page.getByRole("button", { name: "صندوق الإشعارات" }) | Role | px13-search-alerts.spec.ts | 287 | PROTECTED — do not change role/name |
| page.getByText(seed.adminNotificationTitle, { exact: true }) | Text | px13-search-alerts.spec.ts | 288 | PROTECTED — dynamic/constant-backed text locator |
| page.getByRole("button", { name: "تطبيق الفلاتر" }) | Role | px13-search-alerts.spec.ts | 292 | PROTECTED — do not change role/name |
| page.getByText("البحث الشامل", { exact: true }) | Text | px13-search-alerts.spec.ts | 302 | PROTECTED — do not change string |
| page.getByText("صندوق الإشعارات", { exact: true }) | Text | px13-search-alerts.spec.ts | 303 | PROTECTED — do not change string |
| page.getByText(seed.invoiceNumber, { exact: true }) | Text | px13-search-alerts.spec.ts | 304 | PROTECTED — dynamic/constant-backed text locator |
| page.getByRole("button", { name: "صندوق الإشعارات" }) | Role | px13-search-alerts.spec.ts | 306 | PROTECTED — do not change role/name |
| page.getByText(seed.posNotificationTitle, { exact: true }) | Text | px13-search-alerts.spec.ts | 307 | PROTECTED — dynamic/constant-backed text locator |
| page.getByText(seed.adminNotificationTitle, { exact: true }) | Text | px13-search-alerts.spec.ts | 308 | PROTECTED — dynamic/constant-backed text locator |
| page.getByRole("button", { name: "فتح القائمة" }) | Role | px16-navigation-ia.spec.ts | 20 | PROTECTED — do not change role/name |
| page.getByLabel("التنقل داخل مساحات التشغيل") | Label / aria-label | px16-navigation-ia.spec.ts | 42 | PROTECTED — do not change label |
| nav.getByRole("link", { name: /نقطة البيع/i }) | Role | px16-navigation-ia.spec.ts | 44 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /الفواتير/i }) | Role | px16-navigation-ia.spec.ts | 45 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /الديون/i }) | Role | px16-navigation-ia.spec.ts | 46 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /الإشعارات/i }) | Role | px16-navigation-ia.spec.ts | 47 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /التقارير/i }) | Role | px16-navigation-ia.spec.ts | 48 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /الإعدادات/i }) | Role | px16-navigation-ia.spec.ts | 49 | PROTECTED — do not change role/name |
| page.locator("main") | CSS selector | px16-navigation-ia.spec.ts | 54 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "الديون", exact: true }) | Role | px16-navigation-ia.spec.ts | 54 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "العملاء والقيود" }) | Role | px16-navigation-ia.spec.ts | 56 | PROTECTED — do not change role/name |
| page.getByLabel("أقسام شاشة الديون") | Label / aria-label | px16-navigation-ia.spec.ts | 58 | PROTECTED — do not change label |
| page.getByLabel("أقسام شاشة الديون").getByRole("button", { name: "التسديد" }) | Role | px16-navigation-ia.spec.ts | 58 | PROTECTED — do not change role/name |
| page.locator("main") | CSS selector | px16-navigation-ia.spec.ts | 71 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "الإشعارات", exact: true }) | Role | px16-navigation-ia.spec.ts | 71 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "صندوق الإشعارات" }) | Role | px16-navigation-ia.spec.ts | 73 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "الملخصات والتنبيهات" }) | Role | px16-navigation-ia.spec.ts | 74 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "البحث الشامل" }) | Role | px16-navigation-ia.spec.ts | 75 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "البحث الشامل" }) | Role | px16-navigation-ia.spec.ts | 77 | PROTECTED — do not change role/name |
| page.getByPlaceholder("اسم منتج، رقم فاتورة، عميل أو رقم صيانة") | Placeholder | px16-navigation-ia.spec.ts | 79 | PROTECTED — do not change placeholder |
| page.getByLabel("التنقل داخل مساحات التشغيل") | Label / aria-label | px16-navigation-ia.spec.ts | 89 | PROTECTED — do not change label |
| nav.getByRole("link", { name: /نقطة البيع/i }) | Role | px16-navigation-ia.spec.ts | 91 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /المنتجات/i }) | Role | px16-navigation-ia.spec.ts | 92 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /الفواتير/i }) | Role | px16-navigation-ia.spec.ts | 93 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /الجرد/i }) | Role | px16-navigation-ia.spec.ts | 94 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /التقارير/i }) | Role | px16-navigation-ia.spec.ts | 95 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /الإعدادات/i }) | Role | px16-navigation-ia.spec.ts | 96 | PROTECTED — do not change role/name |
| page.locator("main") | CSS selector | px16-navigation-ia.spec.ts | 97 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "الفواتير" }) | Role | px16-navigation-ia.spec.ts | 97 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "السجل" }) | Role | px16-navigation-ia.spec.ts | 98 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "الأحدث" }) | Role | px16-navigation-ia.spec.ts | 99 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "الأعلى قيمة" }) | Role | px16-navigation-ia.spec.ts | 100 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "الأعلى دينًا" }) | Role | px16-navigation-ia.spec.ts | 101 | PROTECTED — do not change role/name |
| page.getByLabel("أقسام شاشة الجرد") | Label / aria-label | px16-navigation-ia.spec.ts | 105 | PROTECTED — do not change label |
| inventorySections.getByRole("button", { name: "بدء الجرد" }) | Role | px16-navigation-ia.spec.ts | 106 | PROTECTED — do not change role/name |
| inventorySections.getByRole("button", { name: "الجرد المفتوح" }) | Role | px16-navigation-ia.spec.ts | 107 | PROTECTED — do not change role/name |
| inventorySections.getByRole("button", { name: "التسوية" }) | Role | px16-navigation-ia.spec.ts | 108 | PROTECTED — do not change role/name |
| page.getByLabel("أقسام شاشة الإعدادات") | Label / aria-label | px16-navigation-ia.spec.ts | 112 | PROTECTED — do not change label |
| settingsSections.getByRole("button", { name: "الصلاحيات" }) | Role | px16-navigation-ia.spec.ts | 113 | PROTECTED — do not change role/name |
| settingsSections.getByRole("button", { name: "اللقطة اليومية" }) | Role | px16-navigation-ia.spec.ts | 114 | PROTECTED — do not change role/name |
| settingsSections.getByRole("button", { name: "سلامة الأرصدة" }) | Role | px16-navigation-ia.spec.ts | 115 | PROTECTED — do not change role/name |
| settingsSections.getByRole("button", { name: "السياسات" }) | Role | px16-navigation-ia.spec.ts | 116 | PROTECTED — do not change role/name |
| page.getByLabel("التنقل داخل أقسام التقارير") | Label / aria-label | px16-navigation-ia.spec.ts | 120 | PROTECTED — do not change label |
| reportsSections.getByRole("link", { name: "الفلاتر", exact: true }) | Role | px16-navigation-ia.spec.ts | 121 | PROTECTED — do not change role/name |
| reportsSections.getByRole("link", { name: "المقارنة", exact: true }) | Role | px16-navigation-ia.spec.ts | 122 | PROTECTED — do not change role/name |
| reportsSections.getByRole("link", { name: "المرتجعات", exact: true }) | Role | px16-navigation-ia.spec.ts | 123 | PROTECTED — do not change role/name |
| reportsSections.getByRole("link", { name: "الصيانة", exact: true }) | Role | px16-navigation-ia.spec.ts | 124 | PROTECTED — do not change role/name |
| page.getByRole("heading", { name: "تسجيل الدخول" }) | Role | px18-visual-accessibility.spec.ts | 64 | PROTECTED — do not change role/name |
| page.locator(".auth-card") | CSS selector | px18-visual-accessibility.spec.ts | 65 | PROTECTED — do not rename |
| page.locator(".dashboard-topbar .dashboard-header-title") | CSS selector | px18-visual-accessibility.spec.ts | 70 | PROTECTED — do not rename |
| page.locator(".analytical-kpi-grid") | CSS selector | px18-visual-accessibility.spec.ts | 71 | PROTECTED — do not rename |
| page.locator(".data-table") | CSS selector | px18-visual-accessibility.spec.ts | 72 | PROTECTED — do not rename |
| page.getByRole("link", { name: "تصدير Excel" }) | Role | px18-visual-accessibility.spec.ts | 73 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: OPEN_MENU_LABEL }) | Role | px18-visual-accessibility.spec.ts | 83 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: SEARCH_LABEL }) | Role | px18-visual-accessibility.spec.ts | 84 | PROTECTED — dynamic/constant-backed role locator |
| page.locator(".transaction-toolbar__search") | CSS selector | px18-visual-accessibility.spec.ts | 85 | PROTECTED — do not rename |
| page.getByPlaceholder(PRODUCT_SEARCH_PLACEHOLDER) | Placeholder | px18-visual-accessibility.spec.ts | 86 | PROTECTED — dynamic/constant-backed placeholder locator |
| page.locator(".pos-cart-sheet__summary") | CSS selector | px18-visual-accessibility.spec.ts | 87 | PROTECTED — do not rename |
| page.locator(".dashboard-topbar .dashboard-header-title") | CSS selector | px18-visual-accessibility.spec.ts | 89 | PROTECTED — do not rename |
| page.getByRole("button", { name: CATEGORY_ALL_LABEL }) | Role | px18-visual-accessibility.spec.ts | 101 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("navigation", { name: WORKSPACE_NAV_LABEL }) | Role | px18-visual-accessibility.spec.ts | 106 | PROTECTED — dynamic/constant-backed role locator |
| nav.getByRole("link", { name: new RegExp(POS_TITLE, "i") }) | Role | px18-visual-accessibility.spec.ts | 107 | PROTECTED — dynamic/constant-backed role locator |
| page.locator(".dashboard-topbar .dashboard-header-title") | CSS selector | px18-visual-accessibility.spec.ts | 154 | PROTECTED — do not rename |
| page.getByRole("link", { name: "تصدير Excel" }) | Role | px18-visual-accessibility.spec.ts | 155 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: OPEN_MENU_LABEL }) | Role | px21-shell-auth.spec.ts | 25 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: BOTTOM_MENU_LABEL }) | Role | px21-shell-auth.spec.ts | 31 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("heading", { name: LOGIN_TITLE }) | Role | px21-shell-auth.spec.ts | 49 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("link", { name: POS_ENTRY_LINK }) | Role | px21-shell-auth.spec.ts | 50 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: INSTALL_BUTTON }) | Role | px21-shell-auth.spec.ts | 51 | PROTECTED — dynamic/constant-backed role locator |
| page.getByText(INSTALL_COPY) | Text | px21-shell-auth.spec.ts | 52 | PROTECTED — dynamic/constant-backed text locator |
| page.locator("main") | CSS selector | px21-shell-auth.spec.ts | 53 | PROTECTED — do not rename |
| page.getByRole("heading", { name: LOGIN_TITLE }) | Role | px21-shell-auth.spec.ts | 59 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644" }) | Role | px21-shell-auth.spec.ts | 61 | PROTECTED — do not change role/name |
| page.locator("main") | CSS selector | px21-shell-auth.spec.ts | 63 | PROTECTED — do not rename |
| page.locator(".dashboard-bottom-bar") | CSS selector | px21-shell-auth.spec.ts | 74 | PROTECTED — do not rename |
| page.locator(".dashboard-sidebar") | CSS selector | px21-shell-auth.spec.ts | 77 | PROTECTED — do not rename |
| page.getByRole("navigation", { name: WORKSPACE_NAV_LABEL }) | Role | px21-shell-auth.spec.ts | 80 | PROTECTED — dynamic/constant-backed role locator |
| nav.getByRole("link", { name: /\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064a\u0639/i }) | Role | px21-shell-auth.spec.ts | 83 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a/i }) | Role | px21-shell-auth.spec.ts | 86 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631/i }) | Role | px21-shell-auth.spec.ts | 89 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a/i }) | Role | px21-shell-auth.spec.ts | 92 | PROTECTED — do not change role/name |
| page.locator(".dashboard-layout__sidebar") | CSS selector | px21-shell-auth.spec.ts | 100 | PROTECTED — do not rename |
| page.getByRole("navigation", { name: WORKSPACE_NAV_LABEL }) | Role | px21-shell-auth.spec.ts | 101 | PROTECTED — dynamic/constant-backed role locator |
| nav.getByRole("link", { name: /التقارير/i }) | Role | px21-shell-auth.spec.ts | 103 | PROTECTED — do not change role/name |
| nav.getByRole("link", { name: /الإعدادات/i }) | Role | px21-shell-auth.spec.ts | 104 | PROTECTED — do not change role/name |
| page.locator(".dashboard-topbar .dashboard-header-title") | CSS selector | px21-shell-auth.spec.ts | 105 | PROTECTED — do not rename |
| page.locator(".dashboard-user-chip") | CSS selector | px21-shell-auth.spec.ts | 106 | PROTECTED — do not rename |
| page.getByRole("button", { name: /\u0628\u062d\u062b/i }) | Role | px21-shell-auth.spec.ts | 108 | PROTECTED — do not change role/name |

### Transactional Workspaces

| Selector / Locator | Type | Test File | Line | Status |
|--------------------|------|-----------|------|--------|
| page.locator(".dashboard-topbar .dashboard-header-title") | CSS selector | px22-transactional-ux.spec.ts | 44 | PROTECTED — do not rename |
| page.getByPlaceholder(PRODUCT_PLACEHOLDER) | Placeholder | px22-transactional-ux.spec.ts | 45 | PROTECTED — dynamic/constant-backed placeholder locator |
| page.getByRole("button", { name: "الكل" }) | Role | px22-transactional-ux.spec.ts | 46 | PROTECTED — do not change role/name |
| page.locator(".pos-cart-sheet__summary") | CSS selector | px22-transactional-ux.spec.ts | 47 | PROTECTED — do not rename |
| page.locator(".pos-cart-sheet__summary") | CSS selector | px22-transactional-ux.spec.ts | 49 | PROTECTED — do not rename |
| page.locator(".pos-cart-card__title") | CSS selector | px22-transactional-ux.spec.ts | 50 | PROTECTED — do not rename |
| page.locator(".pos-cart-card__title").filter({ hasText: CURRENT_CART_TITLE }) | Filter + text | px22-transactional-ux.spec.ts | 50 | PROTECTED — dynamic/constant-backed text filter |
| page.getByRole("button", { name: CHECKOUT_REVIEW_LABEL }) | Role | px22-transactional-ux.spec.ts | 51 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("main") | Role | px22-transactional-ux.spec.ts | 60 | PROTECTED — do not change role/name |
| page.getByRole("main").getByRole("heading", { name: INVOICES_TITLE, exact: true }) | Role | px22-transactional-ux.spec.ts | 60 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("heading", { name: INVOICE_LIST_TITLE, exact: true }) | Role | px22-transactional-ux.spec.ts | 62 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("link", { name: /فتح الفاتورة/i }) | Role | px22-transactional-ux.spec.ts | 63 | PROTECTED — do not change role/name |
| page.getByRole("link", { name: /فتح الفاتورة/i }) | Role | px22-transactional-ux.spec.ts | 67 | PROTECTED — do not change role/name |
| page.getByText(INVOICE_DETAIL_TITLE, { exact: true }) | Text | px22-transactional-ux.spec.ts | 71 | PROTECTED — dynamic/constant-backed text locator |
| page.getByRole("button", { name: INVOICE_SUMMARY_TAB }) | Role | px22-transactional-ux.spec.ts | 72 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: INVOICE_RETURN_TAB }) | Role | px22-transactional-ux.spec.ts | 73 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: INVOICE_ADMIN_TAB }) | Role | px22-transactional-ux.spec.ts | 74 | PROTECTED — dynamic/constant-backed role locator |
| page.getByRole("button", { name: "طباعة الإيصال" }) | Role | px22-transactional-ux.spec.ts | 75 | PROTECTED — do not change role/name |
| page.getByRole("main") | Role | px22-transactional-ux.spec.ts | 84 | PROTECTED — do not change role/name |
| page.getByRole("main").getByRole("heading", { name: DEBTS_TITLE, exact: true }) | Role | px22-transactional-ux.spec.ts | 84 | PROTECTED — dynamic/constant-backed role locator |
| page.getByLabel("أقسام شاشة الديون") | Label / aria-label | px22-transactional-ux.spec.ts | 86 | PROTECTED — do not change label |
| debtSections.getByRole("button", { name: "العملاء والقيود" }) | Role | px22-transactional-ux.spec.ts | 87 | PROTECTED — do not change role/name |
| debtSections.getByRole("button", { name: "دين يدوي" }) | Role | px22-transactional-ux.spec.ts | 88 | PROTECTED — do not change role/name |
| debtSections.getByRole("button", { name: "التسديد" }) | Role | px22-transactional-ux.spec.ts | 89 | PROTECTED — do not change role/name |

### Operational Workspaces

| Selector / Locator | Type | Test File | Line | Status |
|--------------------|------|-----------|------|--------|
| page.locator("main") | CSS selector | px23-operational-workspaces.spec.ts | 32 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "المنتجات" }) | Role | px23-operational-workspaces.spec.ts | 32 | PROTECTED — do not change role/name |
| page.getByPlaceholder("ابحث باسم المنتج أو SKU أو الوصف") | Placeholder | px23-operational-workspaces.spec.ts | 33 | PROTECTED — dynamic/constant-backed placeholder locator |
| page.getByRole("button", { name: "الكل" }) | Role | px23-operational-workspaces.spec.ts | 34 | PROTECTED — do not change role/name |
| page.locator(".catalog-page__results") | CSS selector | px23-operational-workspaces.spec.ts | 35 | PROTECTED — do not rename |
| page.locator("main") | CSS selector | px23-operational-workspaces.spec.ts | 46 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "الإشعارات", exact: true }) | Role | px23-operational-workspaces.spec.ts | 46 | PROTECTED — do not change role/name |
| page.getByLabel("أقسام مركز الإشعارات") | Label / aria-label | px23-operational-workspaces.spec.ts | 48 | PROTECTED — do not change label |
| sectionNav.getByRole("button", { name: "صندوق الإشعارات" }) | Role | px23-operational-workspaces.spec.ts | 50 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "الملخصات والتنبيهات" }) | Role | px23-operational-workspaces.spec.ts | 51 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "البحث الشامل" }) | Role | px23-operational-workspaces.spec.ts | 52 | PROTECTED — do not change role/name |
| sectionNav.getByRole("button", { name: "البحث الشامل" }) | Role | px23-operational-workspaces.spec.ts | 54 | PROTECTED — do not change role/name |
| page.getByPlaceholder("اسم منتج، رقم فاتورة، عميل أو رقم صيانة") | Placeholder | px23-operational-workspaces.spec.ts | 55 | PROTECTED — do not change placeholder |
| page.locator("main") | CSS selector | px23-operational-workspaces.spec.ts | 65 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "الجرد" }) | Role | px23-operational-workspaces.spec.ts | 65 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "الجرد المفتوح" }) | Role | px23-operational-workspaces.spec.ts | 66 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "آخر النتائج" }) | Role | px23-operational-workspaces.spec.ts | 67 | PROTECTED — do not change role/name |
| page.locator("main") | CSS selector | px23-operational-workspaces.spec.ts | 71 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "الموردون" }) | Role | px23-operational-workspaces.spec.ts | 71 | PROTECTED — do not change role/name |
| page.getByLabel("أقسام الموردين والمشتريات") | Label / aria-label | px23-operational-workspaces.spec.ts | 72 | PROTECTED — do not change label |
| suppliersSections.getByRole("button", { name: "الدليل والتفاصيل" }) | Role | px23-operational-workspaces.spec.ts | 73 | PROTECTED — do not change role/name |
| suppliersSections.getByRole("button", { name: "أوامر الشراء" }) | Role | px23-operational-workspaces.spec.ts | 74 | PROTECTED — do not change role/name |
| suppliersSections.getByRole("button", { name: "التسديدات" }) | Role | px23-operational-workspaces.spec.ts | 75 | PROTECTED — do not change role/name |
| page.locator("main") | CSS selector | px23-operational-workspaces.spec.ts | 79 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "المصروفات" }) | Role | px23-operational-workspaces.spec.ts | 79 | PROTECTED — do not change role/name |
| page.getByLabel("أقسام شاشة المصروفات") | Label / aria-label | px23-operational-workspaces.spec.ts | 80 | PROTECTED — do not change label |
| expensesSections.getByRole("button", { name: "تسجيل المصروف" }) | Role | px23-operational-workspaces.spec.ts | 81 | PROTECTED — do not change role/name |
| page.getByRole("main") | Role | px23-operational-workspaces.spec.ts | 86 | PROTECTED — do not change role/name |
| page.getByRole("main").getByRole("heading", { name: "الشحن والتحويلات" }) | Role | px23-operational-workspaces.spec.ts | 86 | PROTECTED — do not change role/name |
| page.getByLabel("أقسام شاشة العمليات") | Label / aria-label | px23-operational-workspaces.spec.ts | 88 | PROTECTED — do not change label |
| operationsSections.getByRole("button", { name: "تحويل داخلي" }) | Role | px23-operational-workspaces.spec.ts | 89 | PROTECTED — do not change role/name |
| page.locator("main") | CSS selector | px23-operational-workspaces.spec.ts | 93 | PROTECTED — do not rename |
| page.locator("main").getByRole("heading", { name: "الصيانة الأساسية" }) | Role | px23-operational-workspaces.spec.ts | 93 | PROTECTED — do not change role/name |
| page.getByRole("button", { name: "أوامر الصيانة" }) | Role | px23-operational-workspaces.spec.ts | 94 | PROTECTED — do not change role/name |
## Section 3 — Token Migration Map

| Old Token (--aya-*) | New Token (--color-*) | Files Using Old Token | Count |
|---------------------|-----------------------|-----------------------|-------|
| --aya-accent | --color-accent | app/globals.css (17) | 17 |
| --aya-accent-deep | --color-text-primary | app/globals.css (9) | 9 |
| --aya-amber | --color-warning | app/globals.css (1) | 1 |
| --aya-bg | --color-bg-base | app/globals.css (9), components/pos/pos-view.module.css (3) | 12 |
| --aya-bg-soft | --color-bg-muted | app/globals.css (29) | 29 |
| --aya-border | --color-border | app/globals.css (1) | 1 |
| --aya-chart-grid | N/A - no direct token in Section 9 | app/globals.css (1), components/dashboard/reports-advanced-charts.tsx (2) | 3 |
| --aya-chart-primary | --color-accent | app/globals.css (1), components/dashboard/reports-advanced-charts.tsx (2) | 3 |
| --aya-chart-secondary | N/A - no direct token in Section 9 | app/globals.css (1), components/dashboard/reports-advanced-charts.tsx (1) | 2 |
| --aya-chart-tertiary | --color-warning | app/globals.css (1), components/dashboard/reports-advanced-charts.tsx (1) | 2 |
| --aya-cyan | --color-accent | app/globals.css (4) | 4 |
| --aya-cyan-soft | --color-accent-light | app/globals.css (1) | 1 |
| --aya-danger | --color-danger | app/globals.css (20) | 20 |
| --aya-danger-soft | --color-danger-bg | app/globals.css (9) | 9 |
| --aya-focus-ring | --color-focus-ring | app/globals.css (2) | 2 |
| --aya-focus-shadow | --color-focus-ring | app/globals.css (2) | 2 |
| --aya-font-body | --font-primary | app/globals.css (4), app/layout.tsx (2) | 6 |
| --aya-font-mono | --font-numeric | app/globals.css (7), app/layout.tsx (1) | 8 |
| --aya-header-offset | N/A - layout token | app/globals.css (1) | 1 |
| --aya-info | N/A - no direct token in Section 9 | app/globals.css (6) | 6 |
| --aya-info-soft | N/A - no direct token in Section 9 | app/globals.css (4) | 4 |
| --aya-ink | --color-text-primary | app/globals.css (46), components/pos/pos-view.module.css (2), components/pos/product-grid-item.module.css (1) | 49 |
| --aya-ink-soft | --color-text-primary | app/globals.css (9) | 9 |
| --aya-leaf | --color-success | app/globals.css (6) | 6 |
| --aya-line | --color-border | app/globals.css (102), components/pos/pos-view.module.css (4), components/pos/product-grid-item.module.css (2) | 108 |
| --aya-line-strong | --color-border | app/globals.css (7) | 7 |
| --aya-muted | --color-text-secondary | app/globals.css (92), components/pos/pos-view.module.css (2) | 94 |
| --aya-page-accent | N/A - decorative alias | app/globals.css (2) | 2 |
| --aya-page-leaf | N/A - decorative alias | app/globals.css (2) | 2 |
| --aya-panel | --color-bg-surface | app/globals.css (60), components/pos/pos-view.module.css (3), components/pos/product-grid-item.module.css (2) | 65 |
| --aya-panel-muted | --color-bg-muted | app/globals.css (3) | 3 |
| --aya-panel-strong | --color-bg-surface | app/globals.css (14) | 14 |
| --aya-primary | --color-accent | app/globals.css (53), components/pos/pos-view.module.css (1), components/pos/product-grid-item.module.css (4) | 58 |
| --aya-primary-hover | --color-accent-hover | app/globals.css (5) | 5 |
| --aya-primary-ring | --color-focus-ring | app/globals.css (5) | 5 |
| --aya-primary-soft | --color-accent-light | app/globals.css (18), components/pos/product-grid-item.module.css (2) | 20 |
| --aya-radius-lg | --radius-lg | app/globals.css (7) | 7 |
| --aya-radius-md | --radius-md | app/globals.css (9) | 9 |
| --aya-radius-sm | --radius-sm | app/globals.css (3) | 3 |
| --aya-shadow | N/A - removed in new system | app/globals.css (10) | 10 |
| --aya-shadow-lg | N/A - removed in new system | app/globals.css (2) | 2 |
| --aya-shadow-sm | N/A - removed in new system | app/globals.css (14) | 14 |
| --aya-success | --color-success | app/globals.css (18) | 18 |
| --aya-success-soft | --color-success-bg | app/globals.css (8) | 8 |
| --aya-warning | --color-warning | app/globals.css (24) | 24 |
| --aya-warning-soft | --color-warning-bg | app/globals.css (12) | 12 |
| --aya-white | --color-bg-surface | app/globals.css (1) | 1 |

## Section 4 — Safe vs Protected Summary

| Component Area | Total Classes | Protected by Tests | Safe to Rename | New (no real class yet) |
|----------------|---------------|--------------------|----------------|-------------------------|
| Prototype Scaffold | 13 | 0 | 0 | 13 |
| Shell & Navigation | 22 | 3 | 17 | 2 |
| Shared Controls & Forms | 29 | 0 | 22 | 7 |
| Dashboard Data & Section Navigation | 26 | 3 | 23 | 0 |
| Feedback & Dialogs | 20 | 1 | 9 | 10 |
| POS Products & Checkout | 43 | 2 | 41 | 0 |
