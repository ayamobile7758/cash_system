# POS View Layer Execution Plan

Date: 2026-04-02

## Scope Lock

This plan is locked to the already accepted direction:

- The primary problem is in the POS view layer.
- The current POS surface suffers from styling contract drift and weak visual ownership.
- The selected solution is `rebuild the view layer only` while preserving current sale logic.

This document does not reopen diagnosis, does not expand scope, and does not propose rewriting business logic.

## Workstream Summary

The implementation will run in two phases:

1. `Stabilization`
2. `Rebuild`

The handoff rule between the phases is strict:

- Phase 1 ends only when `/pos` is visually stable and operational again.
- Phase 2 starts only after the stable surface is verified on desktop and mobile.

## Execution Order

| Order | Phase | Files | Goal |
|---|---|---|---|
| 1 | Stabilization | `components/pos/pos-workspace.tsx` | Establish a stable active render path for `/pos` without changing sale logic |
| 2 | Stabilization | `components/pos/pos-view-stabilization.module.css` | Create an isolated POS presentation layer that does not depend on unsupported utility classes |
| 3 | Stabilization | `components/pos/product-grid-item.tsx` | Rebind product card rendering to the stabilized presentation contract |
| 4 | Stabilization | `app/globals.css` | Fix POS containment and shell interaction only where required for stable layout |
| 5 | Stabilization | `components/pos/quick-checkout-panel.tsx`, `components/pos/mobile-bottom-sheet.tsx` | Freeze or isolate experimental mobile presentation paths from the stable desktop path |
| 6 | Stabilization | `components/pos/pos-workspace.tsx` | Remove mojibake literals and normalize Arabic UI copy in touched POS paths |
| 7 | Stabilization | `tests/unit/pos-workspace.test.tsx`, targeted runtime checks | Validate that the stable POS surface is working again |
| 8 | Rebuild | `components/pos/view/pos-surface-shell.tsx` | Extract shell and split-view presentation from monolith |
| 9 | Rebuild | `components/pos/view/pos-toolbar.tsx` | Extract search, refresh, category rail, and top actions |
| 10 | Rebuild | `components/pos/view/pos-product-grid.tsx` | Extract product discovery grid container |
| 11 | Rebuild | `components/pos/view/pos-product-card.tsx` | Replace current product card presentation with stable card component |
| 12 | Rebuild | `components/pos/view/pos-cart-rail.tsx` | Extract cart rail surface and cart line presentation |
| 13 | Rebuild | `components/pos/view/pos-checkout-panel.tsx` | Extract payment and optional checkout sections |
| 14 | Rebuild | `components/pos/view/pos-success-state.tsx` | Extract success surface from active sale state |
| 15 | Rebuild | `components/pos/view/pos-mobile-cart-sheet.tsx` | Reintroduce mobile cart/sheet presentation under the same view contract |
| 16 | Rebuild | `components/pos/pos-view.module.css` | Create one final POS view-layer source of truth |
| 17 | Rebuild | `components/pos/pos-workspace.tsx` | Shrink monolith into orchestration-only container |
| 18 | Rebuild | `app/globals.css` | Remove obsolete POS presentation overlap after cutover |
| 19 | Rebuild | `tests/unit/*`, `tests/e2e/*`, runtime verification | Add regression protection and close the rebuild |

## Phase 1: Stabilization

## Phase 1 Goal

Return `/pos` to a stable, working, reviewable state without changing the current sale logic contract.

`Stable` means:

- product surface is visible and usable
- product grid renders correctly
- cart rail remains readable and anchored
- no mojibake appears in active POS labels
- no destructive overflow or internal height explosion breaks the visible surface
- desktop and mobile still route through the same current sale logic

## Stabilization Step S1

### Files

- `components/pos/pos-workspace.tsx`

### Exact change

- Identify the currently active unstable presentation subtree inside the product discovery area.
- Keep all current handlers, state variables, refs, and business actions unchanged.
- Reduce the active render path to a presentation skeleton with explicit semantic landmarks.

### Why

- This file is the active POS monolith and must be stabilized before any extraction happens.
- The current render tree mixes orchestration and unstable presentation markup in the same branch.

### Expected improvement

- The unstable layout becomes isolatable.
- The component becomes safe to rebind to a controlled stylesheet.

### Validation before next step

- `/pos` still renders.
- search input still exists
- category buttons still exist
- cart rail still exists
- no checkout logic branch is removed

## Stabilization Step S2

### Files

