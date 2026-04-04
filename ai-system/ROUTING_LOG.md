<!--
ملخص: سجل قرارات التوجيه. يُقرأ فقط عند الشك. حقول القياس تبدأ بعد Task #10.
-->

# ROUTING_LOG.md — Routing Decisions Log

> One row per Task. Read only when uncertain about Agent choice.

## Log

| TASK_ID | TASK_TYPE | AGENT | STATUS | ROUTING_CONFIDENCE | OUTCOME_SCORE | TOKEN_EFFICIENCY | REWORK_NEEDED | CONSULTATION_USED |
|---------|-----------|-------|--------|-------------------|---------------|-----------------|---------------|-------------------|
| — | — | — | — | (starts T-11) | (starts T-11) | (starts T-11) | (starts T-11) | (starts T-11) |
| 2026-04-04-001 | bug-fix | Codex | BLOCKED | — | — | — | yes | no |
| 2026-04-04-001-R1 | bug-fix | Codex | PARTIAL | — | — | — | no | no |
| 2026-04-04-002 | ui-change | Gemini | DONE | — | — | — | no | no |
| 2026-04-04-003 | ui-change | Gemini | DONE | — | — | — | no | no |

## AGENT_PATTERNS (updated every 10 Tasks)

### Codex — succeeded at:
- [ after Task #10 ]

### Codex — did not succeed at:
- [ after Task #10 ]

### Gemini — succeeded at:
- [ after Task #10 ]

### Gemini — did not succeed at:
- [ after Task #10 ]

## META
```
Total Tasks logged              : 4
Last AGENT_PATTERNS update      : —
Next measurement starts at      : Task #11
```
