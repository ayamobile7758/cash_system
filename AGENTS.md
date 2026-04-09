# ملخص عربي سريع:
# هذا الملف يحكم Codex. دوره: منفذ فقط.
# الجزء الأول ثابت (القواعد والتعليمات) — لا يُمسح أبداً.
# الجزء الثاني (TASK ZONE) فيه المهمة الحالية — يُستبدل مع كل مهمة جديدة.
#

# AGENTS.md — Codex Governance File
# ... (first 1673 lines unchanged) ...

---

# ═════════════════════════════════════════════════════════════
# PHASE 2: RESTRUCTURING — PRE-WAVE PREPARATION
# ═════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# ► CURRENT TASK ◄  RESTRUCTURE_PLAN Enhancement & Comprehensive Audit
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-09-RESTRUCTURE-ENHANCE
TASK_TYPE      : review + enhancement
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Develop 5 missing specifications + audit for Wave 1 readiness
DEPENDS_ON     : RESTRUCTURE_PLAN.md v2, Gemini assessment (85% ready)
```

GOAL :
  Enhance RESTRUCTURE_PLAN.md by:
  1. **Developing 5 missing specifications** (prerequisites for Wave 1)
  2. **Comprehensive audit** of 8 areas for additional improvements
  3. **Final readiness check** before implementation starts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 1: DEVELOP THE 5 MISSING SPECS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**SPEC 1: Bottom Sheet Component Definition**
  Create file: `ai-system/BOTTOM_SHEET_SPEC.md`
  
  Content:
    - Component name and purpose: <MobileBottomSheet> for secondary content on mobile
    - When to use: Tablet/mobile (≤1199px) when secondary column needed
    - Props: content (ReactNode), isOpen (bool), onClose (callback), height (default 70vh)
    - Behavior spec:
      * Opens with slide-up animation (0.3s ease-out)
      * Closes on: swipe-down gesture, backdrop click, ESC key
      * Focus trap: yes (keyboard stays inside)
      * Z-index: var(--z-dialog)
      * RTL: use inset-inline-start/end (not left/right)
    - CSS pattern:
      @media (max-width: 1199px) {
        .two-column-layout { grid-template-columns: 1fr; }
        .secondary-column { display: none; }
        .secondary-column.is-open { /* sheet styles */ }
      }
    - Usage examples in 3 screens: Inventory (detail), Suppliers (purchase), Maintenance (job)
    - Accessibility: aria-modal="true", focus-visible on close button, prefers-reduced-motion

**SPEC 2: Accessibility Requirements (Complete Audit)**
  File: Create `ai-system/ACCESSIBILITY_AUDIT.md`
  
  Baseline requirements (map to Waves):
    1. Focus indicators: All interactive elements must have visible :focus-visible (3px ring)
       → Wave 0 (already done in Shell)
       → Wave 2+ (check all new interactive elements)
    
    2. Keyboard navigation: Tab order logical (top-to-bottom, left-to-right in RTL)
       → Wave 1 (Settings tabs, Reports tabs)
       → Wave 2+ (all new tabs/splits)
    
    3. Screen reader labels: All toggles, buttons, tabs, custom controls need aria-label
       → Each Wave: audit JSX for missing labels
    
    4. Motion preferences: Respect prefers-reduced-motion (no animations on ::before)
       → Wave 5 (polish pass)
    
    5. Color contrast: All text WCAG AA minimum (4.5:1 body, 3:1 large)
       → Done (token colors already pass)
  
  Audit checklist per Wave:
    Wave 1: Tab focus + keyboard nav (tabindex management)
    Wave 2: Two-column split focus trap (similar to popover)
    Wave 3: Bottom sheets + accordions focus management
    Wave 4: Light interaction refinements
    Wave 5: Full a11y polish (contrast check, motion check)

**SPEC 3: Invoices Filter Enhancement Plan**
  Add to RESTRUCTURE_PLAN.md § Screen Plans (after Reports)
  
  Problem: Invoice list has no filters (Problem #12 from PROTOTYPE_SPEC)
  
  Solution (Wave 4.x — 4 hours):
    - Add sticky filter header above invoice list
    - Filter chip row with 3 filters:
      1. Status chip: نشطة / مرتجعة / ملغاة / الكل (multi-select)
      2. Date range: last 7d / 30d / 90d / custom picker
      3. Amount range: optional toggle for min-max filter
    - Selected filters show as dismissible chips below
    - "Clear all filters" button
    - No API changes (filtering happens client-side from loaded data)
  
  Content mapping:
    - Filters appear in .invoices-page__filters (new, sticky)
    - List remains .invoices-page__list
    - Each chip uses --color-border and --color-bg-muted
  
  RTL: filter chips inset-inline-start

**SPEC 4: Shared CSS Scoping Rules for .operational-* Patterns**
  Add section to RESTRUCTURE_PLAN.md § CSS Architecture Rules
  
  Problem: .operational-* selectors (layout, list-card, sidebar) used across
           4 screens (Inventory, Suppliers, Maintenance, Operations)
           Changes to one affect all
  
  Solution: Scope by screen parent
    ✅ GOOD:
       .inventory-page .operational-list-card { ... }
       .suppliers-page .operational-sidebar { ... }
    
    ❌ BAD (shared across all 4 unintentionally):
       .operational-list-card { ... }
  
  Rules for all restructures:
    1. If .operational-* used in multiple screens → add .screen-page parent selector
    2. If --color-* token used → OK to keep unscoped (shared token)
    3. If layout/spacing changes → must be screen-specific
    4. If hover/interactive state → must be screen-specific
  
  Documentation:
    - In RESTRUCTURE_PLAN.md Wave 2 (Settings) section:
      "Note: Settings uses .configuration-* scoped to .settings-page only"
    - In RESTRUCTURE_PLAN.md Wave 3 (Inventory/Suppliers/Maintenance) section:
      "Note: .operational-* must be scoped with parent .screen-page selector
       to avoid cross-screen style leaks"

**SPEC 5: Wave 2 Timeline Adjustment**
  File: Update RESTRUCTURE_PLAN.md § Execution Order
  
  Current: "2 weeks for 4 complex screens" (Settings, Reports, Suppliers, Portability)
  
  Revised plan (choose one):
    
    **OPTION A: Sequential Waves (Safer, longer timeline)**
    Wave 2a (1 week): Settings + Reports (priority, most tested)
    Wave 2b (1 week): Suppliers + Portability (lower risk, can watch for regressions)
    Total: still 2 weeks, but more breathing room
    
    **OPTION B: Extended Wave (Most flexible)**
    Wave 2 (2.5–3 weeks): All 4, but slower pace
    - Week 1: Settings + Reports (implementation + testing)
    - Week 1.5: Suppliers + Portability (implementation + regression check)
    - Week 2.5: Buffer for edge cases + final QA
    
  Recommendation: **OPTION A** (sequential)
  Rationale: Reports + Settings heavily tested by end users; want extra time
            before moving to Suppliers/Portability. Also allows catching bugs
            in shared .configuration-* rules before 2 more screens depend on them.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 2: COMPREHENSIVE AUDIT (8 AREAS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each area, review the plan and suggest improvements (if any):

**AUDIT 1: Test Impact Analysis**
  Questions:
    □ Which e2e test files affected per Wave?
      (px06-uat.spec.ts, px22-transactional-ux.spec.ts, px23-operational-workspaces.spec.ts, etc.)
    □ Any test locators at risk? (.notifications-page__sections, .result-card, etc.)
    □ Will test assertions break? (e.g., "expect(notifications.length > 5)")
    □ Need test updates per Wave?
  
  Deliverable: Test impact matrix

**AUDIT 2: State Management**
  Questions:
    □ Any screen needing Redux/Context refactor for tabs?
      (Settings: 2 groups, Reports: 3 tabs, Suppliers: 4 tabs)
    □ Tab state persistence: remember last selected tab on navigation away?
    □ Form state for two-column: keep draft in secondary until "save"?
    □ Focus restoration: remember focused item in list when returning?
  
  Deliverable: State management strategy per Wave

**AUDIT 3: Performance & Optimization**
  Questions:
    □ POS density refinement: virtualize long held-carts list?
    □ Inventory active count: lazy load item rows?
    □ Reports charts: memoization needed (React.memo, useMemo)?
    □ Suppliers purchase list: pagination or infinite scroll?
  
  Deliverable: Performance optimization checklist per Wave

**AUDIT 4: RTL Edge Cases**
  Questions:
    □ Two-column split on RTL: which is "start" (visual left) vs "end" (visual right)?
    □ Bottom sheet on RTL: swipe direction down or left?
    □ Accordions: expand arrow direction correct for RTL?
    □ Tab bar indicator line: positioned correctly in RTL?
    □ Any other RTL gotchas?
  
  Deliverable: RTL validation checklist

**AUDIT 5: Browser Support**
  Questions:
    □ CSS features used (grid, focus-visible, color-mix, clip-path)?
    □ Any need for fallbacks for older browsers?
    □ Bottom sheet animation smooth on mobile Safari?
    □ CSS Grid support on Android browsers?
  
  Deliverable: Browser support matrix + fallback list

**AUDIT 6: Data Flow Implications**
  Questions:
    □ Any restructure affecting API calls?
    □ Invoices filters: client-side or server-side pagination?
    □ Reports tab switch: re-fetch data or store in memory?
    □ Inventory sessions: real-time updates across tabs?
  
  Deliverable: Data architecture decisions per screen

**AUDIT 7: Mobile Testing Strategy**
  Questions:
    □ All breakpoints tested on real devices (iPhone, iPad, Android)?
    □ Bottom sheet height (70vh) reasonable on small screens (<360px)?
    □ Two-column stacking readable on 375px width?
    □ Touch targets >= 44px×44px?
  
  Deliverable: Mobile testing device list + checklist

**AUDIT 8: Documentation & Handoff**
  Questions:
    □ RESTRUCTURE_PLAN complete enough for developers to execute?
    □ Any screen missing detailed content mapping?
    □ Any Wave missing implementation checklist?
    □ Should create implementation guides per Wave?
  
  Deliverable: Documentation audit + suggested additions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Develop SPEC 1–5:**
   - Create BOTTOM_SHEET_SPEC.md in ai-system/
   - Create ACCESSIBILITY_AUDIT.md in ai-system/
   - Update RESTRUCTURE_PLAN.md with SPEC 3, 4, 5

2. **Audit AREAS 1–8:**
   - Review each area against RESTRUCTURE_PLAN.md
   - Provide findings: ✅ OK / ⚠️ WARNING / ❌ BLOCKER
   - Suggest improvements where found

3. **Write EXECUTION_RESULT with:**
   - All 5 specs completed (file locations/links)
   - Audit findings per area
   - 3–5 bonus improvement suggestions (if found outside the 5 specs)
   - Final readiness: **GO** / **YELLOW** / **STOP** for Wave 1

4. Say: "RESTRUCTURE-ENHANCE complete, ready for Wave 1 approval."

CONSTRAINTS:
  - No code changes (analysis + documentation only)
  - Stay within scope (RESTRUCTURE_PLAN enhancements)
  - Don't modify Phase 1 (token migration) — that's done

═══ EXECUTION_RESULT ═══
EXECUTION_RESULT

# 1) Missing Specs Resolved
- [Spec 1]: `ai-system/BOTTOM_SHEET_SPEC.md`. Current assessment: the plan depended on mobile and tablet detail sheets but had no reusable contract, and the existing POS sheet implementation is not a safe baseline for future restructure work. Risks: inconsistent focus return, gesture handling, z-index behavior, and RTL drift if teams copy ad-hoc overlays. Improvement proposed: added a full `<MobileBottomSheet>` specification covering purpose, approved use cases, API, behavior, interaction details, responsive rules, accessibility requirements, variants, dependencies, risks, and acceptance criteria. Recommendation: treat this file as the only allowed baseline for Wave 2 to Wave 4 secondary mobile surfaces.
- [Spec 2]: `ai-system/ACCESSIBILITY_AUDIT.md`. Current assessment: focus styling exists and shell accessibility improved in Wave 0, but section navigators, accordions, and bottom sheets still lacked a shared ARIA and keyboard contract. Risks: each wave could ship a different tab model, incomplete focus management, or screen-reader regressions. Improvement proposed: added a complete audit document with missing requirements, ARIA and keyboard rules, screen-reader guidance, contrast and touch-target checks, wave-specific audit gates, blockers, and acceptance criteria. Recommendation: use this file as the a11y gate before approving any restructure PR.
- [Spec 3]: `New/RESTRUCTURE_PLAN.md` now includes `Invoices List Filters (سجل الفواتير) — Enhancement Plan`. Current assessment: invoice triage relied on search and sort only, which is too weak for operational review. Risks: users will keep scanning manually, and later implementations may invent incompatible filter behavior. Improvement proposed: documented the sticky filter header, active filter chips, client-side state/data-flow decision, edge cases, rollout notes, test implications, and acceptance criteria. Recommendation: implement this as Wave `4.6` exactly as documented unless the route later adopts server pagination.
- [Spec 4]: `New/RESTRUCTURE_PLAN.md` now includes `Shared CSS Scoping Rules`. Current assessment: shared selector families such as `.operational-*` and `.configuration-*` are useful primitives but dangerous when layout or interactive states leak across screens. Risks: one restructure can silently regress another screen through unscoped global selectors. Improvement proposed: added explicit scoping, naming, isolation, precedence, maintainability, anti-pattern, and acceptance rules, plus guidance to preserve test-protected selectors while scoping by parent route class. Recommendation: treat these rules as mandatory architecture constraints for every Wave 1 to Wave 4 UI change.
- [Spec 5]: `New/RESTRUCTURE_PLAN.md` execution order now uses `Wave 2A` and `Wave 2B` instead of one compressed Wave 2. Current assessment: the original two-week batch grouped four complex screens too tightly and left no formal hardening checkpoint. Risks: shared navigator, accessibility, or CSS leakage defects would propagate from Settings and Reports into Suppliers and Portability before being contained. Improvement proposed: split decision-critical work into `2A`, added a shared hardening checkpoint, moved Suppliers and Portability into `2B`, and added a regression buffer with a revised estimate of `~6.5 weeks`. Recommendation: keep the 2A/2B split; it is the safer sequencing for implementation and QA.

# 2) Audit Review
## Test Impact Analysis — ⚠️ WARNING
- Current Assessment: Test ownership is now clear from `CLAUDE.md`, and the highest-risk wave targets are already guarded by `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px16-navigation-ia.spec.ts`, `px23-operational-workspaces.spec.ts`, `px24-analytical-config.spec.ts`, and `px22-transactional-ux.spec.ts`.
- Risks: Wave 1 ownership changes in Settings and Inventory can break headings, section controls, and assumptions about where reconciliation and completion actions live. Later section-tab restructures can also break exact button-label assertions if they are implemented without a locator-preservation plan.
- Improvements: Create a per-wave test impact matrix before coding, preserve existing section labels and protected classes wherever possible, and bundle required test updates in the same PR as each restructure wave.
- Wave 1 Impact: Yes. This is not a blocker, but Wave 1 should not start without a test update checklist for Settings and Inventory.

## State Management — ⚠️ WARNING
- Current Assessment: The affected dashboard workspaces rely heavily on local `useState` and route-level data loading. That is workable, but it makes selected sections, draft forms, and list-detail context easy to lose during IA changes.
- Risks: section switches may reset active detail, bottom-sheet dismissal may lose list context, and ownership removal from Settings may leave hidden duplicated state expectations between Settings and Inventory if execution drifts beyond UI composition.
- Improvements: Define a simple persistence contract per wave: preserve active section, preserve selected record where feasible, retain unsaved form state inside the current detail surface, and restore focus to the originating control after overlay close or section change.
- Wave 1 Impact: Yes. The Decisions in Wave 1 are safe only if ownership moves remain UI-level and do not trigger accidental data-flow rewrites.

## Performance & Optimization — ✅ OK
- Current Assessment: No immediate architecture blocker was found for Wave 1. The restructure plan mostly rearranges existing content rather than introducing new heavy data operations.
- Risks: later waves can still suffer from unnecessary chart recomputation, long operational lists, or over-dense mobile detail surfaces if thresholds are not defined.
- Improvements: Add threshold-based rules to implementation tickets: profile first, memoize only when measured, virtualize only for genuinely long lists, and move any server-side filtering decision behind explicit data-volume triggers.
- Wave 1 Impact: Low. Performance does not block Wave 1 readiness.

## RTL Edge Cases — ⚠️ WARNING
- Current Assessment: The plan now corrects the main left/right ambiguities and documents `inline-start` / `inline-end` in the highest-risk split layouts.
- Risks: future implementation can still regress through physical positioning in tab indicators, accordion chevrons, sheet internals, or split-pane dominance if developers follow visual intuition instead of logical direction.
- Improvements: Add an RTL validation checklist to every wave ticket, require logical CSS properties only, and keep the visual mapping notes now added for Settings, Inventory, and POS.
- Wave 1 Impact: Yes. Settings navigator behavior must be implemented with logical direction and keyboard order from day one.

## Browser Support — ⚠️ WARNING
- Current Assessment: Browser automation is Chromium-only today, and the restructure plan will eventually depend on features whose behavior is most fragile on Safari and iPadOS.
- Risks: `100dvh`, `focus-visible`, `color-mix`, sheet gestures, sticky regions, and overlay scroll locking can diverge from Chromium behavior and escape detection until late QA.
- Improvements: Add a WebKit smoke project or a documented manual WebKit matrix before any mobile-sheet-heavy wave is approved, and treat Safari validation as mandatory for overlay work.
- Wave 1 Impact: Low. It does not block the foundation decisions, but it does affect readiness for later waves.

## Data Flow Implications — ✅ OK
- Current Assessment: The reviewed restructure plan keeps the major changes at the IA and layout layer. The new invoices filter plan explicitly stays client-side, and no API or schema changes are required by the documented Waves.
- Risks: teams may overreach during implementation by mixing IA work with server filtering, caching rewrites, or endpoint ownership changes between Settings and Inventory.
- Improvements: Lock the rule that Wave 1 and Wave 2 remain UI-composition changes unless a separate data task is approved, and keep the invoices filter enhancement client-side until dataset size proves otherwise.
- Wave 1 Impact: Manageable. No direct blocker was found.

## Mobile Testing Strategy — ⚠️ WARNING
- Current Assessment: Existing viewport coverage is useful, but it is not a full device strategy for bottom sheets, sticky controls, and compressed tablet layouts.
- Risks: bottom-sheet height choices may fail on small Android screens, touch targets may compress below minimum size, and tablet stacked layouts may look correct in Chromium while breaking on iPad Safari.
- Improvements: Define and execute a minimum matrix of `360x800 Android`, `390x844 iPhone`, `768x1024 iPad portrait`, and `1024x768 tablet landscape`, with checks for focus, touch targets, sticky surfaces, and dismiss behavior.
- Wave 1 Impact: Moderate. Wave 1 itself is light, but its implementation patterns feed directly into later mobile work.

## Documentation & Handoff — ✅ OK
- Current Assessment: `RESTRUCTURE_PLAN.md` is now materially more executable, and the two missing shared-spec files exist. The plan now includes the missing invoices enhancement, CSS scoping architecture, and the corrected Wave 2 sequencing. Verification note: `npx tsc --noEmit --pretty false` passed cleanly; `npx vitest run` still fails only in the pre-existing locale-digit assertions in `tests/unit/formatters.test.ts`.
- Risks: the team can still drift if these documents are treated as reference material instead of implementation gates.
- Improvements: Attach `ai-system/BOTTOM_SHEET_SPEC.md`, `ai-system/ACCESSIBILITY_AUDIT.md`, and the updated `RESTRUCTURE_PLAN.md` sections to the implementation tickets and require them in the PR checklist.
- Wave 1 Impact: Positive. Documentation quality is sufficient to begin Wave 1 under explicit conditions.

# 3) Additional Improvements Found
- Add a reusable implementation contract for section-based tabs so Settings, Reports, Suppliers, Notifications, and future workspaces do not each invent their own ARIA and keyboard behavior.
- Create a wave-by-wave locator preservation matrix from `CLAUDE.md` and keep it next to the restructure backlog so QA can update the right tests in the same batch.
- Add a WebKit smoke path to Playwright, or document a manual Safari/iPad validation script before any wave that ships bottom sheets or sticky mobile filters.
- Define a small persistence policy for selected section, selected record, and draft retention so list-detail workspaces do not reset user context on every interaction.
- Document explicit data-size thresholds that trigger virtualization or server-side filtering, so performance decisions stay consistent across Waves 2 to 4.

# 4) Final Delivery Decision
- Decision: YELLOW
- Rationale: The missing specifications are now resolved, the plan is materially more executable, and no architectural blocker was found that should stop Wave 1 outright. The remaining risk is execution discipline: Wave 1 should start only if the team treats tab semantics, test impact updates, and ownership boundaries as part of the implementation scope rather than follow-up cleanup. Verification status is acceptable for a documentation task: `tsc` is clean, and `vitest` shows only the existing formatter locale failures outside this task's scope.
- Mandatory fixes before Wave 1:
  - Create the Wave 1 implementation checklist for the Settings section navigator, including `tablist/tab/tabpanel`, keyboard handling, and focus restoration.
  - Prepare the Wave 1 test-update scope for `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px16-navigation-ia.spec.ts`, and `px24-analytical-config.spec.ts`.
  - Enforce the ownership boundary that reconciliation and inventory completion move only at the IA/UI layer in Wave 1, with no hidden API or schema changes.
- Recommended next actions:
  - Approve Wave 1 as a conditioned start, not as an open-ended redesign.
  - Use `Wave 2A` and `Wave 2B` exactly as documented, without recombining them into one batch.
  - Treat `ai-system/BOTTOM_SHEET_SPEC.md` and `ai-system/ACCESSIBILITY_AUDIT.md` as required references in every restructure PR.

RESTRUCTURE-ENHANCE complete

# ═════════════════════════════════════════════════════════════
# WAVE 1 — FOUNDATION DECISIONS (1 day)
# ═════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# ► CURRENT TASK ◄  Wave 1.1-1.3 — Settings Restructure (Foundation)
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-09-WAVE-1
TASK_TYPE      : refactor
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Apply architectural decisions from RESTRUCTURE_PLAN.md
                 Remove Reconciliation + Inventory Completion from Settings.
                 Merge Settings to 2 groups instead of 3.
DEPENDS_ON     : RESTRUCTURE_PLAN.md v2 + Enhancement audit (YELLOW approval)
```

