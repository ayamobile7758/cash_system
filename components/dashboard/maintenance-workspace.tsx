"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, ShieldCheck, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import type {
  MaintenanceAccountOption,
  MaintenanceJobOption,
  MaintenanceSummary
} from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/utils/formatters";

type MaintenanceWorkspaceProps = {
  role: "admin" | "pos_staff";
  maintenanceAccounts: MaintenanceAccountOption[];
  jobs: MaintenanceJobOption[];
  summary: MaintenanceSummary;
};

type MaintenanceCreateResponse = {
  job_id: string;
  job_number: string;
  status: string;
};

type MaintenanceUpdateResponse = {
  job_id: string;
  job_number: string;
  status: string;
  final_amount: number;
  ledger_entry_id: string | null;
};

type JobDraftState = Record<
  string,
  {
    final_amount: string;
    payment_account_id: string;
    notes: string;
  }
>;
type MaintenanceRetryAction =
  | { kind: "create" }
  | { kind: "update"; jobId: string; nextStatus: "in_progress" | "ready" | "delivered" | "cancelled" };
type MaintenanceSection = "overview" | "create" | "jobs";

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
}

function getStatusLabel(status: string) {
  switch (status) {
    case "new":
      return "جديد";
    case "in_progress":
      return "قيد الصيانة";
    case "ready":
      return "جاهز للتسليم";
    case "delivered":
      return "مسلّم";
    case "cancelled":
      return "ملغى";
    default:
      return status;
  }
}

function getAccountTypeLabel(type: string) {
  switch (type) {
    case "cash":
      return "نقدي";
    case "bank":
      return "بنكي";
    case "wallet":
      return "محفظة";
    case "receivable":
      return "مدين";
    case "payable":
      return "دائن";
    default:
      return type;
  }
}

