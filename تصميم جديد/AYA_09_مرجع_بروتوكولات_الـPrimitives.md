# AYA 09 — مرجع بروتوكولات الـ Primitives
## Primitive API Reference — contract surface for every shared UI primitive in Aya Mobile

---

## 1) الغرض من هذا الملف

AYA 03 §8 يعرّف أسماء وأدوار الـ primitives. هذا الملف يضيف **العقد التقني** لكل primitive: props، slots، variants، a11y hooks، test IDs، وقواعد الاستخدام.

- لا يُخترع primitive جديد بدون إضافته هنا أولًا
- لا تُغيّر signature primitive دون تحديث هذا الملف في نفس الـ commit
- الوكيل (Codex/Gemini) يقرأ هذا الملف قبل أي surface extraction

## 2) أسماء ثابتة — لا مرادفات

| AYA name | File path (expected) | Archetype usage |
|---|---|---|
| PageHeader | `components/primitives/page-header.tsx` | جميع ما عدا Operational |
| CommandBar | `components/primitives/command-bar.tsx` | Operational + Analytical + Management |
| FilterDrawer | `components/primitives/filter-drawer.tsx` | Analytical + Management |
| MetricCard | `components/primitives/metric-card.tsx` | Analytical |
| ContextPanel | `components/primitives/context-panel.tsx` | Detail + Operational (held carts, customer) |
| Toolbar | `components/primitives/toolbar.tsx` | Operational local command surface |
| SectionCard | موجود حاليًا في الكود | جميع الـ archetypes بتنوعات مختلفة |

---

## 3) PageHeader

### 3.1 Role
Surface: Primary content anchor at the top of a non-operational archetype.
Contains page title, archetype meta, and optional primary action.

### 3.2 Props
```tsx
type PageHeaderProps = {
  title: string;                    // visible Arabic string — test-protected
  subtitle?: string;                // optional meta line under title
  archetype: "analytical" | "management" | "detail" | "settings";
  primaryAction?: {
    label: string;                  // visible Arabic string — test-protected
    onClick: () => void;
    disabled?: boolean;
  };
  breadcrumbs?: Array<{ label: string; href?: string }>;
  children?: never;                 // no slots
};
```

### 3.3 DOM contract
- Root: `<header data-primitive="page-header" data-archetype={archetype}>`
- Title: `<h1>` (one per page — never two h1s)
- Primary action: `<button data-action="primary">`

### 3.4 Width
Inherits from workspace — PageHeader does not cap its own width.

### 3.5 Forbidden
- No embedded filters (filters belong to CommandBar or FilterDrawer)
- No secondary actions beyond `primaryAction`
- No direct store access (pure prop-driven)

---

## 4) CommandBar

### 4.1 Role
The **single** command surface for a page. One per archetype instance.

### 4.2 Props
```tsx
type CommandBarProps = {
  archetype: "operational" | "analytical" | "management";
  left?: React.ReactNode;           // primary commands (search, filters)
  right?: React.ReactNode;          // secondary (view toggle, export)
  sticky?: boolean;                 // defaults to archetype sticky budget
  density?: "compact" | "regular";  // operational defaults compact
};
```

### 4.3 DOM contract
- Root: `<div data-primitive="command-bar" data-archetype={archetype}>`
- Sticky behavior uses `var(--z-sticky)` — never hardcoded z-index
- No `position: sticky` if any ancestor has `overflow: hidden`

### 4.4 Sticky budget (from AYA 01 §6)
- Operational: may be sticky
- Analytical: sticky allowed for command bar only, not filters
- Management: non-sticky by default

### 4.5 Forbidden
- More than one CommandBar per page
- Nesting CommandBar inside CommandBar
- Receiving an entire Toolbar as `left` (use Toolbar primitive instead)

---

## 5) FilterDrawer

### 5.1 Role
Off-screen drawer for advanced filters. Opens from the inline edge (RTL-aware).

### 5.2 Props
```tsx
type FilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;                    // visible Arabic — test-protected
  children: React.ReactNode;        // filter form
  onApply: () => void;
  onReset?: () => void;
};
```

### 5.3 DOM contract
- Root: `<aside role="dialog" aria-modal="true" data-primitive="filter-drawer">`
- Uses `var(--z-drawer)` for layering
- Inline-start on LTR, inline-end on RTL — use `inset-inline-end` in CSS
- Backdrop uses `var(--z-nav-backdrop)`

