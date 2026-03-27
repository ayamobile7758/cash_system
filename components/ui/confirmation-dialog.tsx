"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  tone?: "default" | "danger";
};

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "إلغاء",
  onConfirm,
  onCancel,
  isPending = false,
  tone = "default"
}: ConfirmationDialogProps) {
  if (!open) {
    return null;
  }

  const descriptionId = description ? "confirmation-dialog-description" : undefined;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={isPending ? undefined : onCancel}>
      <div
        className={`confirmation-dialog confirmation-dialog--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirmation-dialog__icon">
          <AlertTriangle size={20} />
        </div>

        <div className="confirmation-dialog__copy">
          <h2 id="confirmation-dialog-title">{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>

        <div className="confirmation-dialog__actions">
          <button type="button" className="secondary-button" disabled={isPending} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? "primary-button confirmation-dialog__confirm is-danger" : "primary-button confirmation-dialog__confirm"}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="spin" size={16} /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
