"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { PosContrast, PosDensity, PosFontSize } from "@/stores/pos-settings";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[href]",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

type PosSettingsModalProps = {
  open: boolean;
  density: PosDensity;
  fontSize: PosFontSize;
  contrast: PosContrast;
  onClose: () => void;
  onChange: (next: {
    density?: PosDensity;
    fontSize?: PosFontSize;
    contrast?: PosContrast;
  }) => void;
  onReset: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const DENSITY_OPTIONS: Array<{ value: PosDensity; label: string }> = [
  { value: "compact", label: "مضغوط" },
  { value: "comfortable", label: "مريح" },
  { value: "spacious", label: "واسع" }
];

const FONT_SIZE_OPTIONS: Array<{ value: PosFontSize; label: string }> = [
  { value: "sm", label: "صغير" },
  { value: "md", label: "متوسط" },
  { value: "lg", label: "كبير" },
  { value: "xl", label: "كبير جدًا" }
];

const CONTRAST_OPTIONS: Array<{ value: PosContrast; label: string }> = [
  { value: "off", label: "افتراضي" },
  { value: "soft", label: "ناعم" },
  { value: "strong", label: "قوي" }
];

const PRESETS = [
  {
    id: "default",
    label: "افتراضي",
    values: {
      density: "comfortable" as PosDensity,
      fontSize: "md" as PosFontSize,
      contrast: "off" as PosContrast
    }
  },
  {
    id: "day",
    label: "نهاري",
    values: {
      density: "comfortable" as PosDensity,
      fontSize: "md" as PosFontSize,
      contrast: "soft" as PosContrast
    }
  },
  {
    id: "night",
    label: "مسائي",
    values: {
      density: "spacious" as PosDensity,
      fontSize: "lg" as PosFontSize,
      contrast: "strong" as PosContrast
    }
  }
] as const;

export function PosSettingsModal({
  open,
  density,
  fontSize,
  contrast,
  onClose,
  onChange,
  onReset,
  triggerRef
}: PosSettingsModalProps) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function getFocusableElements() {
      return Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
      ).filter((element) => !element.hasAttribute("disabled"));
    }

    const frameHandle = window.requestAnimationFrame(() => {
      const [firstFocusableElement] = getFocusableElements();
      firstFocusableElement?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
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
      triggerRef.current?.focus();
    };
  }, [onClose, open, triggerRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="pos-settings-modal" role="presentation">
      <button
        type="button"
        className="pos-settings-modal__backdrop"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        className="pos-settings-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-settings-modal-title"
        aria-describedby="pos-settings-modal-scope"
        tabIndex={-1}
      >
        <header className="pos-settings-modal__header">
          <h2 id="pos-settings-modal-title" className="pos-settings-modal__title">
            الإعدادات
          </h2>
          <button
            type="button"
            className="icon-button pos-settings-modal__close"
            aria-label="إغلاق"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="pos-settings-modal__body">
          <p id="pos-settings-modal-scope" className="pos-settings-modal__scope">
            هذه الإعدادات تُحفظ على هذا الجهاز فقط
          </p>

          <div className="pos-settings-modal__presets" aria-label="الإعدادات">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="secondary-button pos-settings-modal__preset"
                onClick={() => onChange(preset.values)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <fieldset className="pos-settings-modal__fieldset">
            <legend className="pos-settings-modal__legend">الكثافة</legend>
            <div className="pos-settings-modal__options">
              {DENSITY_OPTIONS.map((option) => (
                <label key={option.value} className="pos-settings-modal__option">
                  <input
                    type="radio"
                    name="pos-density"
                    value={option.value}
                    checked={density === option.value}
                    onChange={() => onChange({ density: option.value })}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="pos-settings-modal__fieldset">
            <legend className="pos-settings-modal__legend">حجم الخط</legend>
            <div className="pos-settings-modal__options">
              {FONT_SIZE_OPTIONS.map((option) => (
                <label key={option.value} className="pos-settings-modal__option">
                  <input
                    type="radio"
                    name="pos-font-size"
                    value={option.value}
                    checked={fontSize === option.value}
                    onChange={() => onChange({ fontSize: option.value })}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="pos-settings-modal__fieldset">
            <legend className="pos-settings-modal__legend">التباين</legend>
            <div className="pos-settings-modal__options">
              {CONTRAST_OPTIONS.map((option) => (
                <label key={option.value} className="pos-settings-modal__option">
                  <input
                    type="radio"
                    name="pos-contrast"
                    value={option.value}
                    checked={contrast === option.value}
                    onChange={() => onChange({ contrast: option.value })}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="pos-settings-modal__footer">
          <button
            type="button"
            className="secondary-button pos-settings-modal__footer-button"
            onClick={onReset}
          >
            إعادة تعيين
          </button>
          <button
            type="button"
            className="secondary-button pos-settings-modal__footer-button"
            onClick={onClose}
          >
            إغلاق
          </button>
        </footer>
      </div>
    </div>
  );
}