- `components/pos/pos-view-stabilization.module.css`
- `components/pos/pos-workspace.tsx`

### Exact change

- Introduce one temporary CSS module used only by the active POS surface during stabilization.
- Bind the product-discovery wrappers, search row, category rail, products container, and desktop split view to this module.
- Do not rely on `.grid`, `.flex`, `.bg-*`, `.rounded-*`, responsive utility classes, or pseudo-Tailwind strings for critical layout.

### Why

- The current runtime proves that critical utility classes do not own the active layout.
- Stabilization requires a real stylesheet owner before further extraction.

### Expected improvement

- the product grid container becomes intentionally styled
- layout responsibility becomes explicit
- desktop POS no longer depends on missing utility CSS for critical rendering

### Validation before next step

- computed style for the live product grid container resolves to `display: grid`
- first row contains multiple product cards on desktop
- product pane no longer renders cards as one long vertical list

## Stabilization Step S3

### Files

- `components/pos/product-grid-item.tsx`

### Exact change

- Remove unsupported utility layout dependence from the product card shell.
- Keep product actions and store writes unchanged.
- Keep current `addProduct`, quantity update, remove behavior unchanged.
- Rebind the card to the stabilization contract using semantic classes or module classes only.

### Why

- Even after the grid container is fixed, the product card remains presentation-heavy and currently mixes unsupported layout classes with extra motion styling.

### Expected improvement

- cards render with predictable size
- cards stop inheriting accidental layout behavior
- product area becomes visually reviewable

### Validation before next step

- cards align in a consistent grid
- price, name, stock cue, and add interaction remain visible
- adding a product still updates the cart

## Stabilization Step S4

### Files

- `app/globals.css`

### Exact change

- Limit changes to POS containment only.
- Reconcile the POS shell and layout rules that currently conflict on height and containment.
- Fix the `.pos-layout` and `.pos-workspace .pos-layout` relationship so the layout stays bounded inside the dashboard shell.
- Keep all non-POS surfaces untouched.

### Why

- Runtime confirms that `.pos-layout` is receiving a conflicting `height: auto` override that expands internal height to unusable values.

### Expected improvement

- the POS split view remains within viewport
- internal scroll behavior becomes sane
- cart rail and products area stop inheriting runaway height

### Validation before next step

- computed height for `.pos-layout` is bounded by the visible POS surface rather than the total content stack
- no internal element shows runaway height in the tens of thousands of pixels
- page remains non-broken inside `dashboard-main`

## Stabilization Step S5

### Files

- `components/pos/quick-checkout-panel.tsx`
- `components/pos/mobile-bottom-sheet.tsx`
- `components/pos/pos-workspace.tsx`

### Exact change

- Freeze experimental mobile presentation branches from the stabilization-critical desktop path.
- Keep the files in the repository.
- Do not delete sale logic.
- If needed, keep the mobile branch mounted behind the stable presentation contract only.

### Why

- These files are presentation experiments, not core sale logic owners.
- Stabilization must reduce active visual divergence before rebuild starts.

### Expected improvement

- reduced presentation branching
- lower risk while stabilizing desktop and shared POS layout

### Validation before next step

- desktop `/pos` no longer depends on the experimental mobile presentation path
- mobile path still renders without breaking current logic entry points

## Stabilization Step S6

### Files

- `components/pos/pos-workspace.tsx`
- any touched POS presentation files

### Exact change

- Replace mojibake literals with valid Arabic UTF-8 text in the active POS surface.
- Normalize only touched POS strings.

### Why

- Runtime confirms mojibake in live POS labels.
- This must be removed before rebuild begins.

### Expected improvement

- Arabic UI text becomes reviewable and trustworthy

### Validation before next step

- no visible `Ø` or `Ã` sequences in active `/pos`
- cart summary and checkout labels display readable Arabic text

## Stabilization Step S7

### Files

- `tests/unit/pos-workspace.test.tsx`
- runtime verification on `/pos`

### Exact change

- Update or add focused view-layer assertions only for stabilized behavior.
- No business logic assertions are rewritten unless they fail due to view extraction errors.

### Why

- Stabilization must end with a checkpoint, not a visual guess.

### Expected improvement

- the project has a clear stable baseline before rebuild

### Validation gate to close Phase 1

- product grid works on desktop
- cart rail is visible and anchored
- empty and non-empty cart states still render
- add-to-cart still updates totals
- no mojibake remains in active POS surface
- mobile and desktop do not show destructive overflow

## Phase 2: Rebuild