GOAL :
  Apply three foundational decisions to Settings workspace:
  
  1.1 — Remove Reconciliation (تسوية الحسابات) from Settings
  1.2 — Remove Inventory Completion (إكمال الجرد) from Settings
  1.3 — Merge Settings structure to 2 groups (Access & Governance + System Oversight)
  
  These moves implement Decision 1 and Decision 2 from RESTRUCTURE_PLAN.md.
  No data loss, no logic changes — UI structure only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO READ:
  1. `New/RESTRUCTURE_PLAN.md` § Architectural Decisions (Decision 1 + 2)
  2. `New/RESTRUCTURE_PLAN.md` § Settings Restructure Plan
  3. `components/dashboard/settings-ops.tsx` — current structure
  4. `app/globals.css` — search for .settings-page__operational
  5. Test files: tests/e2e/device-qa.spec.ts, tests/e2e/px06-device-gate.spec.ts,
     tests/e2e/px16-navigation-ia.spec.ts, tests/e2e/px24-analytical-config.spec.ts
  6. `CLAUDE.md` § File Ownership Map — Settings guards

WHAT TO CHANGE:

**TASK 1.1 — Remove Reconciliation from Settings**
  File: components/dashboard/settings-ops.tsx
  
  Find: The JSX section that renders "Operational Utilities" group
  Action: 
    - Locate the Reconciliation component/element inside Operational Utilities
    - Delete the entire Reconciliation JSX block
    - Delete any useState/state logic specific to Reconciliation in this file
    - Do NOT delete Snapshots, Integrity Check, or other System Oversight items
  
  Verify:
    □ Settings UI no longer shows "Reconciliation" or "تسوية الحسابات"
    □ Reconciliation will be in Inventory → Tab 3 (separate, untouched by this task)
    □ tsc passes
    □ vitest passes

**TASK 1.2 — Remove Inventory Completion from Settings**
  File: components/dashboard/settings-ops.tsx
  
  Find: The JSX section that renders "Operational Utilities" group
  Action:
    - Locate the Inventory Completion component/element inside Operational Utilities
    - Delete the entire Inventory Completion JSX block
    - Delete any useState/state logic specific to Inventory Completion in this file
    - Do NOT delete other items
  
  Verify:
    □ Settings UI no longer shows "Inventory Completion" or "إكمال الجرد"
    □ Inventory Completion will be in Inventory → Tab 2 (separate, untouched by this task)
    □ tsc passes
    □ vitest passes

