"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { AlertTriangle, ChevronDown, Loader2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PermissionsPanel } from "@/components/dashboard/permissions-panel";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import type {
  PermissionAssignmentOption,
  PermissionBundleOption,
  PermissionUserOption,
  SettingsSnapshot
} from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";

type SnapshotResponse = {
  snapshot_id: string;
  total_sales: number;
  net_sales: number;
  net_profit: number;
  invoice_count: number;
  is_replay: boolean;
};

type BalanceCheckResponse = {
  success: boolean;
  drift_count: number;
  drifts: Array<{
    account_id: string;
    account_name: string;
    current_balance: number;
    calculated_balance: number;
    drift: number;
  }>;
};

type SettingsOpsProps = {
  snapshots: SettingsSnapshot[];
  permissionBundles: PermissionBundleOption[];
  permissionUsers: PermissionUserOption[];
  activeAssignments: PermissionAssignmentOption[];
};

type SettingsSection = "permissions" | "policies" | "snapshot" | "integrity";
type SettingsAction = "snapshot" | "balance-check";
type SettingsConfirmAction = "snapshot" | null;
type MobileAccordionState = Record<SettingsSection, boolean>;

type SettingsSectionMeta = {
  key: SettingsSection;
  label: string;
  description: string;
  group: "governance" | "oversight";
};

const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    key: "permissions",
    label: "الصلاحيات",
    description: "إدارة الحِزم والإسناد الدقيق للمستخدمين دون تغيير آلية العمل الحالية.",
    group: "governance"
  },
  {
    key: "policies",
    label: "السياسات",
    description: "سياسات الطباعة والوصول من الأجهزة وملخّص الأدوات اليومية المتبقية في الإعدادات.",
    group: "governance"
  },
  {
    key: "snapshot",
    label: "اللقطة اليومية",
    description: "حفظ لقطة نهاية اليوم ومراجعة آخر اللقطات المحفوظة من نفس مساحة الإدارة.",
    group: "oversight"
  },
  {
    key: "integrity",
    label: "سلامة الأرصدة",
    description: "فحص سلامة الأرصدة ومراجعة الفروقات قبل أي تدخل يدوي على الحسابات.",
    group: "oversight"
  }
];

const SETTINGS_GROUPS = [
  { key: "governance", label: "الوصول والحوكمة" },
  { key: "oversight", label: "الإشراف على النظام" }
] as const;

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
}

function createClosedAccordionState(): MobileAccordionState {
  return {
    permissions: false,
    policies: false,
    snapshot: false,
    integrity: false
  };
}

function createAccordionState(section: SettingsSection): MobileAccordionState {
  return {
    ...createClosedAccordionState(),
    [section]: true
  };
}

