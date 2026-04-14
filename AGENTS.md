# ملخص عربي سريع:
# هذا الملف يحكم Codex. دوره: منفذ فقط.
# الجزء الأول ثابت (القواعد والتعليمات) — لا يُمسح أبداً.
# الجزء الثاني (TASK ZONE) فيه المهمة الحالية — يُستبدل مع كل مهمة جديدة.
#

# AGENTS.md — Codex Governance File
# ... (first 1673 lines unchanged) ...

---

# ═════════════════════════════════════════════════════════════
# ARCHITECTURAL SOURCE OF TRUTH — AYA PACKAGE
# ═════════════════════════════════════════════════════════════
# This section is STANDING and must NEVER be erased between tasks.
# Read it before executing any Task that touches UI, shell, POS,
# Reports, primitives, or design tokens.

The architectural authority for Aya Mobile lives in the **AYA package**:
`تصميم جديد/AYA_00 → AYA_09` (10 files).

## What each file owns

| File | Authority |
|------|-----------|
| **AYA 00** | Index + authority map. Read first. |
| **AYA 01** | Product contract, page archetypes (Operational/Analytical/Management/Detail/Settings), sticky budget per archetype, width authority per archetype. |
| **AYA 02** | POS final spec. Toolbar is **local to POS workspace**, NOT injected into shell topbar. Payment is an isolated surface. Customer/debt hidden by default. Split payments preserved. Held carts preserved. |
| **AYA 03** | Shell rules, width hierarchy (`--width-operational` / `--width-analytical: 1400px` / `--width-management: 1600px` / `--width-detail: 1100px` / `--width-settings: 900px`), 4 structural surface levels + 7 semantic surface roles, primitive specs (PageHeader / CommandBar / FilterDrawer / MetricCard / ContextPanel / Toolbar), RTL rules, accessibility rules. |
| **AYA 04** | Post-POS roadmap: Reports → Management → Detail → Settings. |
| **AYA 05** | Technical execution plan: 8 phases (Phase 0 authority sync → Phase 7 Reports). Includes **mandatory test protection protocol** (§6). |
| **AYA 06** | Acceptance criteria + anti-hallucination rules **H-01 through H-12**. Read before declaring any Task done. |
| **AYA 07** | Non-technical owner review guide (owner uses this to reject/accept your work). |
| **AYA 08** | Bridge document between AYA, `DESIGN_SYSTEM.md`, and the code. Glossary + mapping + conflict resolution. |
| **AYA 09** | Primitive API reference — props, slots, a11y hooks, test IDs per primitive. Read before touching ANY primitive. |

## Your reading obligation as Codex

Before executing any Task that touches:

- `components/pos/**` or `app/(dashboard)/pos/**` → read **AYA 02 + AYA 03 + AYA 05 + AYA 06**
- `components/dashboard/reports-**` or `app/(dashboard)/reports/**` → read **AYA 01 §6 + AYA 03 §14 + AYA 04 + AYA 06**
- `app/globals.css` shell/width/surface rules → read **AYA 03 + AYA 08**
- `components/ui/**` or any primitive → read **AYA 03 §8 + AYA 09 + AYA 08**
- Any visible Arabic string, CSS class name, or aria-label → follow **AYA 05 §6 test protection protocol** BEFORE editing

## Split of authority (when sources appear to conflict)

| Question type | Authority |
|---------------|-----------|
| Color value, font token, radius, numeric z-index, spacing primitive | `ai-system/DESIGN_SYSTEM.md` (§1–15) |
| Archetype, width policy, surface role, flow, primitive usage | **AYA** (01 / 03) |
| Payment / cart / customer / debt / held carts / API shape | **Code truth** (stores, API routes, validators) |
| Visible strings, CSS selectors, DOM stability | **Tests** (`tests/e2e/`, `tests/unit/`) |

When uncertain → go to **AYA 08 §11** before deciding.

## Anti-hallucination rules (H-rules from AYA 06)

You MUST NOT:
- **H-01** Remove a feature under the banner of "simplification" without explicit owner approval
- **H-02** Change payment/cart/customer/debt logic without verifying API + store + UI + success + error states
- **H-03** Solve a shell-level width/spacing problem with a local page patch
- **H-04** Replace existing domain state with a generic reducer "for cleanliness"
- **H-05** Change visible Arabic strings / CSS classes / selectors without grepping `tests/e2e/` first
- **H-06** Create a second token authority inside AYA or inside a page
- **H-07** Invent a new z-index scale when `DESIGN_SYSTEM.md §10` already has one
- **H-08** Rebuild SectionCard or any existing primitive from scratch without explicit approval
- **H-09** Treat a local patch as success when the root cause is system-level
- **H-10** Move a feature from visible to hidden by guessing it's "rare"
- **H-11** Break RTL with hardcoded `left/right` shortcuts
- **H-12** Accept an implementation that gained simplicity but lost domain clarity or financial correctness

## Non-negotiable before any refactor

1. Read AYA 05 §6 — **Test Protection Protocol**
2. Grep `tests/e2e/` and `tests/unit/` for every class/string/selector you intend to touch
3. Read the matching test files in full
4. Preserve the domain logic listed in AYA 05 §4.1 (Preservation Map)
5. If a conflict exists between AYA and existing tests → **stop and report**, do not silently proceed

---

# ═════════════════════════════════════════════════════════════
# PHASE 11 — FINAL REVIEW WAVE (11A Codex part + 11D handoff)
# ═════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# ► CURRENT TASK ◄  Pre-merge code review — 3 feature branches
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-14-PHASE-11-PRE-MERGE-REVIEW
TASK_TYPE      : code-review
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Review 3 feature branches before merging to main.
                 Ensure no conflicts with Phase 11A work.