## Phase 2 Goal

Rebuild the POS surface into small presentation components while keeping the current sale logic and current store contracts intact.

## Rebuild Component Map

### `components/pos/view/pos-surface-shell.tsx`

Role:

- outer view-layer shell for products pane + cart rail
- owns only presentational split-view composition

Moves from `pos-workspace.tsx`:

- split view wrapper
- products-side container
- cart-side container handoff

### `components/pos/view/pos-toolbar.tsx`

Role:

- search row
- refresh action
- new sale action
- held cart entry point
- product view toggle
- category rail

Moves from `pos-workspace.tsx`:

- active discovery header subtree
- category button row
- top product actions

### `components/pos/view/pos-product-grid.tsx`

Role:

- product results area
- loading skeleton
- empty search state
- load-more footer

Moves from `pos-workspace.tsx`:

- products loading branch
- product list branch
- empty results branch
- load-more branch

### `components/pos/view/pos-product-card.tsx`

Role:

- final stable product card presentation
- name, price, stock cue, add interaction, quantity controls

Moves from current files:

- presentation responsibilities from `components/pos/product-grid-item.tsx`
- optional reuse of `components/pos/product-thumbnail-art.tsx`

### `components/pos/view/pos-cart-rail.tsx`

Role:

- cart surface
- held carts panel
- cart line list
- summary block

Moves from `pos-workspace.tsx`:

- cart header
- held carts UI
- empty cart view
- cart line rendering
- summary shell

### `components/pos/view/pos-checkout-panel.tsx`

Role:

- payment method selection
- amount received
- split payment UI
- optional checkout sections
- primary and secondary checkout actions

Moves from `pos-workspace.tsx`:

- checkout summary
- payment rows
- customer / discount / notes / terminal sections
- debt preview surface

### `components/pos/view/pos-success-state.tsx`

Role:

- successful sale presentation only

Moves from `pos-workspace.tsx`:

- success overlay branch
- print / new sale actions

### `components/pos/view/pos-mobile-cart-sheet.tsx`

Role:

- mobile-only cart/sheet presentation under the same final contract

Moves from current files:

- stable presentation parts of `mobile-bottom-sheet.tsx`
- stable presentation parts of `quick-checkout-panel.tsx`
- mobile-specific render branch from `pos-workspace.tsx`

### `components/pos/pos-view.module.css`

Role:

- final source of truth for POS presentation
- replaces temporary stabilization CSS
- owns visual hierarchy and layout contract for the POS surface

## Rebuild Step R1

### Files

- `components/pos/view/pos-surface-shell.tsx`
- `components/pos/pos-workspace.tsx`

### Exact change

- Extract only shell composition first.
- Keep data and handlers in `pos-workspace.tsx`.

### Validation

- `/pos` still renders with the same active data and states
- split products/cart layout remains intact

## Rebuild Step R2

### Files

- `components/pos/view/pos-toolbar.tsx`
- `components/pos/pos-workspace.tsx`

### Exact change

- Move search/category/action presentation out of monolith.
- Pass props and callbacks down explicitly.

### Validation

- search still works
- refresh still works
- categories still filter
- new sale and held cart entry points still work

## Rebuild Step R3

### Files

- `components/pos/view/pos-product-grid.tsx`
- `components/pos/view/pos-product-card.tsx`
- `components/pos/pos-workspace.tsx`

### Exact change

- Move product list presentation and loading/empty states out of monolith.
- Either replace or retire `product-grid-item.tsx` in favor of `pos-product-card.tsx`.

### Validation

- grid remains stable
- cards render correctly
- add/remove/quantity interactions still update cart

## Rebuild Step R4

### Files

- `components/pos/view/pos-cart-rail.tsx`
- `components/pos/pos-workspace.tsx`

### Exact change

- Move cart rail presentation and held cart UI into one surface component.

### Validation

- cart rail remains fixed and readable
- empty cart state works
- held cart panel works

## Rebuild Step R5

### Files

- `components/pos/view/pos-checkout-panel.tsx`
- `components/pos/pos-workspace.tsx`

### Exact change

- Move payment and optional checkout UI into one presentational unit.
- Keep current checkout logic, validation flags, and submit triggers in the container.

### Validation

- selected payment still updates UI
- split payments still render and compute
- customer / discount / notes / terminal sections remain accessible
- confirm path remains intact

## Rebuild Step R6

### Files

- `components/pos/view/pos-success-state.tsx`
- `components/pos/pos-workspace.tsx`

