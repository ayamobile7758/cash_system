# Aya Mobile — Safety Infrastructure Setup

> **Role**: You are a senior quality engineering lead responsible for building the long-term safety infrastructure of this codebase. Your job is not to add features — it is to make breaking changes **impossible to miss** before they reach production. You work with precision, you read every relevant file before touching it, and you leave the codebase safer than you found it.

> **Authority Declaration**: This document is the sole authoritative source for this execution wave. Execute every part completely. Do not skip, combine, or reorder steps. Agents execute without requesting clarification.

---

## Context: Why This Wave Exists

The project has suffered repeated CI failures caused by a single systemic gap: executors modify components, state, and visible text **without first reading the e2e tests that guard that code**. A changed string, a flipped boolean, or a renamed CSS class silently breaks tests that only surface after `git push`.

This wave installs three permanent safeguards:

1. **`CLAUDE.md`** — a machine-readable rule file that every AI agent running in this repo must obey before touching any file
2. **`docs/PROTECTED_STRINGS.md`** — a living index of every Arabic string, CSS class, and role selector that is directly tested in e2e specs, with the exact file and line where it is asserted
3. **`EXECUTOR_TEMPLATE.md`** — a reusable executor prompt template that future waves must use as their base, with the safety checks already embedded

---

## Global Rules

1. **No npm dependencies added or removed.**
2. **No database schema changes.**
3. **No changes to API routes.**
4. **No changes to business logic.**
5. **TypeScript must compile clean**: `npx tsc --noEmit --pretty false` → zero output.
6. **All existing tests must pass**: `npx vitest run` → all pass.
7. **Build must succeed**: `npm run build` → no Error lines.
8. **Read every file before writing it.** If the file already exists, read it fully first.
9. **Do not change any existing source code** — this wave only creates new files.
10. **Do not delete, rename, or modify `AGENTS.md`** — it is an existing file owned by the project and must remain untouched. `CLAUDE.md` supplements it, it does not replace it.
11. **Do not reformat, rewrite, or restructure** any existing file you read.

---

## Part 1 — CLAUDE.md

### 1.1 Purpose

`CLAUDE.md` is the file that Claude Code and AI agents automatically read at the start of every session. It sets the standing rules for the entire project. Anything written here is binding for every future executor.

**Important**: `AGENTS.md` already exists in the project root. `CLAUDE.md` must not duplicate its content. Write `CLAUDE.md` to cover what is missing from `AGENTS.md`: project-specific safety rules for the AI workflow.

### 1.2 What to Read First

Before writing `CLAUDE.md`, read these files in full so you understand the project:

- `package.json` — project name, scripts
- `AGENTS.md` — read fully so you do not duplicate its content in `CLAUDE.md`
- `app/globals.css` — lines 1–100 (understand CSS variable conventions)
- `components/pos/pos-workspace.tsx` — lines 1–50 (understand the main component)
- `tests/e2e/smoke.spec.ts` — full file
- `tests/e2e/device-qa.spec.ts` — full file

### 1.3 Content Requirements

`CLAUDE.md` must contain **exactly these 7 sections**, each starting with a level-2 heading (`## `), in this order:

#### `## Project Identity`
- Project name: Aya Mobile (آيا موبايل)
- Stack: Next.js 15 App Router, Supabase, Playwright e2e, Vitest unit
- Language: Arabic RTL retail POS system
- Primary users: pos_staff (cashier), admin
- Note: this file supplements `AGENTS.md` — do not duplicate rules already there

#### `## Mandatory Pre-Edit Checklist`
A numbered checklist that every executor must complete **before modifying any file**:

1. Read the file fully before editing it
2. Search `tests/e2e/` for any reference to the component, class, string, or boolean you are about to change
3. Read every matching test file in full
4. Confirm your change does not break any assertion in those tests
5. If a conflict exists: stop and report it — do not silently proceed
6. After all changes: run `npx tsc --noEmit --pretty false` and confirm zero output
7. After all changes: run `npx vitest run` and confirm all pass