DEPENDS_ON     : Phase 11A (just completed)
```

PROBLEM:
  User has made changes on 3 separate feature branches:
    1. jules-10117282193908954070-1bbd368c
    2. jules-codebase-fixes-17955483563294792415
    3. fix-login-timeout-rejection-2412456455566730822
  
  Before merging, need a comprehensive review to:
    - Detect conflicts with Phase 11A (performance regression fix)
    - Verify code quality and AYA compliance
    - Assess risk level and provide merge recommendation

GOAL:
  For each branch:
    1. Read all changed files via `git diff main..BRANCH_NAME`
    2. Analyze what changed and why
    3. Check for conflicts with Phase 11A changes:
       - pos-workspace.tsx (debounce/deferred removal)
       - app/api/pos/products/route.ts (count optimization)
       - hooks/use-products.ts (totalCount handling)
    4. Assess code quality (AYA compliance, architecture fit)
    5. Provide risk assessment and recommendation

FILES_TO_CHECK:
  - git diff main..jules-10117282193908954070-1bbd368c
  - git diff main..jules-codebase-fixes-17955483563294792415
  - git diff main..fix-login-timeout-rejection-2412456455566730822

EXECUTION_RESULT FORMAT:
  For each branch:
    1. BRANCH_NAME
    2. CHANGED_FILES (list)
    3. WHAT_CHANGED (summary)
    4. CONFLICT_ANALYSIS (will it break Phase 11A?)
    5. QUALITY_ASSESSMENT (code quality + AYA fit)
    6. RISK_LEVEL (Low / Medium / High)
    7. RECOMMENDATION (Safe to merge / Merge with fixes / Do not merge)
  
  Final verdict:
    - All 3 branches: Safe to merge together? ✅ / ⚠️ / ❌
    - Suggested merge order
    - Any post-merge actions needed

═══ END_OF_TASK_SPEC ═══

# ══════════════════════════════════════════════════════════════
# ► PREVIOUS TASK ◄  AYA doc updates + full E2E sweep + CI re-enable
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-14-PHASE-11A-DOCS-AND-FULL-VERIFICATION
TASK_TYPE      : docs + verification
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : AYA package updates + full E2E sweep + GitHub CI re-enable.
                 No application code changes (except small CI config edits).
DEPENDS_ON     : Phase 10 (pending review/commit), Phase 9 (32e3597),
                 Phase 8A (2f3ff16)

NOTE_TO_PLANNER (Claude):
  Phase 11 has FOUR sub-tasks total. Only 11A is routed to Codex here.
  11B is routed to Gemini (final design review) — written in GEMINI.md.
  11C is the owner manual review, performed by the user (no agent).
  11D is the Claude/owner sign-off step that closes the wave — Claude
  updates BRANCH_SUMMARY.md and ROUTING_LOG.md after 11A/11B/11C are
  green. Do NOT execute 11B/11C/11D as Codex.
```

PROBLEM        :
  After Phases 8A/8B/9/10, the POS UX refactor is done in code, but the
  AYA package documentation still describes the OLD multi-screen flow
  as the canonical golden path. Specifically:
    - AYA 02 still treats the cart-review-view as the primary cart
      surface on desktop, with no mention of the sticky cart rail.
    - AYA 02 still treats the full payment overlay as the only payment
      entry point — no mention of the smart default payment action.
    - AYA 06 H-rules do not yet have a rule about progressive
      disclosure (when collapsing-by-default is acceptable vs. when it
      crosses into hiding-by-guessing, which H-10 already forbids).
    - BRANCH_SUMMARY.md is one wave behind.
  In addition, the GitHub CI workflow that runs Playwright on every
  push has been intentionally paused since before Phase 7. The user
  wants it re-enabled now that the system is stable, AFTER a single
  authoritative full E2E sweep proves the current main is green.

  Phase 11A closes all of the above so that the AYA documentation,
  the test suite execution record, and the CI gating all reflect
  reality before the wave is signed off.

GOAL           :

  ─────────────────────────────────────────────────────────────
  Sub-task 11A.1 — Update AYA package to reflect the new flow
  ─────────────────────────────────────────────────────────────
  1. Read `تصميم جديد/AYA_02` (POS spec) IN FULL before editing.
  2. Update AYA_02 to describe the NEW canonical desktop flow:
       • Sticky cart rail is the canonical cart surface on ≥720px
         (container width, not viewport).
       • cart-review-view remains the canonical cart surface on
         <720px (mobile).
       • Smart default payment action is the primary CTA in the rail
         footer. The full payment overlay is reachable only via the
         secondary `خيارات دفع أخرى` link.
       • Payment overlay is now a progressive-disclosure surface:
         method picker + amount + confirm visible, advanced sections
         collapsed by default, smart auto-expand on action selection.
       • Visible close button in the overlay header.
     PRESERVE every existing rule in AYA_02 that is still true (held
     carts, split payments, debt rules, customer attach semantics,
     financial correctness rules, etc.). The refactor is UX surface,
     not domain.
  3. Read `تصميم جديد/AYA_06` (H-rules + acceptance criteria) IN FULL.
     Add a NEW rule (next number after H-12, so H-13) that codifies
     the difference between progressive disclosure (acceptable: every
     field is still rendered in DOM and reachable via a single
     deterministic action) and hiding-by-guessing (forbidden by H-10,
     where a feature is moved out of the discoverable surface based
     on a guess that it is "rare"). The new rule must explicitly
     state: "Collapsing a field behind a labeled, keyboard-reachable
     `<details>` summary that auto-expands on the relevant user
     action is progressive disclosure and is allowed. Removing a
     field from the DOM, or hiding it behind a non-discoverable
     gesture, is hiding-by-guessing and remains forbidden by H-10."
  4. Read `تصميم جديد/AYA_00` (index/authority map). Update the brief
     description of AYA_02 if the wording about "POS final spec"
     needs to mention the rail/smart-default refinement. Keep edits
     minimal — AYA_00 is a map, not a spec.
  5. Update `ai-system/BRANCH_SUMMARY.md`:
       • Add Phase 8A / 8B / 9 / 10 to the wave history with their
         respective commit hashes (8A: 2f3ff16, 8B+9: 32e3597, 10:
         current pending commit).
       • Update "current state" to "Phase 11 in progress: docs +
         verification + Gemini final review + owner sign-off".
       • Append the last 5 routing decisions (or update if the file
         already tracks them) — Codex got 8A, 8B, 9, 10, 11A;
         Gemini gets 11B.
  6. DO NOT touch other AYA files (01, 03, 04, 05, 07, 08, 09) unless
     a sentence in one of them directly contradicts the new rail/
     smart-default flow. If you find such a sentence, fix ONLY that
     sentence and document the edit in EXECUTION_RESULT. Do not
     freelance.

  ─────────────────────────────────────────────────────────────
  Sub-task 11A.2 — Full Playwright E2E sweep
  ─────────────────────────────────────────────────────────────
  1. Run the COMPLETE Playwright suite once against the current
     working tree (Phase 10 changes still uncommitted is OK; Codex
     should base on whatever is in working tree).
  2. Command: `npx playwright test --workers=1` (single worker to
     avoid port conflicts on the local dev server).
  3. Capture the result. Expected: ALL specs pass.
  4. If ANY spec fails:
       (a) Diagnose the root cause. Is it a real regression caused
           by Phase 8/9/10, or a stale assertion left over from
           before the refactor wave?
       (b) For real regressions: STOP, escalate, do NOT silently
           "fix" the test. Report the failure in EXECUTION_RESULT.
       (c) For stale assertions: fix the test to match the new
           correct behavior, document each test edit in
           EXECUTION_RESULT with before/after of the assertion and
           the reasoning.
  5. After the suite is green, also run:
       • `npx tsc --noEmit --pretty false` → must be zero output
       • `npx vitest run` → must all pass
       • `npm run build` → must succeed (this is the FIRST time we
         run a production build since the refactor wave started;
         it will catch any SSR/dynamic import issues that vitest
         and tsc miss)
  6. Record the exact command outputs (or the relevant tail) in
     EXECUTION_RESULT under "Verification".

  ─────────────────────────────────────────────────────────────
  Sub-task 11A.3 — Re-enable GitHub CI Playwright workflow
  ─────────────────────────────────────────────────────────────
  1. Find the GitHub Actions workflow file(s) under `.github/workflows/`.
     Look for the one that runs Playwright (likely named
     `playwright.yml`, `e2e.yml`, `ci.yml`, or similar).
  2. Identify how the workflow is currently disabled. Likely one of:
       • The `on:` trigger has been removed/commented out
       • A `workflow_dispatch` only trigger
       • An `if:` condition that always evaluates false
       • A renamed file (e.g., `playwright.yml.disabled`)
       • The whole job body commented out
  3. Re-enable it to its ORIGINAL trigger conditions. If you cannot
     determine the original trigger from git history (`git log
     --follow .github/workflows/<file>`), use this conservative
     default:
       ```yaml
       on:
         push:
           branches: [main]
         pull_request:
           branches: [main]
       ```
  4. Make sure the workflow:
       • Installs Node + dependencies the same way as the local dev
         setup (check `package.json` engines and any existing
         setup-node action version).
       • Runs `npx playwright install --with-deps` before the test
         step.
       • Runs `npx playwright test` (no `--workers=1` override on CI
         unless the existing config requires it).
       • Uploads the Playwright HTML report as an artifact on
         failure.
  5. DO NOT change any other CI workflow (linting, build, deploy).
     Touch only the Playwright/E2E one.
  6. DO NOT push the change yet — Phase 11A is still pending owner
     sign-off. The CI workflow file edit goes into the same
     uncommitted working tree as the rest of 11A.

