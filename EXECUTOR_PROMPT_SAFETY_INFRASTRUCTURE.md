# Aya Mobile — Safety Infrastructure Setup

> **Role**: You are a senior quality engineering lead responsible for building the long-term safety infrastructure of this codebase. Your job is not to add features — it is to make breaking changes **impossible to miss** before they reach production. You work with precision, you read every relevant file before touching it, and you leave the codebase safer than you found it.

> **Authority Declaration**: This document is the sole authoritative source for this execution wave. Execute every part completely. Do not skip, combine, or reorder steps. Agents execute without requesting clarification.

---

## Context: Why This Wave Exists

The project has suffered repeated CI failures caused by a single systemic gap: executors modify components, state, and visible text **without first reading the e2e tests that guard that code**. A changed string, a flipped boolean, or a renamed CSS class silently breaks tests that only surface after `git push`.

This wave installs three permanent safeguards:

1. **`CLAUDE.md`** — a machine-readable rule file that every AI agent running in this repo must obey before touching any file
2. **`tests/e2e/PROTECTED_STRINGS.md`** — a living index of every Arabic string, CSS class, and role selector that is directly tested in e2e specs, with the exact file and line where it is asserted
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
9. **Do not change any existing source code** — this wave only creates new files and appends to existing ones.
10. **Do not reformat, rewrite, or restructure** any existing file you read.

---

## Part 1 — CLAUDE.md

### 1.1 Purpose

`CLAUDE.md` is the file that Claude Code and AI agents automatically read at the start of every session. It sets the standing rules for the entire project. Anything written here is binding for every future executor.

### 1.2 What to Read First

Before writing `CLAUDE.md`, read these files in full so you understand the project:

- `package.json` — project name, scripts
- `AGENTS.md` — existing agent rules (do not duplicate them)
- `app/globals.css` — lines 1–100 (understand CSS variable conventions)
- `components/pos/pos-workspace.tsx` — lines 1–50 (understand the main component)
- `tests/e2e/smoke.spec.ts` — full file
- `tests/e2e/device-qa.spec.ts` — full file

### 1.3 Content Requirements

`CLAUDE.md` must contain **exactly these sections**, in this order:

#### Section 1: Project Identity
- Project name: Aya Mobile (آيا موبايل)
- Stack: Next.js 15 App Router, Supabase, Playwright e2e, Vitest unit
- Language: Arabic RTL retail POS system
- Primary users: pos_staff (cashier), admin

#### Section 2: Mandatory Pre-Edit Checklist
A numbered checklist that every executor must complete **before modifying any file**:

1. Read the file fully before editing it
2. Search `tests/e2e/` for any reference to the component, class, string, or boolean you are about to change
3. Read every matching test file in full
4. Confirm your change does not break any assertion in those tests
5. If a conflict exists: stop and report it — do not silently proceed
6. After all changes: run `npx tsc --noEmit --pretty false` and confirm zero output
7. After all changes: run `npx vitest run` and confirm all pass

#### Section 3: Protected Entities — Never Change Without Test Review
List these exact categories with an explanation:

- **State initializers** (`useState(...)`) — any boolean/string default that controls visible UI. Changing `false` → `true` can flip what users see on load and break tests expecting the original state.
- **Visible Arabic strings** — any user-facing text in JSX. Tests assert exact substrings. A cosmetic rewording breaks assertions silently.
- **CSS class names used in tests** — classes like `.pos-cart-sheet__summary`, `.dashboard-bottom-bar`, `.result-card` are locators in e2e tests. Renaming them breaks those tests.
- **Role and aria-label values** — `getByRole("button", { name: "..." })` assertions depend on exact accessible names.
- **Heading hierarchy** — `getByRole("heading", { name: "..." })` depends on both the text and the element being `h1`–`h6`.

#### Section 4: Test Commands
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

#### Section 5: File Ownership Map
A table mapping sensitive areas to their test files:

| Area | Source File | Test File |
|------|------------|-----------|
| POS cart sheet | `components/pos/pos-workspace.tsx` | `tests/e2e/device-qa.spec.ts`, `tests/e2e/px06-device-gate.spec.ts`, `tests/e2e/px22-transactional-ux.spec.ts` |
| Reports page headings | `components/dashboard/reports-overview.tsx` | `tests/e2e/px11-reports.spec.ts` |
| Dashboard bottom bar | `components/dashboard/dashboard-shell.tsx` | `tests/e2e/px21-shell-auth.spec.ts` |
| Navigation drawer | `components/dashboard/dashboard-shell.tsx` | `tests/e2e/px16-navigation-ia.spec.ts` |
| Access guard components | `components/pos/access-required.tsx`, `components/dashboard/access-required.tsx` | `tests/e2e/smoke.spec.ts` |
| Home / login page | `app/page.tsx`, `app/login/page.tsx` | `tests/e2e/smoke.spec.ts`, `tests/e2e/px21-shell-auth.spec.ts` |
| Install prompt | `components/runtime/install-prompt.tsx` | `tests/e2e/px06-device-gate.spec.ts`, `tests/e2e/px21-shell-auth.spec.ts` |
| Sales API | `app/api/sales/route.ts` | `tests/e2e/px06-uat.spec.ts`, `tests/e2e/device-qa.spec.ts` |

