import * as React from "react";
import { Loader2, Plus, X, type LucideIcon } from "lucide-react";
import type { PosAccount, SplitPayment } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/formatters";

type CustomerSearchResult = {
  current_balance: number;
  id: string;
  name: string;
  phone: string | null;
};

type PosCheckoutPanelProps = {
  accounts: PosAccount[];
  amountReceived: number | null;
  availablePrimarySplitAccounts: PosAccount[];
  canCompleteSale: boolean;
  canCreateDebt: boolean;
  canHoldCart: boolean;
  changeToReturn: number | null;
  checkoutOptionsToggleLabel: string;
  customerResults: CustomerSearchResult[];
  customerSearchInput: string;
  customersLoading: boolean;
  effectiveMaxDiscount: number;
  getAccountChipLabel: (account: PosAccount) => string;
  getAccountIcon: (type: string) => LucideIcon;
  getAvailableAccountsForSplitRow: (selectedAccountId: string) => PosAccount[];
  heldCartsCount: number;
  itemCount: number;
  invoiceDiscountAmount: number;
  invoiceDiscountPercentage: number;
  isCheckoutOptionsOpen: boolean;
  isCustomerExpanded: boolean;
  isDiscountExpanded: boolean;
  isNotesExpanded: boolean;
  isOffline: boolean;
  isPrimarySplitSelectorOpen: boolean;
  isProcessing: boolean;
  isSplitMode: boolean;
  isSubmitting: boolean;
  isTerminalCodeExpanded: boolean;
  netTotal: number;
  notes: string;
  onAddSplitPayment: () => void;
  onAmountReceivedChange: (value: string) => void;
  onClearCartRequest: () => void;
  onClearCustomerSelection: () => void;
  onConfirmSale: () => void;
  onCustomerSearchInputChange: (value: string) => void;
  onHeldCartsToggle: () => void;
  onHoldCart: () => void;
  onInvoiceDiscountChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onOpenCustomer: () => void;
  onOpenDiscount: () => void;
  onOpenNotes: () => void;
  onOpenTerminalCode: () => void;
  onPaymentAccountSelect: (accountId: string) => void;
  onPosTerminalCodeChange: (value: string) => void;
  onPrimarySplitAccountSelect: (accountId: string) => void;
  onPrimarySplitAmountChange: (value: string) => void;
  onPrimarySplitSelectorToggle: () => void;
  onRemoveSplitPayment: (index: number) => void;
  onSelectCustomer: (customer: CustomerSearchResult) => void;
  onSplitPaymentAccountChange: (index: number, accountId: string) => void;
  onSplitPaymentAmountChange: (index: number, value: string) => void;
  onTerminalCodeLockToggle: () => void;
  onToggleCheckoutOptions: () => void;
  paymentRowCount: number;
  posTerminalCode: string;
  primarySplitAmount: number | null;
  remainingToSettle: number;
  selectedAccount: PosAccount | null;
  selectedAccountId: string | null;
  selectedCustomerBalance: number | null;
  selectedCustomerId: string | null;
  selectedCustomerName: string | null;
  selectedCustomerPhone: string | null;
  shouldBlockForDebt: boolean;
  shouldShowCustomerResults: boolean;
  splitPayments: SplitPayment[];
  subtotal: number;
  terminalCodeLocked: boolean;
  totalDiscount: number;
};