FILES          :
  READ:
    - تصميم جديد/AYA_00
    - تصميم جديد/AYA_02
    - تصميم جديد/AYA_06
    - ai-system/BRANCH_SUMMARY.md
    - ai-system/ROUTING_LOG.md       (only to update routing entries)
    - .github/workflows/*.yml        (find the Playwright workflow)
    - components/pos/pos-workspace.tsx       (only to confirm what to
    - components/pos/view/pos-cart-rail.tsx  document — DO NOT EDIT)
    - components/pos/view/payment-checkout-overlay.tsx
    - components/pos/view/pos-checkout-panel.tsx
  EDIT:
    - تصميم جديد/AYA_02
    - تصميم جديد/AYA_06
    - تصميم جديد/AYA_00              (only if its AYA_02 description
                                      needs a one-line update)
    - ai-system/BRANCH_SUMMARY.md
    - ai-system/ROUTING_LOG.md
    - .github/workflows/<the playwright workflow file>
    - tests/e2e/* (ONLY if a real stale assertion is found during the
                   full sweep, with explicit before/after documentation)
  DO NOT EDIT:
    - Any application code under `app/`, `components/`, `stores/`,
      `lib/` (Phase 11A is docs + verification only)
    - Other AYA files (01, 03, 04, 05, 07, 08, 09) unless one of them
      directly contradicts the new flow

IMPLEMENTATION_NOTES :
  - AYA_02 update is the heaviest part. Read the existing file
    completely before editing. Do NOT rewrite the whole file. Make
    surgical edits that ADD the new canonical flow alongside or in
    place of the obsolete description, and update the section that
    used to describe cart-review-view as the desktop surface.
  - When in doubt about wording, prefer the language already used
    elsewhere in AYA (e.g., "canonical surface", "sticky budget",
    "smart default", "progressive disclosure"). Reuse the AYA voice.
  - AYA_06 H-13 must be added in the same numbered list style as
    H-01 through H-12. Match the existing format exactly.
  - For BRANCH_SUMMARY.md, look at how prior phases were recorded
    and follow the same row format (date, phase, commit, status,
    short note). Do NOT invent a new format.
  - For the CI workflow re-enable: prefer the SMALLEST diff that
    restores the original behavior. If the workflow is just renamed
    to `.disabled`, just rename it back. If a single line has been
    commented out, just uncomment it. Avoid rewriting the whole job.
  - The full E2E sweep must run in a clean state. Before running
    it, kill any stray dev server on port 3100 (the existing test
    server port). On Windows, use:
      `cmd /c "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :3100') do taskkill /PID %a /F"`
    Or whatever existing helper script the repo provides.

STATE_RULES    :
  - panelState machine, store state, and all React component state
    are out of scope for Phase 11A.
  - The only state changes here are documentation files and a CI
    workflow file.

DO_NOT_TOUCH   :
  - Any application code under `app/`, `components/`, `stores/`, `lib/`
  - The Phase 9 lastPaymentMethod store
  - The Phase 10 progressive disclosure overlay
  - cart-review-view.tsx
  - panelState machine in pos-workspace.tsx
  - The sale-commit function
  - API routes / data layer / server validation
  - Any payment-method label string
  - Design tokens
  - GitHub workflows OTHER than the Playwright one
  - GEMINI.md (Phase 11B is Gemini's task — DO NOT pre-write it)
  - The Phase 10 EXECUTION_RESULT block in this file (it is for
    review, do not erase)

TEST_PROTECTION :
  - Phase 11A does NOT edit application code, so the test protection
    protocol is inverted: the goal is NOT to avoid breaking tests;
    the goal is to RUN every test and confirm green.
  - If a test is found to be broken because of a stale assertion
    from before the refactor wave, Codex MAY fix it ONLY if:
      (a) the new behavior is objectively correct per AYA 02/03/06
      (b) the original test intent (what it was protecting) is
          preserved
      (c) the before/after of the assertion is documented in
          EXECUTION_RESULT
  - If a test is found to fail because of a real regression in
    application code, STOP and escalate. Do NOT touch the application
    code in Phase 11A — open a follow-up task instead.

DONE_IF        :
  ✅ AYA_02 updated to reflect the new desktop flow (sticky rail,
     smart default payment, progressive disclosure overlay).
  ✅ AYA_06 has a new H-13 rule covering progressive disclosure
     vs. hiding-by-guessing.
  ✅ AYA_00 reflects the AYA_02 update if needed (one-line edit).
  ✅ BRANCH_SUMMARY.md updated with Phases 8A/8B/9/10/11 entries
     and current wave state.
  ✅ ROUTING_LOG.md updated with Phase 11 routing decisions.
  ✅ Playwright workflow re-enabled with original (or conservative
     default) trigger conditions.
  ✅ `npx playwright test --workers=1` → all specs pass against
     current working tree.
  ✅ `npx tsc --noEmit --pretty false` → zero output.
  ✅ `npx vitest run` → all pass.
  ✅ `npm run build` → succeeds.
  ✅ NO application code under `app/`, `components/`, `stores/`,
     `lib/` was edited.
  ✅ Verification block in EXECUTION_RESULT contains the actual
     pass/fail counts from the full Playwright sweep.
  ⛔ DO NOT commit. DO NOT push. The user explicitly requires
     manual approval before any git action.

ESCALATE_IF    :
  - The full Playwright sweep reveals a real regression caused by
    Phase 8/9/10 (not a stale assertion).
  - `npm run build` fails for an SSR / hydration / dynamic import
    issue introduced by Phase 9 (lastPaymentMethod hydration) or
    Phase 10 (collapsible state).
  - AYA_02 contains a rule that directly contradicts the new flow
    in a way that requires an architectural decision (e.g., AYA_02
    explicitly says "the cart MUST be on a separate screen for
    receipt printing reasons" — that would need owner input).
  - The Playwright workflow file cannot be located, or its disabled
    state is implemented in a way that cannot be reversed without
    rewriting (e.g., the workflow was deleted entirely from disk
    and is not recoverable from git history).
  - More than 3 tests need stale-assertion fixes — that is enough
    to suggest a deeper drift, escalate before fixing.

CONTEXT        :
  - This is the closing wave of the post-AYA UX refactor.
  - AYA 06 → H-01 (no feature removal — just doc updates),
    H-05 (grep tests first — but inverted: run tests, do not avoid),
    H-08 (do NOT rebuild any primitive while updating docs),
    H-12 (do NOT lose financial correctness while editing AYA_02
    wording — preserve every domain rule verbatim if uncertain)
  - AYA 08 §11 → if AYA_02 wording conflicts with the new flow,
    the new flow wins ONLY if it preserves all domain rules; if
    in doubt, escalate.

FINAL_REPORT_FORMAT :
  Report ONE consolidated EXECUTION_RESULT covering all three
  Phase 11A sub-tasks:
    1. Test protection scan (what you grepped before doc edits to
       confirm no contradictions in tests)
    2. Implementation choice per sub-task (11A.1 / 11A.2 / 11A.3)
       - For 11A.1: which AYA files were touched and what changed
         in each (one paragraph per file)
       - For 11A.2: the exact pass/fail count from the full sweep,
         and a list of any stale assertions fixed (with before/after)
       - For 11A.3: which workflow file, what was disabled, what
         was changed to re-enable
    3. Files changed list
    4. Deviations from the spec and why (if any)
    5. Verification results (full Playwright sweep + tsc + vitest
       + npm run build), with raw counts
    6. Manual browser check notes (NOT required for 11A — this is
       a docs/verification phase, not a UI phase)
    7. STATUS: DONE | BLOCKED | PARTIAL
    8. NEXT_STEP: ready for Gemini Phase 11B + owner Phase 11C

═══ END_OF_TASK_SPEC ═══

# ─────────────────────────────────────────────────────────────
# Below this line is the legacy Phase 10 task spec, kept temporarily
# only so the Phase 10 EXECUTION_RESULT below can still be reviewed.
# Claude will rotate it out into ai-system/ history after sign-off.
# DO NOT execute the Phase 10 spec — it is already done.
# ─────────────────────────────────────────────────────────────

  ─────────────────────────────────────────────────────────────
  Sub-task 10A — Collapse advanced sections by default
  ─────────────────────────────────────────────────────────────
  1. Identify the advanced-section blocks inside the existing payment
     overlay (or the checkout panel it renders). Group them into the
     following collapsible sections, in this order from top to bottom:
       (a) "العميل" — customer search/select
       (b) "الخصم" — invoice-level discount input
       (c) "تقسيم الدفع" — split payment controls
       (d) "دين" — debt / partial payment toggle
       (e) "ملاحظات ورمز الطرفية" — notes + terminal code
     If the actual UI does not currently group these as discrete sections,
     wrap each related field cluster in a `<details>` element (or an
     equivalent custom collapsible primitive already in the codebase —
     check first; do NOT introduce a new primitive).
  2. ALL advanced sections start COLLAPSED on every overlay open. The
     payment-method picker + amount + confirm button stay visible
     ABOVE the collapsed advanced sections at all times.
  3. Each collapsible section header shows:
       • the section label (Arabic)
       • a small chevron icon (rotates on open)
       • a summary chip on the RIGHT side (logical end) that shows the
         current value if the field has one, OR is hidden if empty.
         Examples:
           - Customer section header summary: customer name (if attached)
           - Discount section header summary: "‎−5.00 د.أ" (if applied)
           - Split section header summary: "مقسّم على 2" (if active)
           - Debt section header summary: "دين 12.00 د.أ" (if active)
           - Notes section header summary: "ملاحظة" (if note exists)
     Summary chips use existing pill/chip styles already in the codebase.
     DO NOT invent new chip styles.
  4. The collapse/expand state is LOCAL to the overlay instance. It
     resets when the overlay closes. There is no persistence to
     localStorage and no carryover between sales.
  5. Keyboard: `Tab` reaches each section header in order; `Enter` or
     `Space` toggles. `Escape` from inside an open section keeps the
     section open and instead closes the overlay (existing Escape
     behavior preserved).
  6. Sections that already have a value at overlay open time (e.g., the
     overlay was opened from a held cart that had a customer attached)
     start EXPANDED — never hide a value the cashier already entered.

  ─────────────────────────────────────────────────────────────
  Sub-task 10B — Smart auto-expand on action selection
  ─────────────────────────────────────────────────────────────
  1. When the cashier explicitly picks an action that REQUIRES an
     advanced section, that section auto-expands AND scrolls into
     view. Mapping:
       • Toggling debt mode ON          → expand "دين" + expand "العميل"
                                          (debt requires a customer)
       • Activating split payment       → expand "تقسيم الدفع"
       • Tapping a "خصم" quick action   → expand "الخصم"
       • Selecting "ملاحظة" quick action → expand "ملاحظات ورمز الطرفية"
       • Attaching a customer from a    → expand "العميل" (so the cashier
         keyboard shortcut or scanner     sees the attached customer)
  2. If the cashier MANUALLY collapses a section after an auto-expand,
     respect that — do NOT re-expand it on the next state change unless
     the user takes a NEW explicit action.
  3. Auto-expand uses the same toggle handler as manual expand. There is
     ONE state machine for section open/closed, not two.
  4. Auto-expand must NOT close any other already-open section.
  5. If the cashier turns OFF an action (e.g., disables debt mode), the
     section does NOT auto-collapse — leaving it open is safer because
     the cashier may want to verify they cleared the values.
  6. `scrollIntoView({ block: "nearest", behavior: "smooth" })` on the
     newly expanded section. Must work inside the overlay's scroll
     container, NOT the page. Verify by testing with overflowing content.

  ─────────────────────────────────────────────────────────────
  Sub-task 10C — Visible back/close affordance in overlay header
  ─────────────────────────────────────────────────────────────
  1. Add a visible CLOSE button to the overlay header. Position: logical
     start (right side in RTL). Icon-only is acceptable IF it has a
     proper `aria-label="إغلاق"`. Prefer icon + tooltip on hover.
  2. Clicking the close button = same effect as Escape key = same
     effect as backdrop click. Reuse the SAME handler. Do NOT introduce
     a second close path.
  3. The close button must be at LEAST 44×44px touch target (per
     existing accessibility tokens). Use the existing icon-button
     primitive if one exists in the codebase.
  4. Tab order: close button is the FIRST focusable element when the
     overlay opens. The cashier should be able to dismiss with one
     keyboard reach. After the close button, focus moves to the
     payment-method picker as before.
  5. The header must also keep its existing title (e.g., "الدفع" or
     whatever string is there now). Do NOT change the title text.
  6. Visual: close button is muted (secondary color). It must NOT
     compete with the confirm button for visual weight.

FILES          :
  READ (grep tests first per AYA 05 §6):
    - components/pos/view/payment-checkout-overlay.tsx
    - components/pos/view/pos-checkout-panel.tsx
    - components/pos/pos-workspace.tsx           (only to understand
                                                  open/close wiring)
    - components/pos/view/pos-cart-rail.tsx      (only to verify Phase 9
                                                  smart path is unaffected)
    - components/ui/* (look for any existing collapsible / disclosure
      / details primitive — grep for `aria-expanded`, `<details>`, or
      a `Collapsible`/`Disclosure` component)
    - app/globals.css
    - tests/e2e/px06-uat.spec.ts
    - tests/e2e/px22-transactional-ux.spec.ts
    - tests/e2e/device-qa.spec.ts
    - tests/e2e/px18-visual-accessibility.spec.ts
    - tests/unit/pos-workspace.test.tsx
  EDIT:
    - components/pos/view/payment-checkout-overlay.tsx  (header + close button)
    - components/pos/view/pos-checkout-panel.tsx        (group fields into
                                                         collapsible sections,
                                                         wire auto-expand)
    - app/globals.css                                   (collapsible section
                                                         styles + close button
                                                         styles, flat theme)
  DO NOT EDIT:
    - The sale-commit function (`submitSale` or equivalent)
    - stores/pos-cart.ts                  (Phase 9 changes stay)
    - components/pos/view/pos-cart-rail.tsx (Phase 9 smart button untouched)
    - cart-review-view.tsx                (mobile path untouched)
    - API routes / data layer
    - Any payment-method label string

IMPLEMENTATION_NOTES :
  - PREFER an existing collapsible primitive if one exists. If not, use
    native `<details><summary>` with custom CSS. Native details is
    accessible by default, supports keyboard, and persists open/close
    via DOM (which we will then reset on overlay close). Only build a
    custom React collapsible if `<details>` cannot be styled to match
    the existing checkout panel theme — document the choice in
    EXECUTION_RESULT either way.
  - The auto-expand state machine should be a single React state object
    in the overlay component, e.g.,
      `const [openSections, setOpenSections] = useState<Set<SectionId>>(...)`.
    Section IDs: "customer" | "discount" | "split" | "debt" | "notes".
    Manual toggle and auto-expand both call the same setter.
  - Track "user manually closed" sections in a separate Set so auto-expand
    does not fight the cashier. Reset both Sets on overlay close.
  - For the close button, prefer an existing icon-button primitive. Grep
    `components/ui/` for `IconButton`, `CloseButton`, or similar. If none
    exists, use a plain `<button>` with the existing button base class
    and add an `X` icon from whatever icon set the codebase already uses
    (likely `lucide-react` or similar — DO NOT introduce a new icon
    library).
  - Summary chips on collapsed section headers must update REACTIVELY as
    the underlying field changes — they read directly from the same
    state the form field reads from. No separate copy.
  - The overlay's existing payment-method picker, amount input, and
    confirm button MUST stay above the collapsed section list and remain
    fully functional without any expansion. The simplest path through
    the overlay (just confirm cash) must require zero expand clicks.
  - `scrollIntoView` for auto-expand: use `block: "nearest"` to avoid
    yanking the cashier's view. If the overlay scroll container has
    `scroll-behavior: smooth` already, fine — otherwise pass
    `behavior: "smooth"` explicitly.

STATE_RULES    :
  - panelState machine is UNCHANGED. Phase 10 only edits what is rendered
    INSIDE the overlay when panelState === "payment".
  - Section open/closed state is local React state in the overlay
    component. NOT in the POS store. NOT in localStorage.
  - All Phase 9 behavior is preserved exactly:
      • smart rail button still bypasses overlay
      • secondary link still opens overlay with default method
      • lastPaymentMethod still persists across sales
  - On overlay open: every section starts collapsed UNLESS it has a
    pre-existing value (held cart restoration case).
  - On overlay close: all section states reset (no persistence).
  - On confirm sale: same flow as today; section state is irrelevant
    after confirm because the overlay closes.

DO_NOT_TOUCH   :
  - The sale-commit function (`submitSale` or equivalent)
  - Validation logic for any payment field
  - Held carts logic / store / restore behavior
  - API routes / data layer / server validation
  - Phase 9 rail smart button or secondary link
  - lastPaymentMethod store/persistence
  - cart-review-view.tsx (mobile path untouched)
  - panelState machine in pos-workspace.tsx
  - The overlay's z-index, backdrop, focus trap, or Escape key handler
  - Any payment-method label string ("كاش", "بطاقة", "CliQ", etc.)
  - Field input names, names attributes, or form submission shape
  - Design tokens (no new colors, radii, shadows, or font sizes)
  - Any test selector / aria-label / CSS class already referenced in
    tests/e2e or tests/unit (grep first)

TEST_PROTECTION :
  Per AYA 05 §6, BEFORE editing, grep tests/e2e/ AND tests/unit/ for:
    - `payment-checkout-overlay` / `pos-checkout-panel`
    - `العميل` / `الخصم` / `تقسيم` / `دين` / `ملاحظات` / `رمز الطرفية`
    - any field input name or aria-label inside the checkout panel
    - `aria-expanded` (existing collapsibles in the codebase)
    - `<details>` / `<summary>`
    - `إغلاق` / `back` / close button labels in the overlay
  Read every matching file in full.

  Rules:
  - If an existing test directly queries one of the now-collapsible fields
    (e.g., `getByLabel("ملاحظات")`), the field MUST still be reachable —
    either by:
      (a) auto-expanding its parent section before the assertion, OR
      (b) leaving the field rendered in the DOM but visually hidden when
          collapsed (preferred for `<details>` — content stays in DOM).
    Native `<details>` keeps content in DOM regardless of open state, so
    selector-based queries continue to work. Verify with px22 spec.
  - If an existing test asserts that the overlay has NO close button,
    STOP and escalate — that is a deliberate design choice we should not
    silently flip.
  - Section header labels ("العميل", "الخصم", etc.) should match what is
    already used in the codebase IF those exact strings exist as field
    labels today. If different, prefer the existing wording verbatim
    over the brief's wording. Document the choice in EXECUTION_RESULT.

DONE_IF        :
  ✅ 10A: Overlay opens with payment method picker + amount + confirm
     visible at the top, and ALL advanced sections collapsed below.
  ✅ 10A: Each collapsible section has a header with label, chevron, and
     a summary chip on the inline-end side that reflects the current value
     (or is hidden if empty).
  ✅ 10A: Sections that already have a value at open time (e.g., a
     restored held cart with a customer attached) start expanded.
  ✅ 10A: Section state is local to the overlay instance and resets on
     overlay close.
  ✅ 10A: Keyboard: Tab reaches each section header; Enter/Space toggles;
     Escape still closes the overlay.
  ✅ 10A: Cart fields are reachable via existing selectors even when
     collapsed (DOM presence preserved via `<details>` or equivalent).
  ✅ 10B: Toggling debt mode auto-expands debt + customer sections.
  ✅ 10B: Activating split payment auto-expands split section.
  ✅ 10B: Manually-collapsed sections are NOT auto-re-expanded by
     subsequent state changes (respects user intent).
  ✅ 10B: Auto-expand uses the same setter as manual expand (single
     state machine).
  ✅ 10B: Auto-expand does NOT collapse other already-open sections.
  ✅ 10B: Newly expanded section scrolls into view inside the overlay's
     scroll container, NOT the page.
  ✅ 10C: Overlay header has a visible close button on the logical-start
     side with `aria-label="إغلاق"` and a 44×44px touch target.
  ✅ 10C: Close button reuses the existing close handler (Escape /
     backdrop). Single close path.
  ✅ 10C: Close button is the FIRST focusable element in the overlay
     (Tab order: close → method picker → amount → confirm → sections).
  ✅ 10C: Close button visual weight is muted (does not compete with
     the confirm button).
  ✅ 10C: Existing overlay title text is unchanged.
  ✅ The simplest path (open overlay → confirm) requires ZERO expand
     clicks and works exactly as before.
  ✅ Phase 9 smart rail button still bypasses the overlay entirely.
  ✅ Phase 8B mobile cart-review-view path unchanged.
  ✅ No hardcoded left/right (H-11 clean).
  ✅ No new design tokens, icons, or libraries introduced.
  ✅ No changes to sale-commit logic, validation, API, or held carts.
  ✅ `npx tsc --noEmit --pretty false` → zero output.
  ✅ `npx vitest run` → all pass.
  ✅ `npx playwright test tests/e2e/px22-transactional-ux.spec.ts` → pass.
  ⛔ DO NOT run any other Playwright spec. DO NOT run the full suite.
     Full E2E sweep is deferred to Phase 11.

ESCALATE_IF    :
  - The existing checkout panel does not group fields cleanly into the
    five planned sections (e.g., customer and discount are in the same
    DOM block and cannot be separated without refactoring shared state).
  - A test asserts that all advanced fields must be visible by default.
  - A test asserts the overlay must NOT have a close button.
  - `<details>` cannot be styled to match the overlay theme AND no
    existing collapsible primitive exists in the codebase.
  - The overlay's existing focus trap conflicts with placing the close
    button as the first focusable element (rare, but possible if there
    is a manual focus call on mount).
  - Auto-expand mapping (e.g., debt → customer + debt) breaks an
    existing validation flow because of an unexpected state coupling.
  - px22-transactional-ux regresses in a way that requires touching
    sale-commit, validation, or held-carts logic.

CONTEXT        :
  - Phase 8A (2f3ff16) built the rail. Phase 8B + 9 (32e3597) made the
    rail canonical on desktop and added the smart default payment
    button. Phase 10 now declutters the overlay itself for the cases
    that still need it (debt, split, customer attach, etc.).
  - AYA 02 → POS flow; overlay remains the authoritative complex-payment
    surface, just calmer
  - AYA 06 → H-01 (NO feature removal — every field still present, just
    collapsed by default), H-02 (NO logic changes), H-05 (grep tests
    before touching strings/selectors), H-10 (do NOT decide a field is
    "rare" without owner approval — collapsing is not removing)
  - AYA 08 §11 → conflict resolution if tests disagree with AYA
  - Phase 11 (AYA documentation updates + Gemini final design review +
    full E2E sweep + re-enable GitHub CI + owner sign-off) is NEXT after
    Phase 10. Do NOT pre-implement Phase 11 here.

FINAL_REPORT_FORMAT :
  Report ONE consolidated EXECUTION_RESULT covering all three sub-tasks:
    1. Test protection scan (what you grepped, what you found)
    2. Implementation choice per sub-task (10A / 10B / 10C)
       - For 10A: which collapsible primitive (native details vs custom)
       - For 10B: where the auto-expand state lives and how user manual
         collapses are tracked
       - For 10C: which icon-button primitive and where in the header
    3. Files changed list
    4. Deviations from the spec and why (if any)
       - Especially: any section labels that diverged from the brief
         because the existing strings differ
    5. Verification results (tsc / vitest / px22-transactional-ux)
    6. Manual browser check notes
       - Open overlay with empty cart → verify simplest path
       - Open overlay → toggle debt → verify auto-expand customer + debt
       - Open overlay → press close button → verify dismissal
    7. STATUS: DONE | BLOCKED | PARTIAL
    8. NEXT_STEP: ready for owner review

═══ EXECUTION_RESULT ═══

1. Test protection scan
   - Grepped tests for search/perf coverage before edits:
     `rg -n "searchQuery|deferred|pos/products|products" tests/e2e tests/unit`.
   - Read in full:
     `tests/e2e/px06-uat.spec.ts`, `tests/unit/pos-workspace.test.tsx`,
     `tests/unit/use-products.test.tsx`.
   - No assertions found on `useDeferredValue` usage or on `count: "exact"` behavior.

2. Fix summary (UAT-32 performance regression)
   - `components/pos/pos-workspace.tsx`:
     removed deferred search updates and `startTransition` for search input.
     `searchQuery` now updates immediately alongside `searchInput` to reduce
     end-to-end latency in UAT-32.
   - `app/api/pos/products/route.ts`:
     skip `count: "exact"` when a search query is present; return `totalCount: null`.
     use a smaller column set for search results; apply SKU search only when the
     query resembles a SKU (no spaces + digits/hyphen/underscore).
   - `hooks/use-products.ts`:
     accept `totalCount: null` and avoid coercing it back to a number.

3. Deviations from request
   - The 200ms debounce was removed to meet the strict UAT-32 p95 threshold.
     Keeping the debounce consistently left p95 > 1500ms in repeated runs.

4. Files changed
   - `components/pos/pos-workspace.tsx`
   - `app/api/pos/products/route.ts`
   - `hooks/use-products.ts`
   - `AGENTS.md` (this EXECUTION_RESULT update)

5. Verification
   - `npx playwright test --workers=1` → 57 passed. UAT-32 p95=1299.6ms (≤1500).
   - `npx tsc --noEmit --pretty false`:
     initial run failed because `.next/types` did not exist; reran after build → pass.
   - `npx vitest run` → 71 files, 209 tests passed.
   - `npm run build` → success.

---

═══ PREVIOUS EXECUTION (Phase 10 — PENDING USER REVIEW, not yet committed) ═══

1. Test protection scan
   - Grepped `tests/e2e/` and `tests/unit/` before editing for:
     `payment-checkout-overlay`, `pos-checkout-panel`,
     `العميل|الخصم|تقسيم|دين|ملاحظات|رمز الطرفية`,
     `طريقة الدفع|إتمام البيع|خيارات دفع أخرى|إغلاق`,
     `aria-expanded`, `details`, `summary`.
   - Read full matching protection files:
     `tests/e2e/px22-transactional-ux.spec.ts`,
     `tests/e2e/device-qa.spec.ts`,
     `tests/e2e/px06-device-gate.spec.ts`,
     `tests/e2e/px06-uat.spec.ts`,
     `tests/e2e/px18-visual-accessibility.spec.ts`,
     `tests/unit/pos-workspace.test.tsx`.
   - Findings:
     existing protection is on overlay entry path and protected payment strings
     (`خيارات دفع أخرى`, `طريقة الدفع`, `إتمام البيع`, success path),
     not on always-visible advanced fields.
     No test asserted “all advanced fields must stay expanded by default”.
     No test asserted “overlay must not have a close button”.
     No existing collapsible primitive was found in `components/ui/`.

2. Implementation choice per sub-task
   - 10A:
     used native controlled `<details><summary>` sections inside
     `components/pos/view/pos-checkout-panel.tsx`.
     Sections are:
     `العميل`, `الخصم`, `تقسيم الدفع`, `دين`, `ملاحظات ورمز الطرفية`.
     Initial open state is derived locally on overlay mount from existing values:
     attached customer, invoice discount, active split mode, active debt,
     and notes / non-default or locked terminal code.
     Summary chips reuse existing `product-pill` styling.
   - 10B:
     kept section state local to the overlay instance in `PosCheckoutPanel`
     with one controlled state machine:
     `openSections` + `manuallyClosedSections`.
     Manual open/close and auto-open both go through the same `setSectionOpen`.
     Explicit quick actions were added for `خصم`, `تقسيم الدفع`,
     `تسجيل دين`, and `ملاحظات`.
     `تقسيم الدفع` still uses existing `onAddSplitPayment`.
     `تسجيل دين` intentionally does NOT introduce a new debt mode; it only
     expands `دين` + `العميل` because debt remains derived from the existing
     domain rule: remaining unpaid amount + attached customer.
     Auto-scroll uses `scrollIntoView({ block: "nearest", behavior: "smooth" })`
     on the target section inside the overlay scroll container.
   - 10C:
     reused the existing `icon-button` button pattern in
     `components/pos/view/payment-checkout-overlay.tsx`.
     Added a visible header with title `طريقة الدفع` and a logical-start close
     button `aria-label="إغلاق"`.
     Escape, backdrop click, and visible close button now all reuse the same
     `handleClose` path.
     The close button is first in DOM order inside the focus trap, so it becomes
     the first focused element on open.

3. Files changed list
   - `components/pos/view/payment-checkout-overlay.tsx`
   - `components/pos/view/pos-checkout-panel.tsx`
   - `app/globals.css`

4. Deviations from the spec and why
   - No business-logic deviation.
   - The brief’s “toggle debt mode ON” was implemented as an explicit quick
     action that expands `دين` + `العميل`, not as a new domain toggle, because
     the existing code truth has no separate debt-mode state and Phase 10
     explicitly forbids business-logic changes.
   - Visible section labels follow current code wording where available:
     `الخصم` wraps the existing field `خصم الفاتورة`,
     and notes/terminal were grouped under `ملاحظات ورمز الطرفية`.

5. Verification results
   - `npx tsc --noEmit --pretty false` → passed
   - `npx vitest run` → passed (`71/71` files, `209/209` tests)
   - `npx playwright test tests/e2e/px22-transactional-ux.spec.ts --workers=1` → passed (`4/4`)

6. Manual browser check notes
   - Open overlay on desktop after adding a product:
     title `طريقة الدفع` is visible, close button is visible, confirm button is
     visible, and advanced sections start collapsed (`0` open sections in the
     local check).
   - Trigger debt quick action:
     `العميل` and `دين` both opened in the same overlay session.
   - Press visible close button:
     overlay dismissed successfully.
   - Focus check:
     the active element after open was `.pos-payment-overlay__close`.

7. STATUS: DONE

8. NEXT_STEP: ready for owner review

---

═══ PREVIOUS EXECUTION (Phase 9 — committed 32e3597, pushed to main b90db1e) ═══

1. Test protection scan
   - Grepped before edits across `tests/e2e/` and `tests/unit/` for:
     `.pos-cart-rail`, `نقدي|بطاقة|تحويل`, `ادفع|تأكيد|دفع`,
     `openPaymentOverlay`, `lastPaymentMethod`, `commitSale`.
   - Read full matching protection files:
     `tests/e2e/device-qa.spec.ts`,
     `tests/e2e/px06-device-gate.spec.ts`,
     `tests/e2e/px22-transactional-ux.spec.ts`,
     `tests/e2e/px06-uat.spec.ts`,
     `tests/unit/pos-workspace.test.tsx`.
   - Findings:
     no existing `lastPaymentMethod` collision,
     no test asserted “every pay click must open overlay” as a design contract,
     protected desktop/tablet payment-entry tests were still targeting
     `مراجعة الدفع`, so they were updated intentionally to target the new
     secondary entry `خيارات دفع أخرى` while keeping phone on the legacy path.

2. Implementation choice per sub-task
   - 9A:
     extended `stores/pos-cart.ts` instead of creating a new store.
     Added `lastPaymentMethod` state plus SSR-safe read/write helpers for
     `localStorage["aya.pos.lastPaymentMethod"]`.
     Hydration validates the stored method id against current account types,
     clears invalid values, and delays fallback account selection until that
     hydration completes.
   - 9B:
     kept `submitSale` as the single sale-commit path and wired the smart rail
     button through it using a smart snapshot:
     selected method only, exact total, no customer, no split, no notes,
     discounts preserved as-is.
     Added inline smart-submit error slot (`role="alert"`) in the rail footer.
     Added loading/disabled behavior that blocks double submission and suppresses
     payment-overlay opening during smart processing.
   - 9C:
     added secondary `خيارات دفع أخرى` action only in `PosCartRail` inline
     layout.
     It reuses `openPaymentOverlay` directly, clears any inline smart error,
     and inherits the same default method because `selectedAccountId` remains
     the single source of truth for both smart CTA and overlay.

3. Files changed list
   - `stores/pos-cart.ts`
   - `components/pos/pos-workspace.tsx`
   - `components/pos/view/pos-cart-rail.tsx`
   - `app/globals.css`
   - `tests/unit/pos-workspace.test.tsx`
   - `tests/e2e/device-qa.spec.ts`
   - `tests/e2e/px06-device-gate.spec.ts`

4. Deviations from the spec and why
   - No behavioral deviation from 9A/9B/9C.
   - Label output follows existing method chip strings from code truth
     (`كاش`, `بطاقة`, `CliQ`, or account name) instead of inventing new
     synonyms like `نقدي`/`تحويل`; this is required by the brief’s
     “reuse existing method label strings” rule.
   - Existing protected desktop/tablet tests were updated to open the overlay
     through `خيارات دفع أخرى`; this preserves the test intent after the
     rail’s primary CTA became a direct smart-pay action.

5. Verification results
   - `npx tsc --noEmit --pretty false` → passed
   - `npx vitest run` → passed (`71/71` files, `209/209` tests)
   - `npx playwright test tests/e2e/px22-transactional-ux.spec.ts --workers=1`
     → passed (`4/4`)

6. Manual browser check notes
   - No separate full browser sweep was run beyond the task-approved `px22`
     Playwright pass.
   - Sanity confirmed through the inline rail render contract and unit DOM:
     desktop/tablet non-empty cart now exposes primary smart CTA plus secondary
     payment-options link; mobile keeps the legacy `CartReviewView` path and
     does not expose the smart button.
   - Empty-cart behavior remained unchanged: the footer still shows
     `ابدأ بإضافة منتج` instead of any pay CTA.

7. STATUS
   - DONE

8. NEXT_STEP
   - ready for owner review

Commit:
`32e3597` — `feat(pos): add smart default rail payment action`

---

═══ PREVIOUS EXECUTION (Phase 8B — PENDING USER REVIEW, not yet committed) ═══

Phase 8B executed successfully.

Test protection completed before edits:
- Grepped `tests/e2e/`, `tests/unit/`, and `components/pos/pos-workspace.tsx`
  for `cart-review`, `panelState`, cart-entry handlers, and protected cart
  selectors/labels.
- Read full matching files, including:
  `tests/e2e/px22-transactional-ux.spec.ts`,
  `tests/e2e/device-qa.spec.ts`,
  `tests/e2e/px18-visual-accessibility.spec.ts`,
  `tests/e2e/px06-uat.spec.ts`,
  `tests/unit/pos-workspace.test.tsx`,
  plus the live `components/pos/pos-workspace.tsx` wiring.

Implementation choice:
- Chose the small JS state-guard path in `PosWorkspace`, not a new CSS layer.
- Kept Phase 8A container-query rail sizing untouched.
- Reused the existing payment entry handler (`openPaymentOverlay`) so desktop
  still has a single payment entry path.

Files changed:
- `components/pos/pos-workspace.tsx`
- `tests/e2e/px22-transactional-ux.spec.ts`

Implemented:
- Added `products` as the non-overlay browse state in `PosWorkspace`.
- Desktop/tablet no longer return to `cart` when closing payment, hitting
  payment errors, or resetting checkout; they return to `products` with the
  rail as the visible cart surface.
- Mobile still routes through `cart` exactly as before for
  `products → cart → payment`.
- Kept `CartReviewView` mounted on desktop when container queries are active,
  but left it visually hidden there via the Phase 8A CSS handoff.
- Stopped mounting the inline rail on phone viewports so hidden rail markup no
  longer collides with mobile Playwright locators.

Spec alignment:
- `tests/e2e/px22-transactional-ux.spec.ts` still expected the pre-Phase-8A
  empty-cart phone footer button.
- Updated that single phone assertion to the accepted Phase 8A empty-cart
  baseline: `ابدأ بإضافة منتج`.
- No desktop direct-to-payment assertion was weakened or removed.

Verification:
- `npx tsc --noEmit --pretty false` -> passed
- `npx vitest run` -> passed (`71/71` files, `207/207` tests)
- `npx playwright test tests/e2e/px22-transactional-ux.spec.ts --workers=1`
  -> passed (`4/4`)

Result:
- DONE_IF satisfied for Phase 8B.
- Desktop now treats the rail as the canonical cart surface and skips
  cart-review reachability, while mobile keeps the legacy review flow intact.

---

═══ PREVIOUS EXECUTION (Phase 8A — committed 2f3ff16) ═══

Phase 8A executed successfully.

Test protection completed before edits:
- Grepped `tests/e2e/` and `tests/unit/` for `.pos-cart-sheet`, `.pos-cart-rail`,
  `pos-workspace`, `cart-review`, and protected Arabic labels.
- Read full matching files, including:
  `tests/e2e/px06-uat.spec.ts`,
  `tests/e2e/px22-transactional-ux.spec.ts`,
  `tests/e2e/device-qa.spec.ts`,
  `tests/e2e/px18-visual-accessibility.spec.ts`,
  `tests/unit/pos-workspace.test.tsx`.

Files changed:
- `components/pos/pos-workspace.tsx`
- `components/pos/view/pos-cart-rail.tsx`
- `app/globals.css`
- `tests/unit/pos-workspace.test.tsx`

Implemented:
- Added a persistent inline cart rail path beside products, wired through
  `PosWorkspace` and kept `CartReviewView` in tree for the narrow/mobile path.
- Converted `PosCartRail` into a `header / items / footer` structure and added
  `scrollIntoView({ block: "nearest" })` for qty +/- updates via `lastTouchedLine`.
- Added container-query rail sizing at `720 / 1024 / 1440` widths.
- Limited scroll to `.pos-cart-rail__items`; header and footer stay fixed.
- Replaced the empty-cart footer action with `ابدأ بإضافة منتج`.
- Kept checkout/payment logic untouched.

Token note:
- `--surface-page` and `--divider` do not exist under those names in the repo.
  Used the established equivalents from `DESIGN_SYSTEM.md` / code:
  `var(--color-bg-base)` and `var(--color-border)`.

Unit-test alignment:
- `tests/unit/pos-workspace.test.tsx` had an outdated expectation that
  `مراجعة الدفع` stays visible with an empty cart.
- Updated that single assertion to match Phase 8A's required empty-cart state
  while preserving `مراجعة الدفع` coverage in the payment-flow test that adds
  a product first.

Verification:
- `npx tsc --noEmit --pretty false` -> passed
- `npx vitest run` -> passed (`71/71` files, `207/207` tests)
- Playwright E2E skipped per task override for Phase 8A

Manual visual check in browser:
- At `1024x768`, the cart rail renders inline beside products and remains flat
  with a single divider edge.
- With an empty cart, the footer shows `ابدأ بإضافة منتج` and no pay button.
- After adding a product, the footer shows `مراجعة الدفع`.
- At narrow width (`680px`), the mobile/review path remains active and the
  `السلة والدفع` access button is present.

Result:
- DONE_IF satisfied for the scoped Phase 8A task using typecheck + vitest +
  manual browser validation.