export function MaintenanceWorkspace({
  role,
  maintenanceAccounts,
  jobs,
  summary
}: MaintenanceWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [notes, setNotes] = useState("");
  const [createResult, setCreateResult] = useState<MaintenanceCreateResponse | null>(null);
  const [updateResult, setUpdateResult] = useState<MaintenanceUpdateResponse | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<MaintenanceRetryAction | null>(null);
  const [confirmCancelJobId, setConfirmCancelJobId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<MaintenanceSection>("overview");
  const [jobDrafts, setJobDrafts] = useState<JobDraftState>(() =>
    Object.fromEntries(
      jobs.map((job) => [
        job.id,
        {
          final_amount: job.final_amount != null ? String(job.final_amount) : "",
          payment_account_id: job.payment_account_id ?? maintenanceAccounts[0]?.id ?? "",
          notes: job.notes ?? ""
        }
      ])
    )
  );

  const maintenanceAccountOptions = useMemo(
    () => maintenanceAccounts.filter((account) => account.module_scope === "maintenance"),
    [maintenanceAccounts]
  );

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
  }

  function failAction(message: string, action: MaintenanceRetryAction) {
    setActionErrorMessage(message);
    setRetryAction(action);
    toast.error(message);
  }

  async function handleCreateJob() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: customerName,
            customer_phone: customerPhone || undefined,
            device_type: deviceType,
            issue_description: issueDescription,
            estimated_cost: estimatedCost ? Number(estimatedCost) : undefined,
            notes: notes || undefined,
            idempotency_key: crypto.randomUUID()
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<MaintenanceCreateResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), { kind: "create" });
          return;
        }

        setCreateResult(envelope.data);
        setCustomerName("");
        setCustomerPhone("");
        setDeviceType("");
        setIssueDescription("");
        setEstimatedCost("");
        setNotes("");
        clearActionFeedback();
        toast.success("تم إنشاء أمر الصيانة بنجاح.");
        router.refresh();
      })();
    });
  }

  async function handleUpdateJob(jobId: string, nextStatus: "in_progress" | "ready" | "delivered" | "cancelled") {
    const draft = jobDrafts[jobId] ?? {
      final_amount: "",
      payment_account_id: maintenanceAccountOptions[0]?.id ?? "",
      notes: ""
    };

    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/maintenance/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            final_amount: draft.final_amount ? Number(draft.final_amount) : undefined,
            payment_account_id: draft.payment_account_id || undefined,
            notes: draft.notes || undefined
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<MaintenanceUpdateResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), { kind: "update", jobId, nextStatus });
          return;
        }

        setUpdateResult(envelope.data);
        clearActionFeedback();
        if (nextStatus === "cancelled") {
          setConfirmCancelJobId(null);
        }
        toast.success(`تم تحديث أمر الصيانة إلى "${getStatusLabel(envelope.data.status)}".`);
        router.refresh();
      })();
    });
  }

  function retryLastAction() {
    if (!retryAction) {
      return;
    }

    if (retryAction.kind === "create") {
      void handleCreateJob();
      return;
    }

    void handleUpdateJob(retryAction.jobId, retryAction.nextStatus);
  }

  return (
    <section className="operational-page">
      <PageHeader
        title="الصيانة الأساسية"
      />

      <div className="operational-page__meta-grid">
        <article className="operational-page__meta-card">
          <span className="operational-page__meta-label">أوامر مفتوحة</span>
          <strong className="operational-page__meta-value">{formatCompactNumber(summary.open_count)}</strong>
        </article>
        <article className="operational-page__meta-card">
          <span className="operational-page__meta-label">جاهزة للتسليم</span>
          <strong className="operational-page__meta-value">{formatCompactNumber(summary.ready_count)}</strong>
        </article>
        <article className="operational-page__meta-card">
          <span className="operational-page__meta-label">إيراد الصيانة</span>
          <strong className="operational-page__meta-value">{formatCurrency(summary.delivered_revenue)}</strong>
        </article>
      </div>

      <div className="operational-section-nav" aria-label="أقسام شاشة الصيانة">
        <button
          type="button"
          className={activeSection === "overview" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("overview")}
        >
          الملخص
        </button>
        <button
          type="button"
          className={activeSection === "create" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("create")}
        >
          طلب جديد
        </button>
        <button
          type="button"
          className={activeSection === "jobs" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("jobs")}
        >
          أوامر الصيانة
        </button>
      </div>

      {isPending ? (
        <StatusBanner
          variant="info"
          title="جاري تنفيذ الإجراء"
          message="انتظر حتى يكتمل تحديث أوامر الصيانة الحالية قبل بدء إجراء جديد."
        />
      ) : null}

      {actionErrorMessage ? (
        <StatusBanner
          variant="danger"
          title="تعذر إكمال الإجراء"
          message={actionErrorMessage}
          actionLabel={retryAction ? "إعادة المحاولة" : undefined}
          onAction={retryAction ? retryLastAction : undefined}
          onDismiss={clearActionFeedback}
        />
      ) : null}

      {activeSection === "overview" ? <div className="operational-layout operational-layout--wide">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ملخص الصيانة</p>
              <h2>ملخص التشغيل</h2>
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="inline-stats">
            <article className="stat-card">
              <span>أوامر مفتوحة</span>
              <strong>{formatCompactNumber(summary.open_count)}</strong>
            </article>
            <article className="stat-card">
              <span>جاهز للتسليم</span>
              <strong>{formatCompactNumber(summary.ready_count)}</strong>
            </article>
            <article className="stat-card">
              <span>مسلّم</span>
              <strong>{formatCompactNumber(summary.delivered_count)}</strong>
            </article>
            <article className="stat-card">
              <span>إيراد الصيانة</span>
              <strong>{formatCurrency(summary.delivered_revenue)}</strong>
            </article>
          </div>

          <div className="stack-list">
            {maintenanceAccountOptions.map((account) => (
                <article key={account.id} className="list-card">
                  <div className="list-card__header">
                    <strong>{account.name}</strong>
                    <span>{getAccountTypeLabel(account.type)}</span>
                  </div>
                {account.current_balance != null ? (
                  <p className="workspace-footnote">الرصيد الحالي: {formatCurrency(account.current_balance)}</p>
                ) : (
                  <p className="workspace-footnote">يتم إخفاء الرصيد بحسب الحزمة المسندة.</p>
                )}
              </article>
            ))}
          </div>

          {updateResult ? (
            <div className="result-card">
              <h3>آخر تحديث</h3>
              <p>أمر الصيانة: {updateResult.job_number}</p>
              <p>الحالة: {getStatusLabel(updateResult.status)}</p>
              <p>المبلغ النهائي: {formatCurrency(updateResult.final_amount)}</p>
            </div>
          ) : null}
        </section>
      </div> : null}

      {activeSection === "create" ? <div className="operational-layout operational-layout--wide">
        <section className="workspace-panel operational-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">طلب جديد</p>
              <h2>أمر صيانة جديد</h2>
            </div>
            <Wrench size={18} />
          </div>

          <div className="stack-form">
            <label className="stack-field">
              <span>اسم العميل</span>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            </label>

            <label className="stack-field">
              <span>هاتف العميل</span>
              <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
            </label>

            <label className="stack-field">
              <span>نوع الجهاز</span>
              <input value={deviceType} onChange={(event) => setDeviceType(event.target.value)} />
            </label>

            <label className="stack-field">
              <span>وصف العطل</span>
              <textarea rows={3} value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} />
            </label>

            <label className="stack-field">
              <span>التكلفة التقديرية</span>
              <input
                type="number"
                min={0}
                step="0.001"
                value={estimatedCost}
                onChange={(event) => setEstimatedCost(event.target.value)}
              />
            </label>

            <label className="stack-field">
              <span>ملاحظات</span>
              <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>

            <button
              type="button"
              className="primary-button"
              disabled={isPending || !customerName.trim() || !deviceType.trim() || !issueDescription.trim()}
              onClick={() => void handleCreateJob()}
            >
              {isPending ? <Loader2 className="spin" size={16} /> : "إنشاء أمر الصيانة"}
            </button>
          </div>

          {createResult ? (
            <div className="result-card">
              <h3>تم إنشاء الأمر</h3>
              <p>رقم الأمر: {createResult.job_number}</p>
              <p>الحالة: {getStatusLabel(createResult.status)}</p>
            </div>
          ) : null}
        </section>
      </div> : null}

      {activeSection === "jobs" ? <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">سير العمل</p>
            <h2>متابعة أوامر الصيانة</h2>
          </div>
          <Wrench size={18} />
        </div>

        <div className="stack-list">
          {jobs.length === 0 ? (
            <div className="empty-panel">
              <p>لا توجد أوامر صيانة مسجلة حتى الآن. أنشئ أول طلب صيانة ليظهر هنا.</p>
            </div>
          ) : (
            jobs.map((job) => {
              const draft = jobDrafts[job.id] ?? {
                final_amount: job.final_amount != null ? String(job.final_amount) : "",
                payment_account_id: job.payment_account_id ?? maintenanceAccountOptions[0]?.id ?? "",
                notes: job.notes ?? ""
              };

              return (
                <article key={job.id} className="list-card">
                  <div className="list-card__header">
                    <strong>{job.job_number}</strong>
                    <span>{getStatusLabel(job.status)}</span>
                  </div>

                  <p>
                    {job.customer_name} - {job.device_type}
                  </p>
                  <p className="workspace-footnote">{job.issue_description}</p>
                  <p className="workspace-footnote">
                    {formatDate(job.job_date)}
                    {job.delivered_at ? ` • تم التسليم ${formatDate(job.delivered_at)}` : ""}
                  </p>
                  <p className="workspace-footnote">
                    تقديري: {formatCurrency(job.estimated_cost ?? 0)} | نهائي: {formatCurrency(job.final_amount ?? 0)}
                  </p>
                  {job.payment_account_name ? (
                    <p className="workspace-footnote">حساب الصيانة: {job.payment_account_name}</p>
                  ) : null}

                  {job.status === "ready" ? (
                    <div className="inline-form-grid">
                      <label className="stack-field">
                        <span>المبلغ النهائي</span>
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          value={draft.final_amount}
                          onChange={(event) =>
                            setJobDrafts((current) => ({
                              ...current,
                              [job.id]: {
                                ...draft,
                                final_amount: event.target.value
                              }
                            }))
                          }
                        />
                      </label>

                      <label className="stack-field">
                        <span>حساب التحصيل</span>
                        <select
                          value={draft.payment_account_id}
                          onChange={(event) =>
                            setJobDrafts((current) => ({
                              ...current,
                              [job.id]: {
                                ...draft,
                                payment_account_id: event.target.value
                              }
                            }))
                          }
                        >
                          {maintenanceAccountOptions.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}

                  {job.status !== "delivered" && job.status !== "cancelled" ? (
                    <label className="stack-field">
                      <span>ملاحظات التحديث</span>
                      <input
                        type="text"
                        value={draft.notes}
                        onChange={(event) =>
                          setJobDrafts((current) => ({
                            ...current,
                            [job.id]: {
                              ...draft,
                              notes: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                  ) : null}

                  <div className="chip-row">
                    {job.status === "new" ? (
                      <button
                        type="button"
                        className="chip-button"
                        disabled={isPending}
                        onClick={() => void handleUpdateJob(job.id, "in_progress")}
                      >
                        بدء التنفيذ
                      </button>
                    ) : null}

                    {job.status === "in_progress" ? (
                      <button
                        type="button"
                        className="chip-button"
                        disabled={isPending}
                        onClick={() => void handleUpdateJob(job.id, "ready")}
                      >
                        جاهز للتسليم
                      </button>
                    ) : null}

                    {job.status === "ready" ? (
                      <button
                        type="button"
                        className="chip-button is-selected"
                        disabled={isPending}
                        onClick={() => void handleUpdateJob(job.id, "delivered")}
                      >
                        تسليم وتحصيل
                      </button>
                    ) : null}

                    {role === "admin" && job.status !== "delivered" && job.status !== "cancelled" ? (
                      <button
                        type="button"
                        className="chip-button"
                        disabled={isPending}
                        onClick={() => setConfirmCancelJobId(job.id)}
                      >
                        إلغاء الأمر
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section> : null}

      <ConfirmationDialog
        open={Boolean(confirmCancelJobId)}
        title="تأكيد إلغاء أمر الصيانة"
        confirmLabel="تأكيد الإلغاء"
        cancelLabel="الرجوع"
        tone="danger"
        isPending={isPending}
        onCancel={() => setConfirmCancelJobId(null)}
        onConfirm={() => {
          if (!confirmCancelJobId) {
            return;
          }

          void handleUpdateJob(confirmCancelJobId, "cancelled");
        }}
      />
    </section>
  );
}
