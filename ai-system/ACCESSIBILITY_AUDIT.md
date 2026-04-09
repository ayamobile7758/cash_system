# Aya Mobile Accessibility Audit

## Scope

This audit defines the minimum accessibility contract for the restructure waves. It covers tabbed workspaces, accordion sections, bottom sheets, list-detail layouts, keyboard navigation, focus handling, semantic structure, and responsive interaction density.

## Current Assessment

Strengths already present in the codebase:

- Shell focus handling exists for the navigation popover.
- Shared focus-visible styling is already established in `app/globals.css`.
- Core pages already expose stable headings and route-level landmarks that tests rely on.

Gaps still requiring a formal contract:

- Section navigations in multiple dashboards are button groups, not true tab systems.
- There is no shared spec for bottom-sheet semantics and focus restoration.
- Accordion semantics are implied visually but not documented as a reusable ARIA pattern.
- Browser coverage is Chromium-heavy, so Safari-specific focus and motion behaviors are not yet verified systematically.

## Missing Requirements

Required before or during restructure work:

1. Shared tab semantics for every section navigator acting as a single-active-view switcher.
2. Shared accordion semantics for exclusive and non-exclusive disclosures.
3. Shared bottom-sheet modal contract for tablet and mobile detail flows.
4. Focus restoration rules after closing overlays, changing tabs, or collapsing secondary detail.
5. Async status announcement rules for save, retry, sync, offline, and validation feedback.
6. Touch target and semantic-heading checks for every new compact layout.

## ARIA, Focus, And Keyboard Requirements

### Tabs

- Container uses `role="tablist"`.
- Each trigger uses `role="tab"`, `aria-selected`, and `aria-controls`.
- Each panel uses `role="tabpanel"` and `aria-labelledby`.
- Only one tab is active at a time.
- Keyboard:
  - `Tab` enters the active tab.
  - Arrow keys move between sibling tabs.
  - `Home` moves to the first tab.
  - `End` moves to the last tab.
  - `Enter` or `Space` activates the focused tab when activation is manual.

### Accordions

- Each header button exposes `aria-expanded` and `aria-controls`.
- Each content panel has an `id` referenced by its header.
- Exclusive accordions must collapse the previously open panel automatically.
- `Enter` and `Space` toggle the current panel.

### Dialogs And Bottom Sheets

- Use `role="dialog"` and `aria-modal="true"`.
- Move focus into the overlay when it opens.
- Trap focus until dismissed.
- Return focus to the trigger after close.
- Backdrop dismiss must not be the only close path.

### General Keyboard Rules

- Focus order follows the visual reading order from inline-start to inline-end, then top-to-bottom inside the active panel.
- Hidden or collapsed content must not remain in the tab order.
- Route-level section changes must not reset keyboard users to the top of the page without intention.

## Screen Reader Considerations

- Each workspace keeps one route heading as the primary heading.
- Secondary sections use descending heading levels rather than generic bold text.
- Async save/sync/result messaging uses `role="status"` or `aria-live="polite"` for non-destructive updates.
- Destructive or blocking failures use assertive announcement only when the user must act immediately.
- Selected item state in list-detail layouts must be announced, either through tab semantics, selected-state text, or panel heading changes.
- Empty states and permission-blocked states must contain descriptive text, not icon-only placeholders.

## Color Contrast, Touch Targets, And Semantic Structure

- Body text meets WCAG AA `4.5:1`; large text and large iconography meet `3:1`.
- Interactive outlines must remain visible against copper, muted, and surface backgrounds.
- Minimum touch target is `44px x 44px`.
- Dense rows may visually appear shorter, but the click target must still meet the minimum interactive area.
- Lists use semantic list, table, or grid structure when data relationships matter.
- Buttons remain buttons, links remain links; clickable cards must not replace clear control semantics unless the entire card is the only intended control.

## Audit Checklist

### Cross-Wave Checklist

- Route heading exists and remains unique.
- Every interactive element has visible `:focus-visible`.
- Every tabbed region follows the shared tab contract.
- Every accordion follows the shared disclosure contract.
- Every modal or sheet returns focus correctly.
- Every status-only color cue has accompanying text.
- Every compact control still meets the minimum touch target.
- No collapsed content remains focusable.
- `prefers-reduced-motion` is honored for overlays and animated transitions.

### Wave-Specific Gates

- Wave 1:
  - Settings section navigator upgraded to a tab contract.
  - Reports section navigation remains navigable by keyboard with stable labels.
- Wave 2:
  - Two-column workspaces preserve focus when changing selected items.
  - Shared bottom-sheet contract is used wherever secondary columns collapse.
- Wave 3:
  - Accordions in inventory, maintenance, notifications, and invoice detail meet ARIA expectations.
- Wave 4:
  - Compact operational controls preserve touch target size and visible focus.
- Wave 5:
  - Final reduced-motion, contrast, and screen-reader sweep across all restructured screens.

## Blockers

- Blocker 1: There is no approved shared tab contract for section navigators that behave as single-active views. Wave 1 implementation should not start without this contract.
- Blocker 2: There is no approved shared bottom-sheet contract for tablet/mobile secondary columns. Waves 2 to 4 should not ship new detail sheets without this baseline.
- Blocker 3: Current automated browser coverage is Chromium-only. This is not a Wave 1 blocker for structure-only work, but it is a release blocker for mobile-sheet-heavy waves unless Safari validation is added.

## Acceptance Criteria

- Every restructured tabbed workspace ships with `tablist/tab/tabpanel` semantics and keyboard navigation.
- Every accordion ships with correct expanded state, keyboard toggle behavior, and controlled panel identity.
- Every new bottom sheet or modal restores focus to its trigger after close.
- Every async feedback state announced visually is also exposed to assistive technologies.
- Every compact control in the restructure waves remains at or above `44px x 44px`.
- No release candidate for Waves 2 to 4 is accepted without Safari or WebKit validation for the affected mobile detail flows.
