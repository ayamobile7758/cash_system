import * as React from "react";
import { ChevronDown, Loader2, Plus, X, type LucideIcon } from "lucide-react";
import { PaymentAmountConfirmation } from "@/components/pos/view/payment-amount-confirmation";
import type { PosAccount, SplitPayment } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/formatters";

type CustomerSearchResult = {
  current_balance: number;
  id: string;
  name: string;
  phone: string | null;
};

type SectionId = "customer" | "discount" | "split" | "debt" | "notes";
type PaymentStep = "method-select" | "amount-confirmation";

type PosCheckoutPanelProps = {
  accounts: PosAccount[];
  amountReceived: number | null;
  availablePrimarySplitAccounts: PosAccount[];
  canCompleteSale: boolean;
  canCreateDebt: boolean;
  canHoldCart: boolean;
  changeToReturn: number | null;
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
  isOffline: boolean;
  isPrimarySplitSelectorOpen: boolean;
  isProcessing: boolean;
  isSplitMode: boolean;
  isSubmitting: boolean;
  netTotal: number;
  notes: string;
  onAddSplitPayment: () => void;
  onAmountReceivedChange: (value: string) => void;
  onClearCartRequest: () => void;
  onClearCustomerSelection: () => void;
  onConfirmSale: (amountPaid?: number | null) => void;
  onCustomerSearchInputChange: (value: string) => void;
  onHeldCartsToggle: () => void;
  onHoldCart: () => void;
  onInvoiceDiscountChange: (value: string) => void;
  onNotesChange: (value: string) => void;
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
  paymentRowCount: number;
  posTerminalCode: string;
  primarySplitAmount: number | null;
  remainingToSettle: number;
  remainingBalanceToneClass: string;
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

type CheckoutSectionProps = {
  children: React.ReactNode;
  isOpen: boolean;
  label: string;
  sectionId: SectionId;
  sectionRef: React.Ref<HTMLDetailsElement>;
  summary: string | null;
  onToggle: (sectionId: SectionId, nextOpen: boolean) => void;
};

const DEFAULT_TERMINAL_CODE = "POS-01";

function buildInitialOpenSections({
  canCreateDebt,
  invoiceDiscountPercentage,
  isSplitMode,
  notes,
  posTerminalCode,
  selectedCustomerId,
  terminalCodeLocked
}: {
  canCreateDebt: boolean;
  invoiceDiscountPercentage: number;
  isSplitMode: boolean;
  notes: string;
  posTerminalCode: string;
  selectedCustomerId: string | null;
  terminalCodeLocked: boolean;
}) {
  return {
    customer: Boolean(selectedCustomerId),
    debt: canCreateDebt,
    discount: invoiceDiscountPercentage > 0,
    notes:
      notes.trim().length > 0 ||
      terminalCodeLocked ||
      posTerminalCode.trim().toUpperCase() !== DEFAULT_TERMINAL_CODE,
    split: isSplitMode
  } satisfies Record<SectionId, boolean>;
}

function createClosedSectionMap() {
  return {
    customer: false,
    debt: false,
    discount: false,
    notes: false,
    split: false
  } satisfies Record<SectionId, boolean>;
}

function CheckoutSection({
  children,
  isOpen,
  label,
  onToggle,
  sectionId,
  sectionRef,
  summary
}: CheckoutSectionProps) {
  return (
    <details
      ref={sectionRef}
      className="pos-checkout-section"
      data-section-id={sectionId}
      open={isOpen}
    >
      <summary
        className="pos-checkout-section__summary"
        onClick={(event) => {
          event.preventDefault();
          onToggle(sectionId, !isOpen);
        }}
      >
        <span className="pos-checkout-section__summary-main">
          <ChevronDown className="pos-checkout-section__chevron" size={16} />
          <span className="pos-checkout-section__label">{label}</span>
        </span>

        <span className="pos-checkout-section__summary-side">
          {summary ? <span className="product-pill">{summary}</span> : null}
        </span>
      </summary>

      <div className="pos-checkout-section__body">{children}</div>
    </details>
  );
}

export function PosCheckoutPanel({
  accounts,
  amountReceived,
  availablePrimarySplitAccounts,
  canCompleteSale,
  canCreateDebt,
  canHoldCart,
  changeToReturn,
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
  isOffline,
  isPrimarySplitSelectorOpen,
  isProcessing,
  isSplitMode,
  isSubmitting,
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
  paymentRowCount,
  posTerminalCode,
  primarySplitAmount,
  remainingToSettle,
  remainingBalanceToneClass,
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
  const [paymentStep, setPaymentStep] = React.useState<PaymentStep>(() =>
    selectedAccountId ? "amount-confirmation" : "method-select"
  );
  const [openSections, setOpenSections] = React.useState<Record<SectionId, boolean>>(() =>
    buildInitialOpenSections({
      canCreateDebt,
      invoiceDiscountPercentage,
      isSplitMode,
      notes,
      posTerminalCode,
      selectedCustomerId,
      terminalCodeLocked
    })
  );
  const [manuallyClosedSections, setManuallyClosedSections] =
    React.useState<Record<SectionId, boolean>>(createClosedSectionMap);
  const manuallyClosedSectionsRef = React.useRef(manuallyClosedSections);
  const customerSectionRef = React.useRef<HTMLDetailsElement | null>(null);
  const discountSectionRef = React.useRef<HTMLDetailsElement | null>(null);
  const splitSectionRef = React.useRef<HTMLDetailsElement | null>(null);
  const debtSectionRef = React.useRef<HTMLDetailsElement | null>(null);
  const notesSectionRef = React.useRef<HTMLDetailsElement | null>(null);
  const previousSelectedCustomerId = React.useRef<string | null>(selectedCustomerId);

  React.useEffect(() => {
    manuallyClosedSectionsRef.current = manuallyClosedSections;
  }, [manuallyClosedSections]);

  React.useEffect(() => {
    if (!selectedAccountId) {
      setPaymentStep("method-select");
    }
  }, [selectedAccountId]);

  const setSectionOpen = React.useCallback(
    (
      sectionId: SectionId,
      nextOpen: boolean,
      options?: {
        force?: boolean;
        reason?: "auto" | "manual";
        scroll?: boolean;
      }
    ) => {
      const force = options?.force ?? false;
      const reason = options?.reason ?? "manual";

      if (
        nextOpen &&
        reason === "auto" &&
        !force &&
        manuallyClosedSectionsRef.current[sectionId]
      ) {
        return;
      }

      setOpenSections((currentValue) => {
        if (currentValue[sectionId] === nextOpen) {
          return currentValue;
        }

        return {
          ...currentValue,
          [sectionId]: nextOpen
        };
      });

      if (reason === "manual") {
        setManuallyClosedSections((currentValue) => ({
          ...currentValue,
          [sectionId]: !nextOpen
        }));
      } else if (nextOpen && force) {
        setManuallyClosedSections((currentValue) => ({
          ...currentValue,
          [sectionId]: false
        }));
      }

      if (nextOpen && (options?.scroll ?? true)) {
        window.requestAnimationFrame(() => {
          const sectionRef =
            sectionId === "customer"
              ? customerSectionRef
              : sectionId === "discount"
                ? discountSectionRef
                : sectionId === "split"
                  ? splitSectionRef
                  : sectionId === "debt"
                    ? debtSectionRef
                    : notesSectionRef;

          sectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        });
      }
    },
    []
  );

  const openSectionsForAction = React.useCallback(
    (sectionIds: SectionId[], options?: { force?: boolean; scroll?: boolean }) => {
      sectionIds.forEach((sectionId, index) => {
        setSectionOpen(sectionId, true, {
          force: options?.force ?? true,
          reason: "auto",
          scroll: index === 0 ? options?.scroll ?? true : false
        });
      });
    },
    [setSectionOpen]
  );

  React.useEffect(() => {
    if (
      selectedCustomerId &&
      selectedCustomerId !== previousSelectedCustomerId.current
    ) {
      openSectionsForAction(["customer"], { force: true, scroll: false });
    }

    previousSelectedCustomerId.current = selectedCustomerId;
  }, [openSectionsForAction, selectedCustomerId]);

  const canAddSplitPayment =
    Boolean(selectedAccountId) &&
    (isSplitMode || accounts.some((account) => account.id !== selectedAccountId));
  const customerSummary = selectedCustomerName;
  const discountSummary =
    invoiceDiscountAmount > 0 ? `- ${formatCurrency(invoiceDiscountAmount)}` : null;
  const splitSummary = isSplitMode ? `مقسّم على ${formatCompactNumber(paymentRowCount)}` : null;
  const debtSummary = canCreateDebt ? `دين ${formatCurrency(remainingToSettle)}` : null;
  const notesSummary =
    notes.trim().length > 0
      ? "ملاحظة"
      : terminalCodeLocked || posTerminalCode.trim().toUpperCase() !== DEFAULT_TERMINAL_CODE
        ? posTerminalCode
        : null;
  const selectedAccountName = selectedAccount?.name?.trim() || "حساب";

  const handlePaymentAccountSelection = React.useCallback(
    (accountId: string) => {
      onPaymentAccountSelect(accountId);
      onAmountReceivedChange("");
      setPaymentStep("amount-confirmation");
    },
    [onAmountReceivedChange, onPaymentAccountSelect]
  );

  const handleAmountConfirmationCancel = React.useCallback(() => {
    onAmountReceivedChange("");
    setPaymentStep("method-select");
  }, [onAmountReceivedChange]);

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
          <span className="field-label">طريقة الدفع</span>
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
                  onClick={() => handlePaymentAccountSelection(account.id)}
                  disabled={isProcessing}
                >
                  <Icon size={16} />
                  {account.name?.trim() || "حساب"}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!isSplitMode && selectedAccount ? (
        paymentStep === "amount-confirmation" ? (
          <PaymentAmountConfirmation
            amountPaid={amountReceived}
            isProcessing={isProcessing || isSubmitting}
            selectedAccountName={selectedAccountName}
            totalAmount={netTotal}
            onAmountPaidChange={onAmountReceivedChange}
            onCancel={handleAmountConfirmationCancel}
            onConfirm={(amountPaid) => onConfirmSale(amountPaid)}
          />
        ) : (
          <div className="pos-remaining-balance validation-tone--warning">
            <strong>اختر أو راجع طريقة الدفع ثم أدخل المبلغ</strong>
          </div>
        )
      ) : null}

      {isSplitMode ? (
        <div className={`pos-remaining-balance ${remainingBalanceToneClass}`}>
          {remainingToSettle > 0 ? (
            <strong>المتبقي للسداد: {formatCurrency(remainingToSettle)}</strong>
          ) : changeToReturn !== null ? (
            <strong>الباقي للعميل: {formatCurrency(changeToReturn)}</strong>
          ) : (
            <strong>تم تسديد المبلغ</strong>
          )}
        </div>
      ) : null}

      <div className="actions-row">
        <button
          type="button"
          className="secondary-button"
          onClick={(event) => {
            if (!isSplitMode && paymentStep === "amount-confirmation") {
              setPaymentStep("method-select");
              return;
            }

            const paymentSurface = event.currentTarget
              .closest(".pos-unified-checkout")
              ?.querySelector<HTMLElement>(".pos-payment-chip-row, .pos-split-payments");
            paymentSurface?.scrollIntoView({ block: "nearest" });
          }}
        >
          مراجعة الدفع
        </button>
      </div>

      <div className="pos-cart-actions-row pos-checkout-quick-actions">
        <button
          type="button"
          className={
            openSections.discount || invoiceDiscountAmount > 0
              ? "pos-action-chip chip--active"
              : "pos-action-chip"
          }
          onClick={() => openSectionsForAction(["discount"])}
          disabled={isProcessing}
        >
          خصم
        </button>
        <button
          type="button"
          className={
            openSections.split || isSplitMode ? "pos-action-chip chip--active" : "pos-action-chip"
          }
          onClick={() => {
            if (!isSplitMode && canAddSplitPayment) {
              onAddSplitPayment();
            }

            openSectionsForAction(["split"]);
          }}
          disabled={isProcessing || !canAddSplitPayment}
        >
          <Plus size={14} />
          تقسيم الدفع
        </button>
        <button
          type="button"
          className={
            openSections.debt || canCreateDebt ? "pos-action-chip chip--active" : "pos-action-chip"
          }
          onClick={() => openSectionsForAction(["debt", "customer"])}
          disabled={isProcessing}
        >
          تسجيل دين
        </button>
        <button
          type="button"
          className={
            openSections.notes || notesSummary ? "pos-action-chip chip--active" : "pos-action-chip"
          }
          onClick={() => openSectionsForAction(["notes"])}
          disabled={isProcessing}
        >
          ملاحظات
        </button>
      </div>

      {isSplitMode ? (
        <div className="pos-checkout-primary-action">
          <button
            type="button"
            className={
              canCreateDebt
                ? "primary-button btn btn--warning transaction-checkout-button"
                : "primary-button btn btn--primary transaction-checkout-button"
            }
            aria-label="إتمام البيع"
            disabled={isProcessing || isSubmitting || !canCompleteSale || isOffline}
            onClick={() => onConfirmSale()}
            title="Ctrl+Enter"
          >
            {isProcessing || isSubmitting ? (
              <>
                <Loader2 className="spin" size={16} />
                جارٍ التنفيذ...
              </>
            ) : canCreateDebt ? (
              `تسجيل دين • ${formatCurrency(netTotal)}`
            ) : (
              `تأكيد البيع • ${formatCurrency(netTotal)}`
            )}
          </button>
        </div>
      ) : null}

      <div className="pos-checkout-sections">
        <CheckoutSection
          sectionId="customer"
          label="العميل"
          summary={customerSummary}
          isOpen={openSections.customer}
          onToggle={setSectionOpen}
          sectionRef={customerSectionRef}
        >
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
                      onClick={() => {
                        onSelectCustomer(customer);
                        openSectionsForAction(["customer"], { force: true, scroll: false });
                      }}
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
        </CheckoutSection>

        <CheckoutSection
          sectionId="discount"
          label="الخصم"
          summary={discountSummary}
          isOpen={openSections.discount}
          onToggle={setSectionOpen}
          sectionRef={discountSectionRef}
        >
          <label className="stack-field">
            <span className="field-label">خصم الفاتورة</span>
            <input
              className="field-input"
              type="number"
              inputMode="decimal"
              min={0}
              max={effectiveMaxDiscount}
              value={invoiceDiscountPercentage}
              onChange={(event) => onInvoiceDiscountChange(event.target.value)}
              disabled={isProcessing}
            />
          </label>
        </CheckoutSection>

        <CheckoutSection
          sectionId="split"
          label="تقسيم الدفع"
          summary={splitSummary}
          isOpen={openSections.split}
          onToggle={setSectionOpen}
          sectionRef={splitSectionRef}
        >
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
                          {selectedAccount.name?.trim() || "حساب"}
                        </button>
                      );
                    })()
                  : null}
                <label className="stack-field">
                  <span className="field-label">المبلغ</span>
                  <input
                    className="field-input"
                    type="number"
                    inputMode="decimal"
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
                        {account.name?.trim() || "حساب"}
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
                          {account.name?.trim() || "حساب"}
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
                        inputMode="decimal"
                        min={0}
                        step="0.001"
                        value={payment.amount}
                        onChange={(event) =>
                          onSplitPaymentAmountChange(index, event.target.value)
                        }
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
          ) : (
            <p className="workspace-footnote">يمكنك إضافة طريقة دفع ثانية لتقسيم المبلغ.</p>
          )}
        </CheckoutSection>

        <CheckoutSection
          sectionId="debt"
          label="دين"
          summary={debtSummary}
          isOpen={openSections.debt}
          onToggle={setSectionOpen}
          sectionRef={debtSectionRef}
        >
          <div className="pos-checkout-section__stack">
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
            ) : (
              <p className="workspace-footnote">يظهر هنا ملخص الدين عند وجود مبلغ متبقٍ على عميل.</p>
            )}
          </div>
        </CheckoutSection>

        <CheckoutSection
          sectionId="notes"
          label="ملاحظات ورمز الطرفية"
          summary={notesSummary}
          isOpen={openSections.notes}
          onToggle={setSectionOpen}
          sectionRef={notesSectionRef}
        >
          <div className="pos-checkout-section__stack">
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
          </div>
        </CheckoutSection>
      </div>
    </div>
  );
}
