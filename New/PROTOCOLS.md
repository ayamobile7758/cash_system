<!--
ملخص عربي سريع:
هذا الملف فيه كل البروتوكولات التفصيلية.
Claude يقرأه فقط عند الحاجة — مش كل رسالة.
فيه: تسليم المهام، متابعة التنفيذ، الذاكرة، التكلفة، الالتزام.
-->

# PROTOCOLS.md — Detailed System Protocols

> Claude reads this file only when needed — not every message.

---

## 1. Task Delivery Protocol

### Step 1: Write the Task
When writing a Task for an Agent, Claude does the following:

```
1. Read ai-system/TASK_TEMPLATES.md to pick the correct template.
2. Read ai-system/GLOSSARY.md to use correct terms.
3. Open the Agent's governance file:
   - Codex → AGENTS.md
   - Gemini → GEMINI.md
4. Find the line: ═══ TASK ZONE ═══
5. Erase ALL content below that line.
6. Write the new Task using the correct template.
7. Below the Task, add the EXECUTION_RESULT template (empty, for Agent to fill).
```

### Step 2: Notify the User
After writing the Task, Claude tells the user in Arabic:

```
✅ كتبت أمر التنفيذ: [operation-name]
الوجهة: [Codex / Gemini]
📋 انسخ هذا النص وألصقه في [Codex / Gemini]:
─────────────────────────────────
New task ready in [AGENTS.md / GEMINI.md].
Task: [operation-name]
Read the TASK ZONE section and execute.
─────────────────────────────────
```

### Step 3: What the Copy-Paste Text Must Include
```
- The file name (AGENTS.md or GEMINI.md)
- The operation name
- A clear instruction to read and execute
- If there are multiple tasks pending, specify which operation name to execute
```

---

## 2. Mandatory Closing Instructions

**Claude appends this block at the end of every Task inside the TASK ZONE.**

```
─────────────────────────────────────────
MANDATORY CLOSING:

1. Before starting, record current commit:
   PRE_COMMIT=$(git rev-parse HEAD)

2. Execute the requested changes on files with their full paths.

3. After finishing, run on every modified file:
   git diff [full file path]

4. Write EXECUTION_RESULT below this Task in this same file.
   Place git diff output inside DIFF_LOG as a code block.

5. In the chat conversation with the user, say ONLY:
   "Operation [operation-name] complete, ready for review."

6. Do NOT explain what you did in the chat.
   All details go in EXECUTION_RESULT in this file.
─────────────────────────────────────────
```

---

## 3. Completion Signal Protocol

When the user pastes the Agent's completion phrase to Claude:

```
1. Claude recognizes the signal: "Operation [name] complete, ready for review."
2. Claude opens the Agent's file (AGENTS.md or GEMINI.md).
3. Claude reads ONLY the EXECUTION_RESULT section — NOT the Task above it.
4. Claude proceeds to Post-Execution Protocol below.
```

---

## 4. Post-Execution Protocol

After reading EXECUTION_RESULT, Claude does the following in order:

```
STEP_01: Read EXECUTION_RESULT completely.

STEP_02: If STATUS = DONE
         → Update ai-system/BRANCH_SUMMARY.md
         → Add one row to ai-system/ROUTING_LOG.md
         → If ISSUES_FOUND ≠ NONE, add to OPEN_ISSUES in BRANCH_SUMMARY
         → Tell user the result in Arabic

STEP_03: If STATUS = PARTIAL
         → Read BLOCKED_BY
         → Decide: rewrite Task with clearer instructions, or split it
         → Do NOT send the failed Task to the other Agent

STEP_04: If STATUS = FAILED (first time)
         → Read BLOCKED_BY
         → Rewrite Task with more precise instructions → same Agent
         → Record in ai-system/ROUTING_LOG.md

STEP_05: If STATUS = FAILED (second consecutive time for same Task)
         → STOP immediately
         → Tell user in Arabic: what failed, why, what you need from them
         → Do NOT try another Agent
         → Record in ai-system/FAILURES_AND_REVERTS.md
         → Record in ai-system/Learning_Notes.md
         → Wait for user decision

STEP_06: If ISSUES_FOUND ≠ NONE
         → Add to OPEN_ISSUES in ai-system/BRANCH_SUMMARY.md
```

---

## 5. Memory Protocol

### What to write after each Task — and where:
```
ai-system/BRANCH_SUMMARY.md        ← after EVERY Task, no exception
ai-system/ROUTING_LOG.md           ← after EVERY Task (one row)
ai-system/FAILURES_AND_REVERTS.md  ← only if FAILED twice or REVERTED
ai-system/Learning_Notes.md        ← only if there is a lesson worth recording
```

### What to update in BRANCH_SUMMARY:
```
CURRENT_STATE    : Project state now (3-5 lines)
LAST_5_DECISIONS : Last 5 decisions + Agent + result
NEXT_TASKS       : Suggested Tasks for next session
OPEN_ISSUES      : Unresolved problems from ISSUES_FOUND
META             : Last updated, last TASK_ID, total Tasks
```

### Compression Rule:
```
After every update to BRANCH_SUMMARY.md, check line count.
If file exceeds 150 lines:
→ Delete the oldest row from LAST_5_DECISIONS immediately.
→ No exception.
```

---

## 6. Cost Rules

```
COST_RULE_01: Use BRANCH_SUMMARY as primary context — read once per session.
COST_RULE_02: Read EXECUTION_RESULT only, not the full Task you wrote.
COST_RULE_03: Read code files only if ISSUES_FOUND mentions them explicitly.
COST_RULE_04: Simple tasks (explanation / opinion / quick decision) → execute yourself.
COST_RULE_05: Combine similar tasks into one Task when possible.
COST_RULE_06: Do not re-read BRANCH_SUMMARY unless user asks "وين وصلنا؟"
```

---

## 7. Routing Measurement (starts after Task #10)

> Before Task #10: do not fill measurement fields.
> From Task #11: add these to every ROUTING_LOG entry.

```
ROUTING_CONFIDENCE : [high / medium / low]
  high   → chose Agent based on documented experience in ROUTING_LOG
  medium → chose Agent based on Routing Matrix only
  low    → overlap case or untested Task type

OUTCOME_SCORE : [1-5]
  5 → perfect, no intervention  |  4 → good, minor fix
  3 → acceptable, needed rework |  2 → weak, PARTIAL
  1 → total failure, FAILED

TOKEN_EFFICIENCY : [low / medium / high]
  high → one attempt, small context  |  medium → moderate context or one retry
  low  → large context or multiple retries

REWORK_NEEDED : [yes / no]
CONSULTATION_USED : [yes / no]
```

> After every 10 Tasks, review ROUTING_LOG and update AGENT_PATTERNS.

---

## 8. Learning Notes Protocol

After important Tasks (failed, reverted, or significant learning):

```
DATE       : [date]
TASK       : [brief description]
AGENT      : [Codex / Gemini / Claude]
OUTCOME    : [SUCCESS / PARTIAL / FAIL / REVERTED]
LESSON     : [what to do or avoid next time]
REVERT_WHY : [if REVERTED: root cause. Otherwise: N/A]
```

> Every Revert is a mandatory lesson. Never skip recording it.

---

## 9. Overlap Rules

```
OVERLAP_RULE_01: Understand code + modify logic → Codex
OVERLAP_RULE_02: Understand code + no logic change → Gemini
OVERLAP_RULE_03: Large task needing both → split with DEPENDS_ON
OVERLAP_RULE_04: Uncertain → check ROUTING_LOG, then ask user
```
