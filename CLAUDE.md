## Project Identity
- Project name: Aya Mobile (آيا موبايل)
- Stack: Next.js 15 App Router, Supabase, Playwright e2e, Vitest unit
- Language: Arabic RTL retail POS system
- Primary users: `pos_staff` (cashier), `admin`
- This file supplements `AGENTS.md`; it adds repo-specific AI safety rules and must not duplicate standing agent rules already defined there

## Architectural Source of Truth
The architectural and product-level decisions for this project live in the **AYA package**:
`تصميم جديد/AYA_00 → AYA_09` (10 files).

- **AYA 00** — index and authority map (read first)
- **AYA 01** — product contract, page archetypes, sticky budget per archetype
- **AYA 02** — POS final spec (toolbar is local to POS, not shell-injected)
- **AYA 03** — shell, width hierarchy, surface hierarchy, primitive specs
- **AYA 04** — post-POS roadmap (Reports → Management → Detail → Settings)
- **AYA 05** — technical execution plan with test protection protocol + tiered testing
- **AYA 06** — acceptance criteria, H-rules (H-01 … H-12), measurable metrics
- **AYA 07** — non-technical owner review guide
- **AYA 08** — bridge document between AYA, `DESIGN_SYSTEM.md`, and the code
- **AYA 09** — primitive API reference (props/slots/a11y/test IDs)

Split of authority:
- Architecture / archetype / width policy / flow → **AYA wins**
- Color / token / font / radius / numeric z-index → **`ai-system/DESIGN_SYSTEM.md` wins** (see its §16)
- Business logic (payment, cart, debt, held carts) → **code truth wins**
- Visible strings, CSS hooks, aria labels → **tests win** (grep `tests/e2e/` first)

When these appear to conflict, go to **AYA 08 §11** before deciding.
Do not re-invent decisions already made in AYA — extend them or ask.

## Mandatory Pre-Edit Checklist
1. Read the file fully before editing it
2. Search `tests/e2e/` for any reference to the component, class, string, or boolean you are about to change
3. Read every matching test file in full
4. Confirm your change does not break any assertion in those tests
5. If a conflict exists: stop and report it; do not silently proceed
6. After all changes: run `npx tsc --noEmit --pretty false` and confirm zero output
7. After all changes: run `npx vitest run` and confirm all pass

## Protected Entities
- **State initializers** (`useState(...)`) - any boolean/string default that controls visible UI. Changing `false` to `true` can flip what users see on load and break tests expecting the original state.
- **Visible Arabic strings** - any user-facing text in JSX. Tests assert exact substrings. A cosmetic rewording breaks assertions silently.
- **CSS class names used in tests** - classes like `.pos-cart-sheet__summary`, `.dashboard-bottom-bar`, `.result-card` are locators in e2e tests. Renaming them breaks those tests.
- **Role and aria-label values** - `getByRole("button", { name: "..." })` assertions depend on exact accessible names.
- **Heading hierarchy** - `getByRole("heading", { name: "..." })` depends on both the text and the element being `h1`-`h6`.

## Test Commands
```bash
# Unit tests (fast, no server needed)
npx vitest run

# TypeScript check
npx tsc --noEmit --pretty false

# Build check
npm run build

# E2E tests (requires running server on port 3100)
npx playwright test
```

