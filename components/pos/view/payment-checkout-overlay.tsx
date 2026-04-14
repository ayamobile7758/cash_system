import * as React from "react";
import { X } from "lucide-react";
import { PosCheckoutPanel } from "@/components/pos/view/pos-checkout-panel";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

type PaymentCheckoutOverlayProps = React.ComponentProps<typeof PosCheckoutPanel> & {
  isMobileViewport: boolean;
  open: boolean;
  onClose: () => void;
};

export function PaymentCheckoutOverlay({
  isMobileViewport,
  onClose,
  open,
  ...checkoutProps
}: PaymentCheckoutOverlayProps) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const handleClose = React.useCallback(() => {
    if (!checkoutProps.isProcessing) {
      onClose();
    }
  }, [checkoutProps.isProcessing, onClose]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    function getFocusableElements() {
      return Array.from(
        contentRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
      ).filter((element) => !element.hasAttribute("disabled"));
    }

    const frameHandle = window.requestAnimationFrame(() => {
      const [firstFocusableElement] = getFocusableElements();
      firstFocusableElement?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        contentRef.current?.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameHandle);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [handleClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="pos-payment-overlay"
      style={{
        alignItems: isMobileViewport ? "flex-end" : "stretch",
        display: "flex",
        inset: 0,
        justifyContent: isMobileViewport ? "stretch" : "flex-end",
        pointerEvents: "auto",
        position: "fixed",
        zIndex: "var(--z-overlay)"
      }}
    >
      <button
        type="button"
        className="pos-payment-overlay__backdrop"
        aria-label="إغلاق"
        onClick={handleClose}
        style={{
          background: "rgba(24, 23, 21, 0.42)",
          border: "none",
          inset: 0,
          position: "absolute"
        }}
      />

      <div
        ref={contentRef}
        className="transaction-card transaction-card--checkout pos-cart-surface pos-payment-overlay__content"
        role="dialog"
        aria-label="طريقة الدفع"
        aria-modal="true"
        tabIndex={-1}
        style={{
          background: "var(--color-bg-surface)",
          borderInlineStart: isMobileViewport ? undefined : "1px solid var(--color-border)",
          borderRadius: isMobileViewport ? "16px 16px 0 0" : "0",
          boxShadow: isMobileViewport
            ? "0 -8px 24px rgba(24, 23, 21, 0.08)"
            : "-12px 0 24px rgba(24, 23, 21, 0.08)",
          display: "flex",
          flexDirection: "column",
          height: isMobileViewport ? "auto" : "100%",
          marginTop: isMobileViewport ? "auto" : "0",
          maxHeight: isMobileViewport ? "85vh" : "100%",
          overflow: "hidden",
          position: "relative",
          width: isMobileViewport ? "100%" : "min(100%, var(--pos-cart-width))"
        }}
      >
        <div className="pos-payment-overlay__header">
          <button
            type="button"
            className="icon-button pos-payment-overlay__close"
            aria-label="إغلاق"
            title="إغلاق"
            onClick={handleClose}
          >
            <X size={18} />
          </button>

          <h2 className="pos-payment-overlay__title">طريقة الدفع</h2>
        </div>

        <div className="pos-payment-overlay__body">
          <PosCheckoutPanel {...checkoutProps} />
        </div>
      </div>
    </div>
  );
}