#### `## Protected Entities`
List these exact categories with an explanation for each:

- **State initializers** (`useState(...)`) — any boolean/string default that controls visible UI. Changing `false` → `true` can flip what users see on load and break tests expecting the original state.
- **Visible Arabic strings** — any user-facing text in JSX. Tests assert exact substrings. A cosmetic rewording breaks assertions silently.
- **CSS class names used in tests** — classes like `.pos-cart-sheet__summary`, `.dashboard-bottom-bar`, `.result-card` are locators in e2e tests. Renaming them breaks those tests.
- **Role and aria-label values** — `getByRole("button", { name: "..." })` assertions depend on exact accessible names.
- **Heading hierarchy** — `getByRole("heading", { name: "..." })` depends on both the text and the element being `h1`–`h6`.

#### `## Test Commands`
```bash
# Unit tests (fast, no server needed)
npx vitest run

# TypeScript check
npx tsc --noEmit --pretty false

# Build check
npm run build

# E2E tests (requires running server on port 3100)
npx playwright test
```

#### `## File Ownership Map`
A table mapping sensitive source files to the e2e test files that guard them. **Build this table dynamically** by reading all 12 e2e test files listed in Part 2.2 and extracting every component, page, or API route they reference. Do not copy the example table below — it is incomplete. The final table must include **every** source file that has at least one assertion against it in any e2e test.

Use this structure:

| Source File | Guards What | Test Files |
|-------------|------------|-----------|

To build it:
1. For each e2e test file, identify which source components/pages/routes it navigates to, clicks on, or asserts against
2. For each identified source file, list all e2e test files that reference it
3. Include workspace components (e.g. debts-workspace, invoices-workspace), page.tsx files, settings components, and any other source file with e2e coverage

The table in the example below is **a starting point, not the full list** — you must discover and add all missing entries:

| `components/pos/pos-workspace.tsx` | POS cart sheet, confirm button, viewport state | `device-qa.spec.ts`, `px06-device-gate.spec.ts`, `px22-transactional-ux.spec.ts` |
| `components/dashboard/reports-overview.tsx` | Reports page headings and section titles | `px11-reports.spec.ts` |
| `components/dashboard/dashboard-shell.tsx` | Bottom bar, navigation drawer, topbar | `px21-shell-auth.spec.ts`, `px16-navigation-ia.spec.ts` |
| ... | ... | ... |

#### `## CSS and Layout Rules`
- Light theme only — zero dark mode CSS
- RTL native — every layout decision must be RTL-correct
- Do not add `position: sticky` inside containers with `overflow: hidden`
- Do not use `min(...)` for widths that need a responsive range — use `clamp(...)`
- CSS class renames require a grep across `tests/e2e/` before applying
- Check `docs/PROTECTED_STRINGS.md` Section B before renaming any CSS class

#### `## Commit Convention`
```
fix(scope): description
feat(scope): description
refactor(scope): description
docs(scope): description
```
- No force push to main
- No `--no-verify`
- Every wave must end with a commit and `git push origin main`

---

## Part 2 — docs/PROTECTED_STRINGS.md

### 2.1 Purpose

This file is a living index. Any string, CSS class, aria-label, or role-based selector that is **directly asserted** in an e2e test lives here. Any executor that wants to change one of these values must check this file first and update it as part of their wave.

**Location**: `docs/PROTECTED_STRINGS.md` — placed in `docs/` and not inside `tests/e2e/` to prevent any test runner from attempting to execute it as a test spec.

Before creating this file, create the `docs/` directory if it does not exist.

### 2.2 What to Read First

Read every e2e test file completely before writing this document. Do not write a single line of the output file until you have finished reading all of them:

- `tests/e2e/smoke.spec.ts`
- `tests/e2e/device-qa.spec.ts`
- `tests/e2e/px06-device-gate.spec.ts`
- `tests/e2e/px06-uat.spec.ts`
- `tests/e2e/px11-reports.spec.ts`
- `tests/e2e/px13-search-alerts.spec.ts`
- `tests/e2e/px16-navigation-ia.spec.ts`
- `tests/e2e/px18-visual-accessibility.spec.ts`
- `tests/e2e/px21-shell-auth.spec.ts`
- `tests/e2e/px22-transactional-ux.spec.ts`
- `tests/e2e/px23-operational-workspaces.spec.ts`
- `tests/e2e/px24-analytical-config.spec.ts`

### 2.3 Content Requirements

The file must have a header followed by **exactly these 4 sections**, each starting with `## Section`:

#### File Header
```
# Protected Strings & Selectors Index

This file catalogues every Arabic string, CSS class, aria-label, and role-based
selector that is directly asserted in the e2e test suite.

**Rule**: If you intentionally change a value listed here in source code as part
of an authorized UX change in your executor prompt, you must:
1. Update this index to reflect the new value
2. Update the test file that asserts it to match the new value
3. Verify CI passes before merging

**Warning**: If your executor prompt does NOT explicitly authorize changing this
value, do NOT change it in source code. The test is the ground truth — the source
must match the test, not the other way around.

Last updated: [DATE]
Total protected strings: [N]
Total protected CSS classes: [N]
```

**Important**: Replace `[DATE]` with the actual date and `[N]` with the actual counts after filling all sections. Do not leave `[N]` as literal text.

#### `## Section A — Protected Arabic Strings`

A table with these exact columns:

| النص | نوع الـ Assertion | الملف | السطر |
|------|------------------|-------|-------|

Rules for filling this table:
- Extract **every** Arabic string from every assertion across all 12 test files
- Decode all Unicode escape sequences to their Arabic text (e.g. `"\u062a\u0623\u0643\u064a\u062f"` → `"تأكيد"`)
- Include strings from: `getByText(...)`, `getByRole("heading", { name: "..." })`, `getByRole("button", { name: "..." })`, `getByRole("link", { name: "..." })`, `getByLabel(...)`, `getByPlaceholder(...)`, `toContainText(...)`, `toHaveTitle(...)`, `toHaveAttribute(...)`, and `.filter({ hasText: "..." })` (Arabic text inside hasText is a protected string)
- For regex patterns like `/نقطة البيع/i`, write the Arabic text with a note `(regex)`
- The assertion type column must use one of: `getByText`, `getByRole(heading)`, `getByRole(button)`, `getByRole(link)`, `getByLabel`, `getByPlaceholder`, `toContainText`, `toHaveTitle`, `toHaveAttribute`, `filter(hasText)`
- Sort rows by test file name alphabetically

#### `## Section B — Protected CSS Classes`

A table with these exact columns:

| الـ Class | كيف تُستخدم في الـ Test | الملف | السطر |
|-----------|------------------------|-------|-------|

Rules for filling this table:
- Extract every CSS class used as a DOM locator in tests
- Include: `page.locator(".class-name")`, any `.locator()` call referencing a dot-prefixed class
- Do not include classes mentioned only in comments
- For each class, describe how it is used (e.g. "locator for visibility check", "filter by text content")
- Note: Arabic strings inside `.filter({ hasText: "..." })` belong in Section A (protected strings), not here. Only the CSS class from the `.locator()` part belongs in Section B

#### `## Section C — Protected State and Behavior`

A table with these exact columns:

| الوصف | السلوك المتوقع | المكوّن | الملف الذي يختبره |
|--------|---------------|---------|------------------|

Fill this table with every implicit UI state that tests rely on. Must include at minimum:

| الوصف | السلوك المتوقع | المكوّن | الملف الذي يختبره |
|--------|---------------|---------|------------------|
| حالة بدء سلة الهاتف | `isCartSheetExpanded = false` (مطوية) عند التحميل | `pos-workspace.tsx` | `px22-transactional-ux.spec.ts:59` |
| زر تأكيد البيع على الهاتف | مرئي فور تسجيل الدخول دون أي نقر | `pos-workspace.tsx` | `device-qa.spec.ts:220`, `px06-device-gate.spec.ts:116` |
| شريط التنقل السفلي | مرئي على الهاتف (360px) في `/pos` | `dashboard-shell.tsx` | `px21-shell-auth.spec.ts:74` |
| مقبض السلة المطوية | `.pos-cart-sheet__summary` مرئي في الوضع المطوي | `pos-workspace.tsx` | `px22-transactional-ux.spec.ts:59` |

Add any additional state dependencies you discover while reading the tests.

#### `## Section D — How to Update This File`

Write clear instructions for future executors:

1. **When you change a protected string in source code**: find its row in Section A, update the `النص` column to the new value, and note the change date in the file header
2. **When you add a new assertion to a test**: add the string or class to the appropriate section before committing
3. **When you rename a CSS class**: update Section B, grep `tests/e2e/` to confirm all usages, and update all test files before renaming the source
4. **When a state/behavior changes**: update Section C and verify the tests that depend on it still pass
5. This file must always reflect the **current** state of the tests — a stale entry is worse than no entry

---

## Part 3 — EXECUTOR_TEMPLATE.md

### 3.1 Purpose

This is the standard template for all future executor prompts. Every new wave must copy this template and fill in the wave-specific sections. The safety checks are pre-embedded so executors cannot skip them.

**Location**: `EXECUTOR_TEMPLATE.md` in the project root (same level as `CLAUDE.md`).

### 3.2 Content Requirements

The template must be a complete, ready-to-copy document. Write it with placeholder markers in the fill-in sections so it is immediately usable. It must contain these sections in this order:

#### Header
```markdown
# Aya Mobile — [WAVE NAME]

> **Role**: [DESCRIBE THE EXECUTOR'S ROLE AND SPECIALTY FOR THIS WAVE]

> **Authority Declaration**: This document is the sole authoritative source for this
> execution wave. It supersedes all prior reports and trackers — but it does NOT
> override `CLAUDE.md` or `docs/PROTECTED_STRINGS.md`. Those files define standing
> safety rules that every wave must respect.
> Agents execute without requesting clarification.
```

#### `## Executive Summary`
Placeholder text explaining what to write: a 2–4 sentence description of what this wave changes, what problem it solves, and what the success state looks like.

#### `## System Context`
A placeholder table:
```
| Item | Location |
|------|----------|
| [File to modify] | [path + relevant line range] |
```

#### `## Pre-Change Safety Protocol`
This section must appear **verbatim** in every wave — do not mark it as a placeholder. Write it as a real markdown heading (`## Pre-Change Safety Protocol`) in the template file, not inside a code block. The content below shows exactly what to write:

```markdown
## Pre-Change Safety Protocol

Complete this checklist for every file you plan to edit **before writing a single line**:

1. Read `docs/PROTECTED_STRINGS.md` fully
2. Read the source file you are about to edit fully
3. Search `tests/e2e/` for the component name, every string you will change,
   and every CSS class you will touch
4. Read every matching test file in full
5. Confirm your planned change does not break any assertion in those tests
6. If you find a conflict: document it in the Deviations section and propose
   the safest resolution — do not silently proceed

If any step reveals a conflict you cannot resolve without deviating from these
instructions, stop at that Part, write the conflict in the Deviations section,
and continue with the remaining Parts.
```

#### `## Global Rules`
Write this section **verbatim** as a real markdown heading (`## Global Rules`) in the template file, not inside a code block. The content below shows exactly what to write:

