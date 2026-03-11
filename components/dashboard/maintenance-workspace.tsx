"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, ShieldCheck, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

  async function handleCreateJob() {
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
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        setCreateResult(envelope.data);
        setCustomerName("");
        setCustomerPhone("");
        setDeviceType("");
        setIssueDescription("");
        setEstimatedCost("");
        setNotes("");
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
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        setUpdateResult(envelope.data);
        toast.success(`تم تحديث أمر الصيانة إلى "${getStatusLabel(envelope.data.status)}".`);
        router.refresh();
      })();
    });
  }

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-07-T04</p>
          <h1>الصيانة الأساسية</h1>
          <p className="workspace-lead">
            إنشاء أوامر الصيانة، متابعة دورة الحالة حتى التسليم، وربط الإيراد بحسابات الصيانة المنفصلة دون خلطها
            بحسابات المبيعات العامة.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Maintenance Summary</p>
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
                  <span>{account.type}</span>
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

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">New Job</p>
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
      </div>

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workflow</p>
            <h2>متابعة أوامر الصيانة</h2>
          </div>
          <Wrench size={18} />
        </div>

        <div className="stack-list">
          {jobs.length === 0 ? (
            <div className="empty-panel">
              <p>لا توجد أوامر صيانة مسجلة حتى الآن.</p>
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
                        onClick={() => void handleUpdateJob(job.id, "cancelled")}
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
      </section>
    </section>
  );
}
