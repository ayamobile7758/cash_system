"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { AlertTriangle, ChevronDown, Download, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import type {
  PortabilityImportJobOption,
  PortabilityPackageOption,
  PortabilityRestoreDrillOption
} from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatDate } from "@/lib/utils/formatters";

type PortabilityWorkspaceProps = {
  packages: PortabilityPackageOption[];
  importJobs: PortabilityImportJobOption[];
  restoreDrills: PortabilityRestoreDrillOption[];
};

type ExportResponse = {
  package_id: string;
  download_url: string;
  expires_at: string;
};

type ImportResponse = {
  job_id: string;
  mode: "dry_run" | "commit";
  rows_total: number;
  rows_valid: number;
  rows_invalid: number;
  rows_committed?: number;
  validation_errors?: Array<{ row_number: number; field: string; message: string }>;
};

type RestoreResponse = {
  drill_id: string;
  status: "completed";
  drift_count: number;
  rto_seconds: number;
};

type RevokeResponse = {
  package_id: string;
  status: "revoked";
  revoked_at: string;
};

type RetryAction = "create-export" | "dry-run-import" | "commit-import" | "restore-drill" | "revoke-package" | null;
type ConfirmAction =
  | { type: "commit-import"; jobId: string }
  | { type: "revoke-package"; packageId: string }
  | null;
type PortabilitySection = "export" | "import" | "restore" | "history";
type PortabilityHistoryAccordion = "packages" | "operations";
type PortabilityAccordionState = Record<PortabilityHistoryAccordion, boolean>;

const PORTABILITY_TABS = [
  { key: "export", label: "إنشاء الحزم" },
  { key: "import", label: "فحص الاستيراد" },
  { key: "restore", label: "الاستعادة التجريبية" },
  { key: "history", label: "السجل الأخير" }
] as const satisfies ReadonlyArray<{ key: PortabilitySection; label: string }>;

function getApiMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذرت العملية.";
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ready":
      return "جاهزة";
    case "revoked":
      return "مبطلة";
    case "expired":
      return "منتهية";
    case "dry_run_ready":
      return "الفحص الأولي جاهز";
    case "dry_run_failed":
      return "الفحص الأولي لم يكتمل";
    case "committed":
      return "تم الاستيراد";
    case "started":
      return "قيد التشغيل";
    case "completed":
      return "مكتمل";
    case "failed":
      return "فشل";
    default:
      return status;
  }
}

function createAccordionState(
  overrides: Partial<PortabilityAccordionState> = {}
): PortabilityAccordionState {
  return {
    packages: true,
    operations: true,
    ...overrides
  };
}

