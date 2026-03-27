# Aya Mobile — CSS Completion: Missing POS Checkout Styles

> **Authority Declaration**: This document is the **sole authoritative source** for this fix wave. It supersedes any conflicting claim in prior execution reports. If any other document conflicts with this prompt, **this prompt wins**.

---

## Role and Constraints

You are an expert front-end engineer completing a single, well-defined gap in the **Aya Mobile** codebase — an Arabic RTL retail store management system built with **Next.js 14 App Router**, **Supabase**, **Zustand 5**, and **Zod**.

### Rules

1. **Do not break existing functionality.** Every feature that works today must work identically after your changes.
2. **Do not add new npm dependencies.**
3. **Do not touch any file except `app/globals.css`** unless a specific file is named in this document.
4. **Do not modify any TypeScript, JSX, or store logic.** This is a CSS-only fix wave.
5. **Test every change** — `npx tsc --noEmit` must pass, `npx vitest run` must pass, `npm run build` must succeed.
6. **Read `app/globals.css` before editing it.** Understand existing patterns (token names, spacing units, radius values) and match them exactly.
7. **Light theme only.** All new CSS uses the existing token set — no hardcoded hex values except where a token does not exist and the value must match the design system semantics.
8. **All new rules must be inserted in the correct thematic section** of `globals.css` — specifically after line ~4345 (after `.pos-view-toggle__button.is-active`) and before the first `@media` breakpoint block at line ~4347. Do not scatter rules across unrelated sections.

---

## Current System Context

| Concept | Location |
|---|---|
| Global CSS | `app/globals.css` (4508 lines) |
| POS workspace | `components/pos/pos-workspace.tsx` (~1922 lines) |
| Design tokens | `:root` block in `app/globals.css` lines 1–90 |
| Existing POS CSS | `app/globals.css` lines 4142–4345 |
| Cart / checkout CSS | `app/globals.css` lines 1747–2240 |

### Relevant existing tokens (already in `:root`)

```
--aya-bg, --aya-bg-soft, --aya-panel, --aya-panel-muted
--aya-line, --aya-line-strong
--aya-ink, --aya-ink-soft, --aya-muted
--aya-primary, --aya-primary-soft, --aya-primary-ring
--aya-success, --aya-success-soft
--aya-warning, --aya-warning-soft
--aya-danger, --aya-danger-soft
--sp-1 (4px) … --sp-8 (32px)
--radius-sm (6px), --radius-md (8px), --radius-lg (12px)
--shadow-sm, --shadow-md
--input-height (44px), --btn-height (44px)
```

---

## Problem Statement

The UI redesign (V2) was completed and all tests pass. However, a post-implementation review discovered that **20 CSS class names are used in `components/pos/pos-workspace.tsx` but are not defined anywhere in `app/globals.css`**. The components render correctly at a functional level (because they fall back to parent or sibling classes), but they lack the specific visual styling required by the product decisions ratified in the V2 prompt.

The missing classes fall into six groups:

1. **POS checkout payment chips** — `pos-payment-chip`, `pos-payment-chip-row`
2. **Split payment layout** — `pos-split-payments`, `pos-split-payment-row`, `pos-add-split-payment`
3. **Remaining-to-settle indicator** — `pos-remaining-balance`, `pos-remaining-balance--danger`, `pos-remaining-balance--success`
4. **Debt preview panel** — `debt-preview-panel`, `debt-preview-panel--success`
5. **Success screen** — `pos-success-screen`, `pos-success-screen__total`, `pos-success-screen__invoice`, `pos-success-screen__details`
6. **Checkout structural helpers** — `pos-checkout-header`, `pos-checkout-summary`, `pos-cart-mode-summary`, `pos-notes-field`, `pos-notes-field__textarea`, `pos-debt-block-message`

---

## Task — Add the Missing CSS

### Verification step (do this first)

Before writing a single line, run:

```bash
grep -n "pos-remaining-balance\|debt-preview-panel\|pos-success-screen\|pos-split-payment\|pos-payment-chip\|pos-checkout-summary\|pos-notes-field\|pos-checkout-header\|pos-debt-block\|pos-add-split\|pos-cart-mode-summary" app/globals.css
```

Confirm the output is **empty** (none of these classes exist yet). If any already exist, skip adding those specific rules.

---

### CSS to add

Insert the following block into `app/globals.css` **after** the `.pos-view-toggle__button.is-active` rule (around line 4345) and **before** the first `@media (max-width: 1279px)` breakpoint. This keeps all POS-specific rules in one contiguous section.