#### Section 6: CSS and Layout Rules
- Light theme only — zero dark mode CSS
- RTL native — every layout decision must be RTL-correct
- Do not add `position: sticky` inside containers with `overflow: hidden`
- Do not use `min(...)` for widths that need a responsive range — use `clamp(...)`
- CSS class renames require a grep across `tests/e2e/` before applying

#### Section 7: Commit Convention
```
fix(scope): description
feat(scope): description
refactor(scope): description
```
No force push to main. No `--no-verify`.

---

## Part 2 — tests/e2e/PROTECTED_STRINGS.md

### 2.1 Purpose

This file is a living index. Any string, CSS class, aria-label, or role-based selector that is **directly asserted** in an e2e test lives here. Any executor that wants to change one of these values must check this file first and update it as part of their wave.

### 2.2 What to Read First

Read every e2e test file completely before writing this document:

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

The file must have these sections:

#### Header
Explain the purpose: this file lists every protected assertion. Changing any listed value without updating both the source file AND this index will cause CI failure.

#### Section A: Protected Arabic Strings
A table with columns: `النص | نوع الـ Assertion | الملف | السطر`

Extract **every** Arabic string from every assertion across all test files:
- `getByText("...")` assertions
- `getByRole("heading", { name: "..." })` assertions
- `getByRole("button", { name: "..." })` assertions
- `getByRole("link", { name: "..." })` assertions
- `getByLabel("...")` assertions
- `getByPlaceholder("...")` assertions
- Unicode escape sequences decoded to their Arabic text

For each string, note:
- The exact Arabic text (decode Unicode escapes fully)
- The assertion type (`getByText`, `getByRole("heading")`, `getByRole("button")`, etc.)
- The test file (short name only, e.g. `smoke.spec.ts`)
- The approximate line number

#### Section B: Protected CSS Classes
A table with columns: `الـ Class | كيف تُستخدم | الملف | السطر`

Extract every CSS class used as a locator in tests:
- `page.locator(".class-name")`
- `.filter({ hasText: "..." })`
- Any `locator()` call that references a class

#### Section C: Protected State and Behavior
A table documenting UI states that tests rely on:

| الوصف | القيمة المتوقعة | الملف | السطر |
|--------|----------------|-------|-------|

Include:
- `isCartSheetExpanded` starts as `false` (collapsed) on phone
- Bottom bar visible on phone viewport (360px) at `/pos`
- Cart sheet summary handle (`.pos-cart-sheet__summary`) visible when collapsed
- Confirm sale button visible in collapsed cart bar

#### Section D: How to Update This File
Instructions for future executors:
1. When you change a protected string in source code, find it in Section A and update the text there
2. When you add a new assertion to a test, add the string/class to this file
3. When you rename a CSS class, update Section B and grep `tests/e2e/` to find all usages first
4. This file must always reflect the current state of the tests

---

## Part 3 — EXECUTOR_TEMPLATE.md

### 3.1 Purpose

This is the standard template for all future executor prompts. Every new wave must copy this template and fill in the wave-specific sections. The safety checks are pre-embedded so executors cannot skip them.

### 3.2 Content Requirements

The template must have these sections:

#### Header Block (fill-in)
```
# Aya Mobile — [Wave Name]

> **Role**: [Describe the executor's role for this wave]
> **Authority Declaration**: This document is the sole authoritative source...
```

#### Executive Summary (fill-in)
What this wave changes and why.

#### System Context Table (fill-in)
Files to be modified, with line references.

#### Global Rules Section
**Copy these verbatim — do not modify them:**

1. No npm dependencies added or removed
2. No database schema changes
3. No changes to API routes (unless this wave specifically requires it)
4. No changes to business logic unless explicitly stated
5. TypeScript must compile clean: `npx tsc --noEmit --pretty false` → zero output
6. All existing tests must pass: `npx vitest run` → all pass
7. Build must succeed: `npm run build` → no Error lines
8. Read every file before modifying it
9. Light theme only — zero dark mode CSS
10. RTL is native — every layout decision must be RTL-correct
11. Do not rewrite or restructure components — make surgical changes only
12. Do not change any text content, labels, or Arabic strings unless this wave specifically requires it
13. **Before changing any visible string, boolean state, or CSS class: search `tests/e2e/` for that value and read every matching test file completely**
14. **Before submitting: confirm your changes do not break any assertion in `tests/e2e/PROTECTED_STRINGS.md`**
15. Commit and push to git when done

#### Pre-Change Safety Protocol Section
A mandatory checklist that must appear before every Part in the template:

```
## Pre-Change Safety Protocol
For each file you are about to edit, complete this checklist:
- [ ] I have read the file fully
- [ ] I have searched tests/e2e/ for: [component name], [affected strings], [CSS classes]
- [ ] I have read every matching test file
- [ ] I confirm my change does not break any existing assertion
- [ ] If I found a conflict, I have documented it in the Deviations section
```

#### Parts Section (fill-in)
Each Part follows this structure:
```
## Part N — [Name]
### N.1 Problem
[Describe what is broken and why]
### N.2 Fix
[Exact code change with before/after]
### N.3 Test Impact Check
[Which tests touch this area? Confirmed no breakage?]
```

#### Verification Checklist Section
Standard ACs that are always present:
- AC-1: `npx tsc --noEmit --pretty false` → zero output
- AC-2: `npx vitest run` → all pass
- AC-3: `npm run build` → no Error lines
- AC-4: Check `tests/e2e/PROTECTED_STRINGS.md` — no listed string was changed without updating the index

Then wave-specific ACs starting at AC-5.

#### Execution Order Section
Always ends with:
```
[Last step]: Verify PROTECTED_STRINGS.md is up to date with any strings you changed
[Last step]: Commit with message: [scope]: [description]
[Last step]: Push to git: git push origin main
```

#### Post-Execution Report Section
The executor must create a report file named `[WAVE_NAME]_REPORT_[DATE].md` containing:
- Summary of all changes
- AC-1 through AC-N results (pass/fail)
- PROTECTED_STRINGS.md status (updated / no changes needed)
- Any deviations from instructions with explanation
- Files modified list

---

## Verification Checklist

Run these after creating all three files.

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

# AC-4: CLAUDE.md exists and has all 7 sections
grep -c "##" CLAUDE.md
# Expected: 7 or more

# AC-5: PROTECTED_STRINGS.md exists in tests/e2e/
ls tests/e2e/PROTECTED_STRINGS.md
# Expected: file exists

# AC-6: PROTECTED_STRINGS.md has all 4 sections
grep -c "^## Section" tests/e2e/PROTECTED_STRINGS.md
# Expected: 4

# AC-7: EXECUTOR_TEMPLATE.md exists
ls EXECUTOR_TEMPLATE.md
# Expected: file exists

# AC-8: EXECUTOR_TEMPLATE.md contains the Pre-Change Safety Protocol
grep "Pre-Change Safety Protocol" EXECUTOR_TEMPLATE.md
# Expected: 1 result

# AC-9: CLAUDE.md contains the File Ownership Map
grep "File Ownership Map" CLAUDE.md
# Expected: 1 result

# AC-10: PROTECTED_STRINGS.md contains "تأكيد البيع"
grep "تأكيد البيع" tests/e2e/PROTECTED_STRINGS.md
# Expected: 1 or more results

# AC-11: PROTECTED_STRINGS.md contains "pos-cart-sheet__summary"
grep "pos-cart-sheet__summary" tests/e2e/PROTECTED_STRINGS.md
# Expected: 1 or more results
```

---

## Execution Order

1. Read `AGENTS.md` fully
2. Read all 12 e2e test files fully (listed in Part 2.2)
3. Read `package.json`, `app/globals.css` (lines 1–100), `components/pos/pos-workspace.tsx` (lines 1–50)
4. Create `CLAUDE.md` (Part 1)
5. Create `tests/e2e/PROTECTED_STRINGS.md` (Part 2)
6. Create `EXECUTOR_TEMPLATE.md` (Part 3)
7. Run verification checklist (AC-1 through AC-11)
8. Commit with message: `docs(safety): add CLAUDE.md, PROTECTED_STRINGS.md, and EXECUTOR_TEMPLATE`
9. Push to git: `git push origin main`

---

## Post-Execution Report

After completing all steps, create a file `SAFETY_INFRASTRUCTURE_REPORT_[DATE].md` with:

- Summary of the three files created
- AC-1 through AC-11 results (pass/fail)
- Total number of protected strings catalogued in PROTECTED_STRINGS.md
- Total number of protected CSS classes catalogued
- Any deviations from these instructions with explanation
- Complete list of files created and modified

---

## Acceptance Criteria Summary

| AC | Criterion | Verification |
|----|-----------|-------------|
| AC-1 | TypeScript compiles clean | `npx tsc --noEmit` → 0 errors |
| AC-2 | All unit tests pass | `npx vitest run` → all pass |
| AC-3 | Build succeeds | `npm run build` → no errors |
| AC-4 | CLAUDE.md has all 7 sections | grep count ≥ 7 |
| AC-5 | PROTECTED_STRINGS.md exists | file present |
| AC-6 | PROTECTED_STRINGS.md has 4 sections | grep count = 4 |
| AC-7 | EXECUTOR_TEMPLATE.md exists | file present |
| AC-8 | Template has Pre-Change Safety Protocol | grep finds it |
| AC-9 | CLAUDE.md has File Ownership Map | grep finds it |
| AC-10 | "تأكيد البيع" catalogued in PROTECTED_STRINGS | grep finds it |
| AC-11 | "pos-cart-sheet__summary" catalogued | grep finds it |
