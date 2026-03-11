"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Boxes, ClipboardCheck, Loader2, Scale, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
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
  const [createResult, setCreateResult] = useState<CreateInventoryCountResponse | null>(null);
  const [inventoryResult, setInventoryResult] = useState<InventoryCompleteResponse | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResponse | null>(null);
  const [inventoryDrafts, setInventoryDrafts] = useState<InventoryDraftState>({});
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

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  }

  async function handleCreateCount() {
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
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        setCreateResult(envelope.data);
        setCountNotes("");
        setSelectedProductIds([]);
        toast.success("تم بدء عملية الجرد وتحميل البنود المطلوبة.");
        router.refresh();
      })();
    });
  }

  async function handleCompleteCount() {
    if (!selectedCount) {
      toast.error("اختر عملية جرد أولًا.");
      return;
    }

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
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        setInventoryResult(envelope.data);
        toast.success("تم إكمال الجرد وتحديث المخزون.");
        router.refresh();
      })();
    });
  }

  async function handleReconciliation() {
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
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        setReconciliationResult(envelope.data);
        toast.success("تم إنشاء قيد التسوية بنجاح.");
        router.refresh();
      })();
    });
  }

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-07-T03</p>
          <h1>الجرد والتسوية المحسنة</h1>
          <p className="workspace-lead">
            بدء جرد يومي أو شامل، إدخال الفروقات مع الأسباب، وإغلاق الفروقات المالية عبر تسويات موثقة داخل نفس
            المسار الإداري.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Start Count</p>
              <h2>بدء عملية جرد جديدة</h2>
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
              <div className="selection-panel">
                {products.map((product) => (
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
                ))}
              </div>
            ) : null}

            <button
              type="button"
              className="primary-button"
              disabled={isPending || (scope === "selected" && selectedProductIds.length === 0)}
              onClick={() => void handleCreateCount()}
            >
              {isPending ? <Loader2 className="spin" size={16} /> : "بدء الجرد"}
            </button>
          </div>

          {createResult ? (
            <div className="result-card">
              <h3>تم بدء الجرد</h3>
              <p>النوع: {createResult.count_type}</p>
              <p>عدد البنود: {formatCompactNumber(createResult.item_count)}</p>
            </div>
          ) : null}
        </section>

        {canReconcile ? (
          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Reconciliation</p>
                <h2>تسوية حساب مباشر</h2>
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
                  placeholder={selectedAccount ? String(selectedAccount.current_balance) : "0.000"}
                />
              </label>

              <label className="stack-field">
                <span>سبب الفرق</span>
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
                onClick={() => void handleReconciliation()}
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
        ) : (
          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Reconciliation</p>
                <h2>التسوية المالية</h2>
              </div>
              <Scale size={18} />
            </div>

            <p className="workspace-footnote">
              بدء الجرد وإكماله متاحان عبر bundle الجرد، لكن إنشاء قيود التسوية المالية يبقى محصورًا بالـ Admin.
            </p>
          </section>
        )}
      </div>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">In Progress</p>
              <h2>عمليات الجرد المفتوحة</h2>
            </div>
            <ClipboardCheck size={18} />
          </div>

          {inProgressCounts.length === 0 ? (
            <div className="empty-panel">
              <p>لا توجد عمليات جرد مفتوحة حاليًا.</p>
            </div>
          ) : (
            <>
              <label className="stack-field">
                <span>اختر عملية جرد</span>
                <select value={selectedCountId} onChange={(event) => setSelectedCountId(event.target.value)}>
                  {inProgressCounts.map((count) => (
                    <option key={count.id} value={count.id}>
                      {count.count_type} - {formatDate(count.count_date)} ({formatCompactNumber(count.items.length)} بند)
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
                disabled={isPending}
                onClick={() => void handleCompleteCount()}
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

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent Activity</p>
              <h2>آخر نتائج الجرد والتسوية</h2>
            </div>
            <TriangleAlert size={18} />
          </div>

          <div className="stack-list">
            {recentCompletedCounts.length > 0 ? (
              recentCompletedCounts.map((count) => {
                const adjustedProducts = count.items.filter((item) => item.difference !== 0).length;
                const totalDifference = count.items.reduce((sum, item) => sum + Math.abs(item.difference), 0);

                return (
                  <article key={count.id} className="list-card">
                    <div className="list-card__header">
                      <strong>جرد {count.count_type}</strong>
                      <span>{formatDate(count.count_date)}</span>
                    </div>
                    <p>بنود معدلة: {formatCompactNumber(adjustedProducts)}</p>
                    <p className="workspace-footnote">إجمالي الفرق: {formatCompactNumber(totalDifference)}</p>
                  </article>
                );
              })
            ) : (
              <div className="empty-panel">
                <p>لا توجد عمليات جرد مكتملة بعد.</p>
              </div>
            )}
          </div>

          {canReconcile ? (
            <div className="stack-list">
              {recentReconciliations.length > 0 ? (
                recentReconciliations.map((entry) => (
                  <article key={entry.id} className="list-card">
                    <div className="list-card__header">
                      <strong>{entry.account_name}</strong>
                      <span>{formatDate(entry.reconciliation_date)}</span>
                    </div>
                    <p>المتوقع: {formatCurrency(entry.expected_balance)}</p>
                    <p>الفعلي: {formatCurrency(entry.actual_balance)}</p>
                    <p className="workspace-footnote">الفرق: {formatCurrency(entry.difference)}</p>
                  </article>
                ))
              ) : (
                <div className="empty-panel">
                  <p>لا توجد تسويات مسجلة حتى الآن.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-panel">
              <p>سجل التسويات مخصص للـ Admin فقط.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