```markdown
## Global Rules

1. No npm dependencies added or removed
2. No database schema changes
3. No changes to API routes (unless this wave explicitly requires it)
4. No changes to business logic unless explicitly stated
5. TypeScript must compile clean: `npx tsc --noEmit --pretty false` → zero output
6. All existing tests must pass: `npx vitest run` → all pass
7. Build must succeed: `npm run build` → no Error lines
8. Read every file before modifying it
9. Light theme only — zero dark mode CSS
10. RTL is native — every layout decision must be RTL-correct
11. Do not rewrite or restructure components — make surgical changes only
12. Do not change any text content, labels, or Arabic strings unless this wave
    explicitly requires it
13. Before changing any visible string, boolean state, or CSS class: search
    `tests/e2e/` for that value and read every matching test file completely
14. Before changing any value: check `docs/PROTECTED_STRINGS.md` — if the value
    is listed there, you must update the index as part of this wave
15. Commit and push to git when done
```

#### `## Parts`
Placeholder explaining the structure each Part must follow. Write each Part as a real heading in the template (not inside a code block). Use triple-backtick code fences for the before/after snippets. The structure for each Part is:

```
## Part N — [PART NAME]

### N.1 Problem
[What is broken or missing, and why. Include the file path and line number.]

### N.2 Fix
[Exact change with a before/after code block using triple-backtick fences.]

### N.3 Test Impact Check
- Does any test in tests/e2e/ reference this component, string, or class?
- Which test files? Which lines?
- Confirmed: this change does not break any existing assertion? [YES / NO — explain if NO]
```

#### `## Verification Checklist`
Write the standard ACs as a bash code block (using real triple-backtick fences, not escaped), then add a placeholder for wave-specific ACs. The content:

```
## Verification Checklist

AC-1: TypeScript clean — npx tsc --noEmit --pretty false → zero output
AC-2: All unit tests pass — npx vitest run → all pass
AC-3: Build succeeds — npm run build → no Error lines
AC-4: PROTECTED_STRINGS.md up to date — grep each changed value in docs/PROTECTED_STRINGS.md
AC-5 and beyond: [WAVE-SPECIFIC CHECKS]
```

#### `## Execution Order`
Placeholder with the mandatory first and last steps already written:

```markdown
## Execution Order

1. Read `docs/PROTECTED_STRINGS.md` fully
2. Read `CLAUDE.md` fully
3. [WAVE-SPECIFIC READING STEPS]
4. [WAVE-SPECIFIC CHANGE STEPS]
N-2. Run verification checklist (AC-1 through AC-N)
N-1. Update `docs/PROTECTED_STRINGS.md` if any protected value was changed
N.  Commit: `[TYPE](scope): [description]` — then `git push origin main`
```

#### `## Post-Execution Report`
Write this section verbatim:

```markdown
## Post-Execution Report

After completing all steps, create a report file named
`[WAVE_NAME]_REPORT_YYYY-MM-DD.md` in the project root containing:

- Summary of all changes made
- Result for each AC: pass / fail / skipped (with reason if not pass)
- `docs/PROTECTED_STRINGS.md` status: updated / no changes needed
- Any deviations from these instructions with full explanation
- Complete list of files created or modified
```

#### `## Acceptance Criteria Summary`
Placeholder table with the standard rows already filled in:

```markdown
## Acceptance Criteria Summary

| AC | Criterion | Verification Command |
|----|-----------|---------------------|
| AC-1 | TypeScript compiles clean | `npx tsc --noEmit --pretty false` → 0 errors |
| AC-2 | All unit tests pass | `npx vitest run` → all pass |
| AC-3 | Build succeeds | `npm run build` → no Error lines |
| AC-4 | PROTECTED_STRINGS.md reflects all changes | grep for each changed value |
| AC-5 | [WAVE-SPECIFIC] | [VERIFICATION COMMAND] |
```

---

## Verification Checklist

Run these commands after creating all three files. Every check must pass before committing.

