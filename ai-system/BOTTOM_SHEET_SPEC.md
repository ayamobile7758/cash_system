# Aya Mobile Bottom Sheet Component Spec

## Purpose

`<MobileBottomSheet>` is the shared mobile and tablet secondary-surface pattern for Aya Mobile. It replaces hidden secondary columns when a two-column workflow collapses below desktop. The component exists to preserve context, avoid route jumps, and keep the primary list or form visible as the user's anchor.

## When To Use

Use the bottom sheet only when all of the following are true:

- Viewport is `<=1199px`.
- The hidden content is secondary to a primary list, form, or workspace.
- The user needs temporary detail, review, or lightweight action completion without leaving the current route.

Use cases approved for the current restructure plan:

- Inventory active-count detail on tablet/mobile.
- Suppliers directory detail and purchase summary on tablet/mobile.
- Maintenance job detail on tablet/mobile.
- Debts customer detail on mobile.
- Products admin edit form on mobile.
- POS held carts list on mobile.

Do not use the bottom sheet for:

- Primary full-screen workflows that deserve their own route.
- Multi-step destructive flows that require uninterrupted review.
- Desktop-only split layouts (`>=1200px`), where the secondary column must stay visible.

## Expected API

```tsx
type MobileBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  content: React.ReactNode;
  footer?: React.ReactNode;
  height?: "50vh" | "70vh" | "full";
  dismissible?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusRef?: React.RefObject<HTMLElement>;
  labelledBy?: string;
  describedBy?: string;
};
```

Implementation notes:

- The current repo already ships `vaul`; use it as the motion/dialog primitive instead of inventing a second sheet system.
- `height` defaults to `"70vh"` on mobile detail flows and `"50vh"` on tablet detail flows.
- `returnFocusRef` is required whenever the trigger is not the currently focused active element.

## Behavior

- Open with a bottom-up transition lasting `240ms` to `300ms` using an ease-out curve.
- Lock background scroll while open.
- Keep the background visually dimmed and non-interactive.
- Close on backdrop press, `Escape`, explicit close button, or swipe-down gesture when `dismissible !== false`.
- Restore focus to the opening trigger after close.
- Preserve parent route state: search query, selected tab, scroll position, and list selection must not reset when the sheet closes.
- Sheet body scrolls independently from the page when content exceeds available height.

## Interaction Details

- The sheet header must expose one visible title and one visible close button.
- The close button must receive a visible `:focus-visible` ring and remain reachable without swiping.
- Initial focus priority:
  1. Invalid field inside the sheet, if present.
  2. Primary action or first interactive control for a detail-only sheet.
  3. Close button only when the sheet is informational and contains no meaningful interactive target.
- If a sticky footer exists, it must remain visible while the body scrolls.
- Footer actions must not obscure the last line of content; reserve body padding equal to footer height plus safe-area inset.
- Drag handle is optional visual affordance only; it is never the sole dismiss control.

## Responsive Behavior

- Desktop (`>=1200px`): do not use the sheet for planned restructure flows; render the secondary column inline.
- Tablet (`768px-1199px`): use `"50vh"` for detail review and `"70vh"` only when the body contains actionable forms that would otherwise truncate critical fields.
- Mobile (`<768px`): use `"70vh"` for default detail flows and `"full"` only when the form cannot be completed safely inside a partial-height sheet.
- Apply safe-area padding on the bottom edge for iOS devices.

Required layout pattern:

```css
.split-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (max-width: 1199px) {
  .secondary-column {
    display: none;
  }

  .secondary-column.is-open {
    display: block;
  }
}
```

## Accessibility Requirements

- Sheet container uses `role="dialog"` and `aria-modal="true"`.
- The visible heading is bound with `aria-labelledby`.
- Optional assistive description is bound with `aria-describedby`.
- Focus is trapped while the sheet is open.
- `Escape` closes the sheet when dismissal is allowed.
- Focus returns to the original trigger after close.
- Touch targets are at least `44px x 44px`.
- Motion respects `prefers-reduced-motion`; use a near-instant opacity/transform fallback instead of the full transition.
- Visual structure must not depend on color alone; status chips or banners inside the sheet need text labels.

## States And Variants

Behavioral states:

- Closed
- Opening
- Open
- Closing

Content states:

- Loading
- Empty
- Ready
- Error

Approved variants:

- Detail sheet: read-first detail with optional footer action.
- Action sheet: short list of choices with no large body scroll.
- Form sheet: data entry with sticky footer action.

## Dependencies And Risks

- Dependency: `vaul` remains the recommended primitive because it already exists in the repo.
- Risk: the current `components/pos/mobile-bottom-sheet.tsx` implementation is not a compliant baseline because it uses physical `left/right` positioning and hardcoded non-tokenized surfaces; do not copy it forward unchanged.
- Risk: nested overlays (sheet on top of confirmation dialog) can break focus order and z-index expectations; destructive confirmations should replace the sheet focus context, not stack under it.
- Risk: Safari and iPadOS gesture behavior needs manual validation because swipe-dismiss, safe-area padding, and keyboard focus can diverge from Chromium.

## Acceptance Criteria

- Every new mobile or tablet secondary-detail flow uses this component contract instead of ad-hoc overlay markup.
- Implementation uses design-system tokens only; no raw color/shadow/font values are introduced in sheet styling.
- No physical `left` or `right` positioning is used in sheet CSS; logical properties are required.
- Focus enters the sheet on open, stays trapped while open, and returns to the original trigger on close.
- `Escape`, backdrop tap, and explicit close all work when the sheet is dismissible.
- Sticky footer, if present, remains visible without covering body content.
- Validated on one small Android viewport, one iPhone viewport, and one iPad viewport before any wave relying on mobile detail sheets is closed.
