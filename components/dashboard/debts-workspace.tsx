"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, ReceiptText, Search, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import type { AccountOption, DebtCustomerOption, DebtEntryOption } from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/utils/formatters";

type ManualDebtResponse = {
  debt_entry_id: string;
};

type DebtPaymentResponse = {
  payment_id: string;
  receipt_number: string;
  remaining_balance: number;
  allocations: Array<{
    debt_entry_id: string;
    allocated_amount: number;
  }>;
};

type DebtsWorkspaceProps = {
  role: "admin" | "pos_staff";
  customers: DebtCustomerOption[];
  entries: DebtEntryOption[];
  accounts: AccountOption[];
};

type DebtSection = "ledger" | "manual" | "payment";
type DebtsRetryAction = "manual-debt" | "debt-payment";

function createUuid() {
  return crypto.randomUUID();
}

export function DebtsWorkspace({ role, customers, entries, accounts }: DebtsWorkspaceProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id ?? "");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState(accounts[0]?.id ?? "");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentEntryId, setPaymentEntryId] = useState("");
  const [paymentKey, setPaymentKey] = useState("");
  const [manualResult, setManualResult] = useState<ManualDebtResponse | null>(null);
  const [paymentResult, setPaymentResult] = useState<DebtPaymentResponse | null>(null);
  const [activeSection, setActiveSection] = useState<DebtSection>("ledger");
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<DebtsRetryAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCustomers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return customers;
    }

    return customers.filter((customer) => {
      const haystack = `${customer.name} ${customer.phone ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [customers, searchTerm]);

  const selectedCustomer =
    filteredCustomers.find((customer) => customer.id === selectedCustomerId) ??
    customers.find((customer) => customer.id === selectedCustomerId) ??
    null;
  const customerEntries = entries.filter((entry) => entry.debt_customer_id === selectedCustomerId);
  const totalOutstanding = customerEntries.reduce((sum, entry) => sum + entry.remaining_amount, 0);

  useEffect(() => {
    if (!manualKey) {
      setManualKey(createUuid());
    }

    if (!paymentKey) {
      setPaymentKey(createUuid());
    }
  }, [manualKey, paymentKey]);

  useEffect(() => {
    setPaymentEntryId("");
    setManualResult(null);
    setPaymentResult(null);
  }, [selectedCustomerId]);

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
  }

  function failAction(message: string, action: DebtsRetryAction) {
    setActionErrorMessage(message);
    setRetryAction(action);
    toast.error(message);
  }

  function submitManualDebt() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/debts/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            debt_customer_id: selectedCustomerId,
            amount: Number(manualAmount),
            description: manualDescription || undefined,
            idempotency_key: manualKey
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<ManualDebtResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(envelope.error?.message ?? "تعذر تسجيل الدين اليدوي.", "manual-debt");
          return;
        }

        setManualResult(envelope.data);
        setManualAmount("");
        setManualDescription("");
        setManualKey(createUuid());
        clearActionFeedback();
        toast.success("تم إنشاء الدين اليدوي.");
        router.refresh();
      })();
    });
  }

  function submitDebtPayment() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/payments/debt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            debt_customer_id: selectedCustomerId,
            amount: Number(paymentAmount),
            account_id: paymentAccountId,
            notes: paymentNotes || undefined,
            idempotency_key: paymentKey,
            debt_entry_id: paymentEntryId || undefined
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<DebtPaymentResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(envelope.error?.message ?? "تعذر تسجيل تسديد الدين.", "debt-payment");
          return;
        }

        setPaymentResult(envelope.data);
        setPaymentAmount("");
        setPaymentNotes("");
        setPaymentEntryId("");
        setPaymentKey(createUuid());
        clearActionFeedback();
        toast.success(`تم تسجيل الإيصال ${envelope.data.receipt_number}.`);
        router.refresh();
      })();
    });
  }

  function retryLastAction() {
    switch (retryAction) {
      case "manual-debt":
        submitManualDebt();
        break;
      case "debt-payment":
        submitDebtPayment();
        break;
      default:
        break;
    }
  }

  return (
    <section className="workspace-stack transaction-page debts-page">
      <PageHeader
        title="الديون"
        meta={
          <>
            <span className="status-pill badge badge--neutral">
              {formatCompactNumber(filteredCustomers.length)} عميل
            </span>
            {selectedCustomer ? (
              <span className="status-pill badge badge--warning">
                مفتوح {formatCurrency(totalOutstanding)}
              </span>
            ) : null}
          </>
        }
        actions={
          <div className="transaction-action-cluster">
            {role === "admin" ? (
              <button
                type="button"
                className={
                  activeSection === "manual" ? "secondary-button" : "ghost-button btn btn--ghost"
                }
                onClick={() => setActiveSection("manual")}
              >
                دين يدوي
              </button>
            ) : null}
            <button
              type="button"
              className="primary-button"
              onClick={() => setActiveSection("payment")}
            >
              التسديد
            </button>
          </div>
        }
      />

      <div
        className="chip-row transaction-chip-row debts-page__sections"
        aria-label="أقسام شاشة الديون"
      >
        <button
          type="button"
          className={activeSection === "ledger" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("ledger")}
        >
          العملاء والقيود
        </button>
        {role === "admin" ? (
          <button
            type="button"
            className={activeSection === "manual" ? "chip-button is-selected" : "chip-button"}
            onClick={() => setActiveSection("manual")}
          >
            دين يدوي
          </button>
        ) : null}
        <button
          type="button"
          className={activeSection === "payment" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("payment")}
        >
          التسديد
        </button>
      </div>

      {actionErrorMessage ? (
        <StatusBanner
          variant="danger"
          title="تعذر تنفيذ الإجراء"
          message={actionErrorMessage}
          actionLabel={retryAction ? "إعادة المحاولة" : undefined}
          onAction={retryAction ? retryLastAction : undefined}
          onDismiss={clearActionFeedback}
        />
      ) : null}

      <div className="transaction-layout transaction-layout--detail">
        <SectionCard
          title="العملاء"
          className="transaction-card debts-page__customers"
          actions={
            <span className="product-pill product-pill--accent">
              {formatCompactNumber(filteredCustomers.length)} نتيجة
            </span>
          }
        >
          <div className="workspace-toolbar transaction-toolbar">
            <label className="workspace-search transaction-toolbar__search">
              <Search size={18} />
              <input
                className="field-input"
                type="search"
                placeholder="ابحث باسم العميل أو الهاتف"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="empty-panel transaction-empty-panel">
              <Search size={20} />
              <h3>لا توجد نتائج مطابقة</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSearchTerm("")}
              >
                مسح البحث
              </button>
            </div>
          ) : (
            <div className="stack-list transaction-list-shell debt-customer-list">
              {filteredCustomers.map((customer) => {
                const isSelected = customer.id === selectedCustomerId;

                return (
                  <button
                    key={customer.id}
                    type="button"
                    className={
                      isSelected
                        ? "list-card list-card--interactive is-selected debt-customer-card"
                        : "list-card list-card--interactive debt-customer-card"
                    }
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <div className="list-card__header">
                      <strong>{customer.name}</strong>
                      <span className="status-pill badge badge--warning debt-customer-card__balance">
                        {formatCurrency(customer.current_balance)}
                      </span>
                    </div>
                    <div className="debt-customer-card__meta">
                      <span>{customer.phone ?? "بدون هاتف"}</span>
                      {role === "admin" && customer.credit_limit !== undefined ? (
                        <span>
                          حد {formatCurrency(customer.credit_limit ?? 0)}
                        </span>
                      ) : customer.due_date_days ? (
                        <span>{customer.due_date_days} يوم</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="transaction-stack">
          <SectionCard
            title={selectedCustomer?.name ?? "اختر عميلًا"}
            className="transaction-card"
            actions={
              selectedCustomer ? (
                <span className="status-pill badge badge--neutral">
                  {formatCompactNumber(customerEntries.length)} قيود
                </span>
              ) : null
            }
          >
            {selectedCustomer ? (
              <>
                <div className="transaction-summary-grid">
                  <article className="transaction-page__meta-card stat-card">
                    <span>الرصيد الحالي</span>
                    <strong>{formatCurrency(selectedCustomer.current_balance)}</strong>
                  </article>
                  <article className="transaction-page__meta-card stat-card">
                    <span>القيود المفتوحة</span>
                    <strong>{formatCompactNumber(customerEntries.length)}</strong>
                  </article>
                  <article className="transaction-page__meta-card transaction-page__meta-card--safe stat-card">
                    <span>الرصيد المتبقي</span>
                    <strong>{formatCurrency(totalOutstanding)}</strong>
                  </article>
                </div>

                <div className="info-strip">
                  <span>الهاتف: {selectedCustomer.phone ?? "غير متوفر"}</span>
                  {selectedCustomer.due_date_days ? (
                    <span>الاستحقاق الافتراضي: {selectedCustomer.due_date_days} يوم</span>
                  ) : null}
                </div>

                {activeSection === "ledger" ? (
                  <div className="stack-list debt-entry-list">
                    {customerEntries.length > 0 ? (
                      customerEntries.map((entry) => (
                        <article key={entry.id} className="list-card debt-entry-card">
                          <div className="list-card__header">
                            <strong>{entry.entry_type === "manual" ? "دين يدوي" : "فاتورة دين"}</strong>
                            <span className="status-pill badge badge--warning">
                              {formatCurrency(entry.remaining_amount)}
                            </span>
                          </div>
                          <div className="debt-entry-card__meta">
                            <span>الاستحقاق: {formatDate(entry.due_date)}</span>
                            <span>الأصل: {formatCurrency(entry.amount)}</span>
                          </div>
                          <p className="workspace-footnote">
                            {entry.description ?? "بدون وصف إضافي"}
                          </p>
                        </article>
                      ))
                    ) : (
                      <div className="empty-panel transaction-empty-panel">
                        <Wallet size={20} />
                        <h3>لا توجد قيود مفتوحة</h3>
                        {role === "admin" ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setActiveSection("manual")}
                          >
                            دين يدوي
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeSection === "manual" && role === "admin" ? (
                  <div className="transaction-stack">
                    <div className="info-strip">
                      <span>سجل دينًا مباشرًا لهذا العميل عند الحاجة.</span>
                    </div>

                    <div className="stack-form">
                      <label className="stack-field">
                        <span>المبلغ</span>
                        <input
                          className="field-input"
                          type="number"
                          min={0.001}
                          step="0.001"
                          value={manualAmount}
                          onChange={(event) => setManualAmount(event.target.value)}
                          placeholder="0.000"
                        />
                      </label>

                      <label className="stack-field">
                        <span>الوصف</span>
                        <textarea
                          className="field-input"
                          rows={3}
                          maxLength={255}
                          value={manualDescription}
                          onChange={(event) => setManualDescription(event.target.value)}
                          placeholder="سبب الدين اليدوي"
                        />
                      </label>

                      <div className="info-strip">
                        <span>يُحفظ القيد مرة واحدة فقط لكل محاولة.</span>
                      </div>

                      <button
                        type="button"
                        className="primary-button"
                        disabled={isPending || !selectedCustomerId || !manualAmount || !manualKey}
                        onClick={submitManualDebt}
                      >
                        {isPending ? <Loader2 className="spin" size={16} /> : <Wallet size={16} />}
                        حفظ الدين اليدوي
                      </button>
                    </div>

                    {manualResult ? (
                      <div className="result-card">
                        <h3>تم حفظ الدين</h3>
                        <p>أضيف القيد إلى سجل العميل الحالي.</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeSection === "payment" ? (
                  <div className="transaction-stack">
                    <div className="stack-form">
                      <label className="stack-field">
                        <span>المبلغ</span>
                        <input
                          className="field-input"
                          type="number"
                          min={0.001}
                          step="0.001"
                          value={paymentAmount}
                          onChange={(event) => setPaymentAmount(event.target.value)}
                          placeholder="0.000"
                        />
                      </label>

                      <label className="stack-field">
                        <span>حساب الدفع</span>
                        <select className="field-input" value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)}>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      {customerEntries.length > 0 ? (
                        <label className="stack-field">
                          <span>قيد محدد (اختياري)</span>
                          <select className="field-input" value={paymentEntryId} onChange={(event) => setPaymentEntryId(event.target.value)}>
                            <option value="">اتركه فارغًا لتفعيل FIFO</option>
                            {customerEntries.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.entry_type} - {formatDate(entry.due_date)} - {formatCurrency(entry.remaining_amount)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <div className="info-strip">
                          <span>لا توجد قيود مفتوحة لهذا العميل حاليًا.</span>
                        </div>
                      )}

                      <label className="stack-field">
                        <span>ملاحظات</span>
                        <textarea
                          className="field-input"
                          rows={3}
                          maxLength={255}
                          value={paymentNotes}
                          onChange={(event) => setPaymentNotes(event.target.value)}
                          placeholder="ملاحظات اختيارية"
                        />
                      </label>

                      <div className="info-strip">
                        <span>بدون اختيار قيد، يوزع النظام السداد على الأقدم تلقائيًا.</span>
                      </div>

                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          isPending ||
                          !selectedCustomerId ||
                          !paymentAmount ||
                          !paymentAccountId ||
                          !paymentKey ||
                          customerEntries.length === 0
                        }
                        onClick={submitDebtPayment}
                      >
                        {isPending ? <Loader2 className="spin" size={16} /> : <ReceiptText size={16} />}
                        تأكيد التسديد
                      </button>
                    </div>

                    {paymentResult ? (
                      <div className="result-card">
                        <h3>{paymentResult.receipt_number}</h3>
                        <p>الرصيد المتبقي: {formatCurrency(paymentResult.remaining_balance)}</p>
                        <p>
                          التوزيعات:{" "}
                          {paymentResult.allocations
                            .map((entry) => formatCurrency(entry.allocated_amount))
                            .join(" / ")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-panel transaction-empty-panel">
                <Wallet size={20} />
                <h3>اختر عميلًا لعرض الرصيد</h3>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </section>
  );
}