**TASK 1.3 — Merge Settings to 2 Groups**
  File: components/dashboard/settings-ops.tsx
  
  Current structure:
    - Access & Governance (GROUP 1)
    - System Oversight (GROUP 2)
    - Operational Utilities (GROUP 3) ← DELETE THIS GROUP HEADER
  
  New structure:
    - Access & Governance (Permissions, Policies, ...)
    - System Oversight (Snapshots, Integrity Check, ...)
  
  Action:
    - Find the Operational Utilities group header/container
    - Delete the group wrapper (but keep the items inside, if any remain)
    - Since Reconciliation and Inventory Completion are already removed (Tasks 1.1-1.2),
      the group should now be empty and can be deleted entirely
    - Update any group count logic or label rendering
  
  Verify:
    □ Settings shows exactly 2 groups (Access & Governance, System Oversight)
    □ No "Operational Utilities" group visible
    □ All remaining items (Permissions, Policies, Snapshots, Integrity) are visible
    □ tsc passes
    □ vitest passes

CONSTRAINTS:
  - Do NOT rename any protected class names (.settings-page__*, .settings-page__sections)
  - Do NOT change any test-protected selectors
  - Do NOT modify API endpoints (this is UI-only)
  - Do NOT change any Inventory workspace (separate from Settings)
  - DS-ENFORCE rules: RTL-safe, no hardcoded colors, logical properties only
  - Preserve all existing functionality (filtering, sorting, viewing) for remaining items

TEST IMPACT:
  These test files guard Settings:
    - tests/e2e/device-qa.spec.ts
    - tests/e2e/px06-device-gate.spec.ts
    - tests/e2e/px16-navigation-ia.spec.ts
    - tests/e2e/px24-analytical-config.spec.ts
  
  After changes, run:
    npx vitest run tests/unit/settings-ops.test.tsx
    npx vitest run tests/e2e/device-qa.spec.ts
    npx vitest run tests/e2e/px06-device-gate.spec.ts
    npx vitest run tests/e2e/px16-navigation-ia.spec.ts
    npx vitest run tests/e2e/px24-analytical-config.spec.ts
  
  If tests fail:
    - Report ONLY the failing test assertion (do not fix tests yourself)
    - Include the error message and expected vs actual
    - Implementation of Task 1 is complete, test updates are a separate Wave 1 gate

DONE_IF:
  ✅ Reconciliation removed from Settings UI
  ✅ Inventory Completion removed from Settings UI
  ✅ Settings shows 2 groups (Access & Governance, System Oversight)
  ✅ No Operational Utilities group visible
  ✅ All remaining Settings functionality intact
  ✅ tsc clean
  ✅ vitest pass (or only expected Settings test updates needed)

ESCALATE_IF:
  - Cannot find Reconciliation or Inventory Completion in settings-ops.tsx
  - Removing items breaks other Settings logic
  - Test failures indicate structural changes needed beyond scope

═══ EXECUTION_RESULT ═══
EXECUTION_RESULT

1) Wave 5.1 complete
- Updated `app/(dashboard)/loading.tsx` and `app/globals.css` to replace the old sidebar skeleton with a topbar-aligned loading shell: topbar skeleton, summary cards, dominant primary panel, and supporting stacked panels.
- Updated `tests/unit/dashboard-loading.test.tsx` to validate the new loading shell and the accessible `main` loading label.

2) Wave 5.2 complete
- Accessibility and UX polish applied across the final restructure surfaces, including:
  `components/dashboard/inventory-workspace.tsx`
  `components/dashboard/suppliers-workspace.tsx`
  `components/dashboard/maintenance-workspace.tsx`
  `components/dashboard/portability-workspace.tsx`
  `components/dashboard/invoice-detail.tsx`
  `components/dashboard/dashboard-shell.tsx`
  `components/pos/pos-workspace.tsx`
  `components/pos/view/pos-mobile-cart-sheet.tsx`
  `components/pos/view/pos-surface-shell.tsx`
  `components/pos/view/pos-checkout-panel.tsx`
  `components/pos/pos-view.module.css`
  `components/auth/login-entry-page.tsx`
  `components/runtime/install-prompt.tsx`
- Final accessibility/hardening fixes included:
  - button-based navigator semantics kept on the restructured workspaces
  - mobile POS cart access selector uniqueness restored and touch target kept above 44px
  - install prompt now exposes visible CTA copy, visible support copy, and `data-install-state`
  - compatibility selectors restored for `.dashboard-sidebar` and `.dashboard-layout__sidebar`
  - invoice returns now preselect the first eligible item so protected return flows remain executable

3) Wave 5.3 complete
- Regression hardening fixes landed for:
  - mobile POS cart access and selector collisions
  - auth/home install prompt coverage
  - mobile drawer + desktop shell compatibility selectors
  - invoice return flow on protected phone scenarios

Verification
- `npm run build`: PASS
- `npx tsc --noEmit --pretty false`: PASS (zero output)
- `npx vitest run`: known baseline failures only
  - `tests/unit/formatters.test.ts:5` still expects Arabic digits from `Intl.NumberFormat("ar-JO")`, but this runtime returns Latin digits
  - `tests/unit/formatters.test.ts:16` still expects Arabic compact digits, but this runtime returns Latin digits
- `CI=1 npx playwright test --workers=1`: PASS
  - 56 passed (15.0m)

Notes
- Targeted reruns also passed for `px18-visual-accessibility.spec.ts`, `px21-shell-auth.spec.ts`, `px22-transactional-ux.spec.ts`, `px06-device-gate.spec.ts`, and `device-qa.spec.ts`.
- Recharts still logs repeated `width(-1)/height(-1)` warnings during browser runs, but they did not fail build or tests.

Wave 5 complete

---

# ═════════════════════════════════════════════════════════════
# WAVE 2A — DECISION-CRITICAL RESTRUCTURES
# ═════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# ► CURRENT TASK ◄  Wave 2A (Tasks 2.1–2.3) — Settings + Reports Complex Restructures
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-09-WAVE-2A
TASK_TYPE      : restructure (complex)
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Execute Settings (two-column split + accordion) and Reports (3-tab structure)
DEPENDS_ON     : Wave 1 complete + RESTRUCTURE_PLAN.md (Decision 3–4)
                 + ai-system/BOTTOM_SHEET_SPEC.md + ai-system/ACCESSIBILITY_AUDIT.md
