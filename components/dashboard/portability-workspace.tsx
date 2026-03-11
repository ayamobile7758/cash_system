"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Download, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
      return "dry-run جاهز";
    case "dry_run_failed":
      return "dry-run أخفق";
    case "committed":
      return "تم commit";
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
  const [selectedBackupId, setSelectedBackupId] = useState("");
  const [lastExport, setLastExport] = useState<ExportResponse | null>(null);
  const [lastRestore, setLastRestore] = useState<RestoreResponse | null>(null);

  const backupPackages = useMemo(
    () => packages.filter((item) => item.scope === "backup" && item.status === "ready" && !item.is_expired),
    [packages]
  );

  async function handleCreateExport() {
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
          toast.error(getApiMessage(envelope));
          return;
        }

        setLastExport(envelope.data);
        toast.success("تم إنشاء package التصدير.");
        router.refresh();
      })();
    });
  }

  async function handleRevokePackage(packageId: string) {
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/export/packages/${packageId}`, {
          method: "PATCH"
        });

        const envelope = (await response.json()) as StandardEnvelope<RevokeResponse>;
        if (!response.ok || !envelope.success) {
          toast.error(getApiMessage(envelope));
          return;
        }

        toast.success("تم إبطال package التصدير.");
        router.refresh();
      })();
    });
  }

  async function handleDryRunImport() {
    if (!selectedFile) {
      toast.error("اختر ملف JSON أو CSV أولًا.");
      return;
    }

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
          toast.error(getApiMessage(envelope));
          return;
        }

        setDryRunResult(envelope.data);
        toast.success("تم تنفيذ dry-run لملف المنتجات.");
        router.refresh();
      })();
    });
  }

  async function handleCommitImport(jobId: string) {
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
          toast.error(getApiMessage(envelope));
          return;
        }

        setDryRunResult(envelope.data);
        toast.success("تم تنفيذ commit للمنتجات المستوردة.");
        router.refresh();
      })();
    });
  }

  async function handleRestoreDrill() {
    if (!selectedBackupId) {
      toast.error("اختر backup package أولًا.");
      return;
    }

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
          toast.error(getApiMessage(envelope));
          return;
        }

        setLastRestore(envelope.data);
        toast.success("تم تشغيل restore drill.");
        router.refresh();
      })();
    });
  }

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-12</p>
          <h1>مركز النقل والنسخ الاحتياطي</h1>
          <p className="workspace-lead">
            إدارة export/import/restore drill بشكل إداري فقط مع audit صريح، expiry للحزم، وتحذير دائم بأن
            portability لا تعمل أبدًا على البيئة الأساسية مباشرة.
          </p>
        </div>
      </div>

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Privacy / Audit</p>
            <h2>تحذير تشغيلي</h2>
          </div>
          <AlertTriangle size={18} />
        </div>
        <div className="empty-panel">
          <p>
            كل عملية portability هنا تُسجل في audit_logs، وتولد إشعارًا إداريًا، وتعمل بحزم bounded +
            expirable فقط. لا يوجد restore على البيئة الأساسية من هذه الشاشة.
          </p>
        </div>
      </section>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Export</p>
              <h2>إنشاء package تصدير</h2>
            </div>
            <Download size={18} />
          </div>

          <div className="stack-form">
            <label className="stack-field">
              <span>النطاق</span>
              <select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}>
                <option value="products">المنتجات</option>
                <option value="reports">التقارير</option>
                <option value="customers">العملاء</option>
                <option value="backup">backup bundle</option>
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

            <label className="stack-field">
              <span>
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(event) => setActiveOnly(event.target.checked)}
                />{" "}
                active only
              </span>
            </label>

            {scope === "reports" ? (
              <>
                <label className="stack-field">
                  <span>من تاريخ</span>
                  <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                </label>
                <label className="stack-field">
                  <span>إلى تاريخ</span>
                  <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                </label>
              </>
            ) : null}

            <button type="button" className="primary-button" disabled={isPending} onClick={() => void handleCreateExport()}>
              {isPending ? <Loader2 className="spin" size={16} /> : "إنشاء package"}
            </button>
          </div>

          {lastExport ? (
            <div className="result-card">
              <h3>آخر package</h3>
              <p>التحميل: {lastExport.download_url}</p>
              <p>تنتهي الصلاحية: {formatDate(lastExport.expires_at)}</p>
            </div>
          ) : null}
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Import</p>
              <h2>استيراد المنتجات</h2>
            </div>
            <Upload size={18} />
          </div>

          <div className="stack-form">
            <label className="stack-field">
              <span>ملف JSON أو CSV</span>
              <input type="file" accept=".json,.csv,text/csv,application/json" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            </label>

            <button type="button" className="primary-button" disabled={isPending || !selectedFile} onClick={() => void handleDryRunImport()}>
              {isPending ? <Loader2 className="spin" size={16} /> : "تشغيل dry-run"}
            </button>
          </div>

          {dryRunResult ? (
            <div className="result-card">
              <h3>نتيجة الاستيراد</h3>
              <p>Rows total: {formatCompactNumber(dryRunResult.rows_total)}</p>
              <p>Rows valid: {formatCompactNumber(dryRunResult.rows_valid)}</p>
              <p>Rows invalid: {formatCompactNumber(dryRunResult.rows_invalid)}</p>
              {dryRunResult.mode === "dry_run" && dryRunResult.rows_invalid === 0 ? (
                <button type="button" className="secondary-button" disabled={isPending} onClick={() => void handleCommitImport(dryRunResult.job_id)}>
                  تنفيذ commit
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Restore Drill</p>
            <h2>استعادة معزولة</h2>
          </div>
          <ShieldCheck size={18} />
        </div>

        <div className="stack-form">
          <label className="stack-field">
            <span>Backup package</span>
            <select value={selectedBackupId} onChange={(event) => setSelectedBackupId(event.target.value)}>
              <option value="">اختر package</option>
              {backupPackages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.file_name}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="primary-button" disabled={isPending || !selectedBackupId} onClick={() => void handleRestoreDrill()}>
            {isPending ? <Loader2 className="spin" size={16} /> : "تشغيل restore drill"}
          </button>
        </div>

        {lastRestore ? (
          <div className="result-card">
            <h3>آخر restore drill</h3>
            <p>المعرّف: {lastRestore.drill_id}</p>
            <p>الحالة: {getStatusLabel(lastRestore.status)}</p>
            <p>drift: {formatCompactNumber(lastRestore.drift_count)}</p>
            <p>RTO: {formatCompactNumber(lastRestore.rto_seconds)}s</p>
          </div>
        ) : null}
      </section>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent Packages</p>
              <h2>الحزم الأخيرة</h2>
            </div>
            <Download size={18} />
          </div>

          <div className="stack-list">
            {packages.length === 0 ? (
              <div className="empty-panel">
                <p>لا توجد packages مسجلة بعد.</p>
              </div>
            ) : (
              packages.map((item) => (
                <article key={item.id} className="list-card">
                  <div className="list-card__header">
                    <strong>{item.file_name}</strong>
                    <span>{getStatusLabel(item.is_expired ? "expired" : item.status)}</span>
                  </div>
                  <p className="workspace-footnote">
                    {item.scope} / {item.package_type} / {formatCompactNumber(item.row_count)} سجل
                  </p>
                  <p className="workspace-footnote">ينتهي: {formatDate(item.expires_at)}</p>
                  <div className="inline-actions">
                    <a className="secondary-button" href={`/api/export/packages/${item.id}`}>
                      تنزيل
                    </a>
                    {item.status === "ready" && !item.is_expired ? (
                      <button type="button" className="ghost-button" disabled={isPending} onClick={() => void handleRevokePackage(item.id)}>
                        إبطال
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Import / Restore</p>
              <h2>آخر العمليات</h2>
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="stack-list">
            {importJobs.map((job) => (
              <article key={job.id} className="list-card">
                <div className="list-card__header">
                  <strong>{job.file_name}</strong>
                  <span>{getStatusLabel(job.status)}</span>
                </div>
                <p className="workspace-footnote">
                  صالح: {formatCompactNumber(job.rows_valid)} / خطأ: {formatCompactNumber(job.rows_invalid)} / commit:{" "}
                  {formatCompactNumber(job.rows_committed)}
                </p>
              </article>
            ))}

            {restoreDrills.map((drill) => (
              <article key={drill.id} className="list-card">
                <div className="list-card__header">
                  <strong>{drill.package_file_name ?? "backup غير معروف"}</strong>
                  <span>{getStatusLabel(drill.status)}</span>
                </div>
                <p className="workspace-footnote">
                  drift: {formatCompactNumber(drill.drift_count ?? 0)} / RTO: {formatCompactNumber(drill.rto_seconds ?? 0)}s
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