## File Ownership Map
| Source File | Guards What | Test Files |
|-------------|------------|-----------|
| `app/page.tsx` | Home metadata, unified login entry, POS launcher card | `smoke.spec.ts`, `px18-visual-accessibility.spec.ts`, `px21-shell-auth.spec.ts`, `px06-device-gate.spec.ts` |
| `app/login/page.tsx` | Dedicated login route metadata and login shell | `px21-shell-auth.spec.ts` |
| `app/manifest.ts` | Installability manifest fields (`display`, `start_url`, icons, categories) | `smoke.spec.ts`, `px06-device-gate.spec.ts` |
| `app/globals.css` | Light-only theme, locator class definitions, responsive shell and POS layout behavior | `px06-uat.spec.ts`, `px13-search-alerts.spec.ts`, `px18-visual-accessibility.spec.ts`, `px21-shell-auth.spec.ts`, `px22-transactional-ux.spec.ts` |
| `components/auth/login-form.tsx` | Login heading, submit button, auth card surface | `smoke.spec.ts`, `px18-visual-accessibility.spec.ts`, `px21-shell-auth.spec.ts` |
| `components/runtime/install-prompt.tsx` | Install CTA label, ready-state gating, accepted-install copy | `px06-device-gate.spec.ts`, `px21-shell-auth.spec.ts` |
| `components/pos/access-required.tsx` | Unauthenticated guards for `/products` and `/pos` | `smoke.spec.ts` |
| `components/dashboard/access-required.tsx` | Unauthenticated guards for dashboard workspaces | `smoke.spec.ts` |
| `app/(dashboard)/layout.tsx` | Role-scoped navigation inventory and grouped labels passed into the shell | `px16-navigation-ia.spec.ts`, `px21-shell-auth.spec.ts` |
| `components/dashboard/dashboard-shell.tsx` | Drawer, bottom bar, topbar, breadcrumbs, quick search, user chip, shell aria-labels | `px16-navigation-ia.spec.ts`, `px18-visual-accessibility.spec.ts`, `px21-shell-auth.spec.ts` |
| `app/(dashboard)/products/page.tsx` | Products route guard and page metadata | `smoke.spec.ts`, `px23-operational-workspaces.spec.ts` |
| `components/pos/products-browser.tsx` | Products headings, search placeholder, category chip, product grid states | `px06-uat.spec.ts`, `px23-operational-workspaces.spec.ts` |
| `app/(dashboard)/pos/page.tsx` | POS route guard and page metadata | `smoke.spec.ts` |
| `components/pos/pos-workspace.tsx` | POS heading, product search, category chip, cart sheet, checkout and confirm-sale states | `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px18-visual-accessibility.spec.ts`, `px22-transactional-ux.spec.ts` |
| `app/(dashboard)/reports/page.tsx` | Reports route guard and page baseline wiring | `smoke.spec.ts`, `px11-reports.spec.ts`, `px13-search-alerts.spec.ts`, `px18-visual-accessibility.spec.ts`, `px24-analytical-config.spec.ts` |
| `components/dashboard/reports-overview.tsx` | Reports headings, filter controls, section links, export link, analytical lead copy | `px11-reports.spec.ts`, `px13-search-alerts.spec.ts`, `px16-navigation-ia.spec.ts`, `px18-visual-accessibility.spec.ts`, `px24-analytical-config.spec.ts` |
| `components/dashboard/reports-advanced-charts.tsx` | Advanced comparison charts rendered inside reports | `px11-reports.spec.ts`, `px18-visual-accessibility.spec.ts` |
| `app/api/reports/advanced/export/route.ts` | Advanced Excel export endpoint linked from the reports surface | `px11-reports.spec.ts`, `px18-visual-accessibility.spec.ts` |
| `app/(dashboard)/settings/page.tsx` | Settings route guard and page baseline wiring | `smoke.spec.ts`, `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px16-navigation-ia.spec.ts`, `px24-analytical-config.spec.ts` |
| `components/dashboard/settings-ops.tsx` | Settings headings, section navigation, re-check button, policy cards | `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px16-navigation-ia.spec.ts`, `px24-analytical-config.spec.ts` |
| `components/dashboard/permissions-panel.tsx` | Permissions section content surfaced from settings | `px16-navigation-ia.spec.ts`, `px24-analytical-config.spec.ts` |
| `app/api/health/route.ts` | `/api/health` success envelope | `smoke.spec.ts` |
| `app/api/health/balance-check/route.ts` | Balance check POST success from settings | `device-qa.spec.ts`, `px06-device-gate.spec.ts` |
| `app/api/reconciliation/route.ts` | Reconciliation POST success from settings | `device-qa.spec.ts` |
| `app/api/snapshots/route.ts` | Daily snapshot POST success from settings | `device-qa.spec.ts` |
| `app/api/inventory/counts/complete/route.ts` | Inventory count completion POST success | `device-qa.spec.ts` |
| `app/(dashboard)/debts/page.tsx` | Debts route guard and baseline wiring | `smoke.spec.ts`, `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px16-navigation-ia.spec.ts`, `px22-transactional-ux.spec.ts` |
| `components/dashboard/debts-workspace.tsx` | Debt tabs, customer search, payment form, summary and result cards | `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px16-navigation-ia.spec.ts`, `px22-transactional-ux.spec.ts` |
| `app/(dashboard)/invoices/page.tsx` | Invoices route guard and list baseline wiring | `smoke.spec.ts`, `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px22-transactional-ux.spec.ts` |
| `components/dashboard/invoices-workspace.tsx` | Invoices list, return flow controls, confirm-return button | `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px22-transactional-ux.spec.ts` |
| `app/(dashboard)/invoices/[id]/page.tsx` | Invoice detail route and access guard | `px22-transactional-ux.spec.ts` |
| `components/dashboard/invoice-detail.tsx` | Invoice detail heading, summary and return tabs, admin actions, print CTA | `px22-transactional-ux.spec.ts` |
| `app/api/invoices/cancel/route.ts` | Admin-only invoice cancel protection | `px06-uat.spec.ts` |
| `app/api/sales/route.ts` | Sales creation semantics, concurrency, performance, server-authoritative pricing | `px06-uat.spec.ts` |
| `app/(dashboard)/notifications/page.tsx` | Notifications route and search/alerts composition | `px13-search-alerts.spec.ts`, `px16-navigation-ia.spec.ts`, `px23-operational-workspaces.spec.ts` |
| `components/dashboard/notifications-workspace.tsx` | Notifications headings, section nav, alerts and inbox surfaces, role-scoped search panels | `px13-search-alerts.spec.ts`, `px16-navigation-ia.spec.ts`, `px23-operational-workspaces.spec.ts` |
| `app/(dashboard)/inventory/page.tsx` | Inventory route and permissions guard | `device-qa.spec.ts`, `px16-navigation-ia.spec.ts`, `px23-operational-workspaces.spec.ts` |
| `components/dashboard/inventory-workspace.tsx` | Inventory sections, open count, reconciliation and inventory result cards | `device-qa.spec.ts`, `px16-navigation-ia.spec.ts`, `px23-operational-workspaces.spec.ts` |
| `app/(dashboard)/suppliers/page.tsx` | Suppliers route guard | `px23-operational-workspaces.spec.ts` |
| `components/dashboard/suppliers-workspace.tsx` | Suppliers headings and section navigation | `px23-operational-workspaces.spec.ts` |
| `app/(dashboard)/expenses/page.tsx` | Expenses route guard | `px23-operational-workspaces.spec.ts` |
| `components/dashboard/expenses-workspace.tsx` | Expenses heading and section navigation | `px23-operational-workspaces.spec.ts` |
| `app/(dashboard)/operations/page.tsx` | Operations route guard | `px23-operational-workspaces.spec.ts` |
| `components/dashboard/operations-workspace.tsx` | Operations heading and section navigation | `px23-operational-workspaces.spec.ts` |
| `app/(dashboard)/maintenance/page.tsx` | Maintenance route guard | `px13-search-alerts.spec.ts`, `px23-operational-workspaces.spec.ts` |
| `components/dashboard/maintenance-workspace.tsx` | Maintenance heading and orders section | `px13-search-alerts.spec.ts`, `px23-operational-workspaces.spec.ts` |
| `app/(dashboard)/portability/page.tsx` | Portability route guard | `px24-analytical-config.spec.ts` |
| `components/dashboard/portability-workspace.tsx` | Portability headings, section navigation, import and restore history states | `px24-analytical-config.spec.ts` |

## CSS and Layout Rules
- Light theme only - zero dark mode CSS
  **EXCEPTION (2026-04-04):** The login page shell (`.baseline-shell--auth`) is permitted to use a dark atmospheric background and glassmorphism card styling. This exception is scoped exclusively to CSS classes that begin with `.baseline-shell--auth`, `.auth-card`, `.auth-lamp`, and `.login-fab`. No dark-mode media queries, no `color-scheme: dark`, no changes outside the login shell scope.
- RTL native - every layout decision must be RTL-correct
- Do not add `position: sticky` inside containers with `overflow: hidden`
- Do not use `min(...)` for widths that need a responsive range - use `clamp(...)`
- CSS class renames require a grep across `tests/e2e/` before applying
- Check `docs/PROTECTED_STRINGS.md` Section B before renaming any CSS class

## Commit Convention
```text
fix(scope): description
feat(scope): description
refactor(scope): description
docs(scope): description
```
- No force push to main
- No `--no-verify`
- Every wave must end with a commit and `git push origin main`


## Multi-Agent Orchestration (bootstrap)
<!-- Loads the multi-agent planner/executor system. System lives in .claude/rules/ and ai-system/. See HOW_TO_RUN.md for the cycle. -->
@.claude/rules/system-core.md
