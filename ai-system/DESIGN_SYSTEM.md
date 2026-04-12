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
/* Numeric scale — physical layering */
--z-base:               0;    /* Normal document flow */
--z-cart-sheet:        40;    /* POS cart bottom sheet */
--z-bottom-bar:        50;    /* Mobile bottom navigation */
--z-offline-bar:       60;    /* Offline status banner */
--z-nav-backdrop:     200;    /* Nav popover backdrop */
--z-nav-popover:      201;    /* Nav popover panel */
--z-toast:            300;    /* Toast notifications */
--z-dialog:           400;    /* Modal dialogs */
--z-fullscreen:       500;    /* Fullscreen checkout */

/* Semantic aliases — AYA 03 §10 mapping */
--z-sticky:            var(--z-cart-sheet);   /* Sticky headers, local command bars */
--z-floating:          var(--z-bottom-bar);   /* Floating aids, FABs, pinned CTAs */
--z-drawer:            var(--z-nav-popover);  /* Side drawers, filter panels */
--z-overlay:           var(--z-dialog);       /* Modal overlays, payment surface */
```

**Rule:** Any new element that needs to float above others must use one of these tokens.
- Use **semantic aliases** (`--z-sticky`, `--z-floating`, `--z-drawer`, `--z-overlay`) when the element's role is obvious.
- Use **numeric tokens** directly when mapping a specific system primitive (cart sheet, toast, nav popover).
- If none fits, report to Planner — do not invent a new number.

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

---

## 12. Surface Hierarchy

Every visible layer in the UI belongs to exactly one surface level. Never mix levels on the same visual plane.

```
Level 0 — Base        background: var(--color-bg-base)      #F9F8F5
Level 1 — Surface     background: var(--color-bg-surface)   #FFFFFF
Level 2 — Raised      background: var(--color-bg-surface)   #FFFFFF  + border
Level 3 — Overlay     background: var(--color-bg-surface)   #FFFFFF  + border + drop-shadow
```

### Where each level is used

| Element | Level | CSS |
|---------|-------|-----|
| `dashboard-content` (page body) | 0 — Base | `background: var(--color-bg-base)` |
| `dashboard-topbar` | 1 — Surface | `background: var(--color-bg-surface)` + `border-bottom` |
| `section-card` (default) | 2 — Raised | `background: var(--color-bg-surface)` + `border: 1px solid var(--color-border)` |
| `section-card--flat` | 0 — Base | `background: transparent` — no border, no shadow |
| `section-card--inset` | 0 — Muted | `background: var(--color-bg-muted)` — no border, no shadow |
| Dialogs / modals | 3 — Overlay | `background: var(--color-bg-surface)` + `border` + `box-shadow: 0 8px 32px rgba(24,23,21,0.12)` |
| Popovers (nav, dropdowns) | 3 — Overlay | same as dialogs |

### Rules

```
SH-RULE-01: dashboard-content is always Level 0 (bg-base). No gradient, no surface color.

SH-RULE-02: dashboard-topbar is always Level 1. border-bottom only — no box-shadow.

SH-RULE-03: Regular section-cards are Level 2. border only — no box-shadow (enforced by DS-RULE-02).

SH-RULE-04: box-shadow is reserved for Level 3 (dialogs and popovers) only.
            Never add box-shadow to a card that sits inside the page body.

SH-RULE-05: Never place a Level 1 surface directly on a Level 1 surface.
            A card (Level 2) must always sit on top of a base (Level 0) background.
            If a card is nested inside another card, the inner element must use
            section-card--inset (Level 0 muted) — never another raised card.
```

---

## 13. Layout Constraints

Global layout rules that apply to every page. Deviations require explicit justification.

### Max-width

```css
/* Applied on .dashboard-main — enforced in globals.css */
.dashboard-main {
  width: 100%;
  max-width: 1600px;
  margin-inline: auto;
}
```

**Exception — POS only:**
```css
/* POS needs the full viewport — no max-width */
.dashboard-layout--pos .dashboard-main,
.dashboard-shell--pos .dashboard-main {
  max-width: none;
  margin-inline: 0;
}
```

### Rules

```
LC-RULE-01: max-width is set once on .dashboard-main — never repeated locally inside a page.
            If a page sets its own max-width, it must be removed in favour of the global rule.

LC-RULE-02: POS is the only page exempt from the global max-width.
            It must carry the .dashboard-layout--pos modifier to opt out.

LC-RULE-03: position: sticky is only valid when every ancestor in the scroll chain has
            overflow: visible (the default).
            Before using sticky, verify no ancestor has overflow: hidden, auto, or scroll.
            If overflow is required on an ancestor, switch to position: fixed with
            explicit inset values instead.

LC-RULE-04: Avoid padding or margin on both a container and its direct child for the same axis.
            Pick one — container owns horizontal padding, child owns vertical spacing.
```

### Sticky checklist (use before writing position: sticky)

```
□ No ancestor between the sticky element and the scroll container has overflow: hidden/auto/scroll
□ The sticky element has a defined top / bottom / inset-block-start value
□ The scroll container is the viewport or a known, single scrolling parent
□ Tested on mobile Safari (WebKit sticky behaviour differs from Chromium)
```

---

## 14. SectionCard Variants

`SectionCard` accepts a `tone` prop. Each tone maps to a specific surface level and use case.
Never use a heavier tone than necessary.

| Tone | Surface Level | Background | Border | Shadow | Use Case |
|------|--------------|-----------|--------|--------|----------|
| `default` (raised) | Level 2 | `--color-bg-surface` | `1px solid --color-border` | none | Primary content blocks, main workspace sections |
| `subtle` | Level 2 | `--color-bg-muted` | `1px solid --color-border` | none | Secondary info panels, metadata blocks |
| `flat` | Level 0 | `transparent` | none | none | Sub-sections nested inside a raised card |
| `inset` | Level 0 muted | `--color-bg-muted` | none | none | Input areas, content wells inside a card |
| `accent` | Level 2 | `--color-accent-light` | `1px solid --color-accent` (0.3 opacity) | none | Highlighted CTAs, alert-level information |

### Rules

```
SC-RULE-01: Never nest two raised (default) cards directly inside each other.
            The inner element must use flat or inset instead.

