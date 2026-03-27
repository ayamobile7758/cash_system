# UX Cashier Audit Report - UX Restructure Wave - 2026-03-27

## Summary
- Scope: analysis only; no code files were modified.
- Sources reviewed: `UI_REDESIGN_AUDIT_REPORT_2026-03-27.md`, `UI_REDESIGN_V2_EXECUTION_REPORT_2026-03-27.md`, `CSS_COMPLETION_REPORT_2026-03-27.md`, `components/pos/pos-workspace.tsx`, `stores/pos-cart.ts`, and the POS-specific slice of `app/globals.css`.
- Main conclusion: V2 did fix several checkout primitives, but the current implementation still carries cashier-facing friction in structure, restore behavior, and sale completion edge cases.

## Scenario Simulation

### Scenario 1 - Simple cash sale
Works: the cash flow is present and usable. When the selected account is cash, the `المبلغ المستلم` field appears, `remainingToSettle` updates live, and the success screen shows the invoice number, payment breakdown, and `طباعة إيصال` / `بيع جديد` actions. Fees stay hidden when they are zero, which is correct for a simple cash sale.

Friction: the cashier starts on a full POS page header and two explanatory `SectionCard` descriptions instead of a compact sales surface. Optional fields for customer, discount, and terminal code remain visible even when they are not needed. The footer hint `استخدم / أو F1...` is also still on screen, which is instructional noise for a routine sale.

Missing or broken: the page is not yet cashier-first. The current checkout still exposes too much non-payment chrome, so the quick-sale path is visually longer than it should be.

### Scenario 2 - Multi-item card payment with discount
Works: invoice discounting is functional, card-type accounts are fee-aware, and the checkout summary/success state show discount and fee totals. The confirm action changes appropriately when the sale is exact or overpaid, and the success overlay keeps the sale closure visible.

Friction: the cashier must still read through the same always-visible optional fields before reaching the payment summary. If the fetched account list does not start with card, the auto-selected first account adds one more correction step. The success screen is better than before, but it still does not fully match the intended visual weight from the wave brief.

Missing or broken: the card flow is operational, but it is still embedded in a dense checkout panel instead of a deliberately minimized payment surface.

### Scenario 3 - Split payment (cash + CliQ)
Works: split payments exist in the store and are wired into payload building, remaining balance, and success reporting. The additional payment rows can be added and edited, and the sale can complete once the combined total settles the invoice.

Friction: the primary payment method is rendered twice. There is a full `pos-payment-chip-row` above the split block, and then the same full chip row appears again inside `.pos-split-payments` for the primary row. That duplication is exactly the kind of visual ambiguity a cashier feels immediately.

Missing or broken: the split UI still does not match the intended mental model. The primary method should be a selected badge plus amount field, not a repeated chip selector. That is still a real operational defect.

### Scenario 4 - Debt sale
Works: when the customer is selected and the payment remains short, the UI shows a debt preview panel and the confirm button switches to the warning debt-confirm action. The success screen also preserves the debt amount and customer context when the sale completes.

Friction: debt is still treated as an underpayment consequence rather than a clearly separate intent mode. The customer search remains permanently visible, so the cashier has to scan extra fields even on a debt-focused transaction.

Missing or broken: the flow is functional, but it still leans on general checkout structure instead of making debt creation visually deliberate.

### Scenario 5 - Held cart restoration under pressure
Works: held carts are listed, can be restored, and can be discarded. The restore action also prompts before overwriting an active cart, which is the right safety check.

Friction: `restoreHeldCart` does not restore the held payment context. It restores items, customer, discount, and notes, but it clears `selectedAccountId`, `amountReceived`, and `splitPayments`. Then the UI auto-selects the first account again because of the `if (!selectedAccountId && accounts.length > 0)` effect in `components/pos/pos-workspace.tsx:368`. That is a high-risk mismatch when a cashier expects a held sale to resume exactly.

Missing or broken: this is not a full restore. It is a partial restore with automatic payment re-defaulting, which can absolutely mislead the cashier under pressure.

### Scenario 6 - Peak hour: fast sequential sales
Works: `handleStartNewSale` clears the cart, resets local checkout state, and gets the operator back to cart mode quickly. The success screen also gives a direct `بيع جديد` action.

Friction: the system never really returns to a neutral payment state. A blank cart still gets the first account auto-selected, so every new sale inherits whichever account happens to be first in the loaded list. The checkout also keeps customer, discount, and terminal fields visible all the time, which slows the visual scan on a busy counter.

Missing or broken: the current surface is not yet optimized for sub-30-second repeat sales. It works, but it does not feel stripped down enough for a queue.

## Before/After Analysis