```

GOAL :
  Execute two highly interconnected restructures:
  
  2.1 — Settings: Two-column split (navigator left 60%, detail pane right 40%)
        with accordion collapsible sections on mobile
  
  2.2 — Reports: 3-tab structure (Overview, Sales & Returns, Accounts & Operations)
        with filter-collapse behavior inside each tab
  
  2.3 — Shared hardening: Regression sweep after 2.1 and 2.2
  
  These implement Decision 3 and Decision 4 from RESTRUCTURE_PLAN.md.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO READ:
  1. `New/RESTRUCTURE_PLAN.md` § Architectural Decisions (Decision 3 + 4)
  2. `New/RESTRUCTURE_PLAN.md` § Settings Restructure Plan (detailed content mapping)
  3. `New/RESTRUCTURE_PLAN.md` § Reports Restructure Plan (tab content mapping)
  4. `ai-system/BOTTOM_SHEET_SPEC.md` — mobile sheet behavior spec
  5. `ai-system/ACCESSIBILITY_AUDIT.md` — tab/focus requirements
  6. `components/dashboard/settings-ops.tsx` — current state after Wave 1
  7. `components/dashboard/reports-overview.tsx` — current state
  8. `components/dashboard/reports-advanced-charts.tsx` — charts component
  9. `app/globals.css` — search for .settings-page and .reports-page styles
  10. Test files: tests/e2e/device-qa.spec.ts, px06-device-gate.spec.ts,
      px16-navigation-ia.spec.ts, px24-analytical-config.spec.ts, px11-reports.spec.ts,
      px18-visual-accessibility.spec.ts

WHAT TO CHANGE:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 2.1 — Settings: Two-Column Split + Accordion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: components/dashboard/settings-ops.tsx

Change: Restructure the layout from stacked sections to a two-column design:
  - LEFT COLUMN (60%): Section navigator (Permissions, Policies, Snapshot, Integrity)
  - RIGHT COLUMN (40%): Detail pane (shows selected section content)
  - MOBILE (<768px): Stack vertically with collapsible accordion per section

Content Mapping (from RESTRUCTURE_PLAN.md):
  
  PERMISSIONS section:
    - Header: "الصلاحيات"
    - Content: <PermissionsPanel> (unchanged)
    - Detail pane behavior: full width on mobile
  
  POLICIES section:
    - Header: "السياسات"
    - Content: Current 3 cards (الطباعة, الوصول من الأجهزة, الأدوات اليومية)
    - Detail pane behavior: scrollable
  
  SNAPSHOT section:
    - Header: "اللقطة اليومية"
    - Left: Notes textarea + Save button (from current settings-ops)
    - Right: Recent snapshots list (from current settings-ops)
    - Mobile: Split vertically; snapshot list below form
  
  INTEGRITY section:
    - Header: "فحص سلامة الأرصدة"
    - Content: Balance check button + results list (unchanged)
    - Mobile: Full width

Implementation Steps:

**Step 1: CSS Structure (app/globals.css)**
  Add new class definitions:
    .settings-page__shell { 
      display: grid;
      grid-template-columns: minmax(200px, 60%) 1fr;
      gap: var(--spacing-lg);
      @media (max-width: 1199px) {
        grid-template-columns: 1fr;
      }
    }
    
    .settings-page__navigator {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      /* sticky on desktop only */
      @media (min-width: 1200px) {
        position: sticky;
        top: var(--spacing-md);
        max-height: calc(100vh - 200px);
        overflow-y: auto;
      }
    }
    
    .settings-page__navigator-item {
      padding: var(--spacing-md);
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid var(--color-border);
      background: var(--color-bg);
      transition: all 0.2s ease;
      &.is-selected {
        background: var(--color-bg-selected);
        border-color: var(--color-border-selected);
      }
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    }
    
    .settings-page__detail {
      display: grid;
      grid-template-rows: auto 1fr;
      gap: var(--spacing-md);
      @media (max-width: 767px) {
        display: block;
      }
    }
    
    .settings-page__accordion {
      @media (max-width: 767px) {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        margin-bottom: var(--spacing-md);
      }
      @media (min-width: 768px) {
        display: none;
      }
    }
    
    .settings-page__accordion-header {
      @media (max-width: 767px) {
        padding: var(--spacing-md);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        font-weight: 600;
      }
    }
    
    .settings-page__accordion-content {
      @media (max-width: 767px) {
        padding: var(--spacing-md);
        border-top: 1px solid var(--color-border);
      }
      @media (min-width: 768px) {
        display: block;
      }
    }

**Step 2: JSX Structure (settings-ops.tsx)**
  Restructure from section-based rendering to navigator + detail pattern:
    
    1. Change state:
       - Change activeSection to a selected section name
       - Add isMobileAccordionOpen state for tracking accordion state per section
    
    2. Create new NavigatorButton component (inline):
       - Takes: title, isSelected, onClick
       - Renders: styled button with selected state
       - ARIA: role="button", aria-selected={isSelected}, aria-controls="settings-detail"
    
    3. Restructure JSX:
       <div className="settings-page__shell">
         {/* LEFT: Navigator */}
         <nav className="settings-page__navigator" aria-label="أقسام الإعدادات">
           {SECTIONS.map(section => (
             <button
               key={section}
               className={`settings-page__navigator-item ${activeSection === section ? 'is-selected' : ''}`}
               onClick={() => setActiveSection(section)}
               role="tab"
               aria-selected={activeSection === section}
               aria-controls={`settings-panel-${section}`}
             >
               {section label in Arabic}
             </button>
           ))}
         </nav>
         
         {/* RIGHT: Detail pane */}
         <div className="settings-page__detail" role="tabpanel" id="settings-detail">
           {activeSection === 'permissions' && <PermissionsPanel ... />}
           {activeSection === 'policies' && <PoliciesSection />}
           {activeSection === 'snapshot' && <SnapshotSection />}
           {activeSection === 'integrity' && <IntegritySection />}
         </div>
       </div>
    
    4. Mobile accordion (shown only on mobile):
       Wrap each section in:
       <div className="settings-page__accordion">
         <button className="settings-page__accordion-header"
           onClick={() => toggleAccordion(section)}
         >
           {title}
           <ChevronDown className={isMobileAccordionOpen[section] ? 'rotate' : ''} />
         </button>
         {isMobileAccordionOpen[section] && (
           <div className="settings-page__accordion-content">
             {section content}
           </div>
         )}
       </div>
    
    5. Preserve all existing functionality:
       - PermissionsPanel unchanged
       - Snapshot form unchanged (just repositioned)
       - Integrity check unchanged
       - Error banners unchanged

**Step 3: Accessibility Requirements**
  - Navigator: role="tablist", each item role="tab", aria-selected, aria-controls
  - Detail pane: role="tabpanel", id matches aria-controls
  - Keyboard navigation: Tab moves between navigator items, Enter/Space selects
  - Focus visible: 3px ring on selected item
  - Screen reader: announces section name and currently selected section
  - Mobile accordion: aria-expanded on header, aria-hidden on collapsed content

**Step 4: Test Expectations**
  - Verify: settings-page__shell grid shows 2 columns on desktop
  - Verify: settings-page__navigator sticky on desktop (max-height respected)
  - Verify: Mobile (<768px) shows accordion instead of navigator
  - Verify: Clicking navigator item shows correct detail pane
  - Verify: All section content visible and functional
  - Verify: tsc passes
  - Verify: vitest passes or shows only test-update-needed failures

**Step 5: Protected Selectors to Preserve**
  From CLAUDE.md:
    ✅ .settings-page__* (all current class names must remain)
    ✅ .settings-page__sections (navigator container)
    ✅ .result-card (snapshot/balance results)
    ✅ Protected test locators: .settings-page__panel, .settings-page__list

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 2.2 — Reports: 3-Tab Structure + Filter Collapse
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: components/dashboard/reports-overview.tsx (main)
File: components/dashboard/reports-advanced-charts.tsx (charts)
File: app/(dashboard)/reports/page.tsx (if needed)
File: app/globals.css (new .reports-page__* styles)

Change: Restructure from single-view to 3-tab tabbed interface:
  
  Tab 1: Overview (تقرير شامل)
    - Summary cards (sales, returns, profit, etc.)
    - Period selector
    - Chart(s)
    - Export link
  
  Tab 2: Sales & Returns (المبيعات والمرتجعات)
    - Advanced comparison charts (from current reports-advanced-charts.tsx)
    - Filter collapse: Date range, Category, Status (collapsed by default)
    - Detailed breakdown
  
  Tab 3: Accounts & Operations (الحسابات والعمليات)
    - Account balances table
    - Operational metrics
    - Filter collapse: Date range, Account filter (collapsed by default)

Implementation Steps:

**Step 1: CSS Structure (app/globals.css)**
  Add new class definitions:
    .reports-page__tabs {
      display: flex;
      gap: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: var(--spacing-lg);
      overflow-x: auto;
      @media (max-width: 767px) {
        flex-wrap: wrap;
      }
    }
    
    .reports-page__tab {
      padding: var(--spacing-md) var(--spacing-lg);
      border: none;
      background: transparent;
      cursor: pointer;
      font-weight: 500;
      color: var(--color-text-muted);
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
      &:hover {
        color: var(--color-text);
      }
      &.is-active {
        color: var(--color-text);
        border-bottom-color: var(--color-primary);
      }
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    }
    
    .reports-page__tab-panel {
      display: none;
      &.is-active {
        display: block;
      }
    }
    
    .reports-page__filter-collapse {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      background: var(--color-bg-muted);
      border-radius: 8px;
      margin-bottom: var(--spacing-lg);
      cursor: pointer;
      &.is-expanded {
        background: var(--color-bg-selected);
      }
    }
    
    .reports-page__filter-content {
      display: none;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-top: none;
      border-radius: 0 0 8px 8px;
      &.is-expanded {
        display: flex;
      }
    }

**Step 2: JSX Structure (reports-overview.tsx)**
  Restructure from single view to tabbed structure:
    
    1. Change state:
       - Add activeTab: "overview" | "sales-returns" | "accounts-operations"
       - Add expandedFilters: {[tabName]: boolean}
    
    2. Create tab list:
       <div role="tablist" className="reports-page__tabs">
         <button
           role="tab"
           aria-selected={activeTab === 'overview'}
           aria-controls="tab-overview"
           onClick={() => setActiveTab('overview')}
           className={`reports-page__tab ${activeTab === 'overview' ? 'is-active' : ''}`}
         >
           تقرير شامل
         </button>
         <button
           role="tab"
           aria-selected={activeTab === 'sales-returns'}
           aria-controls="tab-sales-returns"
           onClick={() => setActiveTab('sales-returns')}
           className={`reports-page__tab ${activeTab === 'sales-returns' ? 'is-active' : ''}`}
         >
           المبيعات والمرتجعات
         </button>
         <button
           role="tab"
           aria-selected={activeTab === 'accounts-operations'}
           aria-controls="tab-accounts-operations"
           onClick={() => setActiveTab('accounts-operations')}
           className={`reports-page__tab ${activeTab === 'accounts-operations' ? 'is-active' : ''}`}
         >
           الحسابات والعمليات
         </button>
       </div>
    
    3. Tab 1: Overview panel
       <div id="tab-overview" role="tabpanel" aria-labelledby="tab-overview-button"
         className={`reports-page__tab-panel ${activeTab === 'overview' ? 'is-active' : ''}`}
       >
         {/* Current reports overview content */}
         - Summary cards
         - Period selector
         - Charts
         - Export link
       </div>
    
    4. Tab 2: Sales & Returns panel
       <div id="tab-sales-returns" role="tabpanel" aria-labelledby="tab-sales-returns-button"
         className={`reports-page__tab-panel ${activeTab === 'sales-returns' ? 'is-active' : ''}`}
       >
         <FilterCollapseHeader
           title="الفلاتر"
           isExpanded={expandedFilters['sales-returns']}
           onClick={() => toggleFilter('sales-returns')}
         />
         {expandedFilters['sales-returns'] && (
           <FilterContent>
             - Date range filter
             - Category filter
             - Status filter
           </FilterContent>
         )}
         <ReportsAdvancedCharts {/* props */} />
       </div>
    
    5. Tab 3: Accounts & Operations panel
       <div id="tab-accounts-operations" role="tabpanel" aria-labelledby="tab-accounts-operations-button"
         className={`reports-page__tab-panel ${activeTab === 'accounts-operations' ? 'is-active' : ''}`}
       >
         <FilterCollapseHeader
           title="الفلاتر"
           isExpanded={expandedFilters['accounts-operations']}
           onClick={() => toggleFilter('accounts-operations')}
         />
         {expandedFilters['accounts-operations'] && (
           <FilterContent>
             - Date range filter
             - Account filter
           </FilterContent>
         )}
         {/* Accounts & Operations content */}
       </div>
    
    6. Preserve existing:
       - Summary cards styling unchanged
       - Charts component unchanged (imported in Tab 2)
       - Export link preserved (in Tab 1)
       - All data queries unchanged

**Step 3: Accessibility Requirements**
  - Tab list: role="tablist"
  - Each tab: role="tab", aria-selected, aria-controls
  - Tab panels: role="tabpanel", aria-labelledby
  - Filter collapse: aria-expanded, aria-controls
  - Keyboard: Tab navigates between tabs, Left/Right arrows select tabs (optional but recommended)
  - Focus visible: 3px ring on active tab
  - Screen reader: announces tab name and current tab

**Step 4: Test Expectations**
  - Verify: 3 tabs visible (Overview, Sales & Returns, Accounts & Operations)
  - Verify: Clicking tab shows correct panel
  - Verify: Filter collapse toggles with click
  - Verify: Charts appear in Tab 2 (Sales & Returns)
  - Verify: Export link visible in Tab 1 (Overview)
  - Verify: Tab keyboard navigation works (Tab key, arrow keys optional)
  - Verify: All data displays correctly in each tab
  - Verify: tsc passes
  - Verify: vitest passes or shows only test-update-needed failures

**Step 5: Protected Selectors to Preserve**
  From CLAUDE.md:
    ✅ .reports-page__* (all class names must remain consistent)
    ✅ .result-card (if used in reports)
    ✅ Protected test locators: any existing .reports-* class names

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 2.3 — Shared Hardening (Regression Sweep)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After completing Tasks 2.1 and 2.2, run comprehensive regression tests:

**Step 1: Type Check**
  npx tsc --noEmit --pretty false
  ✅ Must pass with zero output

**Step 2: Unit Tests**
  npx vitest run tests/unit/settings-ops.test.tsx (if exists)
  npx vitest run tests/unit/reports-overview.test.tsx (if exists)
  ✅ Must pass or only show new test-update-needed failures

**Step 3: E2E Tests (critical for Wave 2A)**
  Run all test files that guard Settings and Reports:
    npx vitest run tests/e2e/device-qa.spec.ts
    npx vitest run tests/e2e/px06-device-gate.spec.ts
    npx vitest run tests/e2e/px16-navigation-ia.spec.ts
    npx vitest run tests/e2e/px24-analytical-config.spec.ts
    npx vitest run tests/e2e/px11-reports.spec.ts
    npx vitest run tests/e2e/px18-visual-accessibility.spec.ts
  
  ⚠️ If failures occur:
    - Report the failing assertion, error message, expected vs actual
    - Do NOT fix tests yourself (test updates are a separate post-Wave-2A gate)
    - Implementation of Tasks 2.1–2.2 is complete if all source code works

**Step 4: Visual Regression Check (manual)**
  If using Playwright visual regression:
    npx playwright test --ui
    □ Compare Settings two-column layout
    □ Compare Reports tabs appearance
    □ Check mobile accordion rendering
    □ Check focus ring visibility

**Step 5: Build Check**
  npm run build
  ✅ Must complete without errors

**Step 6: Summary Report**
  Document:
    - All test results (passing/failing counts)
    - Any type errors (should be zero)
    - Build status
    - Critical issues (if any)

CONSTRAINTS:
  - Do NOT rename any protected class names (.settings-page__*, .reports-page__*, etc.)
  - Do NOT change API endpoints
  - Do NOT modify test files (test updates are separate)
  - RTL-safe: use logical properties only (inset-inline-*, padding-inline-*, etc.)
  - No hardcoded colors; use --color-* tokens
  - Preserve all existing functionality and data displays
  - Focus management: tab/accordion headers must be keyboard accessible
  - Mobile: two-column must stack correctly on <768px

DONE_IF:
  ✅ Settings: Two-column layout visible on desktop
  ✅ Settings: Accordion visible on mobile
  ✅ Settings: All sections accessible via navigator/accordion
  ✅ Settings: Keyboard navigation working (Tab, arrow keys, Enter)
  ✅ Settings: Focus indicators visible
  ✅ Reports: 3 tabs visible
  ✅ Reports: Clicking tabs shows correct content
  ✅ Reports: Filter collapse toggles correctly
  ✅ Reports: Charts appear in Sales & Returns tab
  ✅ Reports: Export link visible in Overview tab
  ✅ All section content functional (snapshot saving, balance check, permissions, etc.)
  ✅ tsc clean
  ✅ Build succeeds
  ✅ E2E tests run (report failures only if they occur)

ESCALATE_IF:
  - Cannot add two-column split due to layout conflicts
  - Cannot implement tab structure without breaking reports logic
  - Protected selectors conflict with new structure
  - E2E test failures indicate breaking changes beyond scope

═══ EXECUTION_RESULT ═══
(Codex writes results here after execution)

---

# ═════════════════════════════════════════════════════════════
# WAVE 2B — SUPPORTING RESTRUCTURES (continued)
# ═════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# ► CURRENT TASK ◄  Wave 2B (Tasks 2.4–2.5) — Suppliers + Portability Tabs
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-09-WAVE-2B
TASK_TYPE      : restructure (moderate)
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Execute Suppliers (4-tab structure) and Portability (4-tab structure)
DEPENDS_ON     : Wave 2A complete + RESTRUCTURE_PLAN.md (Decision 5–6)
                 + ai-system/ACCESSIBILITY_AUDIT.md
```

