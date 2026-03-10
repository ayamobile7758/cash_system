"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { InventoryCountOption, SettingsAccount, SettingsSnapshot } from "@/lib/api/dashboard";
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
};

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
}

export function SettingsOps({ accounts, snapshots, inventoryCounts }: SettingsOpsProps) {
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

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-05-T02 / T03 / T05 / T06</p>
          <h1>الإعدادات التشغيلية والإغلاق اليومي</h1>
          <p className="workspace-lead">
            من هنا تُدار اللقطة اليومية، فحص سلامة الأرصدة، التسوية، وإكمال الجرد. كما تُوثق
            قرارات baseline الخاصة بالطباعة وSOP الأجهزة.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Daily Snapshot</p>
              <h2>حفظ اللقطة اليومية</h2>
            </div>
          </div>

          <div className="stack-form">
            <label className="stack-field">
              <span>ملاحظات اختيارية</span>
              <textarea
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
              onClick={() => {
                startTransition(() => {
                  void (async () => {
                    const response = await fetch("/api/snapshots", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ notes: snapshotNotes || undefined })
                    });

                    const envelope = (await response.json()) as StandardEnvelope<SnapshotResponse>;
                    if (!response.ok || !envelope.success || !envelope.data) {
                      toast.error(getApiErrorMessage(envelope));
                      return;
                    }

                    setSnapshotResult(envelope.data);
                    toast.success(
                      envelope.data.is_replay
                        ? "تمت إعادة نفس اللقطة اليومية لهذا اليوم."
                        : "تم حفظ اللقطة اليومية بنجاح."
                    );
                    router.refresh();
                  })();
                });
              }}
            >
              {isPending ? <Loader2 className="spin" size={16} /> : "حفظ اللقطة اليومية"}
            </button>
          </div>

          {snapshotResult ? (
            <div className="result-card">
              <h3>{snapshotResult.is_replay ? "Replay" : "Snapshot Saved"}</h3>
              <p>إجمالي المبيعات: {formatCurrency(snapshotResult.total_sales)}</p>
              <p>صافي المبيعات: {formatCurrency(snapshotResult.net_sales)}</p>
              <p>عدد الفواتير: {formatCompactNumber(snapshotResult.invoice_count)}</p>
            </div>
          ) : null}
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Balance Integrity</p>
              <h2>فحص سلامة الأرصدة</h2>
            </div>
          </div>

          <p className="workspace-footnote">
            المسار الإداري يستدعي <code>POST /api/health/balance-check</code> ويعيد نتيجة drift
            قابلة للمراجعة قبل التسوية.
          </p>

          <button
            type="button"
            className="secondary-button"
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                void (async () => {
                  const response = await fetch("/api/health/balance-check", {
                    method: "POST"
                  });

                  const envelope = (await response.json()) as StandardEnvelope<BalanceCheckResponse>;
                  if (!response.ok || !envelope.success || !envelope.data) {
                    toast.error(getApiErrorMessage(envelope));
                    return;
                  }

                  setBalanceResult(envelope.data);
                  toast.success(
                    envelope.data.drift_count === 0
                      ? "الأرصدة سليمة بلا فروقات."
                      : `تم اكتشاف ${envelope.data.drift_count} فروقات تحتاج مراجعة.`
                  );
                });
              });
            }}
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

      <div className="detail-grid">
        <section className="workspace-panel">
          <p className="eyebrow">Reconciliation</p>
          <h2>تسوية الحسابات</h2>

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
              onClick={() => {
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
              }}
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

        <section className="workspace-panel">
          <p className="eyebrow">Inventory Completion</p>
          <h2>إكمال عمليات الجرد المفتوحة</h2>

          {inventoryCounts.length === 0 ? (
            <div className="empty-panel">
              <p>لا توجد عمليات جرد مفتوحة حاليًا.</p>
            </div>
          ) : (
            <>
              <label className="stack-field">
                <span>عملية الجرد</span>
                <select value={selectedCountId} onChange={(event) => setSelectedCountId(event.target.value)}>
                  {inventoryCounts.map((count) => (
                    <option key={count.id} value={count.id}>
                      {count.count_type} - {formatDate(count.count_date)}
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
                disabled={isPending || !selectedCount}
                onClick={() => {
                  if (!selectedCount) {
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
                      toast.success("تم إكمال الجرد وإنشاء التسويات اللازمة.");
                      router.refresh();
                    })();
                  });
                }}
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

      <div className="detail-grid detail-grid--thirds">
        <section className="workspace-panel">
          <p className="eyebrow">Recent Snapshots</p>
          <h2>آخر اللقطات المحفوظة</h2>
          <div className="stack-list">
            {snapshots.length > 0 ? (
              snapshots.map((snapshot) => (
                <article key={snapshot.id} className="list-card">
                  <div className="list-card__header">
                    <strong>{formatDate(snapshot.snapshot_date)}</strong>
                    <span>{formatCompactNumber(snapshot.invoice_count)} فاتورة</span>
                  </div>
                  <p>صافي المبيعات: {formatCurrency(snapshot.net_sales)}</p>
                  <p className="workspace-footnote">آخر إنشاء: {formatDateTime(snapshot.created_at)}</p>
                </article>
              ))
            ) : (
              <div className="empty-panel">
                <p>لا توجد لقطات حتى الآن.</p>
              </div>
            )}
          </div>
        </section>

        <section className="workspace-panel">
          <p className="eyebrow">Print Baseline</p>
          <h2>قرار الطباعة في MVP</h2>
          <p className="workspace-footnote">
            baseline الطباعة الحالي يعتمد على <code>window.print()</code> و<code>@media print</code> من
            شاشة الفواتير، مع إخفاء عناصر التنقل وإبقاء محتوى الفاتورة فقط.
          </p>
        </section>

        <section className="workspace-panel">
          <p className="eyebrow">User / Device SOP</p>
          <h2>قرار فجوة المستخدم/الجهاز</h2>
          <p className="workspace-footnote">
            إدارة كلمة المرور، الجهاز المفقود، تغيير الصلاحيات، وإنهاء الجلسات تبقى ضمن SOPs
            التشغيلية <code>32..36</code> في هذه المرحلة، بدون UI مخصص داخل التطبيق قبل PX-06.
          </p>
          <p className="warning-inline">
            <AlertTriangle size={14} />
            هذا قرار نطاق MVP موثق، وليس ادعاء بوجود إدارة أجهزة داخلية كاملة.
          </p>
        </section>
      </div>
    </section>
  );
}