```bash
# AC-1: TypeScript clean
npx tsc --noEmit --pretty false
# Expected: zero output

# AC-2: All unit tests pass
npx vitest run
# Expected: all pass

# AC-3: Build succeeds
npm run build
# Expected: no Error lines

# AC-4: All 7 section headings present in CLAUDE.md — verify each by name
grep "^## Project Identity" CLAUDE.md
grep "^## Mandatory Pre-Edit Checklist" CLAUDE.md
grep "^## Protected Entities" CLAUDE.md
grep "^## Test Commands" CLAUDE.md
grep "^## File Ownership Map" CLAUDE.md
grep "^## CSS and Layout Rules" CLAUDE.md
grep "^## Commit Convention" CLAUDE.md
# Expected: each returns exactly 1 result
# Note: do NOT use grep -c "^## " — it counts all level-2 headings including
# examples and sub-sections, not just the 7 required top-level sections

# AC-5: docs/PROTECTED_STRINGS.md exists
ls docs/PROTECTED_STRINGS.md
# Expected: file exists

# AC-6: All 4 sections present in PROTECTED_STRINGS.md — verify each by name
grep "^## Section A" docs/PROTECTED_STRINGS.md
grep "^## Section B" docs/PROTECTED_STRINGS.md
grep "^## Section C" docs/PROTECTED_STRINGS.md
grep "^## Section D" docs/PROTECTED_STRINGS.md
# Expected: each returns 1 result

# AC-7: EXECUTOR_TEMPLATE.md exists
ls EXECUTOR_TEMPLATE.md
# Expected: file exists

# AC-8: Template contains Pre-Change Safety Protocol
grep "Pre-Change Safety Protocol" EXECUTOR_TEMPLATE.md
# Expected: 1 or more results (may appear as heading or inside code block)

# AC-9: Template contains Global Rules
grep "Global Rules" EXECUTOR_TEMPLATE.md
# Expected: 1 or more results (may appear as heading or inside code block)

# AC-10: "تأكيد البيع" is catalogued in PROTECTED_STRINGS.md
grep "تأكيد البيع" docs/PROTECTED_STRINGS.md
# Expected: 1 or more results

# AC-11: "pos-cart-sheet__summary" is catalogued in PROTECTED_STRINGS.md
grep "pos-cart-sheet__summary" docs/PROTECTED_STRINGS.md
# Expected: 1 or more results

# AC-12: Section A has a meaningful number of rows (not just a few)
SECTION_A_ROWS=$(sed -n '/^## Section A/,/^## Section B/p' docs/PROTECTED_STRINGS.md | grep -c "^|" || true)
echo "Section A rows: $SECTION_A_ROWS"
# Expected: 50 or more (there are 80+ Arabic assertions across 12 test files)

# AC-13: Section B has a meaningful number of rows
SECTION_B_ROWS=$(sed -n '/^## Section B/,/^## Section C/p' docs/PROTECTED_STRINGS.md | grep -c "^|" || true)
echo "Section B rows: $SECTION_B_ROWS"
# Expected: 5 or more (there are multiple CSS class locators across the test files)

# AC-14: Section C has the required minimum rows
SECTION_C_ROWS=$(sed -n '/^## Section C/,/^## Section D/p' docs/PROTECTED_STRINGS.md | grep -c "^|" || true)
echo "Section C rows: $SECTION_C_ROWS"
# Expected: 4 or more (the prompt specifies at least 4 mandatory rows)

# AC-15: File Ownership Map in CLAUDE.md has rows
grep "^|" CLAUDE.md | grep -c "\.spec\.ts" || true
# Expected: 8 or more source-to-test mappings

# AC-16: AGENTS.md still exists and is unmodified (checks both staged and unstaged)
git diff HEAD AGENTS.md
# Expected: no output (file unchanged)
# Note: "git diff HEAD" catches both staged and unstaged changes

# AC-17: No new files were created inside tests/e2e/ (docs/ is the correct location)
ls tests/e2e/*.md 2>/dev/null
# Expected: no .md files (there are currently none)
```

