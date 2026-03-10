"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { FileText, Loader2, Printer, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AccountOption, InvoiceOption } from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/utils/formatters";

type ReturnResponse = {
  return_id: string;
  return_number: string;
  refunded_amount: number;
  return_type: "full" | "partial";
  total_amount: number;
  debt_reduction: number;
};

type CancelResponse = {
  success: boolean;
  reversed_entries_count: number;
};

type InvoicesWorkspaceProps = {
  role: "admin" | "pos_staff";
  invoices: InvoiceOption[];
  accounts: AccountOption[];
};

type ReturnQuantitiesState = Record<string, number>;

function createUuid() {
  return crypto.randomUUID();
}

export function InvoicesWorkspace({ role, invoices, accounts }: InvoicesWorkspaceProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoices[0]?.id ?? "");
  const [returnType, setReturnType] = useState<"full" | "partial">("partial");
  const [refundAccountId, setRefundAccountId] = useState(accounts[0]?.id ?? "");
  const [returnReason, setReturnReason] = useState("");
  const [returnKey, setReturnKey] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [returnResult, setReturnResult] = useState<ReturnResponse | null>(null);
  const [cancelResult, setCancelResult] = useState<CancelResponse | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<ReturnQuantitiesState>({});
  const [isPending, startTransition] = useTransition();

  const filteredInvoices = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const haystack = `${invoice.invoice_number} ${invoice.customer_name ?? ""} ${invoice.pos_terminal_code ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [invoices, searchTerm]);

  const selectedInvoice =
    filteredInvoices.find((invoice) => invoice.id === selectedInvoiceId) ??
    invoices.find((invoice) => invoice.id === selectedInvoiceId) ??
    null;

  useEffect(() => {
    if (!selectedInvoice) {
      return;
    }

    setReturnQuantities((current) => {
      const next = { ...current };

      for (const item of selectedInvoice.items) {
        if (!(item.id in next)) {
          next[item.id] = 0;
        }
      }

      return next;
    });
  }, [selectedInvoice]);

  useEffect(() => {
    if (!returnKey) {
      setReturnKey(createUuid());
    }
  }, [returnKey]);

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-04 + PX-05-T05</p>
          <h1>الفواتير والمرتجعات والطباعة</h1>
          <p className="workspace-lead">
            هذه الشاشة تجمع سجل الفواتير الحديث، تنفيذ المرتجع من نفس الواجهة، وإخراج baseline
            طباعة يعتمد على المتصفح فقط.
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
                placeholder="ابحث برقم الفاتورة أو العميل أو الجهاز"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>

          <div className="stack-list">
            {filteredInvoices.map((invoice) => (
              <button
                key={invoice.id}
                type="button"
                className={invoice.id === selectedInvoiceId ? "list-card list-card--interactive is-selected" : "list-card list-card--interactive"}
                onClick={() => setSelectedInvoiceId(invoice.id)}
              >
                <div className="list-card__header">
                  <strong>{invoice.invoice_number}</strong>
                  <span className={`status-badge status-badge--${invoice.status}`}>{invoice.status}</span>
                </div>
                <p>التاريخ: {formatDate(invoice.invoice_date)}</p>
                <p>الإجمالي: {formatCurrency(invoice.total_amount)}</p>
                <p className="workspace-footnote">
                  الجهاز: {invoice.pos_terminal_code ?? "غير محدد"} | العميل: {invoice.customer_name ?? "بيع مباشر"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          {selectedInvoice ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Invoice Detail</p>
                  <h2>{selectedInvoice.invoice_number}</h2>
                </div>
                <button type="button" className="secondary-button" onClick={() => window.print()}>
                  <Printer size={16} />
                  طباعة
                </button>
              </div>

              <section className="print-receipt">
                <div className="info-strip">
                  <span>التاريخ: {formatDate(selectedInvoice.invoice_date)}</span>
                  <span>الإجمالي: {formatCurrency(selectedInvoice.total_amount)}</span>
                  <span>الحالة: {selectedInvoice.status}</span>
                  <span>الدين: {formatCurrency(selectedInvoice.debt_amount)}</span>
                </div>

                <div className="stack-list">
                  {selectedInvoice.items.map((item) => {
                    const remainingQuantity = item.quantity - item.returned_quantity;

                    return (
                      <article key={item.id} className="list-card">
                        <div className="list-card__header">
                          <strong>{item.product_name_at_time}</strong>
                          <span>{formatCurrency(item.total_price)}</span>
                        </div>
                        <p>
                          الكمية: {formatCompactNumber(item.quantity)} | المرتجع:{" "}
                          {formatCompactNumber(item.returned_quantity)} | المتبقي:{" "}
                          {formatCompactNumber(remainingQuantity)}
                        </p>
                        <p className="workspace-footnote">
                          سعر الوحدة: {formatCurrency(item.unit_price)} | خصم:{" "}
                          {formatCompactNumber(item.discount_percentage)}%
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <div className="empty-panel">
              <p>اختر فاتورة من القائمة لعرض التفاصيل.</p>
            </div>
          )}
        </section>
      </div>

      {selectedInvoice ? (
        <div className="detail-grid">
          <section className="workspace-panel">
            <p className="eyebrow">Return</p>
            <h2>إنشاء مرتجع</h2>

            <div className="stack-list">
              {selectedInvoice.items.map((item) => {
                const remainingQuantity = item.quantity - item.returned_quantity;

                return (
                  <article key={item.id} className="list-card">
                    <div className="list-card__header">
                      <strong>{item.product_name_at_time}</strong>
                      <span>{formatCompactNumber(remainingQuantity)} متاح</span>
                    </div>
                    <label className="stack-field">
                      <span>كمية الإرجاع</span>
                      <input
                        type="number"
                        min={0}
                        max={remainingQuantity}
                        step={1}
                        value={returnQuantities[item.id] ?? 0}
                        onChange={(event) =>
                          setReturnQuantities((current) => ({
                            ...current,
                            [item.id]: Math.min(Math.max(Number(event.target.value), 0), remainingQuantity)
                          }))
                        }
                      />
                    </label>
                  </article>
                );
              })}
            </div>

            <div className="stack-form">
              <label className="stack-field">
                <span>نوع المرتجع</span>
                <select value={returnType} onChange={(event) => setReturnType(event.target.value as "full" | "partial")}>
                  <option value="partial">جزئي</option>
                  <option value="full">كامل</option>
                </select>
              </label>

              <label className="stack-field">
                <span>حساب الإرجاع</span>
                <select value={refundAccountId} onChange={(event) => setRefundAccountId(event.target.value)}>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-field">
                <span>سبب الإرجاع</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  placeholder="سبب الإرجاع"
                />
              </label>

              <div className="info-strip">
                <span>idempotency_key: {returnKey}</span>
              </div>

              <button
                type="button"
                className="primary-button"
                disabled={isPending || !returnReason.trim() || !returnKey}
                onClick={() => {
                  const items = selectedInvoice.items
                    .map((item) => ({
                      invoice_item_id: item.id,
                      quantity:
                        returnType === "full"
                          ? item.quantity - item.returned_quantity
                          : returnQuantities[item.id] ?? 0
                    }))
                    .filter((item) => item.quantity > 0);

                  if (items.length === 0) {
                    toast.error("حدد بندًا واحدًا على الأقل للمرتجع.");
                    return;
                  }

                  startTransition(() => {
                    void (async () => {
                      const response = await fetch("/api/returns", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          invoice_id: selectedInvoice.id,
                          items,
                          refund_account_id: refundAccountId || undefined,
                          return_type: returnType,
                          reason: returnReason,
                          idempotency_key: returnKey
                        })
                      });

                      const envelope = (await response.json()) as StandardEnvelope<ReturnResponse>;
                      if (!response.ok || !envelope.success || !envelope.data) {
                        toast.error(envelope.error?.message ?? "تعذر إنشاء المرتجع.");
                        return;
                      }

                      setReturnResult(envelope.data);
                      setReturnReason("");
                      setReturnKey(createUuid());
                      setReturnQuantities({});
                      toast.success(`تم إنشاء المرتجع ${envelope.data.return_number}.`);
                      router.refresh();
                    })();
                  });
                }}
              >
                {isPending ? <Loader2 className="spin" size={16} /> : <RotateCcw size={16} />}
                تأكيد المرتجع
              </button>
            </div>

            {returnResult ? (
              <div className="result-card">
                <h3>{returnResult.return_number}</h3>
                <p>الإجمالي: {formatCurrency(returnResult.total_amount)}</p>
                <p>المسترد نقدًا: {formatCurrency(returnResult.refunded_amount)}</p>
                <p>تخفيض الدين: {formatCurrency(returnResult.debt_reduction)}</p>
              </div>
            ) : null}
          </section>

          {role === "admin" ? (
            <section className="workspace-panel">
              <p className="eyebrow">Cancel Invoice</p>
              <h2>إلغاء فاتورة</h2>

              <div className="stack-form">
                <label className="stack-field">
                  <span>سبب الإلغاء</span>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="سبب الإلغاء"
                  />
                </label>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={isPending || !cancelReason.trim()}
                  onClick={() => {
                    startTransition(() => {
                      void (async () => {
                        const response = await fetch("/api/invoices/cancel", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            invoice_id: selectedInvoice.id,
                            cancel_reason: cancelReason
                          })
                        });

                        const envelope = (await response.json()) as StandardEnvelope<CancelResponse>;
                        if (!response.ok || !envelope.success || !envelope.data) {
                          toast.error(envelope.error?.message ?? "تعذر إلغاء الفاتورة.");
                          return;
                        }

                        setCancelResult(envelope.data);
                        setCancelReason("");
                        toast.success("تم إلغاء الفاتورة وعكس القيود المرتبطة.");
                        router.refresh();
                      })();
                    });
                  }}
                >
                  {isPending ? <Loader2 className="spin" size={16} /> : <ShieldAlert size={16} />}
                  تنفيذ الإلغاء الإداري
                </button>
              </div>

              {cancelResult ? (
                <div className="result-card">
                  <h3>تم الإلغاء بنجاح</h3>
                  <p>عدد القيود المعكوسة: {formatCompactNumber(cancelResult.reversed_entries_count)}</p>
                </div>
              ) : null}

              <div className="info-strip">
                <span>طباعة baseline متاحة من الزر أعلاه عبر المتصفح مباشرة.</span>
                <span>عمليات التعديل الإداري تبقى محمية في الخادم حتى لو لم تُفتح هنا كواجهة تحرير كاملة.</span>
              </div>
            </section>
          ) : (
            <section className="workspace-panel">
              <div className="empty-panel">
                <FileText size={18} />
                <p>الإلغاء والتعديل الإداريان يبقيان محصورين بحساب Admin فقط.</p>
              </div>
            </section>
          )}
        </div>
      ) : null}
    </section>
  );
}