export function PosCheckoutPanel({
  accounts,
  amountReceived,
  availablePrimarySplitAccounts,
  canCompleteSale,
  canCreateDebt,
  canHoldCart,
  changeToReturn,
  checkoutOptionsToggleLabel,
  customerResults,
  customerSearchInput,
  customersLoading,
  effectiveMaxDiscount,
  getAccountChipLabel,
  getAccountIcon,
  getAvailableAccountsForSplitRow,
  heldCartsCount,
  itemCount,
  invoiceDiscountAmount,
  invoiceDiscountPercentage,
  isCheckoutOptionsOpen,
  isCustomerExpanded,
  isDiscountExpanded,
  isNotesExpanded,
  isOffline,
  isPrimarySplitSelectorOpen,
  isProcessing,
  isSplitMode,
  isSubmitting,
  isTerminalCodeExpanded,
  netTotal,
  notes,
  onAddSplitPayment,
  onAmountReceivedChange,
  onClearCartRequest,
  onClearCustomerSelection,
  onConfirmSale,
  onCustomerSearchInputChange,
  onHeldCartsToggle,
  onHoldCart,
  onInvoiceDiscountChange,
  onNotesChange,
  onOpenCustomer,
  onOpenDiscount,
  onOpenNotes,
  onOpenTerminalCode,
  onPaymentAccountSelect,
  onPosTerminalCodeChange,
  onPrimarySplitAccountSelect,
  onPrimarySplitAmountChange,
  onPrimarySplitSelectorToggle,
  onRemoveSplitPayment,
  onSelectCustomer,
  onSplitPaymentAccountChange,
  onSplitPaymentAmountChange,
  onTerminalCodeLockToggle,
  onToggleCheckoutOptions,
  paymentRowCount,
  posTerminalCode,
  primarySplitAmount,
  remainingToSettle,
  selectedAccount,
  selectedAccountId,
  selectedCustomerBalance,
  selectedCustomerId,
  selectedCustomerName,
  selectedCustomerPhone,
  shouldBlockForDebt,
  shouldShowCustomerResults,
  splitPayments,
  subtotal,
  terminalCodeLocked,
  totalDiscount
}: PosCheckoutPanelProps) {
  return (
    <div className="pos-unified-checkout">
      <div className="pos-cart-summary">
        <dl>
          <div>
            <dt>المجموع النهائي</dt>
            <dd>{formatCurrency(subtotal)}</dd>
          </div>
          {totalDiscount > 0 ? (
            <div>
              <dt>الخصم</dt>
              <dd>- {formatCurrency(totalDiscount)}</dd>
            </div>
          ) : null}
          {invoiceDiscountAmount > 0 ? (
            <div>
              <dt>خصم الفاتورة</dt>
              <dd>- {formatCurrency(invoiceDiscountAmount)}</dd>
            </div>
          ) : null}
          <div className="cart-summary__total pos-amount-due">
            <dt>المبلغ المستحق</dt>
            <dd>{formatCurrency(netTotal)}</dd>
          </div>
        </dl>
      </div>

      {!isSplitMode ? (
        <div className="stack-field">
          <span className="field-label">طرق الدفع</span>
          <div className="chip-row pos-payment-chip-row">
            {accounts.map((account) => {
              const Icon = getAccountIcon(account.type);
              const isSelected = account.id === selectedAccountId;

              return (
                <button
                  key={account.id}
                  type="button"
                  className={
                    isSelected
                      ? "chip chip--active pos-payment-chip is-selected"
                      : "chip pos-payment-chip"
                  }
                  onClick={() => onPaymentAccountSelect(account.id)}
                  disabled={isProcessing}
                >
                  <Icon size={16} />
                  {getAccountChipLabel(account)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!isSplitMode && selectedAccount?.type === "cash" ? (
        <label className="stack-field">
          <span className="field-label">المبلغ المستلم</span>
          <input
            className="field-input"
            type="number"
            min={0}
            step="0.001"
            value={amountReceived ?? ""}
            onChange={(event) => onAmountReceivedChange(event.target.value)}
            placeholder="0.000"
            disabled={isProcessing}
          />
        </label>
      ) : null}

      {isSplitMode ? (
        <div className="pos-split-payments">
          <div className="pos-split-payment-row pos-split-payment-row--primary">
            {selectedAccount
              ? (() => {
                  const SelectedAccountIcon = getAccountIcon(selectedAccount.type);
                  return (
                    <button
                      type="button"
                      className="chip chip--active pos-payment-chip is-selected"
                      onClick={onPrimarySplitSelectorToggle}
                      disabled={isProcessing}
                    >
                      <SelectedAccountIcon size={16} />
                      {getAccountChipLabel(selectedAccount)}
                    </button>
                  );
                })()
              : null}
            <label className="stack-field">
              <span className="field-label">المبلغ</span>
              <input
                className="field-input"
                type="number"
                min={0}
                step="0.001"
                value={primarySplitAmount ?? ""}
                onChange={(event) => onPrimarySplitAmountChange(event.target.value)}
                disabled={isProcessing}
              />
            </label>
          </div>

          {isPrimarySplitSelectorOpen ? (
            <div className="chip-row pos-split-primary-selector">
              {availablePrimarySplitAccounts.map((account) => {
                const Icon = getAccountIcon(account.type);
                const isSelected = account.id === selectedAccountId;
                return (
                  <button
                    key={`primary-selector-${account.id}`}
                    type="button"
                    className={
                      isSelected
                        ? "chip chip--active pos-payment-chip is-selected"
                        : "chip pos-payment-chip"
                    }
                    onClick={() => onPrimarySplitAccountSelect(account.id)}
                    disabled={isProcessing}
                  >
                    <Icon size={16} />
                    {getAccountChipLabel(account)}
                  </button>
                );
              })}
            </div>
          ) : null}

          {splitPayments.map((payment, index) => (
            <div key={`${payment.accountId}-${index}`} className="pos-split-payment-row">
              <div className="chip-row pos-payment-chip-row">
                {getAvailableAccountsForSplitRow(payment.accountId).map((account) => {
                  const Icon = getAccountIcon(account.type);
                  const isSelected = account.id === payment.accountId;
                  return (
                    <button
                      key={`${index}-${account.id}`}
                      type="button"
                      className={
                        isSelected
                          ? "chip chip--active pos-payment-chip is-selected"
                          : "chip pos-payment-chip"
                      }
                      onClick={() => onSplitPaymentAccountChange(index, account.id)}
                      disabled={isProcessing}
                    >
                      <Icon size={16} />
                      {getAccountChipLabel(account)}
                    </button>
                  );
                })}
              </div>

              <div className="actions-row">
                <label className="stack-field">
                  <span className="field-label">المبلغ</span>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    step="0.001"
                    value={payment.amount}
                    onChange={(event) => onSplitPaymentAmountChange(index, event.target.value)}
                    disabled={isProcessing}
                  />
                </label>

                <button
                  type="button"
                  className="icon-button btn btn--ghost"
                  onClick={() => onRemoveSplitPayment(index)}
                  disabled={isProcessing}
                  aria-label="حذف طريقة الدفع"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className={
          remainingToSettle > 0
            ? "pos-remaining-balance pos-remaining-balance--danger"
            : "pos-remaining-balance pos-remaining-balance--success"
        }
      >
        {remainingToSettle > 0 ? (
          <strong>المتبقي للسداد: {formatCurrency(remainingToSettle)}</strong>
        ) : changeToReturn !== null ? (
          <strong>الباقي للعميل: {formatCurrency(changeToReturn)}</strong>
        ) : (
          <strong>تم تسديد المبلغ</strong>
        )}
      </div>

      <button
        type="button"
        className={
          canCreateDebt
            ? "primary-button btn btn--warning transaction-checkout-button"
            : "primary-button btn btn--primary transaction-checkout-button"
        }
        disabled={isProcessing || isSubmitting || !canCompleteSale || isOffline}
        onClick={onConfirmSale}
        title="Ctrl+Enter"
      >
        {isProcessing || isSubmitting ? (
          <>
            <Loader2 className="spin" size={16} />
            جارٍ التنفيذ...
          </>
        ) : canCreateDebt ? (
          `إتمام البيع وتسجيل الدين • ${formatCurrency(netTotal)}`
        ) : (
          `تأكيد البيع • ${formatCurrency(netTotal)}`
        )}
      </button>

      <div className="pos-checkout-secondary-actions">
        <button
          type="button"
          className="secondary-button pos-checkout-secondary-actions__button"
          onClick={onHoldCart}
          disabled={!canHoldCart}
        >
          تعليق السلة
        </button>
        <button
          type="button"
          className="secondary-button pos-checkout-secondary-actions__button"
          onClick={onClearCartRequest}
          disabled={itemCount === 0}
        >
          تفريغ
        </button>
        <button
          type="button"
          className="secondary-button pos-checkout-secondary-actions__button"
          onClick={onHeldCartsToggle}
        >
          السلال المعلقة
          <span className="product-pill product-pill--accent">
            {formatCompactNumber(heldCartsCount)}
          </span>
        </button>
      </div>

      <div className="pos-checkout-options-toggle">
        <button
          type="button"
          className="secondary-button pos-checkout-options-toggle__button"
          onClick={onToggleCheckoutOptions}
        >
          {checkoutOptionsToggleLabel}
        </button>
      </div>

      {isCheckoutOptionsOpen ? (
        <div className="pos-checkout-advanced">
          {isCustomerExpanded ? (
            <div className="stack-field customer-search-field">
              <span className="field-label">العميل</span>
              <input
                className="field-input"
                type="text"
                value={customerSearchInput}
                onChange={(event) => onCustomerSearchInputChange(event.target.value)}
                placeholder="بحث العميل"
                disabled={isProcessing}
              />

              {shouldShowCustomerResults ? (
                <div className="customer-search-results">
                  {customersLoading ? (
                    <div className="customer-search-results__empty">جارٍ البحث عن العملاء...</div>
                  ) : customerResults.length === 0 ? (
                    <div className="customer-search-results__empty">لا توجد نتائج مطابقة.</div>
                  ) : (
                    customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="customer-search-option"
                        onClick={() => onSelectCustomer(customer)}
                      >
                        <strong>{customer.name}</strong>
                        <span>
                          {customer.phone || "بدون هاتف"} • الرصيد الحالي{" "}
                          {formatCurrency(customer.current_balance)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {selectedCustomerId && selectedCustomerName ? (
                <div className="selected-customer-card">
                  <div>
                    <strong>{selectedCustomerName}</strong>
                    <span>
                      الرصيد الحالي:{" "}
                      {selectedCustomerBalance !== null
                        ? formatCurrency(selectedCustomerBalance)
                        : "جارٍ التحميل..."}
                      {selectedCustomerPhone ? ` • ${selectedCustomerPhone}` : ""}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={onClearCustomerSelection}
                    disabled={isProcessing}
                  >
                    إزالة
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {isTerminalCodeExpanded ? (
            <label className="stack-field">
              <span className="field-label">رمز الطرفية</span>
              <div className="actions-row pos-terminal-code-row">
                <input
                  className="field-input"
                  type="text"
                  value={posTerminalCode}
                  onChange={(event) => onPosTerminalCodeChange(event.target.value)}
                  placeholder="POS-01"
                  disabled={isProcessing || terminalCodeLocked}
                />
                <button
                  type="button"
                  className="secondary-button pos-terminal-code-row__lock"
                  onClick={onTerminalCodeLockToggle}
                  disabled={isProcessing}
                >
                  {terminalCodeLocked ? "إلغاء القفل" : "قفل"}
                </button>
              </div>
            </label>
          ) : null}

          {isDiscountExpanded ? (
            <label className="stack-field">
              <span className="field-label">خصم الفاتورة</span>
              <input
                className="field-input"
                type="number"
                min={0}
                max={effectiveMaxDiscount}
                value={invoiceDiscountPercentage}
                onChange={(event) => onInvoiceDiscountChange(event.target.value)}
                disabled={isProcessing}
              />
            </label>
          ) : null}

          {isNotesExpanded ? (
            <div className="stack-field pos-notes-field">
              <span className="field-label">ملاحظات</span>
              <textarea
                className="field-input pos-notes-field__textarea"
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                placeholder="ملاحظة على الفاتورة"
                disabled={isProcessing}
              />
            </div>
          ) : null}

          {shouldBlockForDebt ? (
            <p className="field-error pos-debt-block-message">
              يجب اختيار عميل أو إكمال المبلغ
            </p>
          ) : null}

          {canCreateDebt ? (
            <div className="debt-preview-panel">
              <strong>سيتم تسجيل دين</strong>
              <span>المبلغ المتبقي: {formatCurrency(remainingToSettle)}</span>
              {selectedCustomerName ? <span>على حساب: {selectedCustomerName}</span> : null}
            </div>
          ) : null}

          <div className="pos-cart-actions-row">
            <button
              type="button"
              className="chip pos-action-chip"
              onClick={onAddSplitPayment}
              disabled={isProcessing || splitPayments.length >= 2 || accounts.length <= paymentRowCount}
            >
              <Plus size={14} />
              تمدد
            </button>
            <button
              type="button"
              className={
                isDiscountExpanded
                  ? "chip chip--active pos-action-chip"
                  : "chip pos-action-chip"
              }
              onClick={onOpenDiscount}
              disabled={isProcessing || isDiscountExpanded}
            >
              <Plus size={14} />
              خصم
            </button>
            <button
              type="button"
              className={
                isCustomerExpanded
                  ? "chip chip--active pos-action-chip"
                  : "chip pos-action-chip"
              }
              onClick={onOpenCustomer}
              disabled={isProcessing || isCustomerExpanded}
            >
              <Plus size={14} />
              عميل
            </button>
            <button
              type="button"
              className={
                isNotesExpanded ? "chip chip--active pos-action-chip" : "chip pos-action-chip"
              }
              onClick={onOpenNotes}
              disabled={isProcessing || isNotesExpanded}
            >
              <Plus size={14} />
              ملاحظات
            </button>
            <button
              type="button"
              className={
                isTerminalCodeExpanded
                  ? "chip chip--active pos-action-chip"
                  : "chip pos-action-chip"
              }
              onClick={onOpenTerminalCode}
              disabled={isProcessing || isTerminalCodeExpanded}
            >
              <Plus size={14} />
              رمز الطرفية
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
