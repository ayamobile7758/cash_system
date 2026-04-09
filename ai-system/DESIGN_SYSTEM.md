<!--
هذا الملف هو المرجع البصري الوحيد للنظام.
كل منفذ (Codex / Gemini) يقرأه قبل أي تعديل على CSS أو UI.
لا يُعدَّل إلا بقرار من المستخدم عبر Claude (الـ Planner).
-->

# DESIGN_SYSTEM.md — Aya Mobile Visual Reference

> **MANDATORY**: Every Agent reads this file before touching any CSS or UI component.
> Token values in this file are synced with `New/component-library.html` (the prototype).
> The prototype is the authoritative source for all visual values (colors, sizes, spacing).
> This file provides rules, states, z-index, breakpoints, and token names.
> When in doubt: refer here. Do not invent.

---

## 1. Theme — Light Neutral Warm

Inspired by Claude.ai interface. Comfortable in all lighting environments.

```css
/* Synced with component-library.html prototype — 2026-04-07 */
--color-bg-base:      #F9F8F5;   /* Main background */
--color-bg-surface:   #FFFFFF;   /* Cards */
--color-bg-muted:     #F3F1EC;   /* Secondary bg / hover */
--color-border:       #E8E6E1;   /* Borders */

--color-text-primary:   #181715; /* Primary text */
--color-text-secondary: #6D6A62; /* Secondary text */

--color-accent:       #CF694A;   /* Single accent — warm copper */
--color-accent-hover: #BB5B3E;   /* Accent hover state */
--color-accent-light: #FCF4F1;   /* Soft accent background */

--color-success:      #13773A;
--color-success-bg:   #EDF9F1;
--color-danger:       #BA1C1C;
--color-danger-bg:    #FEF1F1;
--color-warning:      #B85F0E;
--color-warning-bg:   #FEFAEB;

--color-pos-pay:      #13773A;   /* Pay button — always green */
```

---

## 2. Components Shape

- **Flat cards** — `border: 1px solid var(--color-border)` only. No box-shadow.
- **No gradients** — solid color buttons only.
- **Outline icons** — never filled.
- **Large touch targets** — minimum 44px height on all interactive elements.

```css
--radius-sm:  6px;
--radius-md:  10px;
--radius-lg:  14px;

--height-button-sm: 36px;
--height-button-md: 44px;   /* Minimum touch target */
--height-button-lg: 52px;
--height-input:     44px;
--height-topbar:    56px;
--height-bottombar: 60px;
```

---

## 3. Screen Layout

| Device  | Layout |
|---------|--------|
| Mobile  | Fixed topbar + Fixed bottom nav + Full-width content |
| Tablet  | Fixed topbar + Popover nav + Full-width content |
| Desktop | Fixed topbar + Popover nav + Full-width content |

- Topbar contains: page title + search + notifications **only**
- No persistent sidebar — popover menu only
- Bottom bar on mobile for most-used pages only

---

## 4. Typography

```css
--font-primary: 'Tajawal', sans-serif;
--font-numeric: 'Inter', sans-serif;   /* Financial numbers only */

/* Three sizes only */
--text-heading: 20px;   /* Main heading — weight 600 */
--text-body:    15px;   /* Body text — weight 400 */
--text-small:   13px;   /* Secondary text — weight 400 */

/* Western numerals always (0–9) */
font-variant-numeric: tabular-nums;
```

**Numeric font rule:** All financial figures (prices, totals, stat card values, invoice amounts)
use `font-family: var(--font-numeric)` with `letter-spacing: -0.5px` and `font-weight: 700+`.
Arabic labels next to numbers stay in Tajawal. This creates a clear visual separation between
data and language.

---

## 5. Page Layout Pattern

```
┌─────────────────────────────┐
│  4 stat cards (grid)        │  ← Top of page
├─────────────────────────────┤
│  Main table or grid         │  ← Middle — fills remaining height
├─────────────────────────────┤
│  Action button (end/bottom) │  ← Clear and isolated
└─────────────────────────────┘
```

```css
--padding-card:          16px 20px;
--gap-grid:              16px;
--gap-section:           24px;
--padding-page-mobile:   16px;
--padding-page-tablet:   24px;
--padding-page-desktop:  32px;
```

