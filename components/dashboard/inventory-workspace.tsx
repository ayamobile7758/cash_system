"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Boxes, ClipboardCheck, Loader2, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import type {
  InventoryCountOption,
  InventoryProductOption,
  ReconciliationEntryOption,
  SettingsAccount
} from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/utils/formatters";

type CreateInventoryCountResponse = {
  count_id: string;
  count_type: string;
  item_count: number;
  status: string;
};

type InventoryCompleteResponse = {
  count_id: string;
  adjusted_products: number;
  total_difference: number;
};

type ReconciliationResponse = {
  reconciliation_id: string;
  expected: number;
  actual: number;
  difference: number;
};

type InventoryDraftState = Record<
  string,
  Array<{
    inventory_count_item_id: string;
    actual_quantity: number;
    reason: string;
  }>
>;

type InventoryWorkspaceProps = {
  products: InventoryProductOption[];
  accounts: SettingsAccount[];
  inProgressCounts: InventoryCountOption[];
  recentCompletedCounts: InventoryCountOption[];
  recentReconciliations: ReconciliationEntryOption[];
  canReconcile?: boolean;
};

type InventorySection = "create" | "active" | "reconcile" | "history";
type RetryAction = "create-count" | "complete-count" | "reconcile-account" | null;
type ConfirmAction =
  | { type: "complete-count" }
  | { type: "reconcile-account" }
  | null;

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