export function PortabilityWorkspace({
  packages,
  importJobs,
  restoreDrills
}: PortabilityWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [packageType, setPackageType] = useState<"json" | "csv">("json");
  const [scope, setScope] = useState<"products" | "reports" | "customers" | "backup">("products");
  const [activeOnly, setActiveOnly] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dryRunResult, setDryRunResult] = useState<ImportResponse | null>(null);
  const [lastImport, setLastImport] = useState<ImportResponse | null>(null);
  const [selectedBackupId, setSelectedBackupId] = useState("");
  const [restoreAcknowledged, setRestoreAcknowledged] = useState(false);
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false);
  const [lastExport, setLastExport] = useState<ExportResponse | null>(null);
  const [lastRestore, setLastRestore] = useState<RestoreResponse | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<RetryAction>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [activeSection, setActiveSection] = useState<PortabilitySection>("export");
  const [expandedAccordions, setExpandedAccordions] = useState<PortabilityAccordionState>(() => createAccordionState());
  const tabRefs = useRef<Record<PortabilitySection, HTMLButtonElement | null>>({
    export: null,
    import: null,
    restore: null,
    history: null
  });

  const backupPackages = useMemo(
    () => packages.filter((item) => item.scope === "backup" && item.status === "ready" && !item.is_expired),
    [packages]
  );

  useEffect(() => {
    setShowRestoreConfirmation(false);
  }, [selectedBackupId]);

  useEffect(() => {
    if (!restoreAcknowledged) {
      setShowRestoreConfirmation(false);
    }
  }, [restoreAcknowledged]);

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
  }

  function failAction(message: string, action: RetryAction) {
    setActionErrorMessage(message);
    setRetryAction(action);
    toast.error(message);
  }

  function handleCreateExport() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/export/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            package_type: scope === "backup" ? "json" : packageType,
            scope,
            filters: {
              active_only: activeOnly,
              from_date: fromDate || undefined,
              to_date: toDate || undefined
            }
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<ExportResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiMessage(envelope), "create-export");
          return;
        }

        setLastExport(envelope.data);
        setRetryAction(null);
        toast.success("تم إنشاء حزمة التصدير.");
        router.refresh();
      })();
    });
  }

  function handleRevokePackage(packageId: string) {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/export/packages/${packageId}`, {
          method: "PATCH"
        });

        const envelope = (await response.json()) as StandardEnvelope<RevokeResponse>;
        if (!response.ok || !envelope.success) {
          failAction(getApiMessage(envelope), "revoke-package");
          return;
        }

        setConfirmAction(null);
        setRetryAction(null);
        toast.success("تم إبطال حزمة التصدير.");
        router.refresh();
      })();
    });
  }

  async function handleDryRunImport() {
    if (!selectedFile) {
      failAction("يلزم تحديد ملف JSON أو CSV.", "dry-run-import");
      return;
    }

    clearActionFeedback();
    setLastImport(null);
    const sourceContent = await selectedFile.text();
    const lowerName = selectedFile.name.toLowerCase();
    const sourceFormat = lowerName.endsWith(".json") ? "json" : "csv";

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/import/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "dry_run",
            source_format: sourceFormat,
            source_content: sourceContent,
            file_name: selectedFile.name
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<ImportResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiMessage(envelope), "dry-run-import");
          return;
        }

        setDryRunResult(envelope.data);
        setRetryAction(null);
        toast.success("تم فحص ملف المنتجات بنجاح.");
        router.refresh();
      })();
    });
  }

  function handleCommitImport(jobId: string) {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/import/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "commit",
            dry_run_job_id: jobId
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<ImportResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiMessage(envelope), "commit-import");
          return;
        }

        setDryRunResult(envelope.data);
        setLastImport(envelope.data);
        setConfirmAction(null);
        setRetryAction(null);
        toast.success("تم استيراد المنتجات المعتمدة بنجاح.");
        router.refresh();
      })();
    });
  }

  function handleRestoreDrill() {
    if (!selectedBackupId) {
      failAction("يلزم تحديد حزمة نسخ احتياطي.", "restore-drill");
      return;
    }

    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/restore/drill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            backup_id: selectedBackupId,
            target_env: "isolated-drill",
            idempotency_key: crypto.randomUUID()
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<RestoreResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiMessage(envelope), "restore-drill");
          return;
        }

        setLastRestore(envelope.data);
        setShowRestoreConfirmation(false);
        setRetryAction(null);
        toast.success("تم تشغيل الاستعادة التجريبية.");
        router.refresh();
      })();
    });
  }

  function retryLastAction() {
    switch (retryAction) {
      case "create-export":
        handleCreateExport();
        break;
      case "dry-run-import":
        void handleDryRunImport();
        break;
      case "commit-import":
        if (dryRunResult) {
          handleCommitImport(dryRunResult.job_id);
        }
        break;
      case "restore-drill":
        handleRestoreDrill();
        break;
      case "revoke-package":
        if (confirmAction?.type === "revoke-package") {
          handleRevokePackage(confirmAction.packageId);
        }
        break;
      default:
        break;
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentSection: PortabilitySection) {
    const currentIndex = PORTABILITY_TABS.findIndex((tab) => tab.key === currentSection);
    if (currentIndex === -1) {
      return;
    }

    const focusSection = (index: number) => {
      const nextSection = PORTABILITY_TABS[index]?.key;
      if (nextSection) {
        tabRefs.current[nextSection]?.focus();
      }
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusSection((currentIndex + 1) % PORTABILITY_TABS.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusSection((currentIndex - 1 + PORTABILITY_TABS.length) % PORTABILITY_TABS.length);
        break;
      case "Home":
        event.preventDefault();
        focusSection(0);
        break;
      case "End":
        event.preventDefault();
        focusSection(PORTABILITY_TABS.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        setActiveSection(currentSection);
        break;
      default:
        break;
    }
  }

  function toggleAccordion(accordion: PortabilityHistoryAccordion) {
    setExpandedAccordions((current) => ({ ...current, [accordion]: !current[accordion] }));
  }

  const importCanCommit = Boolean(
    dryRunResult && dryRunResult.mode === "dry_run" && dryRunResult.rows_valid > 0 && dryRunResult.rows_invalid === 0
  );
  const importReviewMessage = dryRunResult
    ? dryRunResult.mode === "commit"
      ? "تم اعتماد الصفوف السليمة في هذه الجلسة."
      : dryRunResult.rows_valid === 0
        ? "لا يمكن المتابعة قبل توفر صفوف سليمة."
        : "يجب معالجة الصفوف غير السليمة قبل إظهار زر الاعتماد."
    : null;
  const selectedBackup =
    backupPackages.find((item) => item.id === selectedBackupId) ??
    packages.find((item) => item.id === selectedBackupId) ??
    null;

  return (
    <section className="workspace-stack configuration-page portability-page">
      <PageHeader
        title="مركز النقل والاستيراد والاستعادة التجريبية"
        meta={
          <div className="configuration-page__meta-grid">
            <article className="configuration-page__meta-card">
              <span className="configuration-page__meta-label">الحزم الجاهزة</span>
              <strong className="configuration-page__meta-value">
                {formatCompactNumber(packages.filter((item) => item.status === "ready" && !item.is_expired).length)}
              </strong>
            </article>
            <article className="configuration-page__meta-card">
              <span className="configuration-page__meta-label">عمليات الاستيراد</span>
              <strong className="configuration-page__meta-value">{formatCompactNumber(importJobs.length)}</strong>
            </article>
            <article className="configuration-page__meta-card">
              <span className="configuration-page__meta-label">تجارب الاستعادة</span>
              <strong className="configuration-page__meta-value">{formatCompactNumber(restoreDrills.length)}</strong>
            </article>
          </div>
        }
      />

      <nav className="configuration-section-nav portability-page__sections portability-page__tabs" aria-label="أقسام شاشة النقل والنسخ">
        {PORTABILITY_TABS.map((tab) => (
          <button
            key={tab.key}
            ref={(node) => {
              tabRefs.current[tab.key] = node;
            }}
            type="button"
            id={`portability-tab-${tab.key}`}
            aria-pressed={activeSection === tab.key}
            aria-controls={`portability-panel-${tab.key}`}
            className={`portability-page__tab ${activeSection === tab.key ? "is-active chip-button is-selected" : "chip-button"}`}
            onClick={() => setActiveSection(tab.key)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {isPending ? (
        <StatusBanner
          variant="info"
          title="جارٍ تنفيذ العملية"
          message="انتظر حتى يكتمل الإجراء الحالي قبل بدء عملية نقل أو استعادة جديدة."
        />
      ) : null}

      {actionErrorMessage ? (
        <StatusBanner
          variant="danger"
          title="تعذر إكمال العملية"
          message={actionErrorMessage}
          actionLabel={retryAction ? "إعادة المحاولة" : undefined}
          onAction={retryAction ? retryLastAction : undefined}
          onDismiss={clearActionFeedback}
        />
      ) : null}

      <SectionCard
        eyebrow="الخصوصية والتتبع"
        title="كل إجراء هنا مؤقت ومراقب"
        tone="subtle"
        className="configuration-card configuration-card--danger"
      >
        <p className="configuration-inline-note">الاستعادة المباشرة غير متاحة من هذه الشاشة.</p>
      </SectionCard>

      <section
        id="portability-panel-export"
        className="portability-page__tab-panel"
        role="region"
        aria-labelledby="portability-tab-export"
        hidden={activeSection !== "export"}
      >
        <div className="portability-page__step-stack">
          <div className="portability-page__step">
            <SectionCard
              eyebrow="التصدير"
              title="أنشئ الحزمة المناسبة للنطاق"
              tone="accent"
              className="configuration-card"
            >
              <div className="stack-form">
                <label className="stack-field">
                  <span>النطاق</span>
                  <select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}>
                    <option value="products">المنتجات</option>
                    <option value="reports">التقارير</option>
                    <option value="customers">العملاء</option>
                    <option value="backup">نسخة احتياطية</option>
                  </select>
                </label>

                <label className="stack-field">
                  <span>النوع</span>
                  <select
                    value={scope === "backup" ? "json" : packageType}
                    onChange={(event) => setPackageType(event.target.value as typeof packageType)}
                    disabled={scope === "backup"}
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </label>

                <label className="stack-checkbox portability-page__checkbox">
                  <input
                    type="checkbox"
                    checked={activeOnly}
                    onChange={(event) => setActiveOnly(event.target.checked)}
                  />
                  <span>العناصر النشطة فقط</span>
                </label>

                {scope === "reports" ? (
                  <div className="portability-page__date-grid">
                    <label className="stack-field">
                      <span>من تاريخ</span>
                      <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                    </label>
                    <label className="stack-field">
                      <span>إلى تاريخ</span>
                      <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                    </label>
                  </div>
                ) : null}

                <div className="portability-page__step-actions">
                  <button type="button" className="primary-button" disabled={isPending} onClick={handleCreateExport}>
                    {isPending ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
                    إنشاء الحزمة
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          {lastExport ? (
            <div className="portability-page__step">
              <SectionCard eyebrow="آخر نتيجة" title="آخر حزمة تم إنشاؤها" className="configuration-card">
                <div className="result-card">
                  <h3>الحزمة جاهزة</h3>
                  <p>تنتهي الصلاحية: {formatDate(lastExport.expires_at)}</p>
                  <div className="inline-actions">
                    <a className="secondary-button" href={lastExport.download_url}>
                      تنزيل آخر حزمة
                    </a>
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : null}
        </div>
      </section>

      <section
        id="portability-panel-import"
        className="portability-page__tab-panel"
        role="region"
        aria-labelledby="portability-tab-import"
        hidden={activeSection !== "import"}
      >
        <div className="portability-page__step-stack">
          <div className="portability-page__step">
            <SectionCard
              eyebrow="الاستيراد"
              title="افحص الملف أولًا ثم اعتمد الصفوف السليمة"
              tone="accent"
              className="configuration-card"
            >
              <div className="stack-form">
                <label className="stack-field">
                  <span>ملف JSON أو CSV</span>
                  <input
                    type="file"
                    accept=".json,.csv,text/csv,application/json"
                    onChange={(event) => {
                      setSelectedFile(event.target.files?.[0] ?? null);
                      setDryRunResult(null);
                      setLastImport(null);
                    }}
                  />
                </label>

                <div className="portability-page__step-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={isPending || !selectedFile}
                    onClick={() => void handleDryRunImport()}
                  >
                    {isPending ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
                    تشغيل الفحص الأولي
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          {dryRunResult ? (
            <div className="portability-page__step">
              <SectionCard eyebrow="مراجعة الفحص" title="نتيجة الفحص الأولي" className="configuration-card">
                <div className="result-card portability-page__review">
                  <h3>ملخص الصفوف</h3>
                  <p>إجمالي الصفوف: {formatCompactNumber(dryRunResult.rows_total)}</p>
                  <p>الصفوف السليمة: {formatCompactNumber(dryRunResult.rows_valid)}</p>
                  <p>الصفوف غير السليمة: {formatCompactNumber(dryRunResult.rows_invalid)}</p>
                  {dryRunResult.validation_errors && dryRunResult.validation_errors.length > 0 ? (
                    <div className="portability-page__validation-errors">
                      <h4>الأخطاء</h4>
                      <div className="stack-list">
                        {dryRunResult.validation_errors.slice(0, 6).map((error) => (
                          <article key={`${error.row_number}-${error.field}-${error.message}`} className="list-card">
                            <div className="list-card__header">
                              <strong>الصف {formatCompactNumber(error.row_number)}</strong>
                              <span>{error.field}</span>
                            </div>
                            <p>{error.message}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {importCanCommit ? (
                    <div className="portability-page__step-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isPending}
                        onClick={() => setConfirmAction({ type: "commit-import", jobId: dryRunResult.job_id })}
                      >
                        اعتماد الصفوف السليمة
                      </button>
                    </div>
                  ) : (
                    <p className="workspace-footnote">{importReviewMessage}</p>
                  )}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {lastImport ? (
            <div className="portability-page__step">
              <SectionCard eyebrow="نتيجة الاستيراد" title="تم تنفيذ الاستيراد" className="configuration-card">
                <div className="result-card">
                  <h3>الاستيراد مكتمل</h3>
                  <p>الصفوف المعتمدة: {formatCompactNumber(lastImport.rows_valid)}</p>
                  <p>الصفوف المستوردة: {formatCompactNumber(lastImport.rows_committed ?? 0)}</p>
                  <p>الحالة: {lastImport.mode === "commit" ? "تم الاعتماد" : "فحص أولي فقط"}</p>
                </div>
              </SectionCard>
            </div>
          ) : null}
        </div>
      </section>

      <section
        id="portability-panel-restore"
        className="portability-page__tab-panel"
        role="region"
        aria-labelledby="portability-tab-restore"
        hidden={activeSection !== "restore"}
      >
        <div className="portability-page__step-stack">
          <div className="portability-page__step">
            <SectionCard
              eyebrow="الاستعادة التجريبية"
              title="استعادة معزولة داخل بيئة الاختبار"
              tone="subtle"
              className="configuration-card configuration-card--danger"
            >
              <div className="stack-form">
                <label className="stack-field">
                  <span>حزمة النسخ الاحتياطي</span>
                  <select value={selectedBackupId} onChange={(event) => setSelectedBackupId(event.target.value)}>
                    <option value="">اختر حزمة نسخ احتياطي</option>
                    {backupPackages.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.file_name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="portability-page__warning">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div>
                    <strong>تحذير</strong>
                    <p>استعادة البيانات ستؤدي إلى استبدال البيانات الحالية داخل البيئة المعزولة للتجربة.</p>
                  </div>
                </div>

                <label className="stack-checkbox portability-page__checkbox">
                  <input
                    type="checkbox"
                    checked={restoreAcknowledged}
                    onChange={(event) => setRestoreAcknowledged(event.target.checked)}
                  />
                  <span>أفهم التحذير وأريد مراجعة الاستعادة قبل التنفيذ.</span>
                </label>

                {selectedBackup ? (
                  <div className="info-strip">
                    <span>الحزمة: {selectedBackup.file_name}</span>
                    <span>تنتهي الصلاحية: {formatDate(selectedBackup.expires_at)}</span>
                  </div>
                ) : null}

                <div className="portability-page__step-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!selectedBackupId || !restoreAcknowledged}
                    onClick={() => setShowRestoreConfirmation(true)}
                  >
                    مراجعة الاستعادة
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          {showRestoreConfirmation && selectedBackup ? (
            <div className="portability-page__step">
              <SectionCard eyebrow="تأكيد نهائي" title="راجع نطاق الاستعادة قبل التنفيذ" className="configuration-card">
                <div className="result-card">
                  <h3>جاهز لتشغيل الاستعادة التجريبية</h3>
                  <p>الحزمة: {selectedBackup.file_name}</p>
                  <p>النطاق: نسخة احتياطية معزولة داخل بيئة الاختبار</p>
                  <div className="portability-page__step-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={isPending}
                      onClick={handleRestoreDrill}
                    >
                      {isPending ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
                      تشغيل الاستعادة
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {lastRestore ? (
            <div className="portability-page__step">
              <SectionCard eyebrow="نتيجة التجربة" title="ملخص آخر استعادة تجريبية" className="configuration-card">
                <div className="result-card">
                  <h3>آخر استعادة تجريبية</h3>
                  <p>الحالة: {getStatusLabel(lastRestore.status)}</p>
                  <p>الفروق: {formatCompactNumber(lastRestore.drift_count)}</p>
                  <p>زمن الاستعادة: {formatCompactNumber(lastRestore.rto_seconds)} ث</p>
                </div>
              </SectionCard>
            </div>
          ) : null}
        </div>
      </section>

      <section
        id="portability-panel-history"
        className="portability-page__tab-panel"
        role="region"
        aria-labelledby="portability-tab-history"
        hidden={activeSection !== "history"}
      >
        <div className="portability-page__history-stack">
          <section className="portability-page__accordion">
            <button
              type="button"
              className={`portability-page__accordion-header ${expandedAccordions.packages ? "is-expanded" : ""}`}
              aria-expanded={expandedAccordions.packages}
              aria-controls="portability-history-packages"
              onClick={() => toggleAccordion("packages")}
            >
              <span>سجل الحزم الجاهزة والملغاة</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={expandedAccordions.packages ? "portability-page__accordion-icon is-rotated" : "portability-page__accordion-icon"}
              />
            </button>
            <div
              id="portability-history-packages"
              className="portability-page__accordion-content"
              hidden={!expandedAccordions.packages}
            >
              <SectionCard eyebrow="الحزم الأخيرة" title="سجل الحزم الجاهزة والملغاة" className="configuration-card">
                <div className="stack-list">
                  {packages.length === 0 ? (
                    <div className="empty-panel">
                      <p>لا توجد حزم محفوظة بعد.</p>
                    </div>
                  ) : (
                    packages.map((item) => (
                      <article key={item.id} className="list-card">
                        <div className="list-card__header">
                          <strong>{item.file_name}</strong>
                          <span>{getStatusLabel(item.is_expired ? "expired" : item.status)}</span>
                        </div>
                        <p className="workspace-footnote">
                          {item.scope === "backup"
                            ? "نسخة احتياطية"
                            : item.scope === "customers"
                              ? "العملاء"
                              : item.scope === "reports"
                                ? "التقارير"
                                : "المنتجات"}{" "}
                          / {item.package_type.toUpperCase()} / {formatCompactNumber(item.row_count)} سجل
                        </p>
                        <p className="workspace-footnote">ينتهي: {formatDate(item.expires_at)}</p>
                        <div className="inline-actions">
                          <a className="secondary-button" href={`/api/export/packages/${item.id}`}>
                            تنزيل
                          </a>
                          {item.status === "ready" && !item.is_expired ? (
                            <button
                              type="button"
                              className="ghost-button"
                              disabled={isPending}
                              onClick={() => setConfirmAction({ type: "revoke-package", packageId: item.id })}
                            >
                              إبطال
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </SectionCard>
            </div>
          </section>

          <section className="portability-page__accordion">
            <button
              type="button"
              className={`portability-page__accordion-header ${expandedAccordions.operations ? "is-expanded" : ""}`}
              aria-expanded={expandedAccordions.operations}
              aria-controls="portability-history-operations"
              onClick={() => toggleAccordion("operations")}
            >
              <span>فحوص الاستيراد وتجارب الاستعادة</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={expandedAccordions.operations ? "portability-page__accordion-icon is-rotated" : "portability-page__accordion-icon"}
              />
            </button>
            <div
              id="portability-history-operations"
              className="portability-page__accordion-content"
              hidden={!expandedAccordions.operations}
            >
              <SectionCard eyebrow="آخر العمليات" title="فحوص الاستيراد وتجارب الاستعادة" className="configuration-card">
                <div className="stack-list">
                  {importJobs.length === 0 && restoreDrills.length === 0 ? (
                    <div className="empty-panel">
                      <p>لم تُسجّل بعد أي عملية استيراد أو استعادة في هذه الجلسة.</p>
                    </div>
                  ) : (
                    <>
                      {importJobs.map((job) => (
                        <article key={job.id} className="list-card">
                          <div className="list-card__header">
                            <strong>{job.file_name}</strong>
                            <span>{getStatusLabel(job.status)}</span>
                          </div>
                          <p className="workspace-footnote">
                            سليم: {formatCompactNumber(job.rows_valid)} / غير سليم: {formatCompactNumber(job.rows_invalid)} /
                            مستورد: {formatCompactNumber(job.rows_committed)}
                          </p>
                        </article>
                      ))}

                      {restoreDrills.map((drill) => (
                        <article key={drill.id} className="list-card">
                          <div className="list-card__header">
                            <strong>{drill.package_file_name ?? "نسخة احتياطية غير معروفة"}</strong>
                            <span>{getStatusLabel(drill.status)}</span>
                          </div>
                          <p className="workspace-footnote">
                            الفروق: {formatCompactNumber(drill.drift_count ?? 0)} / زمن الاستعادة:{" "}
                            {formatCompactNumber(drill.rto_seconds ?? 0)} ث
                          </p>
                        </article>
                      ))}
                    </>
                  )}
                </div>
              </SectionCard>
            </div>
          </section>
        </div>
      </section>

      <ConfirmationDialog
        open={confirmAction?.type === "revoke-package"}
        title="إبطال حزمة التصدير"
        confirmLabel="إبطال الحزمة"
        onConfirm={() => {
          if (confirmAction?.type === "revoke-package") {
            handleRevokePackage(confirmAction.packageId);
          }
        }}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
        tone="danger"
      />

      <ConfirmationDialog
        open={confirmAction?.type === "commit-import"}
        title="تأكيد استيراد المنتجات"
        confirmLabel="تنفيذ الاستيراد"
        onConfirm={() => {
          if (confirmAction?.type === "commit-import") {
            handleCommitImport(confirmAction.jobId);
          }
        }}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
      />
    </section>
  );
}