SC-RULE-02: flat and inset tones must not have padding: var(--sp-6).
            Use padding: var(--sp-4) or no padding (layout decides).

SC-RULE-03: accent tone is for one card per screen maximum.
            Using it on multiple cards per view dilutes the visual signal.

SC-RULE-04: All four tones share the same border-radius: var(--radius-lg).
            Never override border-radius on a SectionCard.
```

---

## 15. CSS Scoping Rules — globals.css vs Module CSS

Two CSS systems exist in this project. Each has a strict domain. Never mix them.

### globals.css — Shared design tokens and primitives

Use for:
- Design tokens (`--color-*`, `--sp-*`, `--radius-*`, etc.)
- Shared primitives used in 2+ screens: `.section-card`, `.btn`, `.chip`, `.stat-card`
- Shell layout: `.dashboard-topbar`, `.dashboard-content`, `.dashboard-main`
- Shared interaction patterns: `:focus-visible`, hover states on shared classes

Never use globals.css for:
- Layout rules that only apply to one screen
- CSS that references a class used in exactly one component
- Overrides of module CSS classes

### Module CSS (`.module.css`) — Screen-specific layout

Use for:
- Layout rules that only apply to one screen (e.g. `pos-view.module.css`)
- Component-internal positioning (e.g. sticky toolbar inside POS)
- Grid/flex templates unique to one screen

Never use module CSS for:
- Redefining tokens already in globals.css
- Overriding shared primitives (`.btn`, `.chip`, `.section-card`)
- Rules that duplicate something already in globals.css for the same element

### Conflict resolution rule

```
MOD-RULE-01: If a CSS property is set in both globals.css AND a module CSS file
             for the same element, the globals.css rule must be removed.
             Module CSS wins for screen-specific layout.
             globals.css wins for shared primitives.

MOD-RULE-02: Before adding a rule to globals.css, search for the class name in
             all .module.css files. If it exists there, edit the module file instead.

MOD-RULE-03: Before adding a rule to a module CSS file, search globals.css for
             the same class. If found, do not duplicate — extend via a modifier class.

MOD-RULE-04: .operational-* classes (used in Inventory, Suppliers, Maintenance, Operations)
             must always be scoped with a page-level parent selector.
             ✅  .inventory-page .operational-list-card { ... }
             ❌  .operational-list-card { ... }
```

---

## 16. AYA Architectural Package — External Authority

This file owns **visual/token truth** (colors, fonts, spacing, states, z-index, section-card tones).
It does **not** own architectural decisions like page archetypes, width hierarchy per archetype,
surface roles, primitive specs, sticky budgets, or implementation flow.

Those live in the AYA package at:
`تصميم جديد/AYA_00 → AYA_08`

### Split of authority

| Decision type | Authority |
|---------------|-----------|
| Color tokens, font tokens, radius, spacing primitives | **This file** (sections 1–15) |
| Numeric z-index scale | **This file** (section 10) |
| SectionCard tones and structural surface levels | **This file** (sections 12, 14) |
| Page archetypes (Operational / Analytical / Management / Detail / Settings) | **AYA 01** |
| Width tokens per archetype (`--width-operational` / `--width-analytical` / etc.) | **AYA 03 §5** |
| Semantic surface roles and their mapping to structural levels | **AYA 03 §6** + **AYA 08 §5** |
| Primitive specs (PageHeader, CommandBar, FilterDrawer, MetricCard, ContextPanel) | **AYA 03 §8** |
| Sticky budget per archetype | **AYA 03 §9** |
| POS flow, toolbar ownership, payment surface isolation | **AYA 02** |
| Reports archetype rules | **AYA 01 §6** + **AYA 03 §14** + **AYA 04** |
| Test protection protocol before CSS/string refactors | **AYA 05 §6** + **AYA 06 §4** |
| Hallucination rules (H-01 … H-12) | **AYA 06 §3** |
| Migration phases and implementation order | **AYA 05 §7** |

### Reading order for any agent touching UI

1. `AYA_00` — index + authority map
2. `AYA_01` — product contract + archetypes
3. `AYA_08` — bridge document (prevents conflicts between AYA and this file)
4. `AYA_03` — shell, width, surfaces, primitives
5. This file — for exact values only
6. `AYA_02` (only when touching POS)
7. `AYA_05` (only when executing refactors)
8. `AYA_06` (acceptance criteria — before declaring done)

### Conflict resolution

If a decision appears to conflict between this file and AYA, go to **AYA 08 §11** first.
The default rule:

- Color / token / radius / numeric z-index → this file wins
- Archetype / width policy / surface role / flow → AYA wins
- Business logic (payment, cart, debt) → code truth wins (neither this file nor AYA)
- Visible strings, CSS hooks, aria labels → tests win (grep `tests/e2e/` and `tests/unit/` first)

### Semantic z-index aliases

AYA 03 §10 references semantic z-index tokens (`z-sticky`, `z-floating`, `z-drawer`, `z-overlay`).
These are now defined as aliases over the numeric scale in section 10 of this file.
Use semantic aliases for role-based layering, numeric tokens for primitive-specific mappings.

---