GOAL :
  Execute two moderately complex tab restructures:
  
  2.4 — Suppliers: 4-tab structure (Directory, Purchase, Payment, History)
        with two-column split in Directory and Purchase tabs
  
  2.5 — Portability: 4-tab structure (Export, Import, Restore, History)
        with progressive disclosure (commit/restore actions hidden until ready)
  
  These implement Decision 5 and Decision 6 from RESTRUCTURE_PLAN.md.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO READ:
  1. `New/RESTRUCTURE_PLAN.md` § Suppliers Restructuring Plan
  2. `New/RESTRUCTURE_PLAN.md` § Portability Restructuring Plan
  3. `ai-system/ACCESSIBILITY_AUDIT.md` — tab requirements
  4. `components/dashboard/suppliers-workspace.tsx` — current state
  5. `components/dashboard/portability-workspace.tsx` — current state
  6. `app/globals.css` — search for .suppliers-page and .portability-page styles
  7. Test files: tests/e2e/px23-operational-workspaces.spec.ts, tests/e2e/px24-analytical-config.spec.ts

WHAT TO CHANGE:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 2.4 — Suppliers: 4-Tab Structure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: components/dashboard/suppliers-workspace.tsx
File: app/globals.css (new .suppliers-page__* styles)

Change: Restructure from section model to 4-tab interface:
  
  Tab 1: Directory (الموردون)
    - Left: Supplier search, filters, supplier list
    - Right: Supplier details and edit/create form
    - Two-column split pattern
  
  Tab 2: Purchase (الشراء)
    - Left: Supplier selection, product search, candidate results, draft line items
    - Right: Sticky order summary, payment mode, payment account, notes, confirm button
    - Two-column split pattern
  
  Tab 3: Payment (الدفع)
    - Single column: payment form (supplier, amount, account, notes)
    - Projected balance display above form
  
  Tab 4: History (السجل)
    - Two accordions: Purchase Orders | Supplier Payments
    - Each accordion shows a timeline/list of past transactions

Implementation Steps:

**Step 1: CSS Structure (app/globals.css)**
  Add new class definitions:
    .suppliers-page__tabs {
      display: flex;
      gap: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: var(--spacing-lg);
      overflow-x: auto;
    }
    
    .suppliers-page__tab {
      padding: var(--spacing-md) var(--spacing-lg);
      border: none;
      background: transparent;
      cursor: pointer;
      font-weight: 500;
      color: var(--color-text-muted);
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
      &:hover {
        color: var(--color-text);
      }
      &.is-active {
        color: var(--color-text);
        border-bottom-color: var(--color-primary);
      }
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    }
    
    .suppliers-page__tab-panel {
      display: none;
      &.is-active {
        display: block;
      }
    }
    
    .suppliers-page__split {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 24px;
      @media (max-width: 1199px) {
        grid-template-columns: 1fr;
      }
    }
    
    .suppliers-page__accordion {
      margin-bottom: var(--spacing-lg);
    }
    
    .suppliers-page__accordion-header {
      padding: var(--spacing-md);
      background: var(--color-bg-muted);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      &.is-expanded {
        background: var(--color-bg-selected);
      }
    }
    
    .suppliers-page__accordion-content {
      display: none;
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-top: none;
      &.is-expanded {
        display: block;
      }
    }

**Step 2: JSX Structure (suppliers-workspace.tsx)**
  Refactor from section-based to tab-based rendering:
    
    1. Keep existing state but change activeSection from string to tab name
    2. Create tab list:
       <div role="tablist" className="suppliers-page__tabs">
         <button
           role="tab"
           aria-selected={activeSection === 'directory'}
           aria-controls="tab-directory"
           onClick={() => setActiveSection('directory')}
           className={`suppliers-page__tab ${activeSection === 'directory' ? 'is-active' : ''}`}
         >
           الموردون
         </button>
         <button
           role="tab"
           aria-selected={activeSection === 'purchase'}
           aria-controls="tab-purchase"
           onClick={() => setActiveSection('purchase')}
           className={`suppliers-page__tab ${activeSection === 'purchase' ? 'is-active' : ''}`}
         >
           الشراء
         </button>
         <button
           role="tab"
           aria-selected={activeSection === 'payment'}
           aria-controls="tab-payment"
           onClick={() => setActiveSection('payment')}
           className={`suppliers-page__tab ${activeSection === 'payment' ? 'is-active' : ''}`}
         >
           الدفع
         </button>
         <button
           role="tab"
           aria-selected={activeSection === 'history'}
           aria-controls="tab-history"
           onClick={() => setActiveSection('history')}
           className={`suppliers-page__tab ${activeSection === 'history' ? 'is-active' : ''}`}
         >
           السجل
         </button>
       </div>
    
    3. Tab 1: Directory panel (two-column)
       <div id="tab-directory" role="tabpanel" className={`suppliers-page__tab-panel ${activeSection === 'directory' ? 'is-active' : ''}`}>
         <div className="suppliers-page__split">
           {/* LEFT: search + filter + list */}
           <div>
             {/* Existing supplier search, filter, list JSX */}
           </div>
           {/* RIGHT: supplier details form */}
           <div>
             {/* Existing supplier detail form JSX */}
           </div>
         </div>
       </div>
    
    4. Tab 2: Purchase panel (two-column)
       <div id="tab-purchase" role="tabpanel" className={`suppliers-page__tab-panel ${activeSection === 'purchase' ? 'is-active' : ''}`}>
         <div className="suppliers-page__split">
           {/* LEFT: supplier selection + product search + draft items */}
           <div>
             {/* Existing purchase form left side */}
           </div>
           {/* RIGHT: sticky order summary, payment mode, account, notes, confirm */}
           <div style={{ position: 'sticky', top: 0 }}>
             {/* Existing order summary JSX */}
           </div>
         </div>
       </div>
    
    5. Tab 3: Payment panel (single column)
       <div id="tab-payment" role="tabpanel" className={`suppliers-page__tab-panel ${activeSection === 'payment' ? 'is-active' : ''}`}>
         {/* Projected balance strip */}
         {/* Payment form (supplier, amount, account, notes) */}
         {/* Existing payment JSX */}
       </div>
    
    6. Tab 4: History panel (accordions)
       <div id="tab-history" role="tabpanel" className={`suppliers-page__tab-panel ${activeSection === 'history' ? 'is-active' : ''}`}>
         <div className="suppliers-page__accordion">
           <button className="suppliers-page__accordion-header"
             onClick={() => toggleAccordion('purchase-orders')}
             aria-expanded={expandedAccordions['purchase-orders']}
           >
             أوامر الشراء
             <ChevronDown className={expandedAccordions['purchase-orders'] ? 'rotate' : ''} />
           </button>
           {expandedAccordions['purchase-orders'] && (
             <div className="suppliers-page__accordion-content">
               {/* Purchase orders list */}
             </div>
           )}
         </div>
         <div className="suppliers-page__accordion">
           <button className="suppliers-page__accordion-header"
             onClick={() => toggleAccordion('supplier-payments')}
             aria-expanded={expandedAccordions['supplier-payments']}
           >
             الدفعات
             <ChevronDown className={expandedAccordions['supplier-payments'] ? 'rotate' : ''} />
           </button>
           {expandedAccordions['supplier-payments'] && (
             <div className="suppliers-page__accordion-content">
               {/* Supplier payments list */}
             </div>
           )}
         </div>
       </div>
    
    7. Preserve all existing functionality:
       - Supplier search, filters, and list unchanged
       - Purchase form logic unchanged
       - Payment form logic unchanged
       - History feeds unchanged
       - All API integrations unchanged

**Step 3: Accessibility Requirements**
  - Tab list: role="tablist"
  - Each tab: role="tab", aria-selected, aria-controls
  - Tab panels: role="tabpanel", aria-labelledby
  - Accordion headers: aria-expanded, aria-controls
  - Keyboard: Tab navigates between tabs, Enter/Space selects, arrow keys optional
  - Focus visible: 3px ring on active tab
  - Screen reader: announces tab name and current tab

**Step 4: Test Expectations**
  - Verify: 4 tabs visible (Directory, Purchase, Payment, History)
  - Verify: Clicking tab shows correct panel
  - Verify: Directory tab shows two-column split (supplier search + details form)
  - Verify: Purchase tab shows two-column split (product search + order summary)
  - Verify: Payment tab shows single column form
  - Verify: History tab shows two accordions (expandable)
  - Verify: All supplier operations functional (create, edit, search, filter)
  - Verify: All purchase operations functional (add items, confirm)
  - Verify: All payment operations functional (record payment)
  - Verify: tsc passes
  - Verify: vitest passes or shows only test-update-needed failures

**Step 5: Protected Selectors to Preserve**
  From CLAUDE.md:
    ✅ .suppliers-page__* (all class names must remain)
    ✅ Protected test locators: any existing .suppliers-* classes in e2e

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 2.5 — Portability: 4-Tab Structure + Progressive Disclosure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: components/dashboard/portability-workspace.tsx
File: app/globals.css (new .portability-page__* styles)

Change: Restructure from section model to 4-tab interface with progressive disclosure:
  
  Tab 1: Export (التصدير)
    - Step 1: Package scope form (type, scope, filters)
    - Step 2 (hidden until successful): Last export result
    - Export button triggers action
  
  Tab 2: Import (الاستيراد)
    - Step 1: File upload + dry-run review
    - Step 2 (hidden until dry-run success): Commit button + result
    - No commit action shown before dry-run success
  
  Tab 3: Restore (الاستعادة)
    - Step 1: Restore selection + warnings
    - Step 2 (hidden until confirmed): Restore confirmation
    - Step 3 (hidden until successful): Result summary
  
  Tab 4: History (السجل)
    - Two accordions: Package History | Import/Restore History
    - Each accordion shows a list of past operations

Implementation Steps:

**Step 1: CSS Structure (app/globals.css)**
  Add new class definitions:
    .portability-page__tabs {
      display: flex;
      gap: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: var(--spacing-lg);
      overflow-x: auto;
    }
    
    .portability-page__tab {
      padding: var(--spacing-md) var(--spacing-lg);
      border: none;
      background: transparent;
      cursor: pointer;
      font-weight: 500;
      color: var(--color-text-muted);
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
      &:hover {
        color: var(--color-text);
      }
      &.is-active {
        color: var(--color-text);
        border-bottom-color: var(--color-primary);
      }
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    }
    
    .portability-page__tab-panel {
      display: none;
      &.is-active {
        display: block;
      }
    }
    
    .portability-page__step {
      margin-bottom: var(--spacing-lg);
      padding: var(--spacing-lg);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-bg);
      &.is-hidden {
        display: none;
      }
      &.is-disabled {
        opacity: 0.6;
        pointer-events: none;
      }
    }
    
    .portability-page__accordion {
      margin-bottom: var(--spacing-lg);
    }
    
    .portability-page__accordion-header {
      padding: var(--spacing-md);
      background: var(--color-bg-muted);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      &.is-expanded {
        background: var(--color-bg-selected);
      }
    }
    
    .portability-page__accordion-content {
      display: none;
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-top: none;
      &.is-expanded {
        display: block;
      }
    }