export function InventoryWorkspace({
  products,
  accounts,
  inProgressCounts,
  recentCompletedCounts,
  recentReconciliations,
  canReconcile = true
}: InventoryWorkspaceProps) {
  const router = useRouter();
  const [countType, setCountType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [countNotes, setCountNotes] = useState("");
  const [selectedCountId, setSelectedCountId] = useState(inProgressCounts[0]?.id ?? "");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [actualBalance, setActualBalance] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [createResult, setCreateResult] = useState<CreateInventoryCountResponse | null>(null);
  const [inventoryResult, setInventoryResult] = useState<InventoryCompleteResponse | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResponse | null>(null);
  const [inventoryDrafts, setInventoryDrafts] = useState<InventoryDraftState>({});
  const [activeSection, setActiveSection] = useState<InventorySection>(inProgressCounts.length > 0 ? "active" : "create");
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<RetryAction>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setInventoryDrafts((current) => {
      const next = { ...current };

      for (const count of inProgressCounts) {
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
  }, [inProgressCounts]);

  useEffect(() => {
    if (!selectedCountId && inProgressCounts[0]?.id) {
      setSelectedCountId(inProgressCounts[0].id);
    }
  }, [inProgressCounts, selectedCountId]);

  const selectedCount = useMemo(
    () => inProgressCounts.find((count) => count.id === selectedCountId) ?? null,
    [inProgressCounts, selectedCountId]
  );

  const selectedCountDraft = selectedCount ? inventoryDrafts[selectedCount.id] ?? [] : [];

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const filteredProducts = useMemo(() => {
    const normalized = productSearchTerm.trim().toLowerCase();
    if (!normalized) {
      return products;
    }

    return products.filter((product) => {
      const haystack = `${product.name} ${product.category}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [productSearchTerm, products]);

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
  }

  function failAction(message: string, action: RetryAction) {
    setActionErrorMessage(message);
    setRetryAction(action);
    toast.error(message);
  }

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  }

  function handleCreateCount() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/inventory/counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            count_type: countType,
            scope,
            product_ids: scope === "selected" ? selectedProductIds : undefined,
            notes: countNotes || undefined
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<CreateInventoryCountResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), "create-count");
          return;
        }

        setCreateResult(envelope.data);
        setCountNotes("");
        setSelectedProductIds([]);
        setProductSearchTerm("");
        setRetryAction(null);
        toast.success("تم بدء عملية الجرد وتحميل البنود المطلوبة.");
        router.refresh();
      })();
    });
  }

  function handleCompleteCount() {
    if (!selectedCount) {
      failAction("يلزم تحديد عملية الجرد.", "complete-count");
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
          failAction(getApiErrorMessage(envelope), "complete-count");
          return;
        }

        setInventoryResult(envelope.data);
        setConfirmAction(null);
        setRetryAction(null);
        toast.success("تم إكمال الجرد وتحديث المخزون.");
        router.refresh();
      })();
    });
  }

  function handleReconciliation() {
    if (!selectedAccountId || !actualBalance || !reconcileNotes.trim()) {
      failAction("أكمل بيانات التسوية قبل المتابعة.", "reconcile-account");
      return;
    }

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
          failAction(getApiErrorMessage(envelope), "reconcile-account");
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

  function retryLastAction() {
    switch (retryAction) {
      case "create-count":
        handleCreateCount();
        break;
      case "complete-count":
        handleCompleteCount();
        break;
      case "reconcile-account":
        handleReconciliation();
        break;
      default:
        break;
    }
  }

  return (
    <section className="operational-page inventory-page">
      <PageHeader
        title="الجرد"
        meta={
          <>
            <span className="status-pill badge badge--neutral">
              مفتوح {formatCompactNumber(inProgressCounts.length)}
            </span>
            <span className="status-pill badge badge--neutral">
              مكتمل {formatCompactNumber(recentCompletedCounts.length)}
            </span>
            {canReconcile ? (
              <span className="status-pill badge badge--neutral">
                تسويات {formatCompactNumber(recentReconciliations.length)}
              </span>
            ) : null}
          </>
        }
        actions={
          <div className="transaction-action-cluster">
            {canReconcile ? (
              <button
                type="button"
                className={activeSection === "reconcile" ? "secondary-button" : "ghost-button btn btn--ghost"}
                onClick={() => setActiveSection("reconcile")}
              >
                التسوية
              </button>
            ) : null}
            <button type="button" className="primary-button" onClick={() => setActiveSection("create")}>
              بدء الجرد
            </button>
          </div>
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

      <div className="operational-section-nav inventory-page__sections" aria-label="أقسام شاشة الجرد">
        <button
          type="button"
          className={activeSection === "create" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("create")}
        >
          بدء الجرد
        </button>
        <button
          type="button"
          className={activeSection === "active" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("active")}
        >
          الجرد المفتوح
        </button>
        {canReconcile ? (
          <button
            type="button"
            className={activeSection === "reconcile" ? "chip-button is-selected" : "chip-button"}
            onClick={() => setActiveSection("reconcile")}
          >
            التسوية
          </button>
        ) : null}
        <button
          type="button"
          className={activeSection === "history" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("history")}
        >
          آخر النتائج
        </button>
      </div>

      {activeSection === "create" ? (
        <div className="operational-layout operational-layout--wide inventory-page__create">
          <section className="workspace-panel inventory-page__create-panel">
            <div className="section-heading">
              <div>
                <h2>جلسة جرد جديدة</h2>
              </div>
              <Boxes size={18} />
            </div>

            <div className="stack-form">
              <label className="stack-field">
                <span>نوع الجرد</span>
                <select value={countType} onChange={(event) => setCountType(event.target.value as typeof countType)}>
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="monthly">شهري</option>
                </select>
              </label>

              <label className="stack-field">
                <span>النطاق</span>
                <select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}>
                  <option value="all">جرد شامل</option>
                  <option value="selected">منتجات محددة</option>
                </select>
              </label>

              <label className="stack-field">
                <span>ملاحظات</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={countNotes}
                  onChange={(event) => setCountNotes(event.target.value)}
                  placeholder="مثال: جرد نهاية اليوم أو مراجعة صنف منخفض"
                />
              </label>

              {scope === "selected" ? (
                <>
                  <label className="workspace-search">
                    <Boxes size={18} />
                    <input
                      type="search"
                      placeholder="ابحث داخل قائمة المنتجات قبل التحديد"
                      value={productSearchTerm}
                      onChange={(event) => setProductSearchTerm(event.target.value)}
                    />
                  </label>

                  <div className="selection-panel">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <label key={product.id} className="selection-chip">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                          />
                          <span>
                            {product.name} ({formatCompactNumber(product.stock_quantity)})
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="empty-panel inventory-page__selection-empty">
                        <Boxes size={20} />
                        <h3>لا توجد منتجات مطابقة</h3>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setProductSearchTerm("")}
                        >
                          مسح البحث
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              <button
                type="button"
                className="primary-button"
                disabled={isPending || (scope === "selected" && selectedProductIds.length === 0)}
                onClick={handleCreateCount}
              >
                {isPending ? <Loader2 className="spin" size={16} /> : "بدء الجرد"}
              </button>
            </div>

            {createResult ? (
              <div className="result-card">
                <h3>تم بدء الجرد</h3>
                <p>النوع: {getCountTypeLabel(createResult.count_type)}</p>
                <p>عدد البنود: {formatCompactNumber(createResult.item_count)}</p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeSection === "active" ? (
        <div className="operational-layout operational-layout--split inventory-page__active">
          <section className="workspace-panel operational-sidebar operational-sidebar--sticky inventory-page__sidebar">
            <div className="section-heading">
              <div>
                <h2>الجلسات المفتوحة</h2>
              </div>
              <ClipboardCheck size={18} />
            </div>

            {inProgressCounts.length === 0 ? (
              <div className="empty-panel inventory-page__empty">
                <ClipboardCheck size={20} />
                <h3>لا توجد جلسات مفتوحة</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveSection("create")}
                >
                  بدء الجرد
                </button>
              </div>
            ) : (
              <div className="stack-list inventory-count-list">
                {inProgressCounts.map((count) => (
                  <button
                    key={count.id}
                    type="button"
                    className={
                      count.id === selectedCountId
                        ? "list-card list-card--interactive is-selected inventory-count-card"
                        : "list-card list-card--interactive inventory-count-card"
                    }
                    onClick={() => setSelectedCountId(count.id)}
                  >
                    <div className="list-card__header">
                      <strong>{getCountTypeLabel(count.count_type)}</strong>
                      <span className="status-pill badge badge--neutral">
                        {formatCompactNumber(count.items.length)} بند
                      </span>
                    </div>
                    <div className="inventory-count-card__meta">
                      <span>{formatDate(count.count_date)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="workspace-panel inventory-page__detail">
            <div className="section-heading">
              <div>
                <h2>
                  {selectedCount ? getCountTypeLabel(selectedCount.count_type) : "اختر جلسة جرد"}
                </h2>
              </div>
              <Boxes size={18} />
            </div>

            {selectedCount ? (
              <>
                <div className="info-strip inventory-page__summary">
                  <span>التاريخ: {formatDate(selectedCount.count_date)}</span>
                  <span>البنود: {formatCompactNumber(selectedCount.items.length)}</span>
                </div>

                <button
                  type="button"
                  className="primary-button inventory-page__primary-action"
                  disabled={isPending || !selectedCount}
                  onClick={() => setConfirmAction({ type: "complete-count" })}
                >
                  {isPending ? <Loader2 className="spin" size={16} /> : "إكمال الجرد"}
                </button>

                <div className="stack-list inventory-line-list">
                  {selectedCount.items.map((item, index) => {
                    const draft = selectedCountDraft[index];
                    const actualQuantity = draft?.actual_quantity ?? item.actual_quantity;
                    const difference = actualQuantity - item.system_quantity;

                    return (
                      <article key={item.id} className="list-card inventory-line-card">
                        <div className="list-card__header">
                          <strong>{item.product_name}</strong>
                          <span
                            className={
                              difference === 0
                                ? "status-pill badge badge--neutral"
                                : "status-pill badge badge--warning"
                            }
                          >
                            {difference === 0
                              ? "مطابق"
                              : `فرق ${difference > 0 ? "+" : ""}${formatCompactNumber(difference)}`}
                          </span>
                        </div>

                        <div className="inventory-line-card__meta">
                          <span>النظام: {formatCompactNumber(item.system_quantity)}</span>
                          <span>الفعلي: {formatCompactNumber(actualQuantity)}</span>
                        </div>

                        <div className="inline-form-grid">
                          <label className="stack-field">
                            <span>الكمية الفعلية</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={actualQuantity}
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
              </>
            ) : (
              <div className="empty-panel inventory-page__empty">
                <Boxes size={20} />
                <h3>اختر جلسة جرد لعرض البنود</h3>
              </div>
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

      {activeSection === "reconcile" ? (
        <div className="operational-layout operational-layout--wide inventory-page__reconcile">
          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <h2>تسوية الحسابات</h2>
              </div>
              <Scale size={18} />
            </div>

            <div className="stack-form">
              <label className="stack-field">
                <span>الحساب</span>
                <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
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
                onClick={() => setConfirmAction({ type: "reconcile-account" })}
              >
                {isPending ? <Loader2 className="spin" size={16} /> : "تأكيد التسوية"}
              </button>
            </div>

            {selectedAccount ? (
              <div className="info-strip">
                <span>الرصيد الحالي: {formatCurrency(selectedAccount.current_balance)}</span>
                <span>المجال: {selectedAccount.module_scope}</span>
              </div>
            ) : null}

            {reconciliationResult ? (
              <div className="result-card">
                <h3>تم حفظ التسوية</h3>
                <p>المتوقع: {formatCurrency(reconciliationResult.expected)}</p>
                <p>الفعلي: {formatCurrency(reconciliationResult.actual)}</p>
                <p>الفرق: {formatCurrency(reconciliationResult.difference)}</p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeSection === "history" ? (
        <div className="operational-layout operational-layout--split inventory-page__history">
          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <h2>آخر الجردات</h2>
              </div>
              <ClipboardCheck size={18} />
            </div>
            <div className="stack-list inventory-history-list">
              {recentCompletedCounts.length > 0 ? (
                recentCompletedCounts.map((count) => (
                  <article key={count.id} className="list-card inventory-history-card">
                    <div className="list-card__header">
                      <strong>{getCountTypeLabel(count.count_type)}</strong>
                      <span className="status-pill badge badge--neutral">
                        {formatCompactNumber(count.items.length)} بند
                      </span>
                    </div>
                    <div className="inventory-history-card__meta">
                      <span>{formatDate(count.count_date)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-panel inventory-page__empty">
                  <ClipboardCheck size={20} />
                  <h3>لا توجد نتائج مكتملة</h3>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveSection("create")}
                  >
                    بدء الجرد
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <h2>آخر التسويات</h2>
              </div>
              <Scale size={18} />
            </div>
            <div className="stack-list inventory-history-list">
              {recentReconciliations.length > 0 ? (
                recentReconciliations.map((entry) => (
                  <article key={entry.id} className="list-card inventory-history-card">
                    <div className="list-card__header">
                      <strong>{entry.account_name}</strong>
                      <span className="status-pill badge badge--warning">
                        {formatCurrency(entry.difference)}
                      </span>
                    </div>
                    <div className="inventory-history-card__meta">
                      <span>{formatDate(entry.reconciliation_date)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-panel inventory-page__empty">
                  <Scale size={20} />
                  <h3>لا توجد تسويات مسجلة</h3>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmationDialog
        open={confirmAction?.type === "complete-count"}
        title="تأكيد إكمال الجرد"
        confirmLabel="إكمال الجرد"
        onConfirm={handleCompleteCount}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
      />

      <ConfirmationDialog
        open={confirmAction?.type === "reconcile-account"}
        title="تأكيد التسوية"
        confirmLabel="تنفيذ التسوية"
        onConfirm={handleReconciliation}
        onCancel={() => setConfirmAction(null)}
        isPending={isPending}
      />
    </section>
  );
}
