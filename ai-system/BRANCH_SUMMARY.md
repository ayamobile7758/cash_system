<!--
ملخص عربي سريع:
دماغ النظام — يُقرأ مرة وحدة أول كل جلسة.
فيه: حالة المشروع، آخر 5 قرارات، مشاكل مفتوحة، مهام مقترحة.
حد أقصى: 150 سطر.
-->

# BRANCH_SUMMARY.md — System Memory

> Read ONCE at session start. Max 150 lines.

---

## CURRENT_STATE

```
- Project phase: UI Restructuring — COMPLETE (Waves 1–5 done)
- Last work done: Wave 5 — Loading Screen + A11y final pass + Regression hardening
- Current priority: Wave 6A (Infrastructure: tokens → layout → surface → SectionCard)
- Quality gates: build ✅ | tsc ✅ | vitest 205/207 ✅ | e2e 56 passed ✅
- Known issues logged: ai-system/KNOWN_ISSUES.md (13 issues, Wave 6A/B/C scope)
- Design system expanded: DESIGN_SYSTEM.md §12–15 added
```

---

## LAST_5_DECISIONS

| TASK_ID | Operation | Agent | STATUS | Note |
|---------|-----------|-------|--------|------|
| 2026-04-06-TOKEN-MIGRATION | Migrate all --aya-* tokens → --color-* in globals.css | Codex | DONE | Full token migration complete |
| 2026-04-06-SHELL-REFACTOR | Replace sidebar with Mega Popover nav | Codex | DONE | Sidebar removed, popover implemented |
| 2026-04-09-WAVE-2A-2B | Settings + Reports + Suppliers + Portability restructure | Codex | DONE | Two-column splits, tab patterns, ARIA roles |
| 2026-04-09-WAVE-3-4 | Inventory/Maintenance/Notifications/Debts/Invoices/POS | Codex | DONE | 12 passed e2e (px13, px22, px23) |
| 2026-04-09-AUTH-PERF | Login role-check timeout (2s Promise.race) | Claude | DONE | Fixes slow login; 5/5 login tests pass |
| 2026-04-10-WAVE-5 | Loading Screen + A11y + Regression hardening | Codex | DONE | 56 e2e passed, tsc clean, build ok |

---

## OPEN_ISSUES

| # | Problem | Affected file | Priority |
|---|---------|--------------|----------|
| 1 | 2 formatter tests fail (Arabic-Indic vs Latin digits) — pre-existing | tests/unit/formatters.test.ts | low |
| 2 | Recharts width(-1)/height(-1) warnings in Playwright logs — non-blocking | components/dashboard/reports-overview.tsx | low |
| 3–13 | UI/structural issues (G1–G5, P1–P6, R1–R2) — documented in full | ai-system/KNOWN_ISSUES.md | Wave 6 |

---

## NEXT_TASKS

- [x] Wave 5 — DONE
- [ ] Wave 6A — G4 (tokens) → G2 (max-width) → G1 (surface) → G3 (SectionCard)
- [ ] Wave 6B — P3 (CSS cleanup) → P1 (sticky) → P2 (toolbar) → P4 (max-width POS)
- [ ] Wave 6C — P5, R1, P6, R2, G5 (polish)

---

## META
```
Last updated           : 2026-04-10
Last TASK_ID           : 2026-04-10-WAVE-5
Last Agent             : Codex
Total Tasks so far     : 12
Current line count     : ~75 / 150
```
