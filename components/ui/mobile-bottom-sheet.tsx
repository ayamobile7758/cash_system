"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { Drawer } from "vaul";

type MobileBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  content: ReactNode;
  footer?: ReactNode;
  height?: "50vh" | "70vh" | "full";
  dismissible?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  labelledBy?: string;
  describedBy?: string;
};

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  description,
  content,
  footer,
  height = "70vh",
  dismissible = true,
  initialFocusRef,
  returnFocusRef,
  labelledBy,
  describedBy
}: MobileBottomSheetProps) {
  const generatedTitleId = useId();
  const generatedDescriptionId = useId();
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      window.setTimeout(() => {
        initialFocusRef?.current?.focus();
      }, 0);
      return;
    }

    if (wasOpen.current) {
      returnFocusRef?.current?.focus();
      wasOpen.current = false;
    }
  }, [initialFocusRef, isOpen, returnFocusRef]);

  const titleId = labelledBy ?? generatedTitleId;
  const descriptionId = description ? describedBy ?? generatedDescriptionId : undefined;

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      dismissible={dismissible}
      shouldScaleBackground
      modal
    >
      <Drawer.Portal>
        <Drawer.Overlay className="mobile-bottom-sheet__overlay" />
        <Drawer.Content
          className={`mobile-bottom-sheet__content mobile-bottom-sheet__content--${height.replace("vh", "")}`}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <div className="mobile-bottom-sheet__handle" aria-hidden="true" />
          <div className="mobile-bottom-sheet__header">
            <div className="mobile-bottom-sheet__header-copy">
              <Drawer.Title id={titleId} className="mobile-bottom-sheet__title">
                {title}
              </Drawer.Title>
              {description ? (
                <Drawer.Description id={descriptionId} className="mobile-bottom-sheet__description">
                  {description}
                </Drawer.Description>
              ) : null}
            </div>

            <Drawer.Close asChild>
              <button type="button" className="icon-button mobile-bottom-sheet__close" aria-label="إغلاق اللوحة">
                <X size={18} />
              </button>
            </Drawer.Close>
          </div>

          <div className="mobile-bottom-sheet__body">{content}</div>
          {footer ? <div className="mobile-bottom-sheet__footer">{footer}</div> : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