---

## Execution Order

1. Read `AGENTS.md` fully — note its content so you do not duplicate it in `CLAUDE.md`
2. Read all 12 e2e test files fully (listed in Part 2.2) — do not write any output file until all 12 are read
3. Read `package.json`, `app/globals.css` (lines 1–100), `components/pos/pos-workspace.tsx` (lines 1–50)
4. Create `docs/` directory if it does not exist
5. Create `CLAUDE.md` (Part 1) — 7 sections, each starting with `## `
6. Create `docs/PROTECTED_STRINGS.md` (Part 2) — header + 4 sections starting with `## Section`
7. Create `EXECUTOR_TEMPLATE.md` (Part 3)
8. Run verification checklist (AC-1 through AC-17) — fix any failure before proceeding
9. Create report file `SAFETY_INFRASTRUCTURE_REPORT_[DATE].md` (Post-Execution Report section)
10. Stage all new files: `git add CLAUDE.md docs/PROTECTED_STRINGS.md EXECUTOR_TEMPLATE.md SAFETY_INFRASTRUCTURE_REPORT_[DATE].md`
11. Commit: `docs(safety): add CLAUDE.md, PROTECTED_STRINGS.md, and EXECUTOR_TEMPLATE`
12. Push: `git push origin main`

---

## Post-Execution Report

After completing all steps, create `SAFETY_INFRASTRUCTURE_REPORT_[DATE].md` in the project root containing:

- Summary of the three files created
- Result for each AC (AC-1 through AC-17): pass / fail
- Total number of protected strings catalogued in Section A of PROTECTED_STRINGS.md
- Total number of protected CSS classes catalogued in Section B
- Confirmation that `AGENTS.md` was not modified
- Any deviations from these instructions with full explanation
- Complete list of files created

---

## Acceptance Criteria Summary

| AC | Criterion | Verification |
|----|-----------|-------------|
| AC-1 | TypeScript compiles clean | `npx tsc --noEmit --pretty false` → 0 errors |
| AC-2 | All unit tests pass | `npx vitest run` → all pass |
| AC-3 | Build succeeds | `npm run build` → no errors |
| AC-4 | All 7 section names present in CLAUDE.md | grep each name individually → 1 each |
| AC-5 | `docs/PROTECTED_STRINGS.md` exists | `ls docs/PROTECTED_STRINGS.md` |
| AC-6 | All 4 `## Section` headings present | grep each individually → 1 each |
| AC-7 | `EXECUTOR_TEMPLATE.md` exists | `ls EXECUTOR_TEMPLATE.md` |
| AC-8 | Template has Pre-Change Safety Protocol | `grep "Pre-Change Safety Protocol" EXECUTOR_TEMPLATE.md` → 1 |
| AC-9 | Template has Global Rules | `grep "Global Rules" EXECUTOR_TEMPLATE.md` → 1 |
| AC-10 | `"تأكيد البيع"` catalogued | grep in PROTECTED_STRINGS.md → ≥1 |
| AC-11 | `"pos-cart-sheet__summary"` catalogued | grep in PROTECTED_STRINGS.md → ≥1 |
| AC-12 | Section A has ≥50 rows | `sed` extract Section A, `grep -c "^|"` ≥ 50 |
| AC-13 | Section B has ≥5 rows | `sed` extract Section B, `grep -c "^|"` ≥ 5 |
| AC-14 | Section C has ≥4 rows | `sed` extract Section C, `grep -c "^|"` ≥ 4 |
| AC-15 | File Ownership Map has ≥8 mappings | `grep` CLAUDE.md for `.spec.ts` rows ≥ 8 |
| AC-16 | `AGENTS.md` unmodified | `git diff HEAD AGENTS.md` → no output |
| AC-17 | No `.md` files added inside `tests/e2e/` | `ls tests/e2e/*.md` → none |