**Step 2: JSX Structure (portability-workspace.tsx)**
  Refactor from section-based to tab-based with progressive disclosure:
    
    1. Keep existing state but add step-visibility states per tab
    2. Create tab list:
       <div role="tablist" className="portability-page__tabs">
         <button role="tab" aria-selected={activeSection === 'export'} ...>التصدير</button>
         <button role="tab" aria-selected={activeSection === 'import'} ...>الاستيراد</button>
         <button role="tab" aria-selected={activeSection === 'restore'} ...>الاستعادة</button>
         <button role="tab" aria-selected={activeSection === 'history'} ...>السجل</button>
       </div>
    
    3. Tab 1: Export panel (progressive disclosure)
       <div id="tab-export" role="tabpanel" className={`portability-page__tab-panel ${activeSection === 'export' ? 'is-active' : ''}`}>
         {/* Step 1: Form (always visible) */}
         <div className="portability-page__step">
           {/* Package type, scope, filters, date range form */}
           {/* Export button */}
         </div>
         {/* Step 2: Result (shown only if lastExport is not null) */}
         {lastExport && (
           <div className="portability-page__step">
             {/* Last export result card with download link */}
           </div>
         )}
       </div>
    
    4. Tab 2: Import panel (progressive disclosure)
       <div id="tab-import" role="tabpanel" className={`portability-page__tab-panel ${activeSection === 'import' ? 'is-active' : ''}`}>
         {/* Step 1: Upload + dry-run (always visible) */}
         <div className="portability-page__step">
           {/* File upload input */}
           {/* Dry-run button */}
         </div>
         {/* Step 2: Dry-run review (shown only if dryRunResult exists) */}
         {dryRunResult && (
           <div className="portability-page__step">
             {/* Validation summary: rows_total, rows_valid, rows_invalid */}
             {/* Validation errors list (if any) */}
             {/* Commit button (only if rows_valid > 0) */}
           </div>
         )}
         {/* Step 3: Result (shown only if lastImport is not null) */}
         {lastImport && (
           <div className="portability-page__step">
             {/* Import result card with committed rows count */}
           </div>
         )}
       </div>
    
    5. Tab 3: Restore panel (progressive disclosure)
       <div id="tab-restore" role="tabpanel" className={`portability-page__tab-panel ${activeSection === 'restore' ? 'is-active' : ''}`}>
         {/* Step 1: Selection + warnings (always visible) */}
         <div className="portability-page__step">
           {/* Restore drill selection */}
           {/* Warning banner: "استعادة البيانات ستؤدي إلى استبدال البيانات الحالية" */}
           {/* Restore confirm button (disabled until user confirms warning) */}
         </div>
         {/* Step 2: Confirmation (shown only if restoreConfirmed is true) */}
         {restoreConfirmed && (
           <div className="portability-page__step">
             {/* Final confirmation dialog or panel */}
           </div>
         )}
         {/* Step 3: Result (shown only if lastRestore exists) */}
         {lastRestore && (
           <div className="portability-page__step">
             {/* Restore result card with drift count, RTO metrics */}
           </div>
         )}
       </div>
    
    6. Tab 4: History panel (accordions)
       <div id="tab-history" role="tabpanel" className={`portability-page__tab-panel ${activeSection === 'history' ? 'is-active' : ''}`}>
         <div className="portability-page__accordion">
           <button className="portability-page__accordion-header"
             onClick={() => toggleAccordion('packages')}
             aria-expanded={expandedAccordions['packages']}
           >
             سجل الحزم
             <ChevronDown />
           </button>
           {expandedAccordions['packages'] && (
             <div className="portability-page__accordion-content">
               {/* List of all packages with status, date, size */}
             </div>
           )}
         </div>
         <div className="portability-page__accordion">
           <button className="portability-page__accordion-header"
             onClick={() => toggleAccordion('operations')}
             aria-expanded={expandedAccordions['operations']}
           >
             سجل الاستيراد والاستعادة
             <ChevronDown />
           </button>
           {expandedAccordions['operations'] && (
             <div className="portability-page__accordion-content">
               {/* Timeline of import jobs + restore drills with status */}
             </div>
           )}
         </div>
       </div>
    
    7. Preserve all existing functionality:
       - Export form and logic unchanged
       - Import validation and commit unchanged
       - Restore drill selection and execution unchanged
       - History lists unchanged
       - All API integrations unchanged

**Step 3: Accessibility Requirements**
  - Tab list: role="tablist"
  - Each tab: role="tab", aria-selected, aria-controls
  - Tab panels: role="tabpanel"
  - Accordion headers: aria-expanded
  - Keyboard: Tab navigates, Enter/Space activates
  - Focus visible: 3px ring on active elements
  - Screen reader: announces step visibility states
  - Warning text must be clear and readable (high contrast)

**Step 4: Test Expectations**
  - Verify: 4 tabs visible (Export, Import, Restore, History)
  - Verify: Clicking tab shows correct panel
  - Verify: Export form visible, result hidden until export succeeds
  - Verify: Import upload visible, commit button hidden until dry-run success
  - Verify: Restore selection visible, confirmation hidden until selected
  - Verify: History tab shows two accordions
  - Verify: All portability operations functional (export, import, restore)
  - Verify: Progressive disclosure: commit button appears only after dry-run
  - Verify: Restore button disabled until warning acknowledged
  - Verify: tsc passes
  - Verify: vitest passes or shows only test-update-needed failures

**Step 5: Protected Selectors to Preserve**
  From CLAUDE.md:
    ✅ .portability-page__* (all class names must remain)
    ✅ Protected test locators: any existing .portability-* classes in e2e

CONSTRAINTS:
  - Do NOT rename any protected class names
  - Do NOT change API endpoints
  - Do NOT modify test files
  - RTL-safe: use logical properties only
  - No hardcoded colors; use --color-* tokens
  - Preserve all existing functionality and data flows
  - Keyboard and ARIA accessibility required
  - Progressive disclosure: hidden elements until preconditions met

DONE_IF:
  ✅ Suppliers: 4 tabs visible and clickable
  ✅ Suppliers: Directory tab shows two-column split
  ✅ Suppliers: Purchase tab shows two-column split
  ✅ Suppliers: Payment tab shows single column
  ✅ Suppliers: History tab shows 2 accordions
  ✅ Suppliers: All operations functional (CRUD, history)
  ✅ Portability: 4 tabs visible and clickable
  ✅ Portability: Export form visible, result hidden until done
  ✅ Portability: Import upload visible, commit hidden until dry-run success
  ✅ Portability: Restore selection visible, confirmation hidden until ready
  ✅ Portability: History tab shows 2 accordions
  ✅ Portability: All operations functional (export, import, restore)
  ✅ tsc clean
  ✅ Build succeeds
  ✅ E2E tests run (report failures only if they occur)

ESCALATE_IF:
  - Cannot restructure suppliers/portability without breaking existing flows
  - Protected selectors conflict with new tab structure
  - Progressive disclosure logic becomes too complex
  - E2E test failures indicate breaking changes beyond scope

═══ EXECUTION_RESULT ═══
(Codex writes results here after execution)

---

# ═════════════════════════════════════════════════════════════
# WAVE 3 — OPERATIONAL WORKSPACES (Inventory, Maintenance, Invoice Detail)
# ═════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# ► CURRENT TASK ◄  Wave 3 (Tasks 3.1–3.3) — Complex Operational Restructures
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-09-WAVE-3
TASK_TYPE      : restructure (complex)
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Execute Inventory (4-tab with two-column), Maintenance (3-tab with two-column),
                 and Invoice Detail (section hierarchy with progressive disclosure)
DEPENDS_ON     : Wave 2B complete + RESTRUCTURE_PLAN.md (Decision 7–9)
                 + ai-system/BOTTOM_SHEET_SPEC.md + ai-system/ACCESSIBILITY_AUDIT.md
