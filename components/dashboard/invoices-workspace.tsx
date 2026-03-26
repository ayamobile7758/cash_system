"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
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

type ReceiptLinkResponse = {
  token_id: string;
  receipt_url: string;
  expires_at: string;
  is_reissued: boolean;
};

type RevokeReceiptLinkResponse = {
  token_id: string;
  invoice_id: string;
  revoked: boolean;
};

type SendWhatsAppResponse = {
  delivery_log_id: string;
  status: "queued";
  wa_url: string;
};

type InvoicesWorkspaceProps = {
  role: "admin" | "pos_staff";
  invoices: InvoiceOption[];
  accounts: AccountOption[];
};

type ReturnQuantitiesState = Record<string, number>;
type InvoiceSection = "overview" | "returns" | "admin";
type ConfirmAction = "revoke-link" | "create-return" | "cancel-invoice" | null;
type RetryAction =
  | "create-link"
  | "revoke-link"
  | "send-whatsapp"
  | "create-return"
  | "cancel-invoice"
  | null;

function createUuid() {
  return crypto.randomUUID();
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  active: "نشطة",
  partially_returned: "مرتجع جزئي",
  returned: "مرتجعة",
  cancelled: "ملغاة"
};

function getInvoiceStatusLabel(status: string) {
  return INVOICE_STATUS_LABELS[status] ?? status;
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
  const [receiptLinkResult, setReceiptLinkResult] = useState<ReceiptLinkResponse | null>(null);
  const [whatsAppResult, setWhatsAppResult] = useState<SendWhatsAppResponse | null>(null);
  const [expiresInHours, setExpiresInHours] = useState("168");
  const [returnQuantities, setReturnQuantities] = useState<ReturnQuantitiesState>({});
  const [activeSection, setActiveSection] = useState<InvoiceSection>("overview");
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [retryAction, setRetryAction] = useState<RetryAction>(null);
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

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId]
  );

  useEffect(() => {
    if (!selectedInvoice) {
      return;
    }

    setReturnQuantities((current) =>
      selectedInvoice.items.reduce(
        (acc, item) => {
          acc[item.id] ??= 0;
          return acc;
        },
        { ...current }
      )
    );
  }, [selectedInvoice]);

  useEffect(() => {
    if (!returnKey) {
      setReturnKey(createUuid());
    }
  }, [returnKey]);

  useEffect(() => {
    setReceiptLinkResult(null);
    setWhatsAppResult(null);
    setReturnResult(null);
    setCancelResult(null);
    clearActionFeedback();
    setConfirmAction(null);
    setRetryAction(null);
  }, [selectedInvoiceId]);

  function getActionError<T>(envelope: StandardEnvelope<T>, fallback: string) {
    return envelope.error?.message ?? fallback;
  }

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
  }

  function buildReturnItems() {
    if (!selectedInvoice) {
      return [];
    }

    return selectedInvoice.items
      .map((item) => ({
        invoice_item_id: item.id,
        quantity:
          returnType === "full" ? item.quantity - item.returned_quantity : returnQuantities[item.id] ?? 0
      }))
      .filter((item) => item.quantity > 0);
  }

  function handleCreateReceiptLink() {
    if (!selectedInvoice) {
      return;
    }

    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/receipts/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: selectedInvoice.id,
            channel: "share",
            expires_in_hours: Number(expiresInHours || "168")
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<ReceiptLinkResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          const message = getActionError(envelope, "تعذر إنشاء رابط الإيصال.");
          setActionErrorMessage(message);
          setRetryAction("create-link");
          toast.error(message);
          return;
        }

        setReceiptLinkResult(envelope.data);
        setWhatsAppResult(null);
        setRetryAction(null);
        toast.success(envelope.data.is_reissued ? "تم تحديث رابط الإيصال الحالي." : "تم إنشاء رابط الإيصال العام.");
      })();
    });
  }

  function handleRevokeReceiptLink() {
    if (!receiptLinkResult) {
      return;
    }

    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/receipts/link", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token_id: receiptLinkResult.token_id
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<RevokeReceiptLinkResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          const message = getActionError(envelope, "تعذر إلغاء رابط الإيصال.");
          setActionErrorMessage(message);
          setRetryAction("revoke-link");
          toast.error(message);
          return;
        }

        setReceiptLinkResult(null);
        setWhatsAppResult(null);
        setConfirmAction(null);
        setRetryAction(null);
        toast.success("تم إلغاء رابط الإيصال العام.");
      })();
    });
  }

  function handleSendWhatsApp() {
    if (!selectedInvoice || !selectedInvoice.customer_phone || !receiptLinkResult) {
      return;
    }

    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/messages/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_key: "receipt_share",
            target_phone: selectedInvoice.customer_phone,
            reference_type: "invoice",
            reference_id: selectedInvoice.id,
            payload: {
              receipt_url: receiptLinkResult.receipt_url
            },
            idempotency_key: crypto.randomUUID()
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<SendWhatsAppResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          const message = getActionError(envelope, "تعذر تجهيز رسالة واتساب.");
          setActionErrorMessage(message);
          setRetryAction("send-whatsapp");
          toast.error(message);
          return;
        }

        setWhatsAppResult(envelope.data);
        setRetryAction(null);
        window.open(envelope.data.wa_url, "_blank", "noopener,noreferrer");
        toast.success("تم تجهيز مشاركة واتساب وتسجيلها إداريًا.");
      })();
    });
  }

  function handleCreateReturn() {
    if (!selectedInvoice) {
      return;
    }

    const items = buildReturnItems();
    if (items.length === 0) {
      const message = "حدد بندًا واحدًا على الأقل للمرتجع.";
      setActionErrorMessage(message);
      setRetryAction("create-return");
      toast.error(message);
      return;
    }

    clearActionFeedback();
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
          const message = getActionError(envelope, "تعذر إنشاء المرتجع.");
          setActionErrorMessage(message);
          setRetryAction("create-return");
          toast.error(message);
          return;
        }

        setReturnResult(envelope.data);
        setReturnReason("");
        setReturnKey(createUuid());
        setReturnQuantities({});
        setConfirmAction(null);
        setRetryAction(null);
        toast.success(`تم إنشاء المرتجع ${envelope.data.return_number}.`);
        router.refresh();
      })();
    });
  }

  function handleCancelInvoice() {
    if (!selectedInvoice) {
      return;
    }

    clearActionFeedback();
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
          const message = getActionError(envelope, "تعذر إلغاء الفاتورة.");
          setActionErrorMessage(message);
          setRetryAction("cancel-invoice");
          toast.error(message);
          return;
        }

        setCancelResult(envelope.data);
        setCancelReason("");
        setConfirmAction(null);
        setRetryAction(null);
        toast.success("تم إلغاء الفاتورة وعكس القيود المرتبطة.");
        router.refresh();
      })();
    });
  }

  function retryLastAction() {
    switch (retryAction) {
      case "create-link":
        handleCreateReceiptLink();
        break;
      case "revoke-link":
        handleRevokeReceiptLink();
        break;
      case "send-whatsapp":
        handleSendWhatsApp();
        break;
      case "create-return":
        handleCreateReturn();
        break;
      case "cancel-invoice":
        handleCancelInvoice();
        break;
      default:
        break;
    }
  }

  return (
    <section className="workspace-stack transaction-page">
      <PageHeader
        eyebrow="الفواتير"
        title="الفواتير والإيصالات والمرتجعات"
        description="تابع الفواتير الحديثة، واصل مشاركة الإيصال، ونفذ المرتجع أو الإجراء الإداري من مساحة أوضح تقلل التكدس وتبقي كل خطوة في سياقها الصحيح."
        meta={
          <div className="transaction-page__meta" aria-label="ملخص شاشة الفواتير">
            <article className="transaction-page__meta-card">
              <span>الفواتير المعروضة</span>
              <strong>{formatCompactNumber(filteredInvoices.length)}</strong>
            </article>
            <article className="transaction-page__meta-card">
              <span>الحالة الحالية</span>
              <strong>{selectedInvoice ? getInvoiceStatusLabel(selectedInvoice.status) : "اختر فاتورة"}</strong>
            </article>
            <article className="transaction-page__meta-card transaction-page__meta-card--safe">
              <span>إجمالي الفاتورة</span>
              <strong>{selectedInvoice ? formatCurrency(selectedInvoice.total_amount) : "—"}</strong>
            </article>
          </div>
        }
      />

      <div className="chip-row transaction-chip-row" aria-label="أقسام شاشة الفواتير">
        <button
          type="button"
          className={activeSection === "overview" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("overview")}
        >
          الملخص والإيصال
        </button>
        <button
          type="button"
          className={activeSection === "returns" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("returns")}
        >
          المرتجع
        </button>
        {role === "admin" ? (
          <button
            type="button"
            className={activeSection === "admin" ? "chip-button is-selected" : "chip-button"}
            onClick={() => setActiveSection("admin")}
          >
            الإجراء الإداري
          </button>
        ) : null}
      </div>

      {isPending ? (
        <StatusBanner
          variant="info"
          title="جارٍ تنفيذ الإجراء"
          message="انتظر حتى يكتمل الإجراء الحالي قبل تنفيذ خطوة إضافية على هذه الفاتورة."
        />
      ) : null}

      {actionErrorMessage ? (
        <StatusBanner
          variant="danger"
          title="تعذر إكمال الإجراء على الفاتورة"
          message={actionErrorMessage}
          actionLabel={retryAction ? "إعادة المحاولة" : undefined}
          onAction={retryAction ? retryLastAction : undefined}
          onDismiss={clearActionFeedback}
        />
      ) : null}

      <div className="transaction-layout transaction-layout--detail">
        <SectionCard
          eyebrow="سجل الفواتير"
          title="قائمة الفواتير"
          description="ابحث بسرعة برقم الفاتورة أو العميل أو الجهاز، ثم اختر الفاتورة المطلوبة لعرض تفاصيلها وإجراءاتها."
          className="transaction-card"
        >
          <div className="workspace-toolbar transaction-toolbar">
            <label className="workspace-search transaction-toolbar__search">
              <Search size={18} />
              <input
                type="search"
                placeholder="ابحث برقم الفاتورة أو العميل أو الجهاز"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>

          <div className="stack-list transaction-list-shell">
            {filteredInvoices.map((invoice) => (
              <button
                key={invoice.id}
                type="button"
                className={
                  invoice.id === selectedInvoiceId
                    ? "list-card list-card--interactive is-selected"
                    : "list-card list-card--interactive"
                }
                onClick={() => setSelectedInvoiceId(invoice.id)}
              >
                <div className="list-card__header">
                  <strong>{invoice.invoice_number}</strong>
                  <span className={`status-badge status-badge--${invoice.status}`}>{getInvoiceStatusLabel(invoice.status)}</span>
                </div>
                <p>التاريخ: {formatDate(invoice.invoice_date)}</p>
                <p>الإجمالي: {formatCurrency(invoice.total_amount)}</p>
                <p className="workspace-footnote">
                  الجهاز: {invoice.pos_terminal_code ?? "غير محدد"} | العميل: {invoice.customer_name ?? "بيع مباشر"}
                </p>
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="transaction-stack">
          <SectionCard
            eyebrow="تفاصيل الفاتورة"
            title={selectedInvoice ? selectedInvoice.invoice_number : "اختر فاتورة"}
            description="تظهر هنا حالة الفاتورة، قيمتها، بنودها، وكل إجراءات الإيصال أو المرتجع أو الإلغاء بحسب صلاحيتك."
            className="transaction-card"
          >
            {selectedInvoice ? (
              <>
                <div className="transaction-summary-grid">
                  <article className="transaction-page__meta-card">
                    <span>الإجمالي</span>
                    <strong>{formatCurrency(selectedInvoice.total_amount)}</strong>
                  </article>
                  <article className="transaction-page__meta-card">
                    <span>الحالة</span>
                    <strong>{getInvoiceStatusLabel(selectedInvoice.status)}</strong>
                  </article>
                  <article className="transaction-page__meta-card">
                    <span>الدين المرتبط</span>
                    <strong>{formatCurrency(selectedInvoice.debt_amount)}</strong>
                  </article>
                </div>

                <div className="info-strip">
                  <span>التاريخ: {formatDate(selectedInvoice.invoice_date)}</span>
                  <span>الجهاز: {selectedInvoice.pos_terminal_code ?? "غير محدد"}</span>
                  <span>العميل: {selectedInvoice.customer_name ?? "بيع مباشر"}</span>
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
                          {formatCompactNumber(item.returned_quantity)} | المتبقي: {formatCompactNumber(remainingQuantity)}
                        </p>
                        <p className="workspace-footnote">
                          سعر الوحدة: {formatCurrency(item.unit_price)} | خصم: {formatCompactNumber(item.discount_percentage)}%
                        </p>
                      </article>
                    );
                  })}
                </div>

                {activeSection === "overview" ? (
                  <>
                    <div className="transaction-action-cluster">
                      <button type="button" className="secondary-button" onClick={() => window.print()}>
                        <Printer size={16} />
                        طباعة الإيصال
                      </button>

                      <label className="stack-field stack-field--min-220">
                        <span>مدة صلاحية الرابط (بالساعات)</span>
                        <input
                          type="number"
                          min={1}
                          max={720}
                          step={1}
                          value={expiresInHours}
                          onChange={(event) => setExpiresInHours(event.target.value)}
                        />
                      </label>

                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isPending}
                        onClick={handleCreateReceiptLink}
                      >
                        {isPending ? <Loader2 className="spin" size={16} /> : <Link2 size={16} />}
                        إنشاء رابط مشاركة
                      </button>

                      {receiptLinkResult ? (
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={isPending}
                          onClick={() => setConfirmAction("revoke-link")}
                        >
                          إلغاء الرابط
                        </button>
                      ) : null}

                      {receiptLinkResult ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            void navigator.clipboard.writeText(receiptLinkResult.receipt_url);
                            toast.success("تم نسخ رابط الإيصال.");
                          }}
                        >
                          <Copy size={16} />
                          نسخ الرابط
                        </button>
                      ) : null}

                      {receiptLinkResult ? (
                        <a href={receiptLinkResult.receipt_url} target="_blank" rel="noreferrer" className="secondary-button">
                          <ExternalLink size={16} />
                          فتح الرابط العام
                        </a>
                      ) : null}

                      {role === "admin" && selectedInvoice.customer_phone && receiptLinkResult ? (
                        <button
                          type="button"
                          className="primary-button"
                          disabled={isPending}
                          onClick={handleSendWhatsApp}
                        >
                          واتساب
                        </button>
                      ) : null}
                    </div>

                    {receiptLinkResult ? (
                      <div className="result-card">
                        <h3>رابط الإيصال الحالي</h3>
                        <p>الرابط العام جاهز للمشاركة أو الفتح من الأزرار أعلاه.</p>
                        <p>ينتهي في: {formatDate(receiptLinkResult.expires_at)}</p>
                        <p>إعادة إصدار: {receiptLinkResult.is_reissued ? "نعم" : "لا"}</p>
                      </div>
                    ) : null}

                    {whatsAppResult ? (
                      <div className="result-card">
                        <h3>محاولة واتساب</h3>
                        <p>الحالة: {whatsAppResult.status === "queued" ? "قيد الإرسال" : whatsAppResult.status}</p>
                        <p>تم تجهيز نافذة المشاركة المناسبة وتسجيل العملية إداريًا.</p>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {activeSection === "returns" ? (
                  <div className="transaction-stack">
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
                        <span>يحمي النظام طلب المرتجع من الإرسال المكرر ويحدث الفاتورة والمخزون والحساب المرتبط تلقائيًا.</span>
                      </div>

                      <button
                        type="button"
                        className="primary-button"
                        disabled={isPending || !returnReason.trim() || !returnKey}
                        onClick={() => setConfirmAction("create-return")}
                      >
                        {isPending ? <Loader2 className="spin" size={16} /> : <RotateCcw size={16} />}
                        تنفيذ المرتجع
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
                  </div>
                ) : null}

                {activeSection === "admin" ? (
                  role === "admin" ? (
                    <div className="transaction-stack">
                      <div className="info-strip">
                        <span>استخدم الإلغاء الإداري فقط بعد التحقق من السبب والرجوع إلى سياسة المتجر.</span>
                      </div>

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
                          onClick={() => setConfirmAction("cancel-invoice")}
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
                    </div>
                  ) : (
                    <div className="empty-panel transaction-empty-panel">
                      <FileText size={18} />
                      <p>الإلغاء والتعديل الإداريان يبقيان محصورين بالحساب الإداري فقط.</p>
                    </div>
                  )
                ) : null}
              </>
            ) : (
              <div className="empty-panel transaction-empty-panel">
                <p>اختر فاتورة من القائمة لعرض التفاصيل.</p>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmAction === "revoke-link"}
        title="إلغاء رابط الإيصال"
        description="سيبطل هذا الإجراء رابط الإيصال العام الحالي. يمكنك إنشاء رابط جديد لاحقًا عند الحاجة."
        confirmLabel="إلغاء الرابط"
        onConfirm={handleRevokeReceiptLink}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
        tone="danger"
      />

      <ConfirmationDialog
        open={confirmAction === "create-return"}
        title="تأكيد إنشاء المرتجع"
        description="سيسجل النظام المرتجع ويحدّث أرصدة الفاتورة والمخزون والحساب المحدد للإرجاع."
        confirmLabel="تنفيذ المرتجع"
        onConfirm={handleCreateReturn}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
      />

      <ConfirmationDialog
        open={confirmAction === "cancel-invoice"}
        title="تأكيد الإلغاء الإداري"
        description="سيلغي هذا الإجراء الفاتورة ويعكس القيود المرتبطة بها. استخدمه فقط بعد التحقق من السبب الإداري."
        confirmLabel="تنفيذ الإلغاء"
        onConfirm={handleCancelInvoice}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
        tone="danger"
      />
    </section>
  );
}