export function SettingsOps({ snapshots, permissionBundles, permissionUsers, activeAssignments }: SettingsOpsProps) {
  const router = useRouter();
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [snapshotResult, setSnapshotResult] = useState<SnapshotResponse | null>(null);
  const [balanceResult, setBalanceResult] = useState<BalanceCheckResponse | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>("snapshot");
  const [mobileAccordions, setMobileAccordions] = useState<MobileAccordionState>(() => createAccordionState("snapshot"));
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<SettingsAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<SettingsConfirmAction>(null);
  const [isPending, startTransition] = useTransition();
  const tabRefs = useRef<Record<SettingsSection, HTMLButtonElement | null>>({
    permissions: null,
    policies: null,
    snapshot: null,
    integrity: null
  });

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
  }

  function failAction(message: string, action: SettingsAction) {
    setActionErrorMessage(message);
    setRetryAction(action);
    toast.error(message);
  }

  function executeSnapshot() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/snapshots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: snapshotNotes || undefined })
        });

        const envelope = (await response.json()) as StandardEnvelope<SnapshotResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), "snapshot");
          return;
        }

        setSnapshotResult(envelope.data);
        setConfirmAction(null);
        setRetryAction(null);
        toast.success(
          envelope.data.is_replay
            ? "تمت إعادة نفس اللقطة اليومية لهذا اليوم."
            : "تم حفظ اللقطة اليومية بنجاح."
        );
        router.refresh();
      })();
    });
  }

  function executeBalanceCheck() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/health/balance-check", {
          method: "POST"
        });

        const envelope = (await response.json()) as StandardEnvelope<BalanceCheckResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), "balance-check");
          return;
        }

        setBalanceResult(envelope.data);
        setRetryAction(null);
        toast.success(
          envelope.data.drift_count === 0
            ? "الأرصدة سليمة بلا فروقات."
            : `تم اكتشاف ${envelope.data.drift_count} فروقات تحتاج مراجعة.`
        );
      })();
    });
  }

  function retryLastAction() {
    switch (retryAction) {
      case "snapshot":
        executeSnapshot();
        break;
      case "balance-check":
        executeBalanceCheck();
        break;
      default:
        break;
    }
  }

  function activateSection(section: SettingsSection) {
    setActiveSection(section);
    setMobileAccordions(createAccordionState(section));
  }

  function toggleAccordion(section: SettingsSection) {
    setActiveSection(section);
    setMobileAccordions((current) => {
      if (current[section]) {
        return createClosedAccordionState();
      }

      return createAccordionState(section);
    });
  }

  function handleNavigatorKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentSection: SettingsSection
  ) {
    const currentIndex = SETTINGS_SECTIONS.findIndex((section) => section.key === currentSection);

    if (currentIndex === -1) {
      return;
    }

    const focusSection = (index: number) => {
      const nextSection = SETTINGS_SECTIONS[index]?.key;
      if (nextSection) {
        tabRefs.current[nextSection]?.focus();
      }
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusSection((currentIndex + 1) % SETTINGS_SECTIONS.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusSection((currentIndex - 1 + SETTINGS_SECTIONS.length) % SETTINGS_SECTIONS.length);
        break;
      case "Home":
        event.preventDefault();
        focusSection(0);
        break;
      case "End":
        event.preventDefault();
        focusSection(SETTINGS_SECTIONS.length - 1);
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

  function renderSnapshotSection() {
    return (
      <div className="configuration-shell configuration-shell--split settings-page__split">
        <section className="workspace-panel settings-page__panel">
          <div className="section-heading">
            <div>
              <h2>حفظ اللقطة اليومية</h2>
            </div>
          </div>

          <div className="stack-form">
            <label className="stack-field">
              <span>ملاحظات اختيارية</span>
              <textarea
                className="field-input"
                rows={3}
                maxLength={500}
                value={snapshotNotes}
                onChange={(event) => setSnapshotNotes(event.target.value)}
                placeholder="ملخص تنفيذي لنهاية اليوم"
              />
            </label>

            <button
              type="button"
              className="primary-button"
              disabled={isPending}
              onClick={() => setConfirmAction("snapshot")}
            >
              {isPending ? <Loader2 className="spin" size={16} /> : "حفظ اللقطة اليومية"}
            </button>
          </div>

          {snapshotResult ? (
            <div className="result-card" role="status" aria-live="polite">
              <h3>{snapshotResult.is_replay ? "تمت إعادة نفس اللقطة" : "تم حفظ اللقطة"}</h3>
              <p>إجمالي المبيعات: {formatCurrency(snapshotResult.total_sales)}</p>
              <p>صافي المبيعات: {formatCurrency(snapshotResult.net_sales)}</p>
              <p>عدد الفواتير: {formatCompactNumber(snapshotResult.invoice_count)}</p>
            </div>
          ) : null}
        </section>

        <section className="workspace-panel settings-page__panel">
          <div className="section-heading">
            <div>
              <h2>آخر اللقطات</h2>
            </div>
          </div>
          <div className="stack-list settings-page__list">
            {snapshots.length > 0 ? (
              snapshots.map((snapshot) => (
                <article key={snapshot.id} className="list-card settings-page__snapshot-card">
                  <div className="list-card__header">
                    <strong>{formatDate(snapshot.snapshot_date)}</strong>
                    <span className="status-pill badge badge--neutral">
                      {formatCompactNumber(snapshot.invoice_count)} فاتورة
                    </span>
                  </div>
                  <p>صافي المبيعات: {formatCurrency(snapshot.net_sales)}</p>
                  <p className="workspace-footnote">آخر إنشاء: {formatDateTime(snapshot.created_at)}</p>
                </article>
              ))
            ) : (
              <div className="empty-panel settings-page__empty">
                <RefreshCcw size={20} />
                <h3>لا توجد لقطات محفوظة</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setConfirmAction("snapshot")}
                >
                  حفظ اللقطة اليومية
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  function renderIntegritySection() {
    return (
      <div className="configuration-shell settings-page__single">
        <section className="workspace-panel settings-page__panel">
          <div className="section-heading">
            <div>
              <h2>فحص سلامة الأرصدة</h2>
            </div>
          </div>

          <p className="workspace-footnote">
            يفحص هذا الإجراء تطابق الأرصدة المسجلة مع القيود المالية قبل تنفيذ أي تسوية يدوية.
          </p>

          <button
            type="button"
            className="secondary-button"
            disabled={isPending}
            onClick={executeBalanceCheck}
          >
            {isPending ? <Loader2 className="spin" size={16} /> : <RefreshCcw size={16} />}
            إعادة الفحص
          </button>

          {balanceResult ? (
            <div className="stack-list" role="status" aria-live="polite">
              <article className="list-card">
                <div className="list-card__header">
                  <strong>{balanceResult.drift_count === 0 ? "الحالة: سليمة" : "الحالة: فروقات مكتشفة"}</strong>
                  <span>{formatCompactNumber(balanceResult.drift_count)} حسابات</span>
                </div>
              </article>

              {balanceResult.drifts.map((drift) => (
                <article key={drift.account_id} className="list-card">
                  <div className="list-card__header">
                    <strong>{drift.account_name}</strong>
                    <span>{formatCurrency(drift.drift)}</span>
                  </div>
                  <p>المخزن: {formatCurrency(drift.current_balance)}</p>
                  <p>المحسوب: {formatCurrency(drift.calculated_balance)}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  function renderPoliciesSection() {
    return (
      <div className="configuration-summary-grid settings-page__policies">
        <SectionCard
          title="الطباعة"
          className="configuration-card"
        >
          <p className="workspace-footnote">الطباعة المؤقتة خارج نطاق MVP الحالي.</p>
        </SectionCard>

        <SectionCard
          title="الوصول من الأجهزة"
          className="configuration-card configuration-card--danger"
        >
          <p className="warning-inline">
            <AlertTriangle size={14} />
            هذا قرار نطاق MVP موثق، وليس ادعاء بوجود إدارة أجهزة داخلية كاملة.
          </p>
        </SectionCard>

        <SectionCard
          title="الأدوات اليومية"
          className="configuration-card"
        >
          <div className="operational-inline-summary">
            <span className="status-pill badge badge--neutral">اللقطة اليومية</span>
            <span className="status-pill badge badge--neutral">سلامة الأرصدة</span>
          </div>
        </SectionCard>
      </div>
    );
  }

  function renderSectionContent(section: SettingsSection) {
    switch (section) {
      case "permissions":
        return (
          <PermissionsPanel
            permissionBundles={permissionBundles}
            permissionUsers={permissionUsers}
            activeAssignments={activeAssignments}
          />
        );
      case "policies":
        return renderPoliciesSection();
      case "snapshot":
        return renderSnapshotSection();
      case "integrity":
        return renderIntegritySection();
      default:
        return null;
    }
  }

  return (
    <section className="workspace-stack configuration-page settings-page">
      <PageHeader
        title="الإعدادات"
        meta={
          <>
            <span className="status-pill badge badge--neutral">
              الصلاحيات {formatCompactNumber(activeAssignments.length)}
            </span>
            <span className="status-pill badge badge--neutral">
              اللقطات {formatCompactNumber(snapshots.length)}
            </span>
          </>
        }
        actions={
          <button type="button" className="primary-button" onClick={() => activateSection("snapshot")}>
            اللقطة اليومية
          </button>
        }
      />

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

      <div className="settings-page__shell">
        <nav
          className="settings-page__navigator settings-page__sections"
          aria-label="أقسام شاشة الإعدادات"
        >
          {SETTINGS_GROUPS.map((group) => (
            <section key={group.key} className="settings-page__navigator-group">
              <div className="settings-page__navigator-group-header">
                <h2>{group.label}</h2>
              </div>

              <div className="settings-page__navigator-list">
                {SETTINGS_SECTIONS.filter((section) => section.group === group.key).map((section) => (
                  <button
                    key={section.key}
                    ref={(node) => {
                      tabRefs.current[section.key] = node;
                    }}
                    type="button"
                    id={`settings-tab-${section.key}`}
                    aria-pressed={activeSection === section.key}
                    aria-controls={`settings-panel-${section.key}`}
                    aria-labelledby={`settings-nav-title-${section.key}`}
                    aria-describedby={`settings-nav-description-${section.key}`}
                    className={`settings-page__navigator-item ${activeSection === section.key ? "is-selected" : ""}`}
                    onClick={() => activateSection(section.key)}
                    onKeyDown={(event) => handleNavigatorKeyDown(event, section.key)}
                  >
                    <span id={`settings-nav-title-${section.key}`} className="settings-page__navigator-item-title">
                      {section.label}
                    </span>
                    <span
                      id={`settings-nav-description-${section.key}`}
                      className="settings-page__navigator-item-description"
                    >
                      {section.description}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div
          className="settings-page__detail"
          id={`settings-panel-${activeSection}`}
          role="region"
          aria-labelledby={`settings-tab-${activeSection}`}
        >
          <section className="workspace-panel settings-page__detail-intro">
            <div className="section-heading">
              <div>
                <h2>{SETTINGS_SECTIONS.find((section) => section.key === activeSection)?.label}</h2>
                <p className="workspace-footnote">
                  {SETTINGS_SECTIONS.find((section) => section.key === activeSection)?.description}
                </p>
              </div>
            </div>
          </section>

          <div className="settings-page__detail-body">
            {renderSectionContent(activeSection)}
          </div>
        </div>
      </div>

      <div className="settings-page__sections settings-page__accordion-list">
        {SETTINGS_SECTIONS.map((section) => {
          const isExpanded = mobileAccordions[section.key];

          return (
            <section key={section.key} className="settings-page__accordion">
              <button
                type="button"
                className={`settings-page__accordion-header ${isExpanded ? "is-expanded" : ""}`}
                aria-expanded={isExpanded}
                aria-controls={`settings-accordion-panel-${section.key}`}
                id={`settings-accordion-trigger-${section.key}`}
                aria-labelledby={`settings-accordion-title-${section.key}`}
                aria-describedby={`settings-accordion-description-${section.key}`}
                onClick={() => toggleAccordion(section.key)}
              >
                <span className="settings-page__accordion-copy">
                  <strong id={`settings-accordion-title-${section.key}`}>{section.label}</strong>
                  <span id={`settings-accordion-description-${section.key}`}>{section.description}</span>
                </span>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className={`settings-page__accordion-icon ${isExpanded ? "is-rotated" : ""}`}
                />
              </button>

              <div
                id={`settings-accordion-panel-${section.key}`}
                role="region"
                aria-labelledby={`settings-accordion-trigger-${section.key}`}
                className="settings-page__accordion-content"
                hidden={!isExpanded}
                aria-hidden={!isExpanded}
              >
                {isExpanded ? renderSectionContent(section.key) : null}
              </div>
            </section>
          );
        })}
      </div>

      <ConfirmationDialog
        open={confirmAction === "snapshot"}
        title="حفظ اللقطة اليومية"
        confirmLabel="حفظ اللقطة"
        cancelLabel="الرجوع"
        isPending={isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={executeSnapshot}
      />
    </section>
  );
}