### 5.4 a11y
- `aria-labelledby` points to the drawer title
- Focus trap on open, restore focus on close
- Escape closes the drawer (delegates to `onClose`)

### 5.5 Forbidden
- Not for primary filters (those live inline in CommandBar)
- Never use for navigation — use nav drawer for that

---

## 6) MetricCard

### 6.1 Role
A single KPI tile for analytical surfaces.

### 6.2 Props
```tsx
type MetricCardProps = {
  label: string;                    // visible Arabic
  value: string | number;           // already formatted
  delta?: {
    value: string;                  // e.g. "+12.5%"
    direction: "up" | "down" | "flat";
  };
  icon?: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger";
};
```

### 6.3 DOM contract
- Root: `<article data-primitive="metric-card" data-tone={tone}>`
- Value uses `Inter` font (numeric), label uses `Tajawal` (Arabic)
- Minimum touch target 44×44 if interactive

### 6.4 Forbidden
- No embedded chart (use a dedicated chart primitive)
- No CTA button inside — if you need action, wrap in a link

---

## 7) ContextPanel

### 7.1 Role
Secondary side content: held carts, customer info, history.

### 7.2 Props
```tsx
type ContextPanelProps = {
  title: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  side: "inline-start" | "inline-end";  // logical, RTL-aware
  children: React.ReactNode;
};
```

### 7.3 DOM contract
- Root: `<aside data-primitive="context-panel" data-side={side}>`
- Stays within workspace width — never escapes into shell
- Not an overlay — it's part of the normal flow

### 7.4 Forbidden
- Do not overlay on top of primary content (use Drawer for that)
- Do not use as a command surface

---

## 8) Toolbar (POS local command surface)

### 8.1 Role
The POS-specific local command bar. Contains search, category chips, held carts access, view switches.
**Not** a general CommandBar — dedicated to operational flow.

### 8.2 Props
```tsx
type PosToolbarProps = {
  search: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;            // visible Arabic — test-protected
  };
  categories: Array<{
    id: string;
    label: string;                  // visible Arabic — test-protected
    active: boolean;
  }>;
  onCategorySelect: (id: string) => void;
  heldCartsCount: number;
  onHeldCartsOpen: () => void;
};
```

### 8.3 DOM contract
- Root: `<div data-primitive="pos-toolbar">`
- Lives **inside** `PosWorkspace`, not inside shell topbar
- Uses `var(--z-sticky)` if sticky in its own container
- Never injects state into global React Context owned by shell

### 8.4 Forbidden
- Do not receive shell topbar state
- Do not render inside `DashboardShell`'s topbar slot
- Do not duplicate global search (global search lives in shell topbar)

---

## 9) SectionCard (existing primitive — rules only)

SectionCard already exists in the codebase. This section governs its **usage**, not its implementation.

### 9.1 When to use
- Visual grouping of related content that shares one semantic role
- Settings groups, reports sections, management lists

### 9.2 When NOT to use
- As a universal wrapper for everything (anti-pattern)
- To represent an Overlay Surface (use Drawer/Modal)
- To represent a CommandBar (use CommandBar primitive)
- Stacking the same tone three-deep without hierarchy justification

### 9.3 Tones
Owned by `DESIGN_SYSTEM.md §14`. This file does not override tones.

---

## 10) Rules that apply to every primitive

1. **No direct store access** — all primitives are prop-driven
2. **No hardcoded colors** — tokens only
3. **No hardcoded z-index** — semantic aliases or numeric scale from DESIGN_SYSTEM §10
4. **No `left:` / `right:` in CSS** — `inset-inline-start` / `inset-inline-end`
5. **Visible Arabic strings are props**, never hardcoded inside the primitive
6. **Test IDs are stable**: `data-primitive="<name>"` is the selector contract
7. **a11y first**: every interactive element has an accessible name
8. **No primitive consumes another primitive's private DOM** — contract is props only
9. **Breaking changes to any signature above** require: update this file + update all consumers + update tests in the same commit

---

## 11) Adding a new primitive

Before writing a new primitive:
1. Confirm it's not already covered by an existing one
2. Propose it in a Task — the Planner approves or rejects
3. Add its contract to this file **before** writing the `.tsx`
4. Register it in section 2's name table
5. Add at least one vitest unit test and a story/example in the PR description

**Auto-reject:** any primitive introduced without a corresponding update to this file.

---

## 12) القرار النهائي

**هذا الملف هو العقد التقني للـ primitives. أي primitive لا يحترم عقده المنشور هنا يُعتبر خارج النظام، ويُرفض في المراجعة.**
