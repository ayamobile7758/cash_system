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
# PHASE 7: REPORTS ARCHETYPE CLEANUP
# ═════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# ► CURRENT TASK ◄  Phase 7 — Reports Archetype Alignment
# ══════════════════════════════════════════════════════════════

```
TASK_ID        : 2026-04-12-PHASE-7-REPORTS-ARCHETYPE
TASK_TYPE      : refactor
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Align Reports to AYA 01 Analytical archetype (width, density, section layout)
DEPENDS_ON     : Phase 6 (11ea90f), AYA 01 §6 (Reports archetype spec)
```

GOAL           : Apply Analytical archetype rules to Reports workspace

CONTEXT        :
  AYA 01 §6 defines Reports as an Analytical archetype:
    - width: --width-analytical (1400px max)
    - section headers + expandable sections
    - dense data display
    - multiple tabs/panels
    - export/filtering affordances
  
  Reports currently may have layout/width/density issues from earlier waves.
  Phase 7 aligns Reports to the final archetype spec without changing logic.

FILES_IN_SCOPE :
  - components/dashboard/reports-overview.tsx (review: section layout, width)
  - components/dashboard/reports-advanced-charts.tsx (review: chart density, responsive)
  - app/(dashboard)/reports/page.tsx (review: page wrapper, max-width)
  - app/globals.css (review: --width-analytical application)
  - tests/e2e/px11-reports.spec.ts (verify: no test breaks)

CHECKLIST      :
  1. **Width Policy**
     ✅ Reports container uses --width-analytical (1400px)
     ✅ No overflow on tablet/desktop
     ✅ Responsive below 1400px uses full width with padding
  
  2. **Section Layout**
     ✅ Reports uses sections (header + content blocks)
     ✅ Sections are expandable/collapsible (if archetype requires)
     ✅ Section headers are semantic (<h2> or appropriate role)
  
  3. **Data Density**
     ✅ Charts respect density rules (readable, not cramped)
     ✅ Tables have consistent spacing
     ✅ No horizontal overflow on any breakpoint
  
  4. **Affordances**
     ✅ Filter button exists and works
     ✅ Export link exists and works
     ✅ Tab navigation (if present) is semantic + keyboard-safe
  
  5. **RTL & a11y**
     ✅ All flex/grid uses logical properties (inset-inline, etc.)
     ✅ No hardcoded left/right
     ✅ Headings and structure are semantic
  
  6. **Tests**
     ✅ px11-reports.spec.ts passes
     ✅ px18-visual-accessibility.spec.ts passes
     ✅ device-qa.spec.ts passes (if reports touched)

DONE_IF        :
  ✅ Reports layout aligns to Analytical archetype
  ✅ Width policy applied consistently
  ✅ Section/panel structure correct
  ✅ All affordances (filter, export) functional
  ✅ tsc clean
  ✅ vitest 207/207 pass
  ✅ px11-reports.spec.ts passed
  ✅ px18-visual-accessibility.spec.ts passed

DO_NOT_TOUCH   :
  - Report data/logic (preserve)
  - API endpoints (preserve)
  - Test assertions (only fix layout-related breaks)
  - Visible strings/labels (unless required for semantics)

ESCALATE_IF    :
  - Chart library incompatibilities found
  - Width constraints conflict with existing layout
  - Test failures outside layout scope

═══ EXECUTION_RESULT ═══

[Pending execution from Codex]