---

## 6. POS Screen Layout

```
┌──────────────────┬──────────┐
│                  │          │
│  Products (grid) │   Cart   │
│  RTL — right     │  fixed   │
│                  │          │
├──────────────────┴──────────┤
│     Pay button — green      │
└─────────────────────────────┘
```

| Device  | Cart Width | Product Grid |
|---------|-----------|--------------|
| Mobile  | Full separate screen | 2 columns |
| Tablet  | 35% | 3 columns |
| Desktop | 30% | 4 columns |

```css
--pos-cart-width-tablet:  35%;
--pos-cart-width-desktop: 30%;
--pos-product-img:        120px;
```

---

## 7. Responsive Breakpoints

```css
/* Mobile  */ 0px    – 767px
/* Tablet  */ 768px  – 1199px
/* Desktop */ 1200px – ∞
```

---

## 8. Agent Rules — Enforced on Every Task

```
DS-RULE-01: Every color used must map to a token defined in Section 1.
            Never hardcode hex values outside this file.

DS-RULE-02: No box-shadow on cards. Border only.

DS-RULE-03: No gradients on buttons or cards. Solid color only.

DS-RULE-04: No new font families. Tajawal only.

DS-RULE-05: No dark backgrounds outside the login shell
            (baseline-shell--auth scope — already approved exception).

DS-RULE-06: Interactive elements minimum height 44px.

DS-RULE-07: All layout must be RTL-correct.
            Use inset-inline-start / inset-inline-end, not left / right.
            Use padding-inline-start / padding-inline-end, not padding-left / padding-right.
            Use border-inline-start / border-inline-end, not border-left / border-right.
            Numbers, prices, and invoice IDs mixed with Arabic text must be wrapped in
            <bdi dir="ltr"> to prevent bidirectional rendering issues.

DS-RULE-08: When restyling an existing component, remove the old color/shadow/gradient
            rules — do not layer new rules on top of old ones.
            Layering is the root cause of visual inconsistency in this project.

DS-RULE-09: Use 100dvh (not 100vh) for full-screen containers.
            100vh ignores the mobile browser bar and causes content to be cut off.

DS-RULE-10: Before adding a new CSS rule for a class, search the file for existing rules
            targeting that same class. If found, edit the existing rule — never add a
            duplicate. Duplicate CSS rules are the root cause of style drift.
```

---

---

## 9. Token Translation Table — Old → New

The current codebase uses `--aya-*` token names. This table maps every old token to its
new equivalent. When editing any file, replace old tokens with new ones. Never use both systems
in the same component.

| Old Token (current code) | New Token (this system) | Note |
|--------------------------|------------------------|------|
| `--aya-bg` | `--color-bg-base` | Main background |
| `--aya-bg-soft` | `--color-bg-muted` | Hover / secondary bg |
| `--aya-panel` | `--color-bg-surface` | Card surface |
| `--aya-panel-muted` | `--color-bg-muted` | Muted surface |
| `--aya-panel-strong` | `--color-bg-surface` | Same as surface |
| `--aya-line` | `--color-border` | Default border |
| `--aya-line-strong` | `--color-border` | Use same border token |
| `--aya-ink` | `--color-text-primary` | Primary text |
| `--aya-ink-soft` | `--color-text-primary` | Use primary text |
| `--aya-muted` | `--color-text-secondary` | Secondary text |
| `--aya-primary` | `--color-accent` | Main accent color |
| `--aya-primary-hover` | `--color-accent-hover` | See states section |
| `--aya-primary-soft` | `--color-accent-light` | Soft accent bg |
| `--aya-success` | `--color-success` | Success green |
| `--aya-success-soft` | `--color-success-bg` | Success background |
| `--aya-warning` | `--color-warning` | Warning amber |
| `--aya-warning-soft` | `--color-warning-bg` | Warning background |
| `--aya-danger` | `--color-danger` | Danger red |
| `--aya-danger-soft` | `--color-danger-bg` | Danger background |
| `--radius-sm` | `--radius-sm` | Same value (6px) |
| `--radius-md` | `--radius-md` | Changed: 8px → 10px |
| `--radius-lg` | `--radius-lg` | Changed: 12px → 14px |
| `--topbar-height` | `--height-topbar` | Same value (56px) |
| `--input-height` | `--height-input` | Same value (44px) |
| `--btn-height` | `--height-button-md` | Same value (44px) |
| `--shadow-sm` / `--shadow-md` | *(removed)* | No shadows in new system |
| `--aya-focus-ring` | `--color-focus-ring` | See states section |
| `--aya-font-body` | `--font-primary` | Tajawal only |

