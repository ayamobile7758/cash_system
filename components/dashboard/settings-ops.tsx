"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PermissionsPanel } from "@/components/dashboard/permissions-panel";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import type {
  InventoryCountOption,
  PermissionAssignmentOption,
  PermissionBundleOption,
  PermissionUserOption,
  SettingsAccount,
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

type ReconciliationResponse = {
  reconciliation_id: string;
  expected: number;
  actual: number;
  difference: number;
};

type InventoryCompleteResponse = {
  count_id: string;
  adjusted_products: number;
  total_difference: number;
};

type InventoryDraftState = Record<
  string,
  Array<{
    inventory_count_item_id: string;
    actual_quantity: number;
    reason: string;
  }>
>;

type SettingsOpsProps = {
  accounts: SettingsAccount[];
  snapshots: SettingsSnapshot[];
  inventoryCounts: InventoryCountOption[];
  permissionBundles: PermissionBundleOption[];
  permissionUsers: PermissionUserOption[];
  activeAssignments: PermissionAssignmentOption[];
};

type SettingsSection = "permissions" | "snapshot" | "integrity" | "reconciliation" | "inventory" | "policies";
type SettingsAction = "snapshot" | "balance-check" | "reconciliation" | "inventory-complete";
type SettingsConfirmAction = "snapshot" | "reconciliation" | "inventory-complete" | null;

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
}

function getCountTypeLabel(countType: string) {
  switch (countType) {
    case "daily":
      return "يومي";
    case "weekly":
      return "أسبوعي";
    case "monthly":
      return "شهري";
    default:
      return countType;
  }
}

