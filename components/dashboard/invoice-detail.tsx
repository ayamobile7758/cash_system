"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ChevronLeft,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Printer,
  RotateCcw,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
import type {
  AccountOption,
  InvoiceDetailOption,
  InvoiceReturnOption,
  InvoiceReturnItemOption
} from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatDateTime
} from "@/lib/utils/formatters";

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

type InvoiceDetailProps = {
  role: "admin" | "pos_staff";
  invoice: InvoiceDetailOption;
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

function summarizeReturnItems(items: InvoiceReturnItemOption[]) {
  return `${formatCompactNumber(items.length)} بند`;
}

export function InvoiceDetail({ role, invoice, accounts }: InvoiceDetailProps) {
  const router = useRouter();
  const autoPrintAttempted = useRef(false);
  const [returnType, setReturnType] = useState<"full" | "partial">("partial");
  const [refundAccountId, setRefundAccountId] = useState(accounts[0]?.id ?? "");
  const [returnReason, setReturnReason] = useState("");
  const [returnKey, setReturnKey] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [returnResult, setReturnResult] = useState<ReturnResponse | null>(null);
  const [cancelResult, setCancelResult] = useState<CancelResponse | null>(null);
  const [receiptLinkResult, setReceiptLinkResult] = useState<ReceiptLinkResponse | null>(
    null
  );
  const [whatsAppResult, setWhatsAppResult] = useState<SendWhatsAppResponse | null>(null);
  const [expiresInHours, setExpiresInHours] = useState(
    role === "pos_staff" ? "48" : "168"
  );
  const [returnQuantities, setReturnQuantities] = useState<ReturnQuantitiesState>({});
  const [activeSection, setActiveSection] = useState<InvoiceSection>("overview");
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [retryAction, setRetryAction] = useState<RetryAction>(null);
  const [isPending, startTransition] = useTransition();

  const returnableItems = useMemo(
    () =>
      invoice.items.map((item) => ({
        ...item,
        remainingQuantity: item.quantity - item.returned_quantity
      })),
    [invoice.items]
  );

  useEffect(() => {
    setReturnQuantities(
      invoice.items.reduce((acc, item) => {
        acc[item.id] ??= 0;
        return acc;
      }, {} as ReturnQuantitiesState)
    );
  }, [invoice.id, invoice.items]);

  useEffect(() => {
    if (autoPrintAttempted.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("print") !== "1") {
      return;
    }

    autoPrintAttempted.current = true;
    params.delete("print");

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);

    const timer = window.setTimeout(() => window.print(), 150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!returnKey) {
      setReturnKey(createUuid());
    }
  }, [returnKey]);

  function getActionError<T>(envelope: StandardEnvelope<T>, fallback: string) {
    return getSafeArabicErrorMessage(envelope.error, fallback);
  }

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
  }

  function buildReturnItems() {
    return returnableItems
      .map((item) => ({
        invoice_item_id: item.id,
        quantity:
          returnType === "full"
            ? item.remainingQuantity
            : (returnQuantities[item.id] ?? 0)
      }))
      .filter((item) => item.quantity > 0);
  }

  function handleCreateReceiptLink() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/receipts/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: invoice.id,
            channel: "share",
            expires_in_hours: role === "pos_staff" ? 48 : Number(expiresInHours || "168")
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
        toast.success(
          envelope.data.is_reissued
            ? "تم تحديث رابط الإيصال الحالي."
            : "تم إنشاء رابط الإيصال العام."
        );
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

        const envelope =
          (await response.json()) as StandardEnvelope<RevokeReceiptLinkResponse>;
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
    if (!invoice.customer_phone || !receiptLinkResult) {
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
            target_phone: invoice.customer_phone,
            reference_type: "invoice",
            reference_id: invoice.id,
            payload: {
              receipt_url: receiptLinkResult.receipt_url
            },
            idempotency_key: crypto.randomUUID()
          })
        });

        const envelope =
          (await response.json()) as StandardEnvelope<SendWhatsAppResponse>;
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
            invoice_id: invoice.id,
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
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/invoices/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: invoice.id,
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

  const historicalReturns = invoice.returns;

  return (
    <section className="workspace-stack transaction-page">
      <PageHeader
        title={invoice.invoice_number}
        meta={
          <div className="transaction-page__meta" aria-label="ملخص الفاتورة">
            <article className="transaction-page__meta-card stat-card">
              <span>الإجمالي</span>
              <strong>{formatCurrency(invoice.total_amount)}</strong>
            </article>
            <article className="transaction-page__meta-card stat-card">
              <span>الحالة</span>
              <strong className="badge badge--info">
                {getInvoiceStatusLabel(invoice.status)}
              </strong>
            </article>
            <article className="transaction-page__meta-card transaction-page__meta-card--safe stat-card">
              <span>الديْن المرتبط</span>
              <strong>{formatCurrency(invoice.debt_amount)}</strong>
            </article>
          </div>
        }
      />

      <div className="inline-actions">
        <Link href="/invoices" className="secondary-button btn btn--secondary">
          <ChevronLeft size={16} />
          العودة إلى الفواتير
        </Link>
        <button
          type="button"
          className="secondary-button btn btn--secondary"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          طباعة الإيصال
        </button>
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

      <div className="chip-row transaction-chip-row" aria-label="أقسام تفاصيل الفاتورة">
        <button
          type="button"
          className={
            activeSection === "overview" ? "chip-button is-selected" : "chip-button"
          }
          onClick={() => setActiveSection("overview")}
        >
          الملخص والإيصال
        </button>
        <button
          type="button"
          className={
            activeSection === "returns" ? "chip-button is-selected" : "chip-button"
          }
          onClick={() => setActiveSection("returns")}
        >
          المرتجع
        </button>
        {role === "admin" ? (
          <button
            type="button"
            className={
              activeSection === "admin" ? "chip-button is-selected" : "chip-button"
            }
            onClick={() => setActiveSection("admin")}
          >
            الإجراء الإداري
          </button>
        ) : null}
      </div>

      <div className="transaction-layout transaction-layout--detail">
        <div className="transaction-stack">
          <SectionCard
            eyebrow="تفاصيل الفاتورة"
            title={invoice.invoice_number}
            className="transaction-card"
          >
            <div className="transaction-summary-grid">
              <article className="transaction-page__meta-card stat-card">
                <span>المجموع قبل الخصم</span>
                <strong>{formatCurrency(invoice.subtotal)}</strong>
              </article>
              <article className="transaction-page__meta-card stat-card">
                <span>خصم البنود</span>
                <strong>{formatCurrency(invoice.discount_amount)}</strong>
              </article>
              {invoice.invoice_discount_amount > 0 ? (
                <article className="transaction-page__meta-card stat-card">
                  <span>
                    خصم الفاتورة (
                    {formatCompactNumber(invoice.invoice_discount_percentage)}%)
                  </span>
                  <strong>{formatCurrency(invoice.invoice_discount_amount)}</strong>
                </article>
              ) : null}
              <article className="transaction-page__meta-card transaction-page__meta-card--safe stat-card">
                <span>الإجمالي النهائي</span>
                <strong>{formatCurrency(invoice.total_amount)}</strong>
              </article>
            </div>

            <div className="info-strip">
              <span>التاريخ: {formatDate(invoice.invoice_date)}</span>
              <span>الجهاز: {invoice.pos_terminal_code ?? "غير محدد"}</span>
              <span>العميل: {invoice.customer_name ?? "بيع مباشر"}</span>
              {invoice.customer_phone ? (
                <span>الهاتف: {invoice.customer_phone}</span>
              ) : null}
            </div>

            <div className="stack-list">
              {invoice.items.map((item) => {
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

            {invoice.payments.length > 0 ? (
              <div className="stack-list">
                {invoice.payments.map((payment) => (
                  <article key={payment.id} className="list-card">
                    <div className="list-card__header">
                      <strong>{payment.account_name}</strong>
                      <span>{formatCurrency(payment.amount)}</span>
                    </div>
                    <p>
                      صافي: {formatCurrency(payment.net_amount)} | رسوم:{" "}
                      {formatCurrency(payment.fee_amount)} | التاريخ:{" "}
                      {formatDateTime(payment.created_at)}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </div>

        <div className="transaction-stack">
          {activeSection === "overview" ? (
            <SectionCard
              eyebrow="الرابط والمشاركة"
              title="إيصال ومشاركة"
              className="transaction-card"
            >
              <div className="transaction-action-cluster">
                <button
                  type="button"
                  className="secondary-button btn btn--secondary"
                  disabled={isPending}
                  onClick={handleCreateReceiptLink}
                >
                  {isPending ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <Link2 size={16} />
                  )}
                  إنشاء رابط مشاركة
                </button>

                {receiptLinkResult ? (
                  <button
                    type="button"
                    className="secondary-button btn btn--secondary"
                    disabled={isPending}
                    onClick={() => setConfirmAction("revoke-link")}
                  >
                    إلغاء الرابط
                  </button>
                ) : null}

                {receiptLinkResult ? (
                  <button
                    type="button"
                    className="secondary-button btn btn--secondary"
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
                  <a
                    href={receiptLinkResult.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button btn btn--secondary"
                  >
                    <ExternalLink size={16} />
                    فتح الرابط العام
                  </a>
                ) : null}

                {role === "admin" && invoice.customer_phone && receiptLinkResult ? (
                  <button
                    type="button"
                    className="primary-button btn btn--primary"
                    disabled={isPending}
                    onClick={handleSendWhatsApp}
                  >
                    واتساب
                  </button>
                ) : null}
              </div>

              {role === "pos_staff" ? (
                <div className="info-strip">
                  <span>مدة صلاحية الرابط الافتراضية لهذا الحساب: 48 ساعة.</span>
                </div>
              ) : (
                <label className="stack-field stack-field--min-220">
                  <span>مدة صلاحية الرابط (بالساعات)</span>
                  <input
                    className="field-input"
                    type="number"
                    min={1}
                    max={720}
                    step={1}
                    value={expiresInHours}
                    onChange={(event) => setExpiresInHours(event.target.value)}
                  />
                </label>
              )}

              {receiptLinkResult ? (
                <div className="result-card">
                  <h3>رابط الإيصال الحالي</h3>
                  <p>الرابط العام جاهز للمشاركة أو الفتح من الأزرار أعلاه.</p>
                  <p>ينتهي في: {formatDateTime(receiptLinkResult.expires_at)}</p>
                  <p>إعادة إصدار: {receiptLinkResult.is_reissued ? "نعم" : "لا"}</p>
                </div>
              ) : null}

              {whatsAppResult ? (
                <div className="result-card">
                  <h3>مشاركة واتساب</h3>
                  <p>
                    الحالة:{" "}
                    {whatsAppResult.status === "queued"
                      ? "قيد الإرسال"
                      : whatsAppResult.status}
                  </p>
                  <p>تم تجهيز نافذة المشاركة المناسبة وتسجيل العملية إداريًا.</p>
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {activeSection === "returns" ? (
            <SectionCard
              eyebrow="المرتجعات"
              title="إرجاع أو استرجاع"
              className="transaction-card"
            >
              <div className="stack-list">
                {returnableItems.map((item) => (
                  <article key={item.id} className="list-card">
                    <div className="list-card__header">
                      <strong>{item.product_name_at_time}</strong>
                      <span>{formatCompactNumber(item.remainingQuantity)} متاح</span>
                    </div>
                    <label className="stack-field">
                      <span>كمية الإرجاع</span>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        max={item.remainingQuantity}
                        step={1}
                        value={returnQuantities[item.id] ?? 0}
                        onChange={(event) =>
                          setReturnQuantities((current) => ({
                            ...current,
                            [item.id]: Math.min(
                              Math.max(Number(event.target.value), 0),
                              item.remainingQuantity
                            )
                          }))
                        }
                      />
                    </label>
                  </article>
                ))}
              </div>

              <div className="stack-form">
                <label className="stack-field">
                  <span>نوع المرتجع</span>
                  <select
                    className="field-input"
                    value={returnType}
                    onChange={(event) =>
                      setReturnType(event.target.value as "full" | "partial")
                    }
                  >
                    <option value="partial">جزئي</option>
                    <option value="full">كامل</option>
                  </select>
                </label>

                <label className="stack-field">
                  <span>حساب الإرجاع</span>
                  <select
                    className="field-input"
                    value={refundAccountId}
                    onChange={(event) => setRefundAccountId(event.target.value)}
                  >
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
                    className="field-input"
                    rows={3}
                    maxLength={500}
                    value={returnReason}
                    onChange={(event) => setReturnReason(event.target.value)}
                    placeholder="سبب الإرجاع"
                  />
                </label>

                <div className="info-strip">
                  <span>
                    يحمي النظام طلب المرتجع من الإرسال المكرر ويحدث الفاتورة والمخزون
                    والحساب المرتبط تلقائيًا.
                  </span>
                </div>

                <button
                  type="button"
                  className="primary-button btn btn--primary"
                  disabled={isPending || !returnReason.trim() || !returnKey}
                  onClick={() => setConfirmAction("create-return")}
                >
                  {isPending ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <RotateCcw size={16} />
                  )}
                  تنفيذ المرتجع
                </button>
              </div>

              {historicalReturns.length > 0 ? (
                <div className="stack-list">
                  {historicalReturns.map((entry: InvoiceReturnOption) => (
                    <article key={entry.id} className="result-card">
                      <h3>{entry.return_number}</h3>
                      <p>النوع: {entry.return_type === "full" ? "كامل" : "جزئي"}</p>
                      <p>الإجمالي: {formatCurrency(entry.total_amount)}</p>
                      <p>السبب: {entry.reason}</p>
                      <p>حساب الإرجاع: {entry.refund_account_name ?? "غير محدد"}</p>
                      <p>البنود: {summarizeReturnItems(entry.items)}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              {returnResult ? (
                <div className="result-card">
                  <h3>{returnResult.return_number}</h3>
                  <p>الإجمالي: {formatCurrency(returnResult.total_amount)}</p>
                  <p>المسترد نقدًا: {formatCurrency(returnResult.refunded_amount)}</p>
                  <p>تخفيض الدين: {formatCurrency(returnResult.debt_reduction)}</p>
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {activeSection === "admin" ? (
            role === "admin" ? (
              <SectionCard
                eyebrow="الإجراء الإداري"
                title="إلغاء الفاتورة"
                className="transaction-card"
              >
                <div className="info-strip">
                  <span>
                    الرجوع إلى سياسة المتجر قبل تنفيذ الإلغاء الإداري.
                  </span>
                </div>

                <div className="stack-form">
                  <label className="stack-field">
                    <span>سبب الإلغاء</span>
                    <textarea
                      className="field-input"
                      rows={3}
                      maxLength={500}
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="سبب الإلغاء"
                    />
                  </label>

                  <button
                    type="button"
                    className="secondary-button btn btn--secondary"
                    disabled={isPending || !cancelReason.trim()}
                    onClick={() => setConfirmAction("cancel-invoice")}
                  >
                    {isPending ? (
                      <Loader2 className="spin" size={16} />
                    ) : (
                      <ShieldAlert size={16} />
                    )}
                    تنفيذ الإلغاء الإداري
                  </button>
                </div>

                {cancelResult ? (
                  <div className="result-card">
                    <h3>تم الإلغاء بنجاح</h3>
                    <p>
                      عدد القيود المعكوسة:{" "}
                      {formatCompactNumber(cancelResult.reversed_entries_count)}
                    </p>
                  </div>
                ) : null}
              </SectionCard>
            ) : (
              <SectionCard
                eyebrow="الإجراء الإداري"
                title="مقيد"
                className="transaction-card"
              >
                <div className="empty-panel transaction-empty-panel">
                  <FileText size={18} />
                  <p>الإلغاء والتعديل الإداريان يبقيان محصورين بالحساب الإداري فقط.</p>
                </div>
              </SectionCard>
            )
          ) : null}
        </div>
      </div>

      <ConfirmationDialog
        open={confirmAction === "revoke-link"}
        title="إلغاء رابط الإيصال"
        confirmLabel="إلغاء الرابط"
        onConfirm={handleRevokeReceiptLink}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
        tone="danger"
      />

      <ConfirmationDialog
        open={confirmAction === "create-return"}
        title="تأكيد إنشاء المرتجع"
        confirmLabel="تنفيذ المرتجع"
        onConfirm={handleCreateReturn}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
      />

      <ConfirmationDialog
        open={confirmAction === "cancel-invoice"}
        title="تأكيد الإلغاء الإداري"
        confirmLabel="تنفيذ الإلغاء"
        onConfirm={handleCancelInvoice}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
        tone="danger"
      />
    </section>
  );
}