### Fixed by V2, verified in code
- Split payment exists in both the store and the POS checkout UI (`components/pos/pos-workspace.tsx:284`, `1467`; `stores/pos-cart.ts:236`).
- Remaining-to-settle is visible and drives success/danger state (`components/pos/pos-workspace.tsx:332`, `1837`; `app/globals.css:4413`).
- Fee-bearing methods are surfaced in checkout and on the success screen (`components/pos/pos-workspace.tsx:298`, `1199`; `app/globals.css:4349`).
- Debt preview and warning confirmation are present (`components/pos/pos-workspace.tsx:1859`, `1231`).
- Success closure is stronger than the original audit expected: invoice number, payment breakdown, print action, and new-sale action are all implemented (`components/pos/pos-workspace.tsx:1178`).
- Arabic product search normalization and SKU matching are implemented in the POS filter (`components/pos/pos-workspace.tsx:262`).
- Product cards now carry stock labels in the main grid (`components/pos/pos-workspace.tsx:1055`).
- Dark-mode selectors are absent from the current `app/globals.css` slice I reviewed, which aligns with the light-only direction.

### Still not fixed
- The POS still starts with a full `PageHeader` and explanatory descriptions instead of a minimal sticky toolbar (`components/pos/pos-workspace.tsx:843`).
- Optional checkout fields are still always visible; customer, discount, and terminal code are not collapsed by default (`components/pos/pos-workspace.tsx:1652`).
- Split mode still duplicates the primary payment chip row (`components/pos/pos-workspace.tsx:1467`).
- Held cart restore still drops payment context and re-defaults the account (`stores/pos-cart.ts:353`, `components/pos/pos-workspace.tsx:368`).
- Quick-add cards still do not show the stock indicator that the main grid uses (`components/pos/pos-workspace.tsx:1009`).
- There is no product-search empty state inside the grid when the query returns nothing (`components/pos/pos-workspace.tsx:1055`).
- The POS still carries a stray `pos-layout__body` class with no matching CSS (`components/pos/pos-workspace.tsx:901`; no matching selector in `app/globals.css`).
- Zero-total / fully discounted sales are not actually completable because zero-amount payments are filtered out and the submit path rejects an empty payment list (`components/pos/pos-workspace.tsx:668`).

### New friction introduced by V2
- The auto-select effect makes every empty cart default to the first account, which is not a neutral starting state for repeated sales (`components/pos/pos-workspace.tsx:368`).
- Split payment now introduces a duplicated primary-account control, which was not a problem in the pre-split UI because the split UI did not exist.
- The richer success screen is useful, but it is still relatively dense and slightly undersized versus the intended hierarchy (`components/pos/pos-workspace.tsx:1180`; `app/globals.css:4468`).
- The current checkout still surfaces explanatory copy and keyboard hints that are now counterproductive rather than helpful (`components/pos/pos-workspace.tsx:846`, `906`, `1036`, `1107`).

## Prioritized Friction Inventory

### CRITICAL
- Held cart restore drops payment context and auto-selects the first account, which can mispost a restored sale in front of the cashier (`stores/pos-cart.ts:353`, `components/pos/pos-workspace.tsx:368`).
- A zero-total or fully discounted sale cannot be finalized because the payload builder filters out zero-amount payments and the submit path rejects an empty payment list (`components/pos/pos-workspace.tsx:668`).

### HIGH
- Customer, discount, and terminal code fields remain visible all the time, so the cashier scans unnecessary UI on every sale (`components/pos/pos-workspace.tsx:1652`).
- Split mode duplicates the primary payment chip row, which creates immediate ambiguity during the payment step (`components/pos/pos-workspace.tsx:1467`).
- The POS still uses a large `PageHeader` with descriptive copy and meta cards instead of the requested minimal sticky toolbar (`components/pos/pos-workspace.tsx:843`).
- Product search has no in-grid empty state, so a zero-result search feels broken rather than recoverable (`components/pos/pos-workspace.tsx:1055`).

### MEDIUM
- Quick-add cards still omit the stock indicator that the main grid has, so the two product surfaces are inconsistent (`components/pos/pos-workspace.tsx:1009`).
- The success screen is stronger now, but the icon and total still do not match the intended visual hierarchy exactly (`components/pos/pos-workspace.tsx:1178`; `app/globals.css:4468`).
- The `workspace-footnote` keyboard hint is still instructional noise on a cashier surface (`components/pos/pos-workspace.tsx:1107`).

### LOW
- `pos-layout__body` is a dead modifier with no CSS selector, so it should be removed for cleanliness rather than for immediate UX gain (`components/pos/pos-workspace.tsx:901`).
- The success screen still uses generic structural elements for the payment breakdown instead of a stricter semantic definition, which is a polish issue more than a workflow blocker (`components/pos/pos-workspace.tsx:1191`).

## Verification Results
- Code inspection completed against the listed files.
- Tests/build not run in this analysis-only role.