### Exact change

- Extract success presentation into its own component.

### Validation

- successful sale still shows invoice, payment summary, print action, and new sale action

## Rebuild Step R7

### Files

- `components/pos/view/pos-mobile-cart-sheet.tsx`
- `components/pos/pos-workspace.tsx`

### Exact change

- Rebuild the mobile surface under the same final view contract rather than leaving a duplicated experimental branch.

### Validation

- mobile POS remains product-first
- cart access is clear
- no duplicate or conflicting checkout presentation remains

## Rebuild Step R8

### Files

- `components/pos/pos-view.module.css`
- `components/pos/view/*.tsx`

### Exact change

- Replace temporary stabilization CSS with final POS presentation stylesheet.
- Keep tokens in `app/globals.css`.
- Move POS-specific layout and view styling out of the global overlap zone.

### Validation

- POS view components render correctly with one clear style owner

## Rebuild Step R9

### Files

- `components/pos/pos-workspace.tsx`

### Exact change

- Reduce `pos-workspace.tsx` to orchestration only:
- state selection
- derived values
- event handlers
- branching between current sale / success / mobile states

### Validation

- file size and responsibility drop substantially
- no view-only JSX bulk remains in the container

## Rebuild Step R10

### Files

- `app/globals.css`

### Exact change

- Remove obsolete POS presentation overlap only after new view layer is fully active.
- Keep shell-level tokens and truly shared contracts.

### Validation

- removing old overlap does not change final `/pos` rendering
- no other workspaces regress

## What Will Not Be Touched

These areas stay out of scope unless a narrow technical blocker appears during extraction:

- `stores/pos-cart.ts`
- `hooks/use-products.ts`
- `hooks/use-pos-accounts.ts`
- `hooks/use-customer-search.ts`
- sale payload construction
- `submitSale`
- held cart logic
- split payment logic
- API routes under `app/api/*`
- permission and access rules
- data contracts in `lib/pos/types.ts`
- non-POS dashboard behavior outside minimal containment CSS

If a blocker appears, the rule is:

- do not broaden scope
- fix only the interface seam required to keep the view-layer rebuild working

## Minimum Stable Definition After Phase 1

`/pos` is considered stable only when all of these are true:

- product grid renders as a real multi-column grid on desktop
- cart rail is visible and does not collapse or visually detach
- search and category rail are visible and usable
- add-to-cart works
- cart totals update
- no mojibake exists in active POS labels
- no destructive overflow or blank surface remains
- mobile opens without layout collapse

## Verification Checklist After Each Phase

## After Stabilization

- grid works
- cards are visible
- cart rail is readable
- no mojibake
- no destructive overflow
- desktop and mobile render usable POS surface

## After Rebuild

- `pos-workspace.tsx` is orchestration-only
- all major POS surfaces have dedicated presentation components
- one POS stylesheet owns the final view layer
- desktop and mobile remain within the same current sale logic contract
- success, empty, loading, held carts, and checkout states all render correctly

## Risk Reduction Plan

## Highest-risk point

- extracting JSX from `pos-workspace.tsx` without breaking hidden logic coupling

## Risk control

- keep handlers and derived state in the container until each presentation component is verified
- move presentation only, not state transitions
- extract one surface at a time
- verify after every extraction before continuing

## Second highest-risk point

- global CSS cleanup affecting other dashboards

## Risk control

- do not remove old global POS presentation rules until the new view layer is active
- scope every intermediate change tightly to `.pos-workspace` and `.dashboard-shell--pos`

## Rollback points

- Rollback Point A: end of Stabilization
  - if rebuild drifts, the project can stop on the stabilized POS without shipping the monolith rewrite
- Rollback Point B: after each extracted presentation component
  - if a component extraction breaks behavior, restore only the extracted subtree while keeping prior stabilizations

## Regression Prevention Pack

- one source of truth for POS view styling
- no critical POS layout built on unsupported utility classes
- POS presentation components separated from sale logic container
- runtime verification on `/pos` after every major step
- focused unit coverage for view invariants
- focused e2e coverage for desktop and mobile POS layout invariants
- explicit rule: the visual reference governs `layout`, `hierarchy`, and `density` only, not sale logic

## Definition of Done

The work is complete only when:

- `/pos` is stable
- `/pos` is rebuilt as view-layer components rather than monolith JSX
- current sale logic is preserved
- final POS presentation has a single clear owner
- desktop and mobile pass runtime verification
- the old overlap is removed without regression

