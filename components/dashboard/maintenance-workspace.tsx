"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent
} from "react";
import { Loader2, Search, ShieldCheck, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { MobileBottomSheet } from "@/components/ui/mobile-bottom-sheet";
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
  | {
      kind: "update";
      jobId: string;
      nextStatus: "in_progress" | "ready" | "delivered" | "cancelled";
    };

type MaintenanceSection = "overview" | "create" | "jobs";

const MAINTENANCE_TABS = [
  { key: "overview", label: "الملخص" },
  { key: "create", label: "طلب جديد" },
  { key: "jobs", label: "أوامر الصيانة" }
] as const satisfies ReadonlyArray<{ key: MaintenanceSection; label: string }>;

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
  const [createResult, setCreateResult] = useState<MaintenanceCreateResponse | null>(
    null
  );
  const [updateResult, setUpdateResult] = useState<MaintenanceUpdateResponse | null>(
    null
  );
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<MaintenanceRetryAction | null>(null);
  const [confirmCancelJobId, setConfirmCancelJobId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<MaintenanceSection>("overview");
  const [queueSearch, setQueueSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? "");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isJobSheetOpen, setIsJobSheetOpen] = useState(false);
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
  const tabRefs = useRef<Record<MaintenanceSection, HTMLButtonElement | null>>({
    overview: null,
    create: null,
    jobs: null
  });
  const selectedJobTriggerRef = useRef<HTMLButtonElement | null>(null);

  const maintenanceAccountOptions = useMemo(
    () => maintenanceAccounts.filter((account) => account.module_scope === "maintenance"),
    [maintenanceAccounts]
  );

  useEffect(() => {
    setJobDrafts((current) => {
      const next = { ...current };

      for (const job of jobs) {
        if (!next[job.id]) {
          next[job.id] = {
            final_amount: job.final_amount != null ? String(job.final_amount) : "",
            payment_account_id:
              job.payment_account_id ?? maintenanceAccounts[0]?.id ?? "",
            notes: job.notes ?? ""
          };
        }
      }

      return next;
    });
  }, [jobs, maintenanceAccounts]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(query.matches);

    updateViewport();
    query.addEventListener("change", updateViewport);
    return () => query.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (activeSection !== "jobs") {
      setIsJobSheetOpen(false);
    }
  }, [activeSection]);

  const filteredJobs = useMemo(() => {
    const normalized = queueSearch.trim().toLowerCase();
    if (!normalized) {
      return jobs;
    }

    return jobs.filter((job) => {
      const haystack = [
        job.job_number,
        job.customer_name,
        job.device_type,
        job.issue_description,
        getStatusLabel(job.status)
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [jobs, queueSearch]);

  useEffect(() => {
    if (filteredJobs.length === 0) {
      setSelectedJobId("");
      setIsJobSheetOpen(false);
      return;
    }

    if (!selectedJobId || !filteredJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
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

        const envelope =
          (await response.json()) as StandardEnvelope<MaintenanceCreateResponse>;
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
        setActiveSection("jobs");
        clearActionFeedback();
        toast.success("تم إنشاء أمر الصيانة بنجاح.");
        router.refresh();
      })();
    });
  }

  async function handleUpdateJob(
    jobId: string,
    nextStatus: "in_progress" | "ready" | "delivered" | "cancelled"
  ) {
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

        const envelope =
          (await response.json()) as StandardEnvelope<MaintenanceUpdateResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), { kind: "update", jobId, nextStatus });
          return;
        }

        setUpdateResult(envelope.data);
        clearActionFeedback();
        if (nextStatus === "cancelled") {
          setConfirmCancelJobId(null);
        }
        toast.success(
          `تم تحديث أمر الصيانة إلى "${getStatusLabel(envelope.data.status)}".`
        );
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

  function activateSection(section: MaintenanceSection) {
    setActiveSection(section);
    if (section !== "jobs") {
      setIsJobSheetOpen(false);
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentSection: MaintenanceSection
  ) {
    const currentIndex = MAINTENANCE_TABS.findIndex((tab) => tab.key === currentSection);
    if (currentIndex === -1) {
      return;
    }

    const focusSection = (index: number) => {
      const nextSection = MAINTENANCE_TABS[index]?.key;
      if (nextSection) {
        tabRefs.current[nextSection]?.focus();
      }
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusSection((currentIndex + 1) % MAINTENANCE_TABS.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusSection(
          (currentIndex - 1 + MAINTENANCE_TABS.length) % MAINTENANCE_TABS.length
        );
        break;
      case "Home":
        event.preventDefault();
        focusSection(0);
        break;
      case "End":
        event.preventDefault();
        focusSection(MAINTENANCE_TABS.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        activateSection(currentSection);
        break;
      default:
        break;
    }
  }

  function handleJobSelection(jobId: string, trigger: HTMLButtonElement | null) {
    setSelectedJobId(jobId);
    selectedJobTriggerRef.current = trigger;

    if (isMobileViewport) {
      setIsJobSheetOpen(true);
    }
  }

  function renderJobDetail() {
    if (!selectedJob) {
      return (
        <div className="empty-panel maintenance-page__queue-empty">
          <Wrench size={20} />
          <h3>اختر أمر صيانة لعرض التفاصيل</h3>
        </div>
      );
    }

    const draft = jobDrafts[selectedJob.id] ?? {
      final_amount:
        selectedJob.final_amount != null ? String(selectedJob.final_amount) : "",
      payment_account_id:
        selectedJob.payment_account_id ?? maintenanceAccountOptions[0]?.id ?? "",
      notes: selectedJob.notes ?? ""
    };

    return (
      <>
        <div className="section-heading">
          <div>
            <p className="eyebrow">تفاصيل الطلب</p>
            <h2>{selectedJob.job_number}</h2>
          </div>
          <Wrench size={18} />
        </div>

        <div className="info-strip">
          <span>{selectedJob.customer_name}</span>
          <span>{selectedJob.device_type}</span>
          <span>{getStatusLabel(selectedJob.status)}</span>
        </div>

        <div className="info-strip">
          <span>تاريخ الطلب: {formatDate(selectedJob.job_date)}</span>
          <span>التقديري: {formatCurrency(selectedJob.estimated_cost ?? 0)}</span>
          <span>النهائي: {formatCurrency(selectedJob.final_amount ?? 0)}</span>
        </div>

        <article className="list-card maintenance-page__job-summary">
          <div className="list-card__header">
            <strong>العطل المبلغ عنه</strong>
            <span className="status-pill badge badge--neutral">
              {getStatusLabel(selectedJob.status)}
            </span>
          </div>
          <p>{selectedJob.issue_description}</p>
          {selectedJob.payment_account_name ? (
            <p className="workspace-footnote">
              حساب الصيانة: {selectedJob.payment_account_name}
            </p>
          ) : null}
          {selectedJob.delivered_at ? (
            <p className="workspace-footnote">
              تم التسليم: {formatDate(selectedJob.delivered_at)}
            </p>
          ) : null}
        </article>

        {selectedJob.status === "ready" ? (
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
                    [selectedJob.id]: {
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
                    [selectedJob.id]: {
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

        {selectedJob.status !== "delivered" && selectedJob.status !== "cancelled" ? (
          <label className="stack-field">
            <span>ملاحظات التحديث</span>
            <input
              type="text"
              value={draft.notes}
              onChange={(event) =>
                setJobDrafts((current) => ({
                  ...current,
                  [selectedJob.id]: {
                    ...draft,
                    notes: event.target.value
                  }
                }))
              }
            />
          </label>
        ) : null}

        <div className="chip-row maintenance-page__job-actions">
          {selectedJob.status === "new" ? (
            <button
              type="button"
              className="chip-button"
              disabled={isPending}
              onClick={() => void handleUpdateJob(selectedJob.id, "in_progress")}
            >
              بدء التنفيذ
            </button>
          ) : null}

          {selectedJob.status === "in_progress" ? (
            <button
              type="button"
              className="chip-button"
              disabled={isPending}
              onClick={() => void handleUpdateJob(selectedJob.id, "ready")}
            >
              جاهز للتسليم
            </button>
          ) : null}

          {selectedJob.status === "ready" ? (
            <button
              type="button"
              className="chip-button is-selected"
              disabled={isPending}
              onClick={() => void handleUpdateJob(selectedJob.id, "delivered")}
            >
              تسليم وتحصيل
            </button>
          ) : null}
        </div>

        {role === "admin" &&
        selectedJob.status !== "delivered" &&
        selectedJob.status !== "cancelled" ? (
          <div className="maintenance-page__job-danger">
            <button
              type="button"
              className="secondary-button"
              disabled={isPending}
              onClick={() => setConfirmCancelJobId(selectedJob.id)}
            >
              إلغاء الأمر
            </button>
          </div>
        ) : null}

        {updateResult?.job_id === selectedJob.id ? (
          <div className="result-card">
            <h3>آخر تحديث</h3>
            <p>أمر الصيانة: {updateResult.job_number}</p>
            <p>الحالة: {getStatusLabel(updateResult.status)}</p>
            <p>المبلغ النهائي: {formatCurrency(updateResult.final_amount)}</p>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className="operational-page maintenance-page">
      <PageHeader
        title="الصيانة الأساسية"
        actions={
          <div className="transaction-action-cluster">
            <button
              type="button"
              className="primary-button"
              onClick={() => activateSection("create")}
            >
              طلب جديد
            </button>
          </div>
        }
      />

      <div className="operational-page__meta-grid">
        <article className="operational-page__meta-card">
          <span className="operational-page__meta-label">أوامر مفتوحة</span>
          <strong className="operational-page__meta-value">
            {formatCompactNumber(summary.open_count)}
          </strong>
        </article>
        <article className="operational-page__meta-card">
          <span className="operational-page__meta-label">جاهزة للتسليم</span>
          <strong className="operational-page__meta-value">
            {formatCompactNumber(summary.ready_count)}
          </strong>
        </article>
        <article className="operational-page__meta-card">
          <span className="operational-page__meta-label">إيراد الصيانة</span>
          <strong className="operational-page__meta-value">
            {formatCurrency(summary.delivered_revenue)}
          </strong>
        </article>
      </div>

      <div
        className="operational-section-nav maintenance-page__tabs nav-tabs"
        aria-label="أقسام شاشة الصيانة"
      >
        {MAINTENANCE_TABS.map((tab) => (
          <button
            key={tab.key}
            ref={(node) => {
              tabRefs.current[tab.key] = node;
            }}
            type="button"
            id={`maintenance-tab-${tab.key}`}
            aria-pressed={activeSection === tab.key}
            aria-controls={`maintenance-panel-${tab.key}`}
            className={`maintenance-page__tab nav-tab ${activeSection === tab.key ? "is-active chip-button is-selected" : "chip-button"}`}
            onClick={() => activateSection(tab.key)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
          >
            {tab.label}
          </button>
        ))}
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

      <section
        id="maintenance-panel-overview"
        className="maintenance-page__tab-panel"
        role="region"
        aria-labelledby="maintenance-tab-overview"
        hidden={activeSection !== "overview"}
      >
        <div className="operational-layout operational-layout--wide">
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
                    <p className="workspace-footnote">
                      الرصيد الحالي: {formatCurrency(account.current_balance)}
                    </p>
                  ) : (
                    <p className="workspace-footnote">
                      يتم إخفاء الرصيد بحسب الحزمة المسندة.
                    </p>
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
        </div>
      </section>

      <section
        id="maintenance-panel-create"
        className="maintenance-page__tab-panel"
        role="region"
        aria-labelledby="maintenance-tab-create"
        hidden={activeSection !== "create"}
      >
        <div className="operational-layout operational-layout--wide">
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
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </label>

              <label className="stack-field">
                <span>هاتف العميل</span>
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                />
              </label>

              <label className="stack-field">
                <span>نوع الجهاز</span>
                <input
                  value={deviceType}
                  onChange={(event) => setDeviceType(event.target.value)}
                />
              </label>

              <label className="stack-field">
                <span>وصف العطل</span>
                <textarea
                  rows={3}
                  value={issueDescription}
                  onChange={(event) => setIssueDescription(event.target.value)}
                />
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
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>

              <button
                type="button"
                className="primary-button"
                disabled={
                  isPending ||
                  !customerName.trim() ||
                  !deviceType.trim() ||
                  !issueDescription.trim()
                }
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
      </section>

      <section
        id="maintenance-panel-jobs"
        className="maintenance-page__tab-panel"
        role="region"
        aria-labelledby="maintenance-tab-jobs"
        hidden={activeSection !== "jobs"}
      >
        <div className="maintenance-page__split">
          <section className="workspace-panel operational-sidebar maintenance-page__queue maintenance-page__split-primary">
            <div className="section-heading">
              <div>
                <p className="eyebrow">سير العمل</p>
                <h2>متابعة أوامر الصيانة</h2>
              </div>
              <Wrench size={18} />
            </div>

            <div className="workspace-search maintenance-page__queue-search">
              <Search size={18} />
              <input
                type="search"
                placeholder="ابحث برقم الطلب، العميل، الجهاز، الحالة"
                aria-label="بحث أوامر الصيانة"
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
              />
              {queueSearch ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setQueueSearch("")}
                >
                  مسح
                </button>
              ) : null}
            </div>

            {jobs.length === 0 ? (
              <div className="empty-panel maintenance-page__queue-empty">
                <Wrench size={20} />
                <h3>لا توجد أوامر صيانة مسجلة حتى الآن</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => activateSection("create")}
                >
                  طلب جديد
                </button>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="empty-panel maintenance-page__queue-empty">
                <Search size={20} />
                <h3>لا توجد نتائج مطابقة</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setQueueSearch("")}
                >
                  مسح البحث
                </button>
              </div>
            ) : (
              <div className="stack-list maintenance-page__queue-list">
                {filteredJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    className={
                      job.id === selectedJobId
                        ? "list-card list-card--interactive is-selected maintenance-page__queue-card"
                        : "list-card list-card--interactive maintenance-page__queue-card"
                    }
                    onClick={(event) => handleJobSelection(job.id, event.currentTarget)}
                  >
                    <div className="list-card__header">
                      <strong>{job.job_number}</strong>
                      <span className="status-pill badge badge--neutral">
                        {getStatusLabel(job.status)}
                      </span>
                    </div>
                    <div className="maintenance-page__queue-meta">
                      <span>{job.customer_name}</span>
                      <span>{job.device_type}</span>
                    </div>
                    <p className="workspace-footnote">{job.issue_description}</p>
                    <p className="workspace-footnote">{formatDate(job.job_date)}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {!isMobileViewport ? (
            <section className="workspace-panel maintenance-page__job-detail maintenance-page__split-secondary">
              {renderJobDetail()}
            </section>
          ) : null}
        </div>

        <MobileBottomSheet
          isOpen={isMobileViewport && isJobSheetOpen && Boolean(selectedJob)}
          onClose={() => setIsJobSheetOpen(false)}
          title={selectedJob?.job_number ?? "أوامر الصيانة"}
          description="راجع بيانات الطلب وحدّث الحالة أو التحصيل من هذه اللوحة."
          height="50vh"
          content={
            <section className="maintenance-page__job-detail maintenance-page__job-detail-sheet">
              {renderJobDetail()}
            </section>
          }
          returnFocusRef={selectedJobTriggerRef}
        />
      </section>

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