```

GOAL :
  Execute three complex operational workspace restructures:
  
  3.1 — Inventory: 4-tab structure (Create Count, Active Counts, Reconciliation, History)
        with two-column split in Active Counts (sessions left 40%, detail right 60%)
        + Reconciliation tab ownership (moved from Settings)
        + Inventory Completion button (moved from Settings)
  
  3.2 — Maintenance: 3-tab structure (Overview, New Order, Jobs)
        with two-column split in Jobs (queue left 60%, detail right 40%)
        + Queue search/filter feature
  
  3.3 — Invoice Detail: Section hierarchy with progressive disclosure
        (Overview, Returns, Admin sections)
        with secondary rail reorganization
  
  These implement Decision 7, 8, and 9 from RESTRUCTURE_PLAN.md.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO READ:
  1. `New/RESTRUCTURE_PLAN.md` § Inventory Restructuring Plan
  2. `New/RESTRUCTURE_PLAN.md` § Core Maintenance Restructuring Plan
  3. `New/RESTRUCTURE_PLAN.md` § Invoice Detail Restructuring Plan
  4. `ai-system/BOTTOM_SHEET_SPEC.md` — mobile sheet behavior
  5. `ai-system/ACCESSIBILITY_AUDIT.md` — tab/section accessibility
  6. `components/dashboard/inventory-workspace.tsx` — current state
  7. `components/dashboard/maintenance-workspace.tsx` — current state
  8. `components/dashboard/invoice-detail.tsx` — current state
  9. `app/globals.css` — search for .inventory-page, .maintenance-page, .invoice-page
  10. Test files: tests/e2e/px23-operational-workspaces.spec.ts, tests/e2e/px22-transactional-ux.spec.ts

WHAT TO CHANGE:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 3.1 — Inventory: 4-Tab Structure + Two-Column Active Counts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: components/dashboard/inventory-workspace.tsx
File: app/globals.css (new .inventory-page__* styles)

Change: Restructure from mode-based to 4-tab interface:
  
  Tab 1: Create Count (إنشاء جردة جديدة)
    - Single column: scope selection, product picker, success result
    - Same as current create flow
  
  Tab 2: Active Counts (الجلسات المفتوحة)
    - Two-column split: sessions list left 40% | detail right 60%
    - Left: List of open count sessions with status summary
    - Right: Selected session detail (variance strip, item table, row editor)
    - Contains: Count identity, variance summary, editable item table, إكمال الجرد button
    - Bottom sheet on mobile (<768px)
  
  Tab 3: Reconciliation (تسوية الحسابات)
    - Single column: reconciliation form and confirmation (MOVED FROM SETTINGS)
    - This is the only owner of reconciliation (per Decision 1)
  
  Tab 4: History (السجل)
    - Two accordions: آخر الجردات | آخر التسويات
    - Stacked instead of side-by-side

Implementation Steps:

**Step 1: CSS Structure (app/globals.css)**
  Add new class definitions:
    .inventory-page__tabs {
      display: flex;
      gap: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: var(--spacing-lg);
      overflow-x: auto;
    }
    
    .inventory-page__tab {
      padding: var(--spacing-md) var(--spacing-lg);
      border: none;
      background: transparent;
      cursor: pointer;
      font-weight: 500;
      color: var(--color-text-muted);
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
      &.is-active {
        color: var(--color-text);
        border-bottom-color: var(--color-primary);
      }
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    }
    
    .inventory-page__tab-panel {
      display: none;
      &.is-active {
        display: block;
      }
    }
    
    .inventory-page__split {
      display: grid;
      grid-template-columns: 2fr 3fr;
      gap: 24px;
      @media (max-width: 1199px) {
        grid-template-columns: 1fr;
      }
      @media (max-width: 767px) {
        grid-template-columns: 1fr;
      }
    }
    
    .inventory-page__accordion {
      margin-bottom: var(--spacing-lg);
    }
    
    .inventory-page__accordion-header {
      padding: var(--spacing-md);
      background: var(--color-bg-muted);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      &.is-expanded {
        background: var(--color-bg-selected);
      }
    }
    
    .inventory-page__accordion-content {
      display: none;
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-top: none;
      &.is-expanded {
        display: block;
      }
    }

**Step 2: JSX Structure (inventory-workspace.tsx)**
  Refactor from mode-based to tab-based:
    
    1. Keep existing state but change activeMode to activeTab
    2. Create tab list:
       <div role="tablist" className="inventory-page__tabs">
         <button role="tab" aria-selected={activeTab === 'create'} ...>إنشاء جردة جديدة</button>
         <button role="tab" aria-selected={activeTab === 'active'} ...>الجلسات المفتوحة</button>
         <button role="tab" aria-selected={activeTab === 'reconciliation'} ...>تسوية الحسابات</button>
         <button role="tab" aria-selected={activeTab === 'history'} ...>السجل</button>
       </div>
    
    3. Tab 1: Create Count panel
       <div id="tab-create" role="tabpanel" className={`inventory-page__tab-panel ${activeTab === 'create' ? 'is-active' : ''}`}>
         {/* Existing create flow JSX */}
       </div>
    
    4. Tab 2: Active Counts panel (two-column)
       <div id="tab-active" role="tabpanel" className={`inventory-page__tab-panel ${activeTab === 'active' ? 'is-active' : ''}`}>
         <div className="inventory-page__split">
           {/* LEFT: sessions list */}
           <div>
             {/* List of open sessions with status badges */}
           </div>
           {/* RIGHT: selected session detail */}
           <div>
             {/* Variance strip */}
             {/* Item table (editable rows) */}
             {/* إكمال الجرد button */}
           </div>
         </div>
       </div>
    
    5. Tab 3: Reconciliation panel (NEW — moved from Settings)
       <div id="tab-reconciliation" role="tabpanel" className={`inventory-page__tab-panel ${activeTab === 'reconciliation' ? 'is-active' : ''}`}>
         {/* Account reconciliation form */}
         {/* Account list, account balance inputs */}
         {/* Reconcile button + confirmation */}
       </div>
    
    6. Tab 4: History panel (accordions)
       <div id="tab-history" role="tabpanel" className={`inventory-page__tab-panel ${activeTab === 'history' ? 'is-active' : ''}`}>
         <div className="inventory-page__accordion">
           <button className="inventory-page__accordion-header"
             onClick={() => toggleAccordion('counts')}
             aria-expanded={expandedAccordions['counts']}
           >
             آخر الجردات
             <ChevronDown />
           </button>
           {expandedAccordions['counts'] && (
             <div className="inventory-page__accordion-content">
               {/* Past count sessions */}
             </div>
           )}
         </div>
         <div className="inventory-page__accordion">
           <button className="inventory-page__accordion-header"
             onClick={() => toggleAccordion('reconciliations')}
             aria-expanded={expandedAccordions['reconciliations']}
           >
             آخر التسويات
             <ChevronDown />
           </button>
           {expandedAccordions['reconciliations'] && (
             <div className="inventory-page__accordion-content">
               {/* Past reconciliation records */}
             </div>
           )}
         </div>
       </div>
    
    7. Key changes:
       - Reconciliation form: MOVE from Settings-ops.tsx (import if needed or duplicate form)
       - Inventory Completion button: Move from Settings-ops.tsx (import or duplicate)
       - Active Counts detail: Keep as is, just wrap in two-column grid
       - All existing logic preserved

**Step 3: Accessibility Requirements**
  - Tab list: role="tablist", keyboard navigation (Tab, arrow keys)
  - Tab panels: role="tabpanel", aria-labelledby
  - Accordion headers: aria-expanded
  - Two-column on desktop, stack on mobile
  - Focus visible: 3px ring on tabs and accordion headers
  - Screen reader: announces tab name and selected tab

**Step 4: Test Expectations**
  - Verify: 4 tabs visible (Create Count, Active Counts, Reconciliation, History)
  - Verify: Active Counts shows two-column split on desktop
  - Verify: Active Counts stacks vertically on tablet
  - Verify: Active Counts shows bottom sheet on mobile
  - Verify: Reconciliation tab is functional (form inputs, submit button)
  - Verify: History tab shows 2 accordions
  - Verify: All inventory operations functional (create, edit, complete, reconcile)
  - Verify: tsc passes
  - Verify: vitest passes

**Step 5: Protected Selectors**
  ✅ .inventory-page__* (preserve all existing)
  ✅ Protected test locators from CLAUDE.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 3.2 — Maintenance: 3-Tab Structure + Queue Search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: components/dashboard/maintenance-workspace.tsx
File: app/globals.css (new .maintenance-page__* styles)

Change: Restructure from section-based to 3-tab interface with queue search:
  
  Tab 1: Overview (الملخص)
    - Summary cards, maintenance accounts, result feedback
    - Single column
  
  Tab 2: New Order (طلب جديد)
    - Create form and success state
    - Single column
  
  Tab 3: Jobs (أوامر الصيانة)
    - Two-column split: job queue left 60% | detail right 40%
    - Left: Queue search/filter bar + job list with status summary
    - Right: Selected job detail (notes, amounts, account, status actions, cancel button)
    - Queue search: filter by customer name, device, job number, or status

Implementation Steps:

**Step 1: CSS Structure (app/globals.css)**
  Add new class definitions:
    .maintenance-page__tabs {
      display: flex;
      gap: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: var(--spacing-lg);
    }
    
    .maintenance-page__tab {
      padding: var(--spacing-md) var(--spacing-lg);
      border: none;
      background: transparent;
      cursor: pointer;
      font-weight: 500;
      color: var(--color-text-muted);
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
      &.is-active {
        color: var(--color-text);
        border-bottom-color: var(--color-primary);
      }
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    }
    
    .maintenance-page__tab-panel {
      display: none;
      &.is-active {
        display: block;
      }
    }
    
    .maintenance-page__split {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 24px;
      @media (max-width: 1199px) {
        grid-template-columns: 1fr;
      }
    }
    
    .maintenance-page__queue-search {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--color-bg-muted);
      border-radius: 8px;
    }
    
    .maintenance-page__queue-search input {
      flex: 1;
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-bg);
    }

**Step 2: JSX Structure (maintenance-workspace.tsx)**
  Refactor from section-based to tab-based:
    
    1. Change activeSection state to activeTab
    2. Add queueSearch state for filtering jobs
    3. Create tab list:
       <div role="tablist" className="maintenance-page__tabs">
         <button role="tab" aria-selected={activeTab === 'overview'} ...>الملخص</button>
         <button role="tab" aria-selected={activeTab === 'new-order'} ...>طلب جديد</button>
         <button role="tab" aria-selected={activeTab === 'jobs'} ...>أوامر الصيانة</button>
       </div>
    
    3. Tab 1: Overview panel
       <div id="tab-overview" role="tabpanel" className={`maintenance-page__tab-panel ${activeTab === 'overview' ? 'is-active' : ''}`}>
         {/* Summary cards */}
         {/* Maintenance accounts */}
         {/* Result feedback */}
       </div>
    
    4. Tab 2: New Order panel
       <div id="tab-new-order" role="tabpanel" className={`maintenance-page__tab-panel ${activeTab === 'new-order' ? 'is-active' : ''}`}>
         {/* Create form JSX */}
       </div>
    
    5. Tab 3: Jobs panel (two-column with search)
       <div id="tab-jobs" role="tabpanel" className={`maintenance-page__tab-panel ${activeTab === 'jobs' ? 'is-active' : ''}`}>
         <div className="maintenance-page__split">
           {/* LEFT: queue search + list */}
           <div>
             <div className="maintenance-page__queue-search">
               <input
                 type="text"
                 placeholder="ابحث برقم الطلب، العميل، الجهاز، الحالة"
                 value={queueSearch}
                 onChange={(e) => setQueueSearch(e.target.value)}
                 aria-label="بحث أوامر الصيانة"
               />
               <button onClick={() => setQueueSearch('')}>مسح</button>
             </div>
             {/* Filtered job list */}
             {filteredJobs.map(job => (
               <JobListItem
                 key={job.id}
                 job={job}
                 isSelected={selectedJobId === job.id}
                 onClick={() => setSelectedJobId(job.id)}
               />
             ))}
           </div>
           {/* RIGHT: selected job detail */}
           <div>
             {selectedJob && (
               <JobDetail
                 job={selectedJob}
                 onUpdate={handleJobUpdate}
               />
             )}
           </div>
         </div>
       </div>
    
    6. Queue search logic:
       const filteredJobs = useMemo(() => {
         if (!queueSearch) return jobs;
         const normalized = queueSearch.toLowerCase();
         return jobs.filter(job =>
           job.customer.toLowerCase().includes(normalized) ||
           job.device.toLowerCase().includes(normalized) ||
           job.job_number.includes(normalized) ||
           job.status.toLowerCase().includes(normalized)
         );
       }, [queueSearch, jobs]);

**Step 3: Accessibility Requirements**
  - Tab list: role="tablist"
  - Queue search: aria-label, placeholder text
  - Two-column responsive behavior
  - Focus visible on all interactive elements
  - Screen reader: announces tab, search input, job selections

**Step 4: Test Expectations**
  - Verify: 3 tabs visible (Overview, New Order, Jobs)
  - Verify: Overview shows summary cards
  - Verify: New Order shows create form
  - Verify: Jobs tab shows two-column split (queue + detail)
  - Verify: Queue search filters by customer/device/number/status
  - Verify: Selecting job shows detail on right
  - Verify: All job operations functional (create, edit, status change, cancel)
  - Verify: tsc passes
  - Verify: vitest passes

**Step 5: Protected Selectors**
  ✅ .maintenance-page__* (preserve all existing)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 3.3 — Invoice Detail: Section Hierarchy + Progressive Disclosure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: components/dashboard/invoice-detail.tsx
File: app/globals.css (new .invoice-page__* styles)

Change: Restructure secondary rail from competing actions to ordered section hierarchy:
  
  Current: Overview | Returns | Admin sections with side rail actions mixed with content
  
  New: Keep sections, but reorganize side rail by section:
    - Overview section: secondary rail = one ordered output panel (link state, sharing, WhatsApp)
    - Returns section: secondary becomes ordered (item selection first, form below, history bottom)
    - Admin section: isolated danger panel
  
  Progressive disclosure: Return form options hidden until items selected

Implementation Steps:

**Step 1: CSS Structure (app/globals.css)**
  Add new class definitions:
    .invoice-page__section {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      margin-bottom: var(--spacing-lg);
      @media (min-width: 1200px) {
        grid-template-columns: 3fr 2fr;
      }
    }
    
    .invoice-page__primary {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }
    
    .invoice-page__secondary {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }
    
    .invoice-page__secondary-panel {
      padding: var(--spacing-lg);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-bg-muted);
    }
    
    .invoice-page__secondary-title {
      font-weight: 600;
      margin-bottom: var(--spacing-md);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
    }
    
    .invoice-page__return-items {
      margin-bottom: var(--spacing-lg);
    }
    
    .invoice-page__return-item {
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      margin-bottom: var(--spacing-sm);
      cursor: pointer;
      &.is-selected {
        background: var(--color-bg-selected);
        border-color: var(--color-primary);
      }
    }
    
    .invoice-page__return-form {
      display: none;
      &.is-visible {
        display: block;
        padding: var(--spacing-lg);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-bg);
      }
    }
    
    .invoice-page__return-history {
      display: none;
      &.is-expanded {
        display: block;
      }
    }
    
    .invoice-page__danger-panel {
      padding: var(--spacing-lg);
      border: 2px solid var(--color-error);
      border-radius: 8px;
      background: color-mix(in srgb, var(--color-error) 5%, var(--color-bg));
    }
    
    .invoice-page__danger-title {
      color: var(--color-error);
      font-weight: 600;
      margin-bottom: var(--spacing-md);
    }

**Step 2: JSX Structure (invoice-detail.tsx)**
  Restructure sections with progressive disclosure:
    
    1. Section 1: Overview (primary + secondary)
       <div className="invoice-page__section" id="overview">
         <div className="invoice-page__primary">
           {/* Invoice card with summary */}
         </div>
         <div className="invoice-page__secondary">
           <div className="invoice-page__secondary-panel">
             <h3 className="invoice-page__secondary-title">المشاركة والإجراءات</h3>
             {/* Link state display */}
             {/* Share button */}
             {/* WhatsApp button */}
           </div>
         </div>
       </div>
    
    2. Section 2: Returns (primary + secondary with progressive disclosure)
       <div className="invoice-page__section" id="returns">
         <div className="invoice-page__primary">
           {/* Invoice card (read-only in returns context) */}
           {/* Return status if already returned */}
         </div>
         <div className="invoice-page__secondary">
           {/* Step 1: Item selection (always visible) */}
           <div className="invoice-page__secondary-panel">
             <h3 className="invoice-page__secondary-title">المنتجات القابلة للإرجاع</h3>
             <div className="invoice-page__return-items">
               {items.map(item => (
                 <div
                   key={item.id}
                   className={`invoice-page__return-item ${selectedReturnItems.includes(item.id) ? 'is-selected' : ''}`}
                   onClick={() => toggleReturnItem(item.id)}
                   role="checkbox"
                   aria-checked={selectedReturnItems.includes(item.id)}
                 >
                   {/* Item checkbox and info */}
                 </div>
               ))}
             </div>
           </div>
           
           {/* Step 2: Return form (shown only if items selected) */}
           {selectedReturnItems.length > 0 && (
             <div className="invoice-page__return-form is-visible">
               {/* Return reason */}
               {/* Financial options (refund/credit) */}
               {/* Submit button */}
             </div>
           )}
           
           {/* Step 3: Return history (collapsible, shown always) */}
           <div className="invoice-page__secondary-panel">
             <button
               className="invoice-page__secondary-title"
               onClick={() => toggleReturnHistory()}
               aria-expanded={returnHistoryExpanded}
             >
               سجل الإرجاعات
               <ChevronDown className={returnHistoryExpanded ? 'rotate' : ''} />
             </button>
             {returnHistoryExpanded && (
               <div className="invoice-page__return-history is-expanded">
                 {/* Past returns list */}
               </div>
             )}
           </div>
         </div>
       </div>
    
    3. Section 3: Admin (isolated danger panel)
       <div className="invoice-page__section" id="admin">
         <div className="invoice-page__primary">
           {/* Invoice card for context */}
         </div>
         <div className="invoice-page__secondary">
           <div className="invoice-page__danger-panel">
             <h3 className="invoice-page__danger-title">إجراء خطر: إلغاء الفاتورة</h3>
             <p>إلغاء الفاتورة سيؤثر على الأرصدة والسجلات المرتبطة بها.</p>
             {/* Cancel invoice form */}
             {/* Confirmation required */}
           </div>
         </div>
       </div>

**Step 3: Accessibility Requirements**
  - Section hierarchy: use semantic structure (h2, h3 headings)
  - Progressive disclosure: aria-expanded on expandable sections
  - Return items: role="checkbox" with aria-checked
  - Danger panel: aria-live="polite" for confirmation messages
  - Focus visible on all interactive elements

**Step 4: Test Expectations**
  - Verify: 3 sections visible (Overview, Returns, Admin)
  - Verify: Overview shows invoice + secondary rail (share/WhatsApp actions)
  - Verify: Returns section shows item selection first
  - Verify: Return form appears only after items selected
  - Verify: Return history is collapsible
  - Verify: Admin section shows danger panel with warning
  - Verify: All invoice operations functional (share, return, cancel)
  - Verify: tsc passes
  - Verify: vitest passes

**Step 5: Protected Selectors**
  ✅ .invoice-page__* (preserve all existing)

CONSTRAINTS:
  - Do NOT rename protected class names
  - Do NOT change API endpoints
  - Do NOT modify test files
  - RTL-safe: use logical properties
  - No hardcoded colors; use --color-* tokens
  - Preserve all existing functionality
  - Keyboard and ARIA accessibility required
  - Progressive disclosure: hidden until preconditions met

DONE_IF:
  ✅ Inventory: 4 tabs visible (Create, Active, Reconciliation, History)
  ✅ Inventory: Active Counts shows two-column split on desktop
  ✅ Inventory: Reconciliation tab functional (form, submit)
  ✅ Inventory: History shows 2 accordions
  ✅ Maintenance: 3 tabs visible (Overview, New Order, Jobs)
  ✅ Maintenance: Jobs tab shows two-column split
  ✅ Maintenance: Queue search filters by customer/device/number/status
  ✅ Invoice Detail: 3 sections visible (Overview, Returns, Admin)
  ✅ Invoice Detail: Return form appears only after item selection
  ✅ Invoice Detail: Admin section shows danger panel
  ✅ All operations functional (create, edit, delete, complete)
  ✅ tsc clean
  ✅ Build succeeds
  ✅ E2E tests run

ESCALATE_IF:
  - Cannot move reconciliation from Settings to Inventory
  - Two-column splits conflict with existing layouts
  - Progressive disclosure state management too complex
  - E2E test failures indicate breaking changes

═══ EXECUTION_RESULT ═══
(Codex writes results here after execution)

---

# ═════════════════════════════════════════════════════════════
# WAVE 4 — SUPPORTING OPERATIONAL + ANALYTICAL SCREENS
# ═════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# ► CURRENT TASK ◄  Wave 4 (Tasks 4.1–4.5) — Notifications, POS, Products, Debts, Invoices Filters
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-09-WAVE-4
TASK_TYPE      : restructure (moderate-complex)
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Execute Notifications (3-tab + progressive disclosure), POS refinement,
                 Products/Debts improvements, and Invoices list filters
DEPENDS_ON     : Wave 3 complete + RESTRUCTURE_PLAN.md (Decision 10–14)
```