**Migration rule:** When you edit a component, replace ALL `--aya-*` tokens in that component
with the new tokens. Do not leave mixed tokens in the same file.

---

## 10. Z-Index Scale

These values are fixed. Never use a raw number — always use the token.

```css
--z-base:               0;    /* Normal document flow */
--z-cart-sheet:        40;    /* POS cart bottom sheet */
--z-bottom-bar:        50;    /* Mobile bottom navigation */
--z-offline-bar:       60;    /* Offline status banner */
--z-nav-backdrop:     200;    /* Nav popover backdrop */
--z-nav-popover:      201;    /* Nav popover panel */
--z-toast:            300;    /* Toast notifications */
--z-dialog:           400;    /* Modal dialogs */
--z-fullscreen:       500;    /* Fullscreen checkout */
```

**Rule:** Any new element that needs to float above others must use one of these tokens.
If none fits, report to Planner — do not invent a new number.

---

## 11. Interaction States

Define how every interactive element behaves. Use these consistently across all components.

### Buttons

| State | Background | Text | Border | Other |
|-------|-----------|------|--------|-------|
| Idle | `--color-accent` | `#FFFFFF` | none | — |
| Hover | `--color-accent-hover` | `#FFFFFF` | none | `transition: background 0.15s` |
| Active (pressed) | `--color-accent-active` | `#FFFFFF` | none | `transform: scale(0.98)` |
| Disabled | `--color-bg-muted` | `--color-text-secondary` | `--color-border` | `cursor: not-allowed; opacity: 0.6` |
| Focus | same as idle | same | `2px solid --color-accent` | `outline-offset: 2px` |

```css
--color-accent-hover:  #BB5B3E;   /* From prototype — accent darkened */
--color-accent-active: #A84F33;   /* Accent darkened further for press */
```

### Ghost / Secondary Buttons

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Idle | transparent | `--color-text-primary` | `--color-border` |
| Hover | `--color-bg-muted` | `--color-text-primary` | `--color-border` |
| Active | `--color-border` | `--color-text-primary` | `--color-border` |
| Disabled | transparent | `--color-text-secondary` | `--color-border` |

### Inputs

| State | Border | Background | Shadow |
|-------|--------|-----------|--------|
| Idle | `--color-border` | `--color-bg-surface` | none |
| Focus | `--color-accent` | `--color-bg-surface` | `0 0 0 3px --color-accent-ring` |
| Error | `--color-danger` | `--color-danger-bg` | `0 0 0 3px rgba(186,28,28,0.12)` |
| Disabled | `--color-border` | `--color-bg-muted` | none |

```css
--color-accent-ring:  rgba(217, 119, 87, 0.20);  /* Focus ring around inputs */
--color-focus-ring:   rgba(217, 119, 87, 0.20);  /* Same — alias */
```

### Nav Items (Popover / Bottom Bar)

| State | Background | Text | Icon |
|-------|-----------|------|------|
| Idle | transparent | `--color-text-secondary` | `--color-text-secondary` |
| Hover | `--color-bg-muted` | `--color-text-primary` | `--color-text-primary` |
| Active (current page) | `--color-accent-light` | `--color-accent` | `--color-accent` |

Active item also gets: `border-inline-start: 2px solid var(--color-accent)`

### Cards

| State | Border | Background |
|-------|--------|-----------|
| Idle | `--color-border` | `--color-bg-surface` |
| Hover (if clickable) | `--color-accent` | `--color-bg-surface` |

---

## Summary — One Line for Any Agent

> Light warm neutral UI inspired by Claude.ai. Colors: `#F9F8F5` base, `#CF694A` accent.
> Font: Tajawal. Flat cards with border only. Topbar + popover nav. Full RTL. Mobile-first responsive.
