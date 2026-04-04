<!--
ملخص عربي سريع:
قاموس المصطلحات الثابتة. Claude يقرأه مرة وحدة أول الجلسة.
ممنوع اختراع مصطلحات جديدة أو ترجمة هالمصطلحات للعربي.
-->

# GLOSSARY.md — Fixed System Terms

> Read once at session start. Use ONLY these terms. Never create synonyms.

## TERMINOLOGY_RULE
```
When writing any Task, update, or log entry:
- Use the EXACT terms from this table
- Do NOT translate them to Arabic
- Do NOT create new terms that mean the same thing
- If you need a new term, ask the user first
```

## Terms

| Term | Meaning | Used in |
|------|---------|---------|
| TASK_ID | Unique identifier: YYYY-MM-DD-XXX | Every Task |
| TASK_TYPE | Category: bug-fix / refactor / new-logic / test-writing / migration / api-integration / ui-change / explanation / comparison / documentation / refactor-style / code-generation | Task header |
| STATUS | Result: DONE / PARTIAL / FAILED | EXECUTION_RESULT |
| ROUTED_TO | Executing Agent: Codex / Gemini | Task header |
| ROUTING_REASON | Why this Agent was chosen | Task header |
| DEPENDS_ON | Prerequisite TASK_ID, or NONE | Task header |
| DONE_IF | Success criteria | Task template |
| DO_NOT_TOUCH | Excluded files/areas | Task template |
| ESCALATE_IF | When to stop and report | Task template |
| CONSTRAINT | Restrictions on Agent | Task template |
| PRE_COMMIT | Git commit hash before changes | EXECUTION_RESULT |
| DIFF_LOG | Git diff output after changes | EXECUTION_RESULT |
| ISSUES_FOUND | Problems outside scope, or NONE | EXECUTION_RESULT |
| BLOCKED_BY | Reason for incomplete, or NONE | EXECUTION_RESULT |
| TASK ZONE | Section in Agent file where Task is written | AGENTS.md / GEMINI.md |
| COMPLETION_SIGNAL | Phrase Agent says when done | Chat |
| ROUTING_CONFIDENCE | Certainty: high / medium / low | ROUTING_LOG |
| OUTCOME_SCORE | Quality: 1-5 | ROUTING_LOG |
| TOKEN_EFFICIENCY | Cost: low / medium / high | ROUTING_LOG |
| REWORK_NEEDED | Redo required: yes / no | ROUTING_LOG |
| CONSULTATION_USED | Cross-agent help: yes / no | ROUTING_LOG |