GOAL :
  Execute five moderately complex restructures:
  
  4.1 — Notifications: 3-tab structure (Inbox, Alerts, Search)
        with collapsible filter panel (progressive disclosure)
  
  4.2 — POS: Checkout state refinements (simplify cart overlay)
  
  4.3 — Products: Visual and navigational improvements
  
  4.4 — Debts: Workspace clarity improvements
  
  4.5 — Invoices: Add sticky filter header with active filter chips
  
  These implement Decision 10–14 from RESTRUCTURE_PLAN.md.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO READ:
  1. `New/RESTRUCTURE_PLAN.md` § Notifications Restructuring Plan
  2. `New/RESTRUCTURE_PLAN.md` § POS Restructuring Plan
  3. `New/RESTRUCTURE_PLAN.md` § Products Restructuring Plan
  4. `New/RESTRUCTURE_PLAN.md` § Debts Restructuring Plan
  5. `New/RESTRUCTURE_PLAN.md` § Invoices List Filters Enhancement Plan
  6. `components/dashboard/notifications-workspace.tsx`
  7. `components/pos/pos-workspace.tsx`
  8. `components/dashboard/products-browser.tsx`
  9. `components/dashboard/debts-workspace.tsx`
  10. `components/dashboard/invoices-workspace.tsx`
  11. Test files: px13-search-alerts.spec.ts, px22-transactional-ux.spec.ts, px23-operational-workspaces.spec.ts

QUICK NOTES:
  - 4.1 Notifications: 3 tabs, collapsible filters (closed by default)
  - 4.2 POS: No structural changes, only cart state simplifications
  - 4.3 Products: Polish category navigation, improve product grid density
  - 4.4 Debts: Workspace layout improvements (tab consistency with other screens)
  - 4.5 Invoices: Add sticky filter header with chips (status, date range, amount range)

IMPLEMENTATION:

**Task 4.1 — Notifications: 3-Tab + Collapsible Filters**

File: components/dashboard/notifications-workspace.tsx, app/globals.css

Restructure:
  - Tab 1: Inbox (main queue) | collapsible filter panel (closed by default)
  - Tab 2: Alerts (summary cards)
  - Tab 3: Search (toolbar + grouped results)

CSS classes: .notifications-page__tabs, .notifications-page__filter-collapse, .notifications-page__filter-content

Key: Filter panel is collapsed by default, toggles with click.

**Task 4.2 — POS: Checkout State Refinement**

File: components/pos/pos-workspace.tsx, components/pos/view/pos-checkout-panel.tsx

Change:
  - Simplify checkout overlay state transitions
  - Remove redundant confirm states
  - Keep existing split layout (no structural change)

No CSS changes. Logic refinement only.

**Task 4.3 — Products: Category Navigation + Grid Density**

File: components/dashboard/products-browser.tsx, app/globals.css

Change:
  - Sticky category chip bar (same as current)
  - Product grid: improve responsive density (better use of space on tablet)
  - Add visual feedback on category selection

CSS: Refine .products-page__grid responsive breakpoints.

**Task 4.4 — Debts: Workspace Tab Consistency**

File: components/dashboard/debts-workspace.tsx, app/globals.css

Change:
  - Convert to 2-tab structure (Payment, History) to match other operational workspaces
  - Maintain existing debt list + detail split
  - Payment form in first tab

CSS: Add .debts-page__tabs, .debts-page__tab-panel

**Task 4.5 — Invoices List: Sticky Filter Header**

File: components/dashboard/invoices-workspace.tsx, app/globals.css

Add:
  - Sticky filter header above invoice list (closed by default)
  - Filter chips: Status (all/active/returned/cancelled), Date range (7d/30d/90d/custom), Amount range (optional)
  - Selected filters shown as dismissible chips below header
  - "Clear all filters" button
  - Client-side filtering (no API changes)

CSS: .invoices-page__filters (sticky, closed by default)

CONSTRAINTS:
  - No structural breaking changes
  - All existing functionality preserved
  - Keyboard and ARIA accessibility
  - RTL-safe
  - No hardcoded colors

DONE_IF:
  ✅ Notifications: 3 tabs, collapsible filters (working)
  ✅ POS: Checkout state simplified
  ✅ Products: Category nav + grid density improved
  ✅ Debts: 2-tab structure implemented
  ✅ Invoices: Sticky filters added (status, date, amount)
  ✅ All operations functional
  ✅ tsc clean
  ✅ Build succeeds
  ✅ E2E tests pass

═══ EXECUTION_RESULT ═══
(Codex writes results here after execution)

---

# ═════════════════════════════════════════════════════════════
# WAVE 5 — POLISH + FINALIZATION
# ═════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# ► CURRENT TASK ◄  Wave 5 (Tasks 5.1–5.3) — Loading Screen, Accessibility Polish, Final Hardening
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-09-WAVE-5
TASK_TYPE      : polish + hardening
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Dashboard loading shell, accessibility final pass, regression hardening
DEPENDS_ON     : Wave 4 complete + all prior waves
```

GOAL :
  Execute final polish and hardening:
  
  5.1 — Dashboard Loading Screen: Update skeleton to match current topbar navigation
  
  5.2 — Accessibility Final Pass: Audit all new tabs/accordions/splits for WCAG compliance
  
  5.3 — Regression Hardening: Full test suite run + fix any unexpected failures
  
  This closes the restructuring project with verified quality gates.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO READ:
  1. `New/RESTRUCTURE_PLAN.md` § Dashboard Loading Screen Restructuring Plan
  2. `ai-system/ACCESSIBILITY_AUDIT.md` — complete audit checklist
  3. `app/(dashboard)/loading.tsx` — current skeleton
  4. All pages' test files: px18-visual-accessibility.spec.ts, smoke.spec.ts, device-qa.spec.ts

QUICK NOTES:
  - 5.1 Loading: Replace sidebar skeleton with topbar-aligned shell (topbar + content panels)
  - 5.2 A11y: Focus indicators, keyboard nav, contrast, touch targets, screen reader labels
  - 5.3 Hardening: Full test suite, fix regressions (tsc, vitest, e2e, build)

IMPLEMENTATION:

**Task 5.1 — Dashboard Loading Shell**

File: app/(dashboard)/loading.tsx, app/globals.css

Change:
  - Remove sidebar skeleton (no longer used)
  - Add topbar skeleton (menu button, title, action buttons)
  - Add content panel skeletons matching each dashboard page pattern
  - Keep neutral Aya shell styling

Structure:
  1. Shell: topbar skeleton (light bars)
  2. Summary: 3-4 stat card skeletons
  3. Content: 1 dominant panel + supporting panels

**Task 5.2 — Accessibility Final Audit**

Run:
  1. Manual keyboard nav audit: Tab through all new tabs/accordions
  2. Screen reader test: Chrome DevTools + NVDA (if on Windows)
  3. Contrast check: Color contrast ratio >= WCAG AA (4.5:1 normal text, 3:1 large)
  4. Touch targets: All buttons >= 44×44px
  5. Motion: prefers-reduced-motion respected everywhere
  6. Focus visible: All interactive elements have visible :focus-visible ring

Checklist per screen:
  - Settings: navigator buttons, accordion headers, focus ring visible
  - Reports: tab buttons, filter toggles, focus restoration
  - Suppliers: tab buttons, two-column focus order
  - Portability: tab buttons, step visibility announcements
  - Inventory: tab buttons, session selection, focus trap in detail
  - Maintenance: tab buttons, queue search input, job selection
  - Invoice Detail: section anchors, return item checkboxes, danger panel warning
  - Notifications: tab buttons, filter toggle, search input
  - Debts: tab buttons, debt selection
  - Invoices: filter chips, dismissible buttons, clear all button

**Task 5.3 — Regression Hardening**

Run full test suite:
  1. `npx tsc --noEmit --pretty false` — must be zero errors
  2. `npm run build` — must succeed
  3. `npx vitest run` — all tests pass (except known locale-digit failures)
  4. `npx playwright test` — e2e suite full pass
  5. `npx playwright test --ui` — visual regression check (if applicable)

Fix any regressions:
  - If tsc fails: identify and fix type errors
  - If build fails: identify and fix build errors
  - If vitest fails: document which tests need updates (not implementation)
  - If e2e fails: identify scope (in-scope regression vs pre-existing)

Document:
  - Test results: passing/failing counts
  - Any new failures (must be fixed)
  - Pre-existing failures (note for reference)
  - Browser compatibility notes

CONSTRAINTS:
  - No breaking changes
  - All functionality preserved
  - Accessibility WCAG AA minimum
  - Performance: no regressions
  - Browser support: Chrome, Safari, Firefox

DONE_IF:
  ✅ Loading screen updated (topbar shell, content panels)
  ✅ Accessibility audit complete
  ✅ tsc: zero errors
  ✅ npm run build: succeeds
  ✅ vitest: all pass (or documented known failures)
  ✅ e2e: all pass (or pre-existing regressions documented)
  ✅ All features working across desktop/tablet/mobile

FINAL DELIVERY:
  - All Waves 1-5 complete
  - Full test suite passing (or known exclusions documented)
  - All protected selectors preserved
  - All RTL behavior verified
  - All accessibility requirements met
  - Project ready for production release

═══ EXECUTION_RESULT ═══
(Codex writes results here after execution)