export function SettingsOps({
  accounts,
  snapshots,
  inventoryCounts,
  permissionBundles,
  permissionUsers,
  activeAssignments
}: SettingsOpsProps) {
  const router = useRouter();
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [actualBalance, setActualBalance] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");
  const [selectedCountId, setSelectedCountId] = useState(inventoryCounts[0]?.id ?? "");
  const [snapshotResult, setSnapshotResult] = useState<SnapshotResponse | null>(null);
  const [balanceResult, setBalanceResult] = useState<BalanceCheckResponse | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResponse | null>(null);
  const [inventoryResult, setInventoryResult] = useState<InventoryCompleteResponse | null>(null);
  const [inventoryDrafts, setInventoryDrafts] = useState<InventoryDraftState>({});
  const [activeSection, setActiveSection] = useState<SettingsSection>("snapshot");
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<SettingsAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<SettingsConfirmAction>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setInventoryDrafts((current) => {
      const next = { ...current };

      for (const count of inventoryCounts) {
        if (!next[count.id]) {
          next[count.id] = count.items.map((item) => ({
            inventory_count_item_id: item.id,
            actual_quantity: item.actual_quantity,
            reason: item.reason ?? ""
          }));
        }
      }

      return next;
    });
  }, [inventoryCounts]);

  const selectedCount = useMemo(
    () => inventoryCounts.find((count) => count.id === selectedCountId) ?? null,
    [inventoryCounts, selectedCountId]
  );

  const selectedCountDraft = selectedCount ? inventoryDrafts[selectedCount.id] ?? [] : [];

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

  function executeReconciliation() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/reconciliation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: selectedAccountId,
            actual_balance: Number(actualBalance),
            notes: reconcileNotes
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<ReconciliationResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), "reconciliation");
          return;
        }

        setReconciliationResult(envelope.data);
        setConfirmAction(null);
        setRetryAction(null);
        toast.success("تم إنشاء قيد التسوية بنجاح.");
        router.refresh();
      })();
    });
  }

  function executeInventoryComplete() {
    if (!selectedCount) {
      return;
    }

    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/inventory/counts/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventory_count_id: selectedCount.id,
            items: selectedCount.items.map((item, index) => ({
              inventory_count_item_id: item.id,
              actual_quantity: selectedCountDraft[index]?.actual_quantity ?? item.actual_quantity,
              reason: selectedCountDraft[index]?.reason || undefined
            }))
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<InventoryCompleteResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), "inventory-complete");
          return;
        }

        setInventoryResult(envelope.data);
        setConfirmAction(null);
        setRetryAction(null);
        toast.success("تم إكمال الجرد وإنشاء التسويات اللازمة.");
        router.refresh();
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
      case "reconciliation":
        executeReconciliation();
        break;
      case "inventory-complete":
        executeInventoryComplete();
        break;
      default:
        break;
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
            <span className="status-pill badge badge--neutral">
              الجرد المفتوح {formatCompactNumber(inventoryCounts.filter((count) => count.status !== "completed").length)}
            </span>
          </>
        }
        actions={
          <button type="button" className="primary-button" onClick={() => setActiveSection("snapshot")}>
            اللقطة اليومية
          </button>
        }
      />

      <div className="configuration-section-nav settings-page__sections" aria-label="أقسام شاشة الإعدادات">
        <button
          type="button"
          className={activeSection === "permissions" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("permissions")}
        >
          الصلاحيات
        </button>
        <button
          type="button"
          className={activeSection === "snapshot" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("snapshot")}
        >
          اللقطة اليومية
        </button>
        <button
          type="button"
          className={activeSection === "integrity" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("integrity")}
        >
          سلامة الأرصدة
        </button>
        <button
          type="button"
          className={activeSection === "reconciliation" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("reconciliation")}
        >
          التسوية
        </button>
        <button
          type="button"
          className={activeSection === "inventory" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("inventory")}
        >
          إكمال الجرد
        </button>
        <button
          type="button"
          className={activeSection === "policies" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("policies")}
        >
          السياسات
        </button>
      </div>

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

      {activeSection === "permissions" ? (
        <PermissionsPanel
          permissionBundles={permissionBundles}
          permissionUsers={permissionUsers}
          activeAssignments={activeAssignments}
        />
      ) : null}

      {activeSection === "snapshot" ? (
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
              <div className="result-card">
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
      ) : null}

      {activeSection === "integrity" ? (
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
              <div className="stack-list">
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
      ) : null}

      {activeSection === "reconciliation" ? (
        <div className="configuration-shell configuration-shell--split settings-page__split">
          <section className="workspace-panel settings-page__panel">
            <div className="section-heading">
              <div>
                <h2>تسوية الحسابات</h2>
              </div>
            </div>

            <div className="stack-form">
              <label className="stack-field">
                <span>الحساب</span>
                <select className="field-input" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-field">
                <span>الرصيد الفعلي</span>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  step="0.001"
                  value={actualBalance}
                  onChange={(event) => setActualBalance(event.target.value)}
                  placeholder="0.000"
                />
              </label>

              <label className="stack-field">
                <span>سبب التسوية</span>
                <textarea
                  className="field-input"
                  rows={3}
                  value={reconcileNotes}
                  onChange={(event) => setReconcileNotes(event.target.value)}
                  placeholder="مثال: فرق صندوق نهاية المناوبة"
                />
              </label>

              <button
                type="button"
                className="primary-button"
                disabled={isPending || !selectedAccountId || !actualBalance || !reconcileNotes.trim()}
                onClick={() => setConfirmAction("reconciliation")}
              >
                {isPending ? <Loader2 className="spin" size={16} /> : "تأكيد التسوية"}
              </button>
            </div>

            {reconciliationResult ? (
              <div className="result-card">
                <h3>تمت التسوية</h3>
                <p>المتوقع: {formatCurrency(reconciliationResult.expected)}</p>
                <p>الفعلي: {formatCurrency(reconciliationResult.actual)}</p>
                <p>الفرق: {formatCurrency(reconciliationResult.difference)}</p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeSection === "inventory" ? (
        <div className="configuration-shell configuration-shell--split settings-page__split">
          <section className="workspace-panel settings-page__panel">
            <div className="section-heading">
              <div>
                <h2>إكمال الجرد</h2>
              </div>
            </div>

            {inventoryCounts.length === 0 ? (
              <div className="empty-panel settings-page__empty">
                <RefreshCcw size={20} />
                <h3>لا توجد عمليات جرد مفتوحة</h3>
              </div>
            ) : (
              <>
                <label className="stack-field">
                  <span>عملية الجرد</span>
                  <select className="field-input" value={selectedCountId} onChange={(event) => setSelectedCountId(event.target.value)}>
                    {inventoryCounts.map((count) => (
                      <option key={count.id} value={count.id}>
                        {getCountTypeLabel(count.count_type)} - {formatDate(count.count_date)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="stack-list">
                  {selectedCount?.items.map((item, index) => {
                    const draft = selectedCountDraft[index];

                    return (
                      <article key={item.id} className="list-card">
                        <div className="list-card__header">
                          <strong>{item.product_name}</strong>
                          <span>
                            النظام: {formatCompactNumber(item.system_quantity)} | الفروقات الحالية:{" "}
                            {formatCompactNumber(item.difference)}
                          </span>
                        </div>

                        <div className="inline-form-grid">
                          <label className="stack-field">
                            <span>الكمية الفعلية</span>
                            <input
                              className="field-input"
                              type="number"
                              min={0}
                              step={1}
                              value={draft?.actual_quantity ?? item.actual_quantity}
                              onChange={(event) => {
                                const nextValue = Number(event.target.value);
                                setInventoryDrafts((current) => ({
                                  ...current,
                                  [selectedCount.id]: (current[selectedCount.id] ?? []).map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, actual_quantity: nextValue } : entry
                                  )
                                }));
                              }}
                            />
                          </label>

                          <label className="stack-field">
                            <span>سبب الفرق</span>
                            <input
                              className="field-input"
                              type="text"
                              maxLength={255}
                              value={draft?.reason ?? ""}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setInventoryDrafts((current) => ({
                                  ...current,
                                  [selectedCount.id]: (current[selectedCount.id] ?? []).map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, reason: nextValue } : entry
                                  )
                                }));
                              }}
                              placeholder="اختياري"
                            />
                          </label>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="primary-button"
                  disabled={isPending || !selectedCount}
                  onClick={() => setConfirmAction("inventory-complete")}
                >
                  {isPending ? <Loader2 className="spin" size={16} /> : "إكمال الجرد"}
                </button>
              </>
            )}

            {inventoryResult ? (
              <div className="result-card">
                <h3>تم إكمال الجرد</h3>
                <p>عدد المنتجات المعدلة: {formatCompactNumber(inventoryResult.adjusted_products)}</p>
                <p>إجمالي الفرق: {formatCompactNumber(inventoryResult.total_difference)}</p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeSection === "policies" ? (
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
              <span className="status-pill badge badge--neutral">إكمال الجرد</span>
            </div>
          </SectionCard>
        </div>
      ) : null}

      <ConfirmationDialog
        open={confirmAction === "snapshot"}
        title="حفظ اللقطة اليومية"
        confirmLabel="حفظ اللقطة"
        cancelLabel="الرجوع"
        isPending={isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={executeSnapshot}
      />

      <ConfirmationDialog
        open={confirmAction === "reconciliation"}
        title="تأكيد التسوية"
        confirmLabel="تنفيذ التسوية"
        cancelLabel="الرجوع"
        tone="danger"
        isPending={isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={executeReconciliation}
      />

      <ConfirmationDialog
        open={confirmAction === "inventory-complete"}
        title="إكمال الجرد"
        confirmLabel="إكمال الجرد"
        cancelLabel="الرجوع"
        tone="danger"
        isPending={isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={executeInventoryComplete}
      />
    </section>
  );
}
