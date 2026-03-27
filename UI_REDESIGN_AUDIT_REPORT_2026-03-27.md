## Executive Summary

The redesign direction is **partially sound but structurally risky**.

It is sound because it aims at the right problems: RTL-native shell behavior, a unified design system, clearer transactional hierarchy, lower visual clutter, and a stronger cashier mental model. It is risky because the source materials are **internally inconsistent**. The official documentation stack says the frontend redesign wave is already completed and accepted, while the new redesign brief reopens foundational shell, POS, responsive, and design-system decisions as if they are still pending. See [EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md), [31_Execution_Live_Tracker.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/31_Execution_Live_Tracker.md), and [27_PreBuild_Verification_Matrix.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/27_PreBuild_Verification_Matrix.md).

The current payment-method issue is **partially solved**, not fully solved. Replacing a single payment-account dropdown with clearer payment chips helps, and split payment addresses a real operational gap, but the redesign still leaves debt semantics, fee visibility, receipt closure, and split-allocation rules underdefined. The current checkout is still single-account in [pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L844) and [pos-cart.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/stores/pos-cart.ts#L61), while the redesign expects explicit checkout state and multi-payment behavior in [EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md#L399) and [EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md#L489).

The proposal is **not implementation-ready**. It still needs major product and UX clarification before coding.

## Role-Based System Interpretation

`Cashier`
The intended mental model is: search fast, recognize the correct product fast, add items with minimal hesitation, review a compact cart, move into a focused checkout state, choose payment clearly, confirm once, get unmistakable post-sale closure, and start the next sale immediately.

This mental model currently breaks in three places:
- payment is still generic and mostly single-account
- debt creation is implicit rather than explicit
- product recognition for similar Arabic-heavy items is underdefined

`Branch operator`
The intended mental model is: use a calm, grouped dashboard shell; move between daily operations, products, invoices, debts, and inventory without role confusion; trust that high-frequency surfaces are fast and low-risk.

This mental model breaks because the materials disagree on what is already done. Some redesign elements are purely presentation-level, while others actually change workflow behavior.

`Supervisor/admin`
The intended mental model is: manage permissions, catalog structure, reports, portability, and operational safety while preserving Blind POS and financial integrity.

This mental model breaks because payment-method behavior, receipt handling, split payment, and debt rules are not fully ratified as final product decisions.

## Reconstructed Intended System Vision

The team is trying to build an **Arabic-first, RTL-native, cashier-speed retail operating system** that feels more disciplined, more professional, and more scalable than the current UI. The visual philosophy is operational clarity, not decorative polish. The system is meant to feel stable, predictable, and role-aware.

The dashboard is intended to become a grouped, right-oriented, RTL-native shell with unified patterns, calmer configuration surfaces, clearer page context, and role-aware navigation. The POS is intended to become a dedicated execution surface where products stay primary, the cart remains persistent, checkout becomes explicit, and post-sale closure becomes obvious.

Intended behavior:
- `Dashboard`: grouped navigation, native RTL structure, role-aware shortcuts, calmer analytics and settings.
- `POS desktop`: 3-column layout with products as primary workspace and a dedicated transactional side panel.
- `POS tablet`: reduced shell density and stronger touch ergonomics, likely 2-column then 1-column transition.
- `POS mobile`: product-first screen with cart as drawer or bottom sheet, then a checkout-focused expanded state.
- `Cart mode`: edit items, quantities, and mistakes quickly; keep a short summary and one dominant “go to pay” action.
- `Checkout mode`: payment-first interaction, optional customer, discount, notes, confirmation, and processing feedback.
- `Post-sale completion`: strong success state, invoice reference, payment closure, likely receipt next-step, and immediate “new sale” continuity.

Before the sale, the system is expected to help the cashier identify the correct product quickly. During the sale, it should reduce mode confusion and payment ambiguity. After the sale, it should close the loop clearly and reset safely for the next customer.

## Visual and Design-System Intent Analysis

The intended visual direction is a **light-only operational interface** using smaller radii, lighter shadows, tighter spacing, and explicit semantic tokens. Typography centers on `Tajawal`, with `14px` general body text and `15px` POS text. Spacing is normalized to a 4/8/12/16/24/32/48 scale. Radii become `6/8/12`. Controls standardize around `44px`.

The semantic color system is meant to separate:
- primary action
- success, warning, danger
- neutral surfaces and borders
- informational emphasis

The design-system intent is operational, not merely aesthetic:
- one primary button per visible area
- labels above fields
- consistent empty, loading, error, and confirmation states
- badges that do not rely on color alone
- explicit offline signaling
- clearer permission-disabled behavior

This direction supports operational use. The problem is not the intent. The problem is that the intent conflicts with the current accepted baseline in some places. The clearest example is dark mode: current code and tests still support it in [globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css#L1) and [px18-visual-accessibility.spec.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/tests/e2e/px18-visual-accessibility.spec.ts#L116), while the new redesign declares light theme only in [EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md#L57).

## Alignment Analysis

| Major Area | Alignment | Conflict | Incompleteness | Hidden Assumptions | Unresolved Contradictions |
|---|---|---|---|---|---|
| Shell and navigation | Strong intent alignment around grouped, role-aware, RTL-native shell | New brief treats shell foundation as pending while tracker says it is done | Desktop/tablet/mobile behavior is partly described, not re-ratified | Moving sidebar right improves clarity without changing authority | “Frontend redesign complete” vs “rebuild shell now” |
| Dashboard structure | Alignment on calmer, grouped surfaces | Current accepted state already claims calmer surfaces | Product-level shell behavior is not fully re-baselined | Visual calm equals operational safety | Acceptance status is unclear |
| POS layout | Strong alignment on reducing clutter and increasing speed | Current POS is still one continuous panel; redesign wants explicit cart and checkout modes | Transition rules and state persistence are underdefined | Mode separation will automatically reduce confusion | No proof that the new state model is simpler on mobile |
| Payment method selection | Alignment that current payment UI is weak | Current UI is single-account; backend and docs already support multi-payment | Method taxonomy, fee visibility, and debt semantics are incomplete | Payment chips alone solve the problem | They improve clarity but do not complete the payment model |
| Split payment | Alignment that it matters | Current UI does not support it at all | Allocation rules, overpayment logic, and cashier guidance missing | Backend support means UX is easy | UX complexity is the real issue |
| Product browsing | Alignment on search-first and scan-friendly access | Current browse model is flatter and weaker than redesign implies | No subcategories, Arabic search normalization, or ranking strategy | Faster layout will fix product recognition | Recognition is semantic, not only visual |
| Mobile POS | Alignment that phone operation matters | Current accepted tests assume directly visible checkout on phone; redesign moves it into layered states | Bottom-sheet behavior and recovery rules are underdefined | Bottom sheet automatically improves mobile UX | It may reduce clutter but raise state confusion |
| Accessibility | Alignment on focus, 44px targets, semantic badges | Light-only contradicts current accepted dark-mode coverage | Standing-distance readability is not fully validated | Smaller text remains usable in cashier conditions | Current “pass” does not validate the new design |
| Post-sale flow | Alignment that success should be stronger | Current success state is still thin; redesign assumes print-ready closure | Receipt strategy is unresolved | Showing invoice number is enough closure | It is not enough in a real store workflow |

## Comprehensive Issues and Complexities Inventory

| Issue Title | Description | Why It Matters | Severity | Type | Phase Impact | Evidence Status | Likely Consequence If Ignored |
|---|---|---|---|---|---|---|---|
| Authoritative baseline conflict | Tracker/docs say redesign is done; new brief says core redesign is still pending | Teams can build against different truths | Critical | Product / Governance / Risk | Before interaction | Explicitly stated | Rework, disputes, broken acceptance |
| Split payment absent in current UI | Backend, docs, and UAT support multi-payment, but UI submits one payment row only | A documented payment scenario is impossible | Critical | Product / Logic / Workflow | During checkout / During payment | Explicitly stated | Operational gap remains unsolved |
| Single payment account persistence | Selected account persists across sales and can auto-select silently | Wrong account can carry into the next sale | High | UX / Operational / Risk | During checkout / During payment | Explicitly stated | Misposted payments |
| Implicit debt creation | Underpayment plus selected customer creates debt without an explicit debt mode | Cashiers can create debt unintentionally | Critical | Product / Logic / Workflow | During payment / After sale completion | Explicitly stated | Debt errors and cashier confusion |
| No explicit remaining-to-settle state | Confirm behavior is not built around a clear visible “remaining amount” concept | Checkout feels complete before it actually is | High | UX / State | During checkout | Explicitly stated | Incomplete payment logic at confirm time |
| Fee-bearing methods are opaque | Accounts expose fees, but checkout does not surface fee implications clearly | Payment choice is under-informed | High | Product / Operational | During payment | Explicitly stated | Wrong payment-method choice |
| Payment-type taxonomy undefined | Cash/card/CliQ/wallet/bank mapping is not fully ratified | UI labels may not match real operational accounts | High | Product / IA / Logic | During checkout | Inferred | Confusing method behavior |
| Receipt closure unresolved | Redesign assumes print or receipt action; baseline assumptions still defer printing | Success state is not operationally complete | High | Business Requirement / Workflow | After sale completion | Explicitly stated | Cashier uncertainty after sale |
| Success overlay too thin | Current success screen lacks payment breakdown and receipt action | “Sale succeeded” is not the same as “workflow closed” | High | UX / Workflow | After sale completion | Explicitly stated | Store-floor hesitation |
| Notes field over-prioritized | Notes consume attention in checkout despite low operational importance | It competes with payment-critical inputs | Medium | UX / Workflow | During checkout | Implied | Slower checkout scanning |
| Permission visibility rules incomplete | Some restricted actions should be disabled, some hidden; mapping is incomplete | Operators need consistent visibility logic | Medium | Product / IA / Permission | Before interaction / During checkout | Implied | Confusion around what is available |
| Offline recovery model underdefined | “No offline writes” is clear, but recovery, retry, and held-cart continuity are not | Failure handling is part of POS quality | High | Operational / Failure / State | Failure / recovery scenarios | Explicitly stated | Slow or unsafe recovery |
| Held-cart stale context risk | Held carts restore account, customer, and amount context, not just items | Old context can leak into the wrong sale | Medium | Workflow / Risk | During cart building / During checkout | Explicitly stated | Context contamination |
| Flat category model only | Current POS exposes one category layer with no subcategories | Accessory-heavy catalogs need deeper browse paths | High | IA / Workflow / Scalability | During product browsing | Explicitly stated | Slower product access |
| No subcategory governance | No defined rules for deeper taxonomy | Category reachability is too shallow for scale | High | IA / Scalability | During product browsing | Not specified in the provided materials | Poor browse efficiency |
| Weak Arabic search normalization | Current “Arabic normalization” is effectively lowercase + trim | Common Arabic variants and inconsistent typing are not handled | High | UX / Accessibility / Risk | During product browsing | Explicitly stated | Missed search results |
| Category labels inconsistent | POS shows raw category values while product admin maps them to Arabic labels | Information architecture feels unfinished | Medium | UX / IA | During product browsing | Explicitly stated | Lower operator confidence |
| Quick-add governance too blunt | Quick-add is global, boolean, capped, and weakly governed | Fast but not strategically curated | Medium | Product / Workflow | Before interaction / During browsing | Explicitly stated | Stale or misleading shortcuts |
| Long Arabic names unresolved | Current cards are noisy; redesign clamps names to two lines | Layout stability can conflict with recognition safety | High | UX / Operational | During item selection | Inferred | Wrong-item selection |
| Similar-product disambiguation missing | No structured brand/model/capacity/color cue strategy is defined | Phones and accessories often differ by one critical suffix | High | UX / Operational | During item selection | Inferred | Frequent cashier mistakes |
| Mobile bottom-sheet state risk | Bottom sheet plus fullscreen checkout adds layered state complexity | Layering changes recovery and visibility behavior | High | Responsive / State / Workflow | During checkout / Failure scenarios | Implied | State confusion on mobile |
| Modal and layer stacking risk | Drawer, bottom sheet, held carts, search results, toasts, and dialogs may overlap | Layer priority must be intentional in POS | High | State / Responsive | During checkout / Failure scenarios | Inferred | Hidden controls and recovery failure |
| Safe-area handling not specified | Proposed mobile bottom bar and sheet do not define safe-area behavior | Notched phones can crowd critical controls | Medium | Responsive / Risk | During checkout | Not specified in the provided materials | Poor touch reliability |
| Shell search and breadcrumb drift | Current shell implementation no longer fully matches tests and prior shell expectations | Accessibility and navigation confidence are overstated | Medium | UX / Accessibility / Governance | Before interaction | Explicitly stated | False confidence from stale tests |
| Light-only vs dark-mode contradiction | New redesign bans dark mode while current accepted baseline still tests it | Acceptance criteria are unstable | Medium | Product / Accessibility / Governance | Before interaction | Explicitly stated | Review and acceptance conflict |
| Touch-target rules incomplete for dense browsing | 44px logic exists for some controls, not fully for dense product-scan elements | Product selection depends on reliable touch | Medium | Accessibility / Responsive | During browsing / During item selection | Ambiguous | Increased tap error rate |
| Keyboard shortcut scope unclear | Redesign adds shortcuts, but scope and collisions are not fully defined | Tablet and hybrid devices need predictable behavior | Low | Workflow / Accessibility | During browsing / During checkout | Not specified in the provided materials | Inconsistent operator interaction |
| Device-gating middleware risk | Runtime device policy adds another operational dependency | Misclassification can block otherwise valid sessions | Low | Operational / Risk | Before interaction | Explicitly stated | False unsupported-device redirects |
| Acceptance tests too shallow for new complexity | Current tests prove visibility and overflow more than full layered workflow behavior | New mobile/POS complexity is under-validated | High | Risk / Workflow / Responsive | Before interaction / Failure scenarios | Explicitly stated | Hidden regressions ship as “passed” |

## POS Checkout Deep Analysis

The proposed checkout mode is **not operationally complete**.

Current state:
- one continuous cart-plus-checkout panel
- one selected payment account
- optional customer search
- optional invoice discount
- cash amount-received helper
- notes
- single confirm action
- technically strong idempotency and offline blocking

Relevant current implementation is in [pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L844), [pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L938), [pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L1018), and [app/api/sales/route.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/api/sales/route.ts#L61).

Detailed judgment:
- `payment-method-first vs non-payment-method-first`: payment should not be selected before cart building, but once the cashier enters checkout, payment method should become the primary organizing decision.
- `cash flow`: current cash helper is workable, but underpayment and debt implications are not sufficiently explicit.
- `card flow`: current non-cash flow is too generic; it does not surface fee-bearing or method-specific implications.
- `CliQ flow`: Ambiguous. The redesign names it, but current method behavior does not define a distinct CliQ path.
- `split payment`: core requirement, not optional enhancement. Backend and docs already assume it.
- `amount received / change due`: current cash change logic is good, but mixed-payment and overpayment allocation rules are missing.
- `optional customer selection`: visually optional, logically not optional if it changes whether debt is created.
- `discount placement`: acceptable in checkout if permission and total-impact rules remain explicit.
- `permission visibility`: directionally better in the redesign, still incomplete as a mapped product rule.
- `notes field relevance`: too prominent relative to speed-critical payment fields.
- `confirm-sale behavior`: technically robust against duplicate submission, weaker against ambiguous cashier intent.
- `processing state`: relatively strong.
- `sale success state`: stronger than before, still incomplete for professional store closure.
- `receipt printing expectation`: unresolved product decision.

Explicit answers:
- Is the proposed checkout mode operationally complete? `No`.
- Must payment method be selected first? `Yes inside checkout, not before cart building`.
- Is split payment a core requirement or a secondary enhancement? `Core requirement`.
- What cashier mistakes are most likely? `Wrong account selection, accidental debt creation, incomplete payment mental model before confirm, stale held-cart context, wrong product selection among similar items`.
- What is missing, ambiguous, or misplaced? `Debt preview, split-allocation rules, fee visibility, receipt closure, payment taxonomy, mobile state transitions, notes priority, permission visibility map`.

## Product Browsing, Category Access, and POS Speed Analysis

Current POS browsing is mechanically fast but not yet strong enough for a dense Arabic-first mobile/accessory counter.

Current model:
- products are preloaded once and filtered client-side
- search is local and fast
- category access is flat
- quick-add is global and blunt
- product cards are still relatively information-heavy
- search only covers `name` and `sku`

See [use-products.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/hooks/use-products.ts), [pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L153), and [product_discovery findings summarized from local analysis].

Operationally:
- access to main categories exists
- access to subcategories is not defined
- category switching is fast
- product access is fast
- browse vs search is biased toward search-first
- quick-add helps speed but lacks governance
- visually similar products remain risky
- long Arabic names remain unresolved
- repeated use under pressure is only partially supported
- touch accuracy is partly covered, not comprehensively
- readability at working distance remains a concern if cards become denser and type shrinks

Conclusion: current POS browsing is technically fast, but **not yet recognition-safe enough** for a real Arabic retail counter with many similar products.

## Responsive and Device Analysis

Current responsive model:
- desktop: 2-column shell, stable enough
- tablet: collapse and stack behavior, functional but not deeply optimized
- mobile: supported, but still largely a stacked transactional surface rather than a product-first layered mobile POS

Relevant evidence is in [globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css#L1939), [globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css#L2234), [globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css#L2657), [dashboard-shell.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/dashboard/dashboard-shell.tsx), and [29_Device_Browser_Policy.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/29_Device_Browser_Policy.md).

Redesign model:
- desktop: 3-column POS with icon rail
- tablet: 2-column then 1-column
- mobile: bottom bar, cart bottom sheet, fullscreen checkout

Main risks:
- `desktop`: narrower product area may worsen Arabic product disambiguation
- `tablet`: `768-1023px` becomes the most fragile breakpoint because the redesign adds bottom-sheet and fullscreen transitions where the current system just stacks
- `mobile`: bottom bar + cart sheet + dialogs + offline bar + success states becomes a layered state system
- `safe area`: not specified for bottom bar or bottom sheet
- `cart-to-checkout transition`: drag, snap, dismissal, and recovery rules are not specified
- `realistic store compatibility`: “supported on phone” is not the same as “operationally strong on phone”

Conclusion: the redesign is more intentional than the current layout, but it introduces a more complex state model that has not been proven deeply enough.

## Design System and Accessibility Analysis

The design-system direction is generally correct. It pushes toward:
- semantic tokens
- consistent buttons, inputs, tables, badges, and dialogs
- visible focus
- 44px touch targets
- non-color-only meaning
- clearer loading and disabled states

This is operationally useful. The accessibility concern is not a generic standards issue. It is practical retail accessibility:
- can the cashier read it while standing?
- can they hit the target quickly?
- can they tell why a control is disabled?
- can they recover when the state changes?

Practical consequences:
- `light-only theme`: not automatically better. In bright stores it may be appropriate, but glare and contrast must be revalidated because the current accepted system still supports dark mode.
- `contrast assumptions`: semantic colors are better, but product status cannot rely on dots or chip color alone.
- `typography scale`: `14px` general and `15px` POS may still be too small for some cashier-critical metadata.
- `Arabic line-height`: good in principle, but dense product cards still need careful truncation and prioritization.
- `hover/focus visibility`: current tests validate focus visibility in the existing system; the redesign keeps that direction, which is good.
- `disabled/loading states`: must remain semantically distinct; “disabled because no permission” is not the same as “disabled because checkout incomplete.”
- `input clarity`: labels above fields are materially better than placeholder-only patterns.

Conclusion: the redesign improves consistency, but operational accessibility in real cashier conditions remains only partially validated.

## Missing Requirements and Hidden Risks

Missing or underdefined areas:
- authoritative product baseline
- debt-as-mode vs debt-as-underpayment consequence
- payment taxonomy and fee display rules
- split-payment row logic and overpayment allocation
- receipt strategy after sale
- print/share/defer decision
- explicit success-state obligations
- offline recovery and retry behavior
- mobile transition and dismissal rules
- safe-area handling
- full permission visibility map
- keyboard shortcut scope and conflicts
- product differentiation cues for near-duplicate items
- category and subcategory governance
- auditability of cashier intent, not just transaction persistence
- whether the current payment issue is being fixed or expanded into a larger redesign without sufficient product decisions

## Strengths, Weaknesses, Risks, and Open Questions

### Strengths
- Strong RTL-native, Arabic-first intent.
- Current technical sale submission is relatively robust on idempotency, offline blocking, and stock concurrency.
- Local product filtering keeps the browsing surface fast.
- The redesign addresses real operational pain, not just aesthetics.

### Weaknesses
- Materials are temporally unsynchronized.
- Current POS UI exposes only part of the documented payment model.
- Product recognition quality is still underdefined.
- Mobile redesign complexity is higher than the current proof depth.

### Risks
- A visually cleaner system could still preserve hidden payment ambiguity.
- Split payment could be added superficially without ratified debt and fee rules.
- Mobile bottom-sheet behavior could introduce new confusion.
- Acceptance disputes could emerge because tests, tracker, and redesign brief are not aligned.

### Open Questions
- Which document is authoritative now?
- Is debt an explicit checkout mode or an implicit underpayment outcome?
- Is receipt printing expected immediately from POS success?
- How should real accounts map to cashier-facing payment chips?
- What taxonomy depth is needed for phone and accessory browsing?
- What exact disambiguation cues must remain visible for long Arabic names and similar products?

## Decision-Level Recommendations Before Execution

What must be clarified before implementation:
- authoritative source of truth
- payment model
- debt model
- receipt strategy
- mobile POS state model
- product-recognition rules

What must be decided at product level:
- whether split payment is mandatory at launch of the redesign
- how debt is intentionally created
- how payment methods are grouped and labeled
- whether printing is immediate, deferred, or out of scope
- what counts as a “complete” post-sale state

What must be decided at UX level:
- cart vs checkout state transitions
- mobile bottom-sheet and fullscreen rules
- payment completeness indicators
- visible-disabled vs hidden permission behavior
- long-name and similar-product display priorities

What must be validated with real cashier workflows:
- wrong-account risk
- accidental debt creation
- lookalike product selection
- mobile cart-to-checkout transition
- readability at working distance
- touch accuracy in dense product grids

What is a hard blocker:
- lack of authoritative baseline
- unresolved split-payment product contract
- unresolved debt semantics
- unresolved receipt closure strategy

What is important but not blocking:
- token cleanup
- sidebar relocation
- visual rhythm standardization
- unified empty/loading/error patterns

What is optional optimization:
- thumbnail vs text product toggle
- extra keyboard shortcuts
- additional micro-interactions
- deeper visual polish

What should be treated as non-negotiable for a professional POS:
- explicit payment completeness
- clear debt intent
- safe recovery from errors
- a defined receipt path
- reliable product recognition under pressure
- stable acceptance criteria

## Final Verdict

Overall readiness level: **Low for implementation, high for further product and UX definition**.

This is **not ready for implementation review as a coding brief**. It first needs product and UX clarification because the redesign brief currently mixes visual-system work with unresolved workflow rules.

Top priorities that must be resolved before any coding begins:
1. Decide the authoritative baseline.
2. Ratify the payment, debt, and receipt model.
3. Define product-recognition requirements for Arabic retail reality.
4. Define the mobile POS state model.
5. Reconcile redesign acceptance criteria with the current tests and documentation.

## Analysis Execution Log

Tools used:
- local repository search and file inspection
- current POS, store, API, CSS, middleware, and test review
- documentation and tracker review
- local dev server startup on `3001`
- headless Playwright attempts from terminal
- multi-agent delegated analysis

Skills used:
- No listed skill cleanly matched this audit; direct repository analysis was used instead.

Agents or sub-agents used:
- `pos_checkout_audit`: reconstructed current checkout/payment behavior and payment-model gaps.
- `product_discovery_audit`: analyzed search, category access, Arabic recognition, and quick-add risks.
- `docs_alignment_audit`: reconciled redesign brief vs tracker/docs/tests and identified governance contradictions.
- `responsive_a11y_audit`: analyzed current vs proposed responsive and accessibility implications.

Connected sources used:
- Local repository only.
- Key sources included [EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md), [components/pos/pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx), [stores/pos-cart.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/stores/pos-cart.ts), [app/globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css), [components/dashboard/dashboard-shell.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/dashboard/dashboard-shell.tsx), [aya-mobile-documentation/03_UI_UX_Sitemap.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/03_UI_UX_Sitemap.md), [aya-mobile-documentation/04_Core_Flows.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/04_Core_Flows.md), [aya-mobile-documentation/09_Implementation_Plan.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/09_Implementation_Plan.md), [aya-mobile-documentation/27_PreBuild_Verification_Matrix.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/27_PreBuild_Verification_Matrix.md), [aya-mobile-documentation/29_Device_Browser_Policy.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/29_Device_Browser_Policy.md), [aya-mobile-documentation/31_Execution_Live_Tracker.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/31_Execution_Live_Tracker.md), and the suites under [tests/e2e](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/tests/e2e).

Temporary rubric created:
- outside-in journey audit: before sale, browsing, selection, cart, checkout, payment, post-sale, failure and recovery
- inside-out systems audit: states, logic dependencies, missing requirements, operational edge cases, acceptance contradictions

What each contributed:
- code files established real current behavior
- docs established intended product contract and prior acceptance claims
- tests showed what is actually proven vs only described
- agents accelerated deep comparison across payment, discovery, documentation, and responsive tracks

What was unavailable:
- no actual screenshot file was provided in the thread
- no Figma or dedicated design-review connector was available

Where uncertainty remains:
- the referenced “current payment issue visible in the screenshot” could not be verified from a provided screenshot, because no screenshot asset was attached
- live authenticated visual walkthroughs were attempted on a separate local server, but the automation environment did not complete the login transition reliably enough to treat that as verified evidence
- final payment-chip taxonomy and split-payment business rules remain unresolved
- it is still not formally verified whether the new redesign brief supersedes the previously accepted frontend redesign wave

---

## الملخص التنفيذي

الحكم العام: اتجاه إعادة التصميم **سليم جزئيًا لكنه يحمل مخاطر بنيوية**.

هو سليم لأنه يستهدف المشكلات الصحيحة: سلوك RTL أصيل، design system موحدة، هرمية أوضح للأسطح البيعية، تقليل للفوضى البصرية، ونموذج ذهني أقوى للكاشير. وهو محفوف بالمخاطر لأن المواد المرجعية **غير منسجمة داخليًا**. حزمة التوثيق الرسمية تقول إن موجة إعادة التصميم الأمامية أُغلقت وقُبلت، بينما الموجّه الجديد يعيد فتح قرارات أساسية في الـ shell والـ POS والاستجابة ونظام التصميم كما لو أنها ما زالت غير محسومة. راجع [EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md)، و[31_Execution_Live_Tracker.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/31_Execution_Live_Tracker.md)، و[27_PreBuild_Verification_Matrix.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/27_PreBuild_Verification_Matrix.md).

مشكلة طريقة الدفع الحالية **تُحل جزئيًا فقط**، لا بالكامل. استبدال قائمة الحسابات بشرائح دفع أوضح يفيد، والدفع المجزأ يسد فجوة حقيقية، لكن ما يزال هناك غموض في دلالات الدين، ووضوح الرسوم، وإغلاق الرحلة بعد البيع، وقواعد توزيع الدفعات. الـ checkout الحالي ما يزال أحادي الحساب في [pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L844) و[pos-cart.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/stores/pos-cart.ts#L61)، بينما brief التصميم الجديد يفترض checkout state صريحة وسلوك multi-payment في [EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md#L399) و[EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md#L489).

المقترح **غير جاهز للتنفيذ**. ما يزال يحتاج إلى توضيح كبير على مستوى المنتج والـ UX قبل أي برمجة.

## تفسير النظام حسب الدور

`الكاشير`
النموذج الذهني المقصود هو: أبحث بسرعة، أتعرف على المنتج الصحيح بسرعة، أضيف البنود دون تردد، أراجع سلة مضغوطة وواضحة، أنتقل إلى دفع مركز وواضح، أختار طريقة الدفع بلا غموض، أؤكد مرة واحدة، أحصل على إغلاق واضح بعد البيع، ثم أبدأ بيعًا جديدًا فورًا.

هذا النموذج ينكسر حاليًا في ثلاث نقاط:
- الدفع ما يزال عامًا وأحادي الحساب في الغالب
- إنشاء الدين ضمني لا صريح
- التعرف على المنتجات العربية المتشابهة غير معرف بما يكفي

`مشغل الفرع`
النموذج الذهني المقصود هو: استخدام shell هادئة ومجمعة، والتنقل بين التشغيل اليومي والمنتجات والفواتير والديون والمخزون بلا ارتباك في الدور، مع الثقة بأن الأسطح عالية التكرار سريعة ومنخفضة المخاطر.

هذا النموذج ينكسر لأن المواد تختلف حول ما هو “مكتمل” فعلًا. بعض عناصر إعادة التصميم Presentation فقط، وبعضها الآخر يغير السلوك نفسه.

`المشرف/الإداري`
النموذج الذهني المقصود هو: إدارة الصلاحيات وبنية الكتالوج والتقارير والإعدادات مع الحفاظ على Blind POS وسلامة القيود المالية.

هذا النموذج ينكسر لأن سلوك طريقة الدفع، والتعامل مع الإيصال، والدفع المجزأ، ومنطق الدين لم يُحسم كقرارات منتج نهائية بعد.

## إعادة بناء الرؤية المقصودة للنظام

الفريق يحاول بناء **نظام تشغيل تجاري عربي RTL للكاشير السريع** يبدو أكثر انضباطًا واحترافًا وقابلية للتوسع من الواجهة الحالية. الفلسفة ليست تجميلًا فقط. هي فرض نظام منتج أوضح: هرمية أوضح، أفعال أقل تتنافس على الانتباه، حالات أكثر ثباتًا، وفصل أوضح بين الأسطح البيعية والتشغيلية والتحليلية والإعدادية.

الداشبورد مقصودة أن تصبح shell مجمعة حسب الدور، بواجهة يمينية، وسياق صفحة أوضح، وأنماط موحدة. والـ POS مقصودة أن تصبح سطح تنفيذ مباشر: المنتجات تبقى أساسية، السلة تبقى حاضرة، الدفع يصبح مرحلة صريحة، وما بعد البيع يصبح واضحًا.

السلوك المقصود:
- `Dashboard`: تنقل مجمّع، RTL أصيل، shortcuts حسب الدور، وأسـطح تحليل وإعداد أهدأ.
- `POS desktop`: تخطيط 3 أعمدة، المنتجات هي المساحة الأساسية، والسلة/الدفع في لوحة جانبية مخصصة.
- `POS tablet`: كثافة أقل في الـ shell وراحة لمس أعلى، مع انتقال غالبًا من عمودين إلى عمود واحد.
- `POS mobile`: شاشة منتجات أولًا، وسلة على شكل drawer أو bottom sheet، ثم حالة دفع موسعة ومركزة.
- `Cart mode`: تعديل البنود والكميات والأخطاء بسرعة، مع ملخص قصير وزر رئيسي للانتقال إلى الدفع.
- `Checkout mode`: تفاعل يبدأ من الدفع، ثم العميل اختياريًا، والخصم، والملاحظات، والتأكيد، وحالات التنفيذ.
- `Post-sale completion`: نجاح واضح، رقم فاتورة، إغلاق واضح للدفع، وعلى الأرجح طباعة أو إيصال، ثم طريق واضح إلى “بيع جديد”.

قبل البيع، النظام متوقع أن يساعد الكاشير على الوصول إلى المنتج الصحيح بسرعة. أثناء البيع، يجب أن يقلل غموض الحالات والدفع. بعد البيع، يجب أن يغلق الحلقة بوضوح ويعيد التهيئة بأمان للعميل التالي.

## تحليل نية الاتجاه البصري ونظام التصميم

الاتجاه البصري المقصود هو **واجهة تشغيلية مضيئة فقط** مع زوايا أصغر، وظلال أخف، ومسافات أكثر انضباطًا، وsemantic tokens واضحة. الخط المعتمد هو `Tajawal`، مع `14px` للنص العام و`15px` في الـ POS. المسافات تتحول إلى نظام 4/8/12/16/24/32/48. الزوايا تصبح `6/8/12`. وعناصر التحكم تُوحَّد حول `44px`.

نظام الألوان يحاول أن يفصل بوضوح بين:
- الفعل الرئيسي
- النجاح والتحذير والخطر
- الأسطح والحدود المحايدة
- الإبراز المعلوماتي

هذا الاتجاه يخدم التشغيل، لا التجميل فقط:
- زر رئيسي واحد لكل مساحة
- labels فوق الحقول
- أنماط موحدة للحالات الفارغة والتحميل والخطأ والتأكيد
- badges لا تعتمد على اللون وحده
- إشارة Offline واضحة
- منطق أوضح للعناصر المعطلة بسبب الصلاحيات

النية جيدة. المشكلة ليست في النية بل في التعارض مع الـ baseline الحالي في بعض النقاط. المثال الأوضح هو الـ dark mode: الكود والاختبارات الحالية ما تزال تدعمه في [globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css#L1) و[px18-visual-accessibility.spec.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/tests/e2e/px18-visual-accessibility.spec.ts#L116)، بينما brief التصميم الجديد يعلن light-only في [EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md#L57).

## تحليل المواءمة

| المجال الرئيسي | التوافق | التعارض | النقص | الافتراضات المخفية | التناقضات غير المحلولة |
|---|---|---|---|---|---|
| الـ shell والتنقل | توافق قوي حول shell مجمّعة، حسب الدور، وRTL أصيلة | brief الجديد يعامل الأساس كأنه غير منفذ بينما الـ tracker يقول إنه مكتمل | سلوك desktop/tablet/mobile موصوف جزئيًا فقط | نقل الـ sidebar لليمين سيحسن الوضوح دون تغيير authority | “إعادة التصميم مكتملة” مقابل “أعد بناء الـ shell الآن” |
| بنية الداشبورد | توافق على أسطح أهدأ ومجمعة | الحالة الحالية المقبولة تدعي أصلًا أن هذا تحقق | سلوك shell على مستوى المنتج لم يُعاد تثبيته | الهدوء البصري يعني أمانًا تشغيليًا | حالة القبول غير واضحة |
| تخطيط الـ POS | توافق قوي على تقليل الفوضى ورفع السرعة | الـ POS الحالي ما يزال لوحة واحدة؛ الجديد يريد حالتي سلة/دفع واضحتين | قواعد الانتقال وحفظ الحالة غير مكتملة | فصل الحالات سيقلل الارتباك تلقائيًا | لا يوجد إثبات أن النموذج الجديد أبسط على الهاتف |
| اختيار طريقة الدفع | توافق على ضعف الواجهة الحالية | الواجهة الحالية أحادية الحساب، بينما الـ backend والوثائق يدعمان المتعدد | taxonomy الطرق، ووضوح الرسوم، ودلالات الدين ناقصة | شرائح الدفع وحدها تكفي للحل | هي تحسن الوضوح لكنها لا تكمل نموذج الدفع |
| الدفع المجزأ | توافق على أهميته | الواجهة الحالية لا تدعمه أصلًا | قواعد التوزيع والزيادة وإرشاد الكاشير ناقصة | دعم الـ backend يعني أن الـ UX سهلة | تعقيد الـ UX هو المشكلة الحقيقية |
| تصفح المنتجات | توافق على البحث السريع والوصول السهل | نموذج التصفح الحالي أبسط وأضعف من طموح brief الجديد | لا subcategories، ولا تطبيع بحث عربي، ولا ranking | تحسين التخطيط سيحل التعرف على المنتجات | التعرف مشكلة دلالية لا بصرية فقط |
| الـ POS على الموبايل | توافق على أهمية الهاتف | الاختبارات الحالية تفترض checkout مرئية مباشرة؛ التصميم الجديد ينقلها إلى حالات طبقية | سلوك الـ bottom sheet والاستعادة غير مفصل | الـ bottom sheet سيحسن الهاتف تلقائيًا | قد يقلل الفوضى لكنه يرفع غموض الحالات |
| إمكانية الوصول | توافق على focus و44px وbadges semantic | Light-only يتعارض مع baseline الحالي الذي ما يزال يختبر dark mode | القراءة من مسافة العمل لم تُثبت بشكل كاف | تصغير الخط سيظل مناسبًا للكاشير | “Pass” الحالي لا يثبت صلاحية التصميم الجديد |
| ما بعد البيع | توافق على أن النجاح يجب أن يكون أقوى | حالة النجاح الحالية ما تزال ضعيفة، والجديد يفترض إغلاقًا جاهزًا للطباعة | استراتيجية الإيصال غير محسومة | عرض رقم الفاتورة يكفي كإغلاق | لا يكفي فعليًا في بيئة متجر |

## الجرد الشامل للمشكلات والتعقيدات

| عنوان المشكلة | الوصف | لماذا تهم | الشدة | النوع | أثر المرحلة | حالة الدليل | النتيجة المرجحة إذا أُهملت |
|---|---|---|---|---|---|---|---|
| تضارب baseline السلطوية | الـ tracker والتوثيق يقولان إن إعادة التصميم منجزة، بينما brief الجديد يعيد فتح الأساس | قد تبني الفرق على حقائق مختلفة | Critical | Product / Governance / Risk | قبل التفاعل | Explicitly stated | إعادة عمل ونزاعات قبول |
| غياب الدفع المجزأ من الواجهة الحالية | الـ backend والوثائق والـ UAT تدعم تعدد الدفعات، لكن الواجهة ترسل صفًا واحدًا فقط | سيناريو دفع موثق غير قابل للتنفيذ | Critical | Product / Logic / Workflow | أثناء الدفع | Explicitly stated | بقاء فجوة تشغيلية أساسية |
| استمرار حساب دفع واحد بين المبيعات | الحساب المختار يبقى محفوظًا وقد يُعاد استخدامه بصمت | قد يُستخدم حساب خاطئ في البيع التالي | High | UX / Operational / Risk | أثناء الدفع | Explicitly stated | ترحيل الدفع إلى الحساب الخطأ |
| إنشاء الدين ضمنيًا | نقص المبلغ مع اختيار عميل يخلق دينًا دون mode صريح | قد ينشأ دين غير مقصود | Critical | Product / Logic / Workflow | أثناء الدفع / بعد البيع | Explicitly stated | أخطاء دين وارتباك للكاشير |
| غياب مفهوم صريح للمبلغ المتبقي | زر التأكيد لا يُبنى على حالة مرئية وواضحة لـ “المتبقي للسداد” | الـ checkout تبدو مكتملة قبل أن تكتمل منطقيًا | High | UX / State | أثناء الدفع | Explicitly stated | تأكيد دفع غامض |
| غموض الطرق ذات الرسوم | الحسابات تحتوي رسومًا، لكن الواجهة لا تعرض أثرها بوضوح | اختيار طريقة الدفع يصبح غير واعٍ ماليًا | High | Product / Operational | أثناء الدفع | Explicitly stated | اختيار طريقة غير مناسبة |
| taxonomy طرق الدفع غير مرسّمة | cash/card/CliQ/wallet/bank غير محولة إلى نموذج UI نهائي | قد لا تطابق التسميات ما يحدث فعليًا | High | Product / IA / Logic | أثناء الدفع | Inferred | غموض في سلوك الطرق |
| استراتيجية الإيصال غير محسومة | التصميم الجديد يفترض طباعة أو إيصالًا، بينما baseline الحالية تؤجل ذلك | نجاح البيع لا يغلق الرحلة تشغيليًا | High | Business Requirement / Workflow | بعد البيع | Explicitly stated | تردد بعد البيع |
| overlay النجاح ما يزال ضعيفًا | شاشة النجاح الحالية بلا breakdown للدفع ولا CTA إيصال | نجاح العملية لا يساوي اكتمال workflow | High | UX / Workflow | بعد البيع | Explicitly stated | hesitation على أرض المتجر |
| حقل الملاحظات أعلى من قيمته | الملاحظات تأخذ انتباهًا بصريًا أكبر من أهميتها الحقيقية | تنافس حقول الدفع الحرجة | Medium | UX / Workflow | أثناء checkout | Implied | إبطاء المسح البصري |
| قواعد إظهار الصلاحيات غير مكتملة | بعض العناصر يفترض أن تظهر disabled وبعضها hidden | يحتاج المشغل إلى منطق ثابت | Medium | Product / IA / Permission | قبل التفاعل / أثناء الدفع | Implied | ارتباك في ما هو متاح |
| نموذج التعافي بعد Offline غير مكتمل | منع الكتابة أوفلاين واضح، لكن التعافي والـ retry والاستمرارية غير مكتملة | الفشل جزء من جودة الـ POS | High | Operational / Failure / State | سيناريوهات الفشل والاستعادة | Explicitly stated | تعافٍ بطيء أو غير آمن |
| السلال المعلقة تحمل سياقًا قديمًا | استعادة السلة تعيد الحساب والعميل والمبلغ أيضًا | قد يتسرب سياق قديم إلى بيع جديد | Medium | Workflow / Risk | أثناء السلة / أثناء الدفع | Explicitly stated | تلوث السياق |
| وجود طبقة فئات واحدة فقط | الـ POS الحالية تعرض طبقة فئات واحدة فقط دون عمق | كتالوج الإكسسوارات يحتاج عمقًا أكبر | High | IA / Workflow / Scalability | أثناء التصفح | Explicitly stated | بطء الوصول للمنتج |
| غياب governance للفئات الفرعية | لا قواعد واضحة لبنية تصنيف أعمق | الوصول للفئات يظل ضحلًا | High | IA / Scalability | أثناء التصفح | Not specified in the provided materials | ضعف كفاءة التصفح |
| تطبيع البحث العربي ضعيف | “التطبيع” الحالي يكاد يكون lowercase + trim فقط | لا يعالج اختلافات الكتابة العربية الشائعة | High | UX / Accessibility / Risk | أثناء التصفح | Explicitly stated | فوات نتائج البحث |
| عدم اتساق labels الفئات | الـ POS تعرض قيم الفئات الخام، بينما الإدارة تعرض labels عربية | IA تبدو غير مكتملة | Medium | UX / IA | أثناء التصفح | Explicitly stated | انخفاض ثقة المشغل |
| Governance الـ quick-add بدائية | quick-add عامة وثابتة وضعيفة التأطير | سريعة لكنها غير ذكية استراتيجيًا | Medium | Product / Workflow | قبل التفاعل / أثناء التصفح | Explicitly stated | اختصارات قديمة أو مضللة |
| الأسماء العربية الطويلة غير محلولة | البطاقات الحالية مزعجة، والـ clamp الجديد قد يخفي الفارق المهم | استقرار التخطيط قد يصطدم بأمان التعرف | High | UX / Operational | أثناء اختيار المنتج | Inferred | زيادة اختيار المنتج الخاطئ |
| غياب تمييز المنتجات المتشابهة | لا توجد استراتيجية واضحة لإظهار brand/model/capacity/color | الهواتف والإكسسوارات قد تختلف بلاحقة واحدة | High | UX / Operational | أثناء اختيار المنتج | Inferred | أخطاء متكررة للكاشير |
| خطر حالات الـ bottom sheet على الموبايل | bottom sheet + fullscreen checkout يضيفان طبقات حالة جديدة | التراكب يغير قواعد الاستعادة والرؤية | High | Responsive / State / Workflow | أثناء الدفع / الفشل | Implied | غموض حالات على الهاتف |
| خطر تراكب الطبقات | drawer وbottom sheet وdialogs وsearch results وtoasts قد تتراكب | أولوية الطبقات يجب أن تكون محسومة | High | State / Responsive | أثناء الدفع / الفشل | Inferred | عناصر مخفية وفشل في الاستعادة |
| safe-area غير محددة | الـ bottom bar والـ sheet المقترحتان لا تحددان معالجة safe area | الهواتف ذات النتوء قد تقترب فيها العناصر الحرجة من الحافة | Medium | Responsive / Risk | أثناء الدفع | Not specified in the provided materials | ضعف موثوقية اللمس |
| انجراف الشِل عن الاختبارات | تنفيذ الشِل الحالي لا يطابق تمامًا توقعات الاختبارات والـ shell السابقة | الثقة في الوصول والتنقل مبالغ فيها | Medium | UX / Accessibility / Governance | قبل التفاعل | Explicitly stated | ثقة زائفة من اختبارات قديمة |
| تعارض Light-only مع dark mode | brief الجديد يمنع dark mode بينما baseline الحالية ما تزال تختبره | معايير القبول غير مستقرة | Medium | Product / Accessibility / Governance | قبل التفاعل | Explicitly stated | تضارب في المراجعة والقبول |
| قواعد touch targets غير مكتملة للتصفح الكثيف | منطق 44px واضح لبعض العناصر، لا لكل عناصر التصفح | اختيار المنتج يعتمد على لمس موثوق | Medium | Accessibility / Responsive | أثناء التصفح / اختيار المنتج | Ambiguous | زيادة أخطاء النقر |
| نطاق اختصارات الكيبورد غير واضح | التصميم الجديد يضيف shortcuts لكن نطاقها وتصادمها غير محسومين | التابلت والأجهزة الهجينة تحتاج سلوكًا ثابتًا | Low | Workflow / Accessibility | أثناء التصفح / checkout | Not specified in the provided materials | تفاعل غير متسق |
| مخاطرة middleware الخاصة بالجهاز | سياسة دعم الأجهزة تضيف طبقة اعتماد إضافية | قد تُمنع جلسات صالحة بسبب تصنيف خاطئ | Low | Operational / Risk | قبل التفاعل | Explicitly stated | redirects خاطئة إلى unsupported-device |
| الاختبارات الحالية أضعف من التعقيد الجديد | الاختبارات الحالية تثبت visibility وoverflow أكثر من تدفق الحالات الطبقية الجديد | تعقيد الموبايل والـ POS الجديد غير مغطى بما يكفي | High | Risk / Workflow / Responsive | قبل التفاعل / الفشل | Explicitly stated | شحن regressions مخفية على أنها “Pass” |

## التحليل العميق لمرحلة الدفع في الـ POS

حالة الدفع المقترحة **ليست مكتملة تشغيليًا**.

الحالة الحالية:
- لوحة واحدة تجمع السلة والـ checkout
- حساب دفع واحد مختار
- بحث عميل اختياري
- خصم فاتورة اختياري
- مساعد للمبلغ المستلم نقدًا
- ملاحظات
- زر تأكيد واحد
- صلابة تقنية جيدة ضد التكرار والـ offline

السلوك الحالي واضح في [pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L844) و[pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L938) و[pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L1018) و[app/api/sales/route.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/api/sales/route.ts#L61).

الحكم التفصيلي:
- `الدفع يبدأ من اختيار الطريقة أم لا`: لا يجب اختيار الطريقة قبل بناء السلة، لكن داخل checkout يجب أن تصبح طريقة الدفع القرار المنظم الأول.
- `تدفق النقد`: المساعد الحالي جيد، لكن أثر نقص المبلغ والدين غير واضحين بما يكفي.
- `تدفق البطاقة`: التدفق الحالي عام أكثر من اللازم؛ لا يُظهر الرسوم ولا خصائص الطريقة.
- `تدفق CliQ`: Ambiguous. التصميم الجديد يسميه، لكن السلوك الحالي لا يعرفه كمسار مستقل.
- `الدفع المجزأ`: متطلب أساسي، لا تحسين ثانوي. الـ backend والوثائق تفترضانه أصلًا.
- `المبلغ المستلم / الباقي`: منطق الكاش جيد حاليًا، لكن قواعد الزيادة والتوزيع في الدفع المجزأ غير موجودة.
- `اختيار العميل اختياريًا`: بصريًا نعم، منطقيًا لا إذا كان يغير هل سينشأ دين.
- `مكان الخصم`: مقبول داخل checkout بشرط بقاء حدود الصلاحية وأثرها على الإجمالي واضحين.
- `رؤية الصلاحيات`: اتجاه brief الجديد أفضل، لكنه غير مكتمل كقاعدة منتج عامة.
- `أهمية الملاحظات`: أعلى من اللازم قياسًا إلى سرعة الـ POS.
- `سلوك تأكيد البيع`: قوي تقنيًا ضد التكرار، أضعف ضد غموض نية الكاشير.
- `حالة التنفيذ`: جيدة نسبيًا.
- `حالة النجاح`: أقوى من قبل، لكنها ما تزال غير مكتملة.
- `توقع الطباعة/الإيصال`: قرار منتج غير محسوم بعد.

إجابات صريحة:
- Is the proposed checkout mode operationally complete? `لا`.
- Must payment method be selected first? `نعم داخل checkout، وليس قبل بناء السلة`.
- Is split payment a core requirement or a secondary enhancement? `متطلب أساسي`.
- What cashier mistakes are most likely? `اختيار حساب خاطئ، إنشاء دين غير مقصود، تأكيد دفع قبل اكتمال الفهم، استرجاع سلة بسياق قديم، واختيار منتج خاطئ بين عناصر متشابهة`.
- What is missing, ambiguous, or misplaced? `preview للدين، قواعد توزيع الدفع المجزأ، وضوح الرسوم، إغلاق الإيصال، taxonomy طرق الدفع، انتقالات الموبايل، أولوية الملاحظات، وخريطة visibility للصلاحيات`.

## تحليل تصفح المنتجات والوصول للفئات وسرعة الـ POS

تصفح الـ POS الحالي سريع تقنيًا، لكنه ليس قويًا بعد بما يكفي لبيئة عربية كثيفة الهواتف والإكسسوارات.

النموذج الحالي:
- المنتجات تُحمّل مسبقًا وتُفلتر محليًا
- البحث محلي وسريع
- الفئات مسطحة
- quick-add عامة ومباشرة لكنها بدائية
- بطاقات المنتجات ما تزال غنية بالمعلومات نسبيًا
- البحث يغطي `name` و`sku` فقط

راجع [use-products.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/hooks/use-products.ts) و[pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx#L153).

تشغيليًا:
- الوصول للفئات الرئيسية موجود
- الوصول للفئات الفرعية غير معرف
- التبديل بين الفئات سريع
- الوصول للمنتجات سريع
- التوازن الحالي يميل إلى search-first
- quick-add تساعد في السرعة لكنها غير مؤطرة جيدًا
- المنتجات المتشابهة بصريًا ما تزال خطرة
- الأسماء العربية الطويلة ما تزال غير محلولة
- الاستخدام المتكرر تحت الضغط مدعوم جزئيًا فقط
- دقة اللمس مغطاة جزئيًا
- القراءة من مسافة العمل ما تزال موضع قلق إذا زادت كثافة البطاقات وصغر الخط

الخلاصة: التصفح الحالي سريع، لكنه **ليس آمنًا بما يكفي من ناحية التعرف واتخاذ القرار** في كاونتر عربي حقيقي.

## تحليل الاستجابة والأجهزة

النموذج الحالي للاستجابة:
- desktop: shell بعمودين، مستقرة نسبيًا
- tablet: انهيار وتكدس أكثر من كونه نموذج POS مصممًا بعمق
- mobile: مدعوم وظيفيًا، لكنه ما يزال سطحًا متراصًا أكثر من كونه POS طبقية mobile-first

أدلة ذلك في [globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css#L1939) و[globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css#L2234) و[globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css#L2657) و[dashboard-shell.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/dashboard/dashboard-shell.tsx) و[29_Device_Browser_Policy.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/29_Device_Browser_Policy.md).

النموذج المقترح:
- desktop: 3 أعمدة في الـ POS مع شريط أيقونات
- tablet: عمودان ثم عمود واحد
- mobile: bottom bar وسلة على شكل bottom sheet ثم fullscreen checkout

أهم المخاطر:
- `desktop`: تقليص مساحة المنتجات قد يضعف تمييز العناصر العربية المتشابهة
- `tablet`: نطاق `768-1023px` يصبح الأكثر هشاشة لأن التصميم الجديد يضيف bottom-sheet وfullscreen transitions
- `mobile`: bottom bar + cart sheet + dialogs + offline bar + success states تتحول إلى نظام حالات طبقي
- `safe area`: غير محددة للـ bottom bar أو الـ sheet
- `cart-to-checkout transition`: drag والسحب والإغلاق والاستعادة غير محددة
- `التوافق الواقعي مع أجهزة المتجر`: “مدعوم على الهاتف” لا يعني “قوي تشغيليًا على الهاتف”

الخلاصة: التصميم الجديد أكثر قصدًا من الوضع الحالي، لكنه يدخل نموذج حالات أعقد لم يُثبت بعد بالعمق الكافي.

## تحليل نظام التصميم وإمكانية الوصول

اتجاه design system جيد عمومًا. هو يدفع نحو:
- tokens semantic
- أزرار وحقول وجداول وشارات وحوارات متسقة
- focus مرئي
- touch targets بحجم 44px
- معنى لا يعتمد على اللون وحده
- حالات تحميل وتعطيل أوضح

هذا مفيد تشغيليًا. السؤال في accessibility هنا ليس سؤال معايير عامة فقط، بل سؤال تشغيل حقيقي:
- هل يستطيع الكاشير القراءة وهو واقف؟
- هل يستطيع لمس الهدف بسرعة؟
- هل يفهم سبب تعطيل العنصر؟
- هل يستطيع التعافي عندما تتغير الحالة؟

النتائج العملية:
- `light-only theme`: ليست أفضل تلقائيًا. قد تكون مناسبة في المتاجر المضاءة، لكن الوهج والتباين يحتاجان إعادة تحقق لأن baseline الحالية ما تزال تدعم dark mode.
- `contrast assumptions`: الألوان أوضح semantic، لكن لا يمكن الاعتماد على dots أو chips الملونة وحدها.
- `typography scale`: `14px` عامًا و`15px` في الـ POS قد يظلان صغيرين لبعض metadata الحرجة.
- `Arabic line-height`: جيد نظريًا، لكن بطاقات المنتجات الكثيفة ما تزال تحتاج قواعد truncation أدق.
- `hover/focus visibility`: الاختبارات الحالية تثبت focus ظاهرًا في النظام الحالي، والاتجاه الجديد يحافظ على ذلك، وهذا جيد.
- `disabled/loading states`: يجب أن تبقى دلالتها مميزة؛ disabled بسبب الصلاحية ليست disabled بسبب عدم اكتمال الدفع.
- `input clarity`: labels فوق الحقول أفضل فعليًا من placeholders فقط.

الخلاصة: التصميم الجديد يحسن الاتساق، لكن إمكانية الوصول التشغيلية في ظروف كاشير حقيقية ما تزال مثبتة جزئيًا فقط.

## المتطلبات المفقودة والمخاطر الخفية

المناطق المفقودة أو غير المعرفة بما يكفي:
- المرجع السلطوي النهائي
- هل الدين mode صريح أم نتيجة نقص دفع
- taxonomy طرق الدفع وقواعد إظهار الرسوم
- منطق صفوف الدفع المجزأ وتوزيع الزيادة
- استراتيجية الإيصال بعد البيع
- قرار الطباعة أو المشاركة أو التأجيل
- التزامات شاشة النجاح
- نموذج التعافي والـ retry بعد الأخطاء
- قواعد الانتقال والإغلاق على الموبايل
- معالجة safe-area
- خريطة كاملة لإظهار/إخفاء عناصر الصلاحيات
- نطاق اختصارات الكيبورد وتصادمها
- metadata المطلوبة لتمييز المنتجات المتشابهة
- governance للفئات والفئات الفرعية
- auditability لنية الكاشير، لا مجرد ثبات المعاملة
- هل brief التصميم الجديد يعالج المشكلة الحالية فعلًا أم يوسّعها إلى إعادة تصميم أكبر من دون قرارات منتج كافية

## نقاط القوة والضعف والمخاطر والأسئلة المفتوحة

### نقاط القوة
- نية قوية نحو تصميم عربي RTL أصيل.
- مسار تنفيذ البيع الحالي متين نسبيًا في idempotency ومنع البيع أوفلاين ومعالجة تعارض المخزون.
- الفلترة المحلية تجعل سطح التصفح سريعًا.
- التصميم الجديد يعالج ألمًا تشغيليًا حقيقيًا، لا مجرد الشكل.

### نقاط الضعف
- المواد المرجعية غير متزامنة زمنيًا.
- واجهة الـ POS الحالية تعرض جزءًا فقط من نموذج الدفع الموثق.
- جودة التعرف على المنتجات ما تزال غير معرفة بما يكفي.
- تعقيد الموبايل الجديد أعلى من عمق الإثبات الحالي.

### المخاطر
- قد ينتج نظام أنظف بصريًا لكنه يحتفظ بغموض الدفع.
- قد يُضاف الدفع المجزأ شكليًا دون قواعد دين ورسوم راسخة.
- قد يخلق سلوك الـ bottom sheet ارتباكًا جديدًا.
- قد تظهر نزاعات قبول لأن الاختبارات والـ tracker وbrief التصميم غير متوافقة.

### الأسئلة المفتوحة
- ما المرجع السلطوي الآن؟
- هل الدين mode صريح داخل checkout أم نتيجة ضمنية لنقص الدفع؟
- هل الإيصال والطباعة مطلوبان فورًا من شاشة النجاح؟
- كيف يجب تحويل الحسابات الفعلية إلى شرائح دفع يراها الكاشير؟
- ما عمق taxonomy المطلوب لتصفح الهواتف والإكسسوارات؟
- ما الفوارق التي يجب أن تبقى مرئية في الأسماء العربية الطويلة والمنتجات المتشابهة؟

## توصيات على مستوى القرار قبل التنفيذ

ما يجب توضيحه قبل التنفيذ:
- مصدر الحقيقة السلطوي
- نموذج الدفع
- نموذج الدين
- استراتيجية الإيصال
- نموذج حالات الـ POS على الموبايل
- قواعد التعرف على المنتجات

ما يجب تقريره على مستوى المنتج:
- هل الدفع المجزأ إلزامي في أول نسخة من هذا الاتجاه
- كيف يُنشأ الدين عمدًا
- كيف تُجمَّع وتُسمّى طرق الدفع
- هل الطباعة فورية أم مؤجلة أم خارج النطاق
- ما الذي يجعل حالة ما بعد البيع “مكتملة”

ما يجب تقريره على مستوى الـ UX:
- انتقالات cart وcheckout
- قواعد bottom-sheet وfullscreen على الموبايل
- مؤشرات اكتمال الدفع
- منطق disabled-visible مقابل hidden
- أولويات عرض الأسماء الطويلة والمنتجات المتشابهة

ما يجب التحقق منه مع الكاشير الحقيقيين:
- خطر الحساب الخاطئ
- إنشاء الدين غير المقصود
- اختيار المنتجات المتشابهة
- الانتقال من السلة إلى الدفع على الهاتف
- القراءة من مسافة العمل
- دقة اللمس في product grids الكثيفة

ما هو blocker حقيقي:
- غياب baseline سلطوية نهائية
- عدم حسم عقد الدفع المجزأ
- عدم حسم دلالات الدين
- عدم حسم استراتيجية الإيصال

ما هو مهم لكنه غير حاجب:
- تنظيف الـ tokens
- نقل الـ sidebar
- توحيد الإيقاع البصري
- توحيد empty/loading/error patterns

ما هو تحسين اختياري:
- toggle بين thumbnail والنص
- اختصارات إضافية
- micro-interactions إضافية
- polishing بصري أعمق

ما يجب اعتباره غير قابل للتفاوض في POS احترافية:
- اكتمال الدفع بشكل صريح
- نية الدين الواضحة
- التعافي الآمن بعد الخطأ
- مسار إيصال محدد
- التعرف الموثوق على المنتج تحت الضغط
- معايير قبول ثابتة

## الحكم النهائي

مستوى الجاهزية العام: **منخفض للتنفيذ، مرتفع لمزيد من تعريف المنتج والـ UX**.

هذا **غير جاهز لمراجعة تنفيذية كـ coding brief**. يجب أولًا توضيحه على مستوى المنتج والـ UX، لأن brief التصميم الحالية تخلط بين إعادة بناء design system وبين قواعد workflow ما تزال غير محسومة.

الأولويات العليا التي يجب حسمها قبل أي كود:
1. تحديد baseline السلطوية.
2. تثبيت نموذج الدفع والدين والإيصال.
3. تعريف متطلبات التعرف على المنتج لواقع البيع العربي.
4. تعريف نموذج حالات الـ POS على الموبايل.
5. توحيد معايير القبول بين brief الجديدة والاختبارات والتوثيق الحالي.

## سجل تنفيذ التحليل

الأدوات المستخدمة:
- البحث في المستودع وقراءة الملفات محليًا
- مراجعة ملفات الـ POS والـ store والـ API والـ CSS والـ middleware والاختبارات
- مراجعة التوثيق والـ tracker
- تشغيل خادم محلي على `3001`
- محاولات Playwright headless من الطرفية
- تحليل مفوض عبر وكلاء متعددة

المهارات المستخدمة:
- لم توجد skill مدرجة تطابق هذا التدقيق مباشرة، لذا تم الاعتماد على تحليل المستودع نفسه.

الوكلاء المستخدمون:
- `pos_checkout_audit`: أعاد بناء سلوك الدفع الحالي وفجوات نموذج الدفع.
- `product_discovery_audit`: حلل البحث والوصول للفئات والتعرف على المنتجات ومخاطر quick-add.
- `docs_alignment_audit`: وازن بين brief التصميم الجديدة والـ tracker والتوثيق والاختبارات وحدد تناقضات governance.
- `responsive_a11y_audit`: حلل الاستجابة الحالية والمقترحة ومخاطر الوصول.

المصادر المستخدمة:
- المستودع المحلي فقط.
- من أهم المصادر [EXECUTOR_PROMPT_UI_REDESIGN.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/EXECUTOR_PROMPT_UI_REDESIGN.md)، و[components/pos/pos-workspace.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/pos/pos-workspace.tsx)، و[stores/pos-cart.ts](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/stores/pos-cart.ts)، و[app/globals.css](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/app/globals.css)، و[components/dashboard/dashboard-shell.tsx](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/components/dashboard/dashboard-shell.tsx)، و[aya-mobile-documentation/03_UI_UX_Sitemap.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/03_UI_UX_Sitemap.md)، و[aya-mobile-documentation/04_Core_Flows.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/04_Core_Flows.md)، و[aya-mobile-documentation/09_Implementation_Plan.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/09_Implementation_Plan.md)، و[aya-mobile-documentation/27_PreBuild_Verification_Matrix.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/27_PreBuild_Verification_Matrix.md)، و[aya-mobile-documentation/29_Device_Browser_Policy.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/29_Device_Browser_Policy.md)، و[aya-mobile-documentation/31_Execution_Live_Tracker.md](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/aya-mobile-documentation/31_Execution_Live_Tracker.md)، واختبارات [tests/e2e](/c:/Users/Qaysk/OneDrive/Desktop/Aya Mobile/tests/e2e).

الـ rubric المؤقت المستخدم:
- Outside-in: قبل البيع، التصفح، الاختيار، السلة، checkout، الدفع، ما بعد البيع، الفشل والاستعادة.
- Inside-out: الحالات، التبعيات المنطقية، المتطلبات الناقصة، edge cases التشغيلية، وتناقضات القبول.

ماذا ساهم به كل مصدر:
- الكود أثبت السلوك الحالي الحقيقي.
- الوثائق أثبتت عقد المنتج وادعاءات القبول السابقة.
- الاختبارات بيّنت ما هو مثبت فعلًا وما هو مجرد توصيف.
- الوكلاء سرّعوا المقارنة العميقة عبر مسارات الدفع، والتصفح، والوثائق، والاستجابة.

ما الذي لم يكن متاحًا:
- لم تُرفق لقطة شاشة فعلية داخل المحادثة.
- لم يتوفر Figma أو connector مخصص لمراجعة التصميم.

أين بقي عدم اليقين:
- “مشكلة الدفع الحالية الظاهرة في اللقطة” لم يمكن التحقق منها من لقطة فعلية لأن أي ملف screenshot لم يكن مرفقًا.
- تمّت محاولة walkthrough حي بعد تسجيل الدخول على خادم محلي منفصل، لكن بيئة الأتمتة لم تُكمل انتقال login بشكل موثوق بما يكفي لاعتماده كدليل نهائي.
- taxonomy النهائية لشرائح الدفع وقواعد العمل الخاصة بالدفع المجزأ ما تزال غير محسومة.
- لم يُثبت رسميًا بعد ما إذا كانت brief التصميم الجديدة تنسخ موجة الـ frontend redesign المقبولة سابقًا أم لا.
