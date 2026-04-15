import * as React from "react";
import { formatCurrency } from "@/lib/utils/formatters";

type PaymentAmountConfirmationProps = {
  amountPaid: number | null;
  isProcessing: boolean;
  selectedAccountName: string;
  totalAmount: number;
  onAmountPaidChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: (amountPaid: number) => void;
};

export function PaymentAmountConfirmation({
  amountPaid,
  isProcessing,
  selectedAccountName,
  totalAmount,
  onAmountPaidChange,
  onCancel,
  onConfirm
}: PaymentAmountConfirmationProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const normalizedAmountPaid = amountPaid ?? 0;
  const isUnderpaid = normalizedAmountPaid < totalAmount;
  const difference = Math.abs(normalizedAmountPaid - totalAmount);
  const cancelLabel = isUnderpaid ? "ادخل مبلغ آخر" : "إلغاء";
  const accountName = selectedAccountName.trim() || "حساب";

  return (
    <section className="stack-field" aria-label="تأكيد المبلغ">
      <div className="stack-field">
        <strong>تأكيد المبلغ</strong>
        <span className="workspace-footnote">الإجمالي: {formatCurrency(totalAmount)}</span>
        <span className="workspace-footnote">طريقة الدفع: {accountName}</span>
      </div>

      <label className="stack-field">
        <span className="field-label">كم دفع الزبون؟</span>
        <input
          ref={inputRef}
          className="field-input"
          type="number"
          inputMode="numeric"
          min={0}
          step="0.01"
          value={amountPaid ?? ""}
          onChange={(event) => onAmountPaidChange(event.target.value)}
          placeholder="0.00"
          disabled={isProcessing}
          aria-label="المبلغ المدفوع"
        />
      </label>

      <div
        className={
          isUnderpaid
            ? "pos-remaining-balance validation-tone--error"
            : "pos-remaining-balance validation-tone--success"
        }
        aria-live="polite"
        aria-label="الباقي"
      >
        <strong>الباقي: {formatCurrency(difference)}</strong>
      </div>

      {isUnderpaid ? <p className="field-error">يجب الدفع كامل المبلغ</p> : null}

      <div className="actions-row">
        <button
          type="button"
          className="secondary-button"
          onClick={onCancel}
          disabled={isProcessing}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="primary-button btn btn--primary"
          aria-label="تأكيد الدفع"
          disabled={isProcessing || isUnderpaid}
          onClick={() => onConfirm(normalizedAmountPaid)}
        >
          تأكيد
        </button>
      </div>
    </section>
  );
}