```css
/* ─── POS Checkout — Payment chips ─── */

.pos-payment-chip-row {
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.pos-payment-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  height: 36px;
  padding: 0 var(--sp-3);
  border: 1px solid var(--aya-line-strong);
  border-radius: var(--radius-md);
  background: var(--aya-panel);
  color: var(--aya-ink-soft);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 120ms, background 120ms, color 120ms;
  white-space: nowrap;
}

.pos-payment-chip:hover {
  border-color: var(--aya-primary);
  background: var(--aya-primary-soft);
  color: var(--aya-primary);
}

.pos-payment-chip.is-selected {
  border-color: var(--aya-primary);
  background: var(--aya-primary-soft);
  color: var(--aya-primary);
  font-weight: 600;
}

/* ─── POS Checkout — Split payment layout ─── */

.pos-split-payments {
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-3);
  border: 1px solid var(--aya-line);
  border-radius: var(--radius-md);
  background: var(--aya-bg-soft);
}

.pos-split-payment-row {
  display: grid;
  gap: var(--sp-2);
}

.pos-add-split-payment {
  justify-content: flex-start;
  gap: var(--sp-2);
  color: var(--aya-primary);
  font-size: 13px;
}

.pos-add-split-payment:disabled {
  color: var(--aya-muted);
}

/* ─── POS Checkout — Remaining-to-settle indicator ─── */

.pos-remaining-balance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
}

.pos-remaining-balance--danger {
  background: var(--aya-danger-soft);
  color: var(--aya-danger);
  border: 1px solid rgba(220, 38, 38, 0.18);
}

.pos-remaining-balance--success {
  background: var(--aya-success-soft);
  color: var(--aya-success);
  border: 1px solid rgba(5, 150, 105, 0.18);
}

/* ─── POS Checkout — Debt preview panel ─── */

.debt-preview-panel {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--radius-md);
  background: var(--aya-warning-soft);
  border: 1px solid rgba(217, 119, 6, 0.25);
  color: var(--aya-ink-soft);
  font-size: 13px;
}

.debt-preview-panel strong {
  color: var(--aya-warning);
  font-size: 14px;
}

.debt-preview-panel span {
  color: var(--aya-ink-soft);
}

.debt-preview-panel--success {
  background: var(--aya-warning-soft);
  border-color: rgba(217, 119, 6, 0.2);
}

/* ─── POS Success screen ─── */

.pos-success-screen {
  gap: var(--sp-4);
}

.pos-success-screen__total {
  font-size: 28px;
  font-weight: 700;
  color: var(--aya-success);
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.pos-success-screen__invoice {
  font-size: 13px;
  font-weight: 500;
  color: var(--aya-muted);
  letter-spacing: 0.3px;
}

.pos-success-screen__details {
  width: 100%;
  text-align: start;
  gap: var(--sp-2);
}

.pos-success-screen__details div {
  justify-items: start;
  text-align: start;
}

/* ─── POS Checkout — Structural helpers ─── */

.pos-checkout-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--aya-line);
}

.pos-checkout-summary {
  display: grid;
  gap: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--aya-line);
}

.pos-cart-mode-summary {
  display: grid;
  gap: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--aya-line);
}

.pos-notes-field {
  display: grid;
  gap: var(--sp-2);
}

.pos-notes-field__textarea {
  resize: vertical;
  min-height: 80px;
  font-family: var(--aya-font-body);
  font-size: 14px;
  line-height: 1.6;
  direction: rtl;
}

.pos-debt-block-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--aya-danger);
  padding: var(--sp-2) 0;
}
```

---

## Acceptance Criteria

After making the change, all of the following must be true:

### AC-1: Classes are defined
```bash
grep -c "pos-remaining-balance\|debt-preview-panel\|pos-success-screen\|pos-payment-chip\|pos-split-payment\|pos-checkout-summary\|pos-notes-field\|pos-checkout-header\|pos-debt-block\|pos-add-split\|pos-cart-mode-summary" app/globals.css
```
Output must be **≥ 15** (at least 15 matching lines).

### AC-2: TypeScript clean
```bash
npx tsc --noEmit --pretty false
```
Output must be **empty** (zero errors).

### AC-3: Unit tests pass
```bash
npx vitest run
```
Output must end with **70 passed (70)** and **200 passed (200)**.

### AC-4: Build succeeds
```bash
npm run build
```
Must end with the route table and no `Error:` lines.

### AC-5: Token hygiene
No new hardcoded hex colors in the CSS block unless the semantic token does not exist in `:root`. Every spacing value uses `var(--sp-N)`. Every radius uses `var(--radius-*)`. Every color uses `var(--aya-*)`.

### AC-6: No side effects
Run:
```bash
grep -c "prefers-color-scheme\|dark-mode\|\.dark" app/globals.css
```
Output must be **0** — dark mode must remain absent.

---

## Checklist (complete in order)

- [ ] 1. Read `app/globals.css` fully to understand existing conventions
- [ ] 2. Run the verification grep to confirm all 20 classes are missing
- [ ] 3. Locate the insertion point (after `.pos-view-toggle__button.is-active`, before the first `@media` block)
- [ ] 4. Insert the CSS block exactly as specified above
- [ ] 5. Verify the 6 token-hygiene rules: no raw hex except where needed, no raw px except border widths
- [ ] 6. Run `npx tsc --noEmit --pretty false` → must be empty
- [ ] 7. Run `npx vitest run` → must be 70/200 pass
- [ ] 8. Run `npm run build` → must succeed
- [ ] 9. Run AC-1 grep → must return ≥ 15
- [ ] 10. Run AC-6 grep → must return 0
- [ ] 11. Write execution report to `CSS_COMPLETION_REPORT_2026-03-27.md`

---

## Execution Report Template

When all checklist items pass, write a report file at:

`CSS_COMPLETION_REPORT_2026-03-27.md`

With this structure:

```markdown
# CSS Completion Report — 2026-03-27

## Summary
- Classes added: [N]
- Lines added to globals.css: [N]
- Lines before: 4508
- Lines after: [N]

## Verification Results
- tsc: pass
- vitest: 70/200 pass
- build: pass
- AC-1 grep count: [N]
- AC-6 grep count: 0

## Classes Added
[list each class]

## Warnings
[any non-blocking observations]
```

---

## What This Fix Does NOT Change

- No TypeScript files
- No JSX/TSX files
- No store logic
- No API routes
- No test files
- No package.json
- No existing CSS rules — only additions
- No dark mode (remains removed)
- No z-index values (scale is already correct)
- No safe-area handling (already correct)
- No design tokens (`:root` block is already complete)
