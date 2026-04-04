<!--
ملخص عربي سريع:
قوالب المهام — Claude يقرأها فقط لما يكتب مهمة جديدة.
القوالب مقسمة: Codex (منطق/أخطاء) و Gemini (واجهات/شرح).
كل مهمة تبدأ بـ Unified Header ثم القالب المناسب.
-->

# TASK_TEMPLATES.md — Task Templates Reference

> Claude reads this file ONLY when writing a Task. Not every message.

---

## Unified Task Header (mandatory for every Task)

```
TASK_ID        : [YYYY-MM-DD-XXX]
TASK_TYPE      : [see GLOSSARY for valid types]
PROJECT        : [project name]
ROUTED_TO      : [Codex / Gemini]
ROUTING_REASON : [why this Agent was chosen]
DEPENDS_ON     : [prerequisite TASK_ID, or NONE]
```

---

## Codex Templates (written in AGENTS.md)

### Bug Fix
```
PROBLEM          : [describe the bug]
FILE             : [full path]
CURRENT_BEHAVIOR : [what happens now]
DESIRED_BEHAVIOR : [what should happen]
DONE_IF          : [success criteria]
DO_NOT_TOUCH     : [excluded areas]
ESCALATE_IF      : [when to stop]
CONSTRAINT       : Do not change public API. Ensure tests pass.
```

### Refactor
```
GOAL             : [refactor objective]
FILES_IN_SCOPE   : [full paths]
KEEP_IDENTICAL   : Public API, Database Schema, Existing Tests
DONE_IF          : [success criteria]
DO_NOT_TOUCH     : [excluded areas]
ESCALATE_IF      : [when to stop]
CONSTRAINT       : Minimum changes. Same behavior.
```

### New Logic
```
GOAL              : [what to add]
CONTEXT_FILES     : [full paths for understanding]
TARGET_FILE       : [full path — where new code goes]
PATTERN_TO_FOLLOW : [existing pattern to match]
DONE_IF           : [success criteria]
DO_NOT_TOUCH      : [excluded areas]
ESCALATE_IF       : [when to stop]
```

### Test Writing
```
TARGET_FUNCTION : [function to test]
FILE            : [full path]
EDGE_CASES      : [cases to cover]
TEST_FRAMEWORK  : [Jest / Vitest / Pytest]
DONE_IF         : [success criteria]
DO_NOT_TOUCH    : [tested code — tests only]
ESCALATE_IF     : [if bug found during testing]
```

### Migration
```
FROM             : [current version/library]
TO               : [target version/library]
FILES_IN_SCOPE   : [full paths]
DONE_IF          : [success criteria]
DO_NOT_TOUCH     : [excluded areas]
ESCALATE_IF      : [when to stop]
CONSTRAINT       : Keep identical behavior after migration.
```

### API Integration
```
GOAL             : [integration objective]
ENDPOINT         : [API endpoint details]
TARGET_FILE      : [full path]
AUTH_METHOD       : [API key / OAuth / none]
DONE_IF          : [success criteria]
DO_NOT_TOUCH     : [excluded areas]
ESCALATE_IF      : [when to stop]
```

---

## Gemini Templates (written in GEMINI.md)

### UI Change
```
GOAL            : [visual change]
FILES_TO_READ   : [full paths for context]
FILES_AFFECTED  : [full paths that will change]
EXPECTED_OUTPUT : [how it looks after]
DONE_IF         : [success criteria]
DO_NOT_TOUCH    : [no logic, no API]
ESCALATE_IF     : [if logic change needed]
CONSTRAINT      : Do not change logic or API. Style only.
```

### Code Explanation
```
GOAL           : Explain the following code
FILES_TO_READ  : [full path]
FOCUS_ON       : [logic / structure / relationships]
OUTPUT_FORMAT  : [Bullet points / Plain text / Inline comments]
DONE_IF        : [success criteria]
DO_NOT_TOUCH   : Do not modify any code — explanation only.
ESCALATE_IF    : [if bug found, report don't fix]
```

### File Comparison
```
GOAL           : Compare these files and highlight differences
FILES_TO_READ  : [full paths of both files]
FOCUS_ON       : [Breaking changes / Logic / API]
OUTPUT_FORMAT  : Old behavior vs New behavior
DONE_IF        : [success criteria]
DO_NOT_TOUCH   : Do not modify any file — comparison only.
ESCALATE_IF    : [if critical conflict found]
```

### Documentation
```
GOAL           : Generate documentation for this module
FILES_TO_READ  : [full paths]
DOC_FORMAT     : [JSDoc / Markdown / Inline comments]
AUDIENCE       : [Developer / User]
DONE_IF        : [success criteria]
DO_NOT_TOUCH   : Do not change any code. Add comments only.
ESCALATE_IF    : [if function logic unclear]
CONSTRAINT     : Do not change any code.
```

### Style Refactor
```
GOAL           : [refactor objective]
FILES_TO_READ  : [full paths or directory]
SCOPE          : Style / Formatting / Naming — No logic changes
PATTERN        : [example of desired pattern]
DONE_IF        : [success criteria]
DO_NOT_TOUCH   : [no logic, no exports, no schema]
ESCALATE_IF    : [if external import change needed]
CONSTRAINT     : Keep identical behavior. Keep all public exports.
```

### Code Generation
```
GOAL           : [what to generate]
SPECS          : [detailed specifications]
TARGET_FILE    : [full path for new file]
PATTERN        : [existing component/file to match style]
DONE_IF        : [success criteria]
DO_NOT_TOUCH   : [existing files]
ESCALATE_IF    : [if specs are ambiguous]
```

---

## EXECUTION_RESULT Template (appended empty after every Task)

```
═══ EXECUTION_RESULT ═══

  1. PRE_COMMIT    :
  2. STATUS        :
  3. REPORT        :
  4. ISSUES_FOUND  :
  5. DIFF_LOG      :
     ```diff
     ```
  6. BLOCKED_BY    :
  7. FINAL_NOTE    :
```
