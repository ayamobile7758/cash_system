import * as React from "react";
import { CheckCircle2, Printer } from "lucide-react";
import type { SaleResponseData } from "@/lib/pos/types";
import { formatCurrency } from "@/lib/utils/formatters";

type PosSuccessStateProps = {
  completedSaleFeeTotal: number;
  lastCompletedSale: SaleResponseData;
  onNewSale: () => void;
  onPrint: () => void;
};

export function PosSuccessState({
  completedSaleFeeTotal,
  lastCompletedSale,
  onNewSale,
  onPrint
}: PosSuccessStateProps) {
  return (
    <div className="cart-success-overlay pos-success-screen">
      <div className="cart-success-overlay__icon">
        <CheckCircle2 size={64} />
      </div>
      <h3 className="cart-success-overlay__title">تم إتمام البيع بنجاح</h3>
      <strong className="pos-success-screen__total">
        {formatCurrency(lastCompletedSale.net_total ?? lastCompletedSale.total)}
      </strong>
      <span className="pos-success-screen__invoice">
        فاتورة #{lastCompletedSale.invoice_number}
      </span>

      <dl className="cart-success-overlay__details pos-success-screen__details">
        {(lastCompletedSale.payments ?? []).map((payment) => (
          <div key={`${payment.account_id}-${payment.amount}`}>
            <dt>{payment.account_name}</dt>
            <dd>{formatCurrency(payment.amount)}</dd>
          </div>
        ))}

        {completedSaleFeeTotal > 0 ? (
          <div>
            <dt>رسوم الدفع</dt>
            <dd>{formatCurrency(completedSaleFeeTotal)}</dd>
          </div>
        ) : null}

        {lastCompletedSale.change !== null && lastCompletedSale.change > 0 ? (
          <div>
            <dt>الباقي للعميل</dt>
            <dd>{formatCurrency(lastCompletedSale.change)}</dd>
          </div>
        ) : null}
        {lastCompletedSale.debt_amount && lastCompletedSale.debt_amount > 0 ? (
          <div className="pos-success-screen__detail pos-success-screen__detail--warning">
            <dt>دين مسجل</dt>
            <dd>{formatCurrency(lastCompletedSale.debt_amount)}</dd>
          </div>
        ) : null}
      </dl>

      {lastCompletedSale.customer_name ? (
        <div className="info-strip">
          <span>العميل: {lastCompletedSale.customer_name}</span>
        </div>
      ) : null}

      <div className="cart-success-overlay__actions actions-row">
        <button type="button" className="primary-button btn btn--primary" onClick={onPrint}>
          <Printer size={16} />
          طباعة إيصال
        </button>
        <button type="button" className="secondary-button btn btn--secondary" onClick={onNewSale}>
          بيع جديد
        </button>
      </div>
    </div>
  );
}
