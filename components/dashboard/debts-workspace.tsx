"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, ReceiptText, Search, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AccountOption, DebtCustomerOption, DebtEntryOption } from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

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

  useEffect(() => {
    if (!manualKey) {
      setManualKey(createUuid());
    }

    if (!paymentKey) {
      setPaymentKey(createUuid());
    }
  }, [manualKey, paymentKey]);

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-04 / PX-05</p>
          <h1>الديون والتسديد</h1>
          <p className="workspace-lead">
            هذه الشاشة تغطي الدين اليدوي للـ Admin، وتسديد الدين بـ FIFO للـ Admin/POS من نفس
            baseline المالي.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="workspace-toolbar">
            <label className="workspace-search">
              <Search size={18} />
              <input
                type="search"
                placeholder="ابحث باسم العميل أو الهاتف"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>

          <div className="stack-list">
            {filteredCustomers.map((customer) => {
              const isSelected = customer.id === selectedCustomerId;

              return (
                <button
                  key={customer.id}
                  type="button"
                  className={isSelected ? "list-card list-card--interactive is-selected" : "list-card list-card--interactive"}
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <div className="list-card__header">
                    <strong>{customer.name}</strong>
                    <span>{formatCurrency(customer.current_balance)}</span>
                  </div>
                  <p>{customer.phone ?? "بدون هاتف"}</p>
                  {role === "admin" && customer.credit_limit !== undefined ? (
                    <p className="workspace-footnote">الحد: {formatCurrency(customer.credit_limit ?? 0)}</p>
                  ) : customer.due_date_days ? (
                    <p className="workspace-footnote">استحقاق افتراضي: {customer.due_date_days} يوم</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Customer Detail</p>
              <h2>{selectedCustomer?.name ?? "اختر عميلًا"}</h2>
            </div>
          </div>

          {selectedCustomer ? (
            <>
              <div className="info-strip">
                <span>الرصيد الحالي: {formatCurrency(selectedCustomer.current_balance)}</span>
                <span>الهاتف: {selectedCustomer.phone ?? "غير متوفر"}</span>
              </div>

              <div className="stack-list">
                {customerEntries.length > 0 ? (
                  customerEntries.map((entry) => (
                    <article key={entry.id} className="list-card">
                      <div className="list-card__header">
                        <strong>{entry.entry_type === "manual" ? "دين يدوي" : "فاتورة دين"}</strong>
                        <span>{formatCurrency(entry.remaining_amount)}</span>
                      </div>
                      <p>الاستحقاق: {formatDate(entry.due_date)}</p>
                      <p className="workspace-footnote">{entry.description ?? "بدون وصف إضافي"}</p>
                    </article>
                  ))
                ) : (
                  <div className="empty-panel">
                    <p>لا توجد قيود دين مفتوحة لهذا العميل.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <p>اختر عميلًا من القائمة لعرض التفاصيل.</p>
            </div>
          )}
        </section>
      </div>

      <div className="detail-grid">
        {role === "admin" ? (
          <section className="workspace-panel">
            <p className="eyebrow">Manual Debt</p>
            <h2>تسجيل دين يدوي</h2>

            <div className="stack-form">
              <label className="stack-field">
                <span>المبلغ</span>
                <input
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
                  rows={3}
                  maxLength={255}
                  value={manualDescription}
                  onChange={(event) => setManualDescription(event.target.value)}
                  placeholder="سبب الدين اليدوي"
                />
              </label>

              <div className="info-strip">
                <span>idempotency_key: {manualKey}</span>
              </div>

              <button
                type="button"
                className="primary-button"
                disabled={isPending || !selectedCustomerId || !manualAmount || !manualKey}
                onClick={() => {
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
                        toast.error(envelope.error?.message ?? "تعذر تسجيل الدين اليدوي.");
                        return;
                      }

                      setManualResult(envelope.data);
                      setManualAmount("");
                      setManualDescription("");
                      setManualKey(createUuid());
                      toast.success("تم إنشاء الدين اليدوي.");
                      router.refresh();
                    })();
                  });
                }}
              >
                {isPending ? <Loader2 className="spin" size={16} /> : <Wallet size={16} />}
                حفظ الدين اليدوي
              </button>
            </div>

            {manualResult ? (
              <div className="result-card">
                <h3>تم حفظ الدين اليدوي</h3>
                <p>debt_entry_id: {manualResult.debt_entry_id}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="workspace-panel">
          <p className="eyebrow">Debt Payment</p>
          <h2>تسديد الدين</h2>

          <div className="stack-form">
            <label className="stack-field">
              <span>المبلغ</span>
              <input
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
              <select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack-field">
              <span>قيد محدد (اختياري)</span>
              <select value={paymentEntryId} onChange={(event) => setPaymentEntryId(event.target.value)}>
                <option value="">اتركه فارغًا لتفعيل FIFO</option>
                {customerEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.entry_type} - {formatDate(entry.due_date)} - {formatCurrency(entry.remaining_amount)}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack-field">
              <span>ملاحظات</span>
              <textarea
                rows={3}
                maxLength={255}
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                placeholder="ملاحظات اختيارية"
              />
            </label>

            <div className="info-strip">
              <span>idempotency_key: {paymentKey}</span>
            </div>

            <button
              type="button"
              className="primary-button"
              disabled={isPending || !selectedCustomerId || !paymentAmount || !paymentAccountId || !paymentKey}
              onClick={() => {
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
                      toast.error(envelope.error?.message ?? "تعذر تسجيل تسديد الدين.");
                      return;
                    }

                    setPaymentResult(envelope.data);
                    setPaymentAmount("");
                    setPaymentNotes("");
                    setPaymentEntryId("");
                    setPaymentKey(createUuid());
                    toast.success(`تم تسجيل الإيصال ${envelope.data.receipt_number}.`);
                    router.refresh();
                  })();
                });
              }}
            >
              {isPending ? <Loader2 className="spin" size={16} /> : <ReceiptText size={16} />}
              تأكيد التسديد
            </button>
          </div>

          {paymentResult ? (
            <div className="result-card">
              <h3>{paymentResult.receipt_number}</h3>
              <p>الرصيد المتبقي: {formatCurrency(paymentResult.remaining_balance)}</p>
              <p>التوزيعات: {paymentResult.allocations.map((entry) => formatCurrency(entry.allocated_amount)).join(" / ")}</p>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
