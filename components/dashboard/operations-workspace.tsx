"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, Loader2, SmartphoneCharging, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  OperationsAccountOption,
  TopupOption,
  TopupProviderOption,
  TopupReportSummary,
  TransferOption
} from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/utils/formatters";

type OperationsWorkspaceProps = {
  role: "admin" | "pos_staff";
  accounts: OperationsAccountOption[];
  providers: TopupProviderOption[];
  recentTopups: TopupOption[];
  recentTransfers: TransferOption[];
  topupSummary: TopupReportSummary;
};

type TopupResponse = {
  topup_id: string;
  topup_number: string;
  ledger_entry_ids: string[];
};

type TransferResponse = {
  transfer_id: string;
  transfer_number: string;
  ledger_entry_ids: string[];
};

function createUuid() {
  return crypto.randomUUID();
}

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
}

export function OperationsWorkspace({
  role,
  accounts,
  providers,
  recentTopups,
  recentTransfers,
  topupSummary
}: OperationsWorkspaceProps) {
  const router = useRouter();
  const [topupAccountId, setTopupAccountId] = useState(accounts[0]?.id ?? "");
  const [topupProviderId, setTopupProviderId] = useState("");
  const [topupAmount, setTopupAmount] = useState("");
  const [topupProfit, setTopupProfit] = useState("");
  const [topupNotes, setTopupNotes] = useState("");
  const [topupKey, setTopupKey] = useState("");
  const [transferFromAccountId, setTransferFromAccountId] = useState(accounts[0]?.id ?? "");
  const [transferToAccountId, setTransferToAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferKey, setTransferKey] = useState("");
  const [topupResult, setTopupResult] = useState<TopupResponse | null>(null);
  const [transferResult, setTransferResult] = useState<TransferResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!topupKey) {
      setTopupKey(createUuid());
    }

    if (!transferKey) {
      setTransferKey(createUuid());
    }
  }, [topupKey, transferKey]);

  const selectedFromAccount = useMemo(
    () => accounts.find((account) => account.id === transferFromAccountId) ?? null,
    [accounts, transferFromAccountId]
  );
  const selectedToAccount = useMemo(
    () => accounts.find((account) => account.id === transferToAccountId) ?? null,
    [accounts, transferToAccountId]
  );

  const projectedTopupCost = useMemo(() => {
    const amount = Number(topupAmount);
    const profit = Number(topupProfit);

    if (!Number.isFinite(amount) || !Number.isFinite(profit)) {
      return null;
    }

    return amount - profit;
  }, [topupAmount, topupProfit]);

  const projectedTransferBalance =
    selectedFromAccount?.current_balance != null && transferAmount
      ? selectedFromAccount.current_balance - Number(transferAmount)
      : null;

  const canManageTransfers = role === "admin";

  async function handleTopupSubmit() {
    if (!topupAccountId) {
      toast.error("اختر حساب الاستلام أولًا.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/topups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: topupAccountId,
            amount: Number(topupAmount),
            profit_amount: Number(topupProfit),
            supplier_id: topupProviderId || undefined,
            notes: topupNotes || undefined,
            idempotency_key: topupKey
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<TopupResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        setTopupResult(envelope.data);
        setTopupAmount("");
        setTopupProfit("");
        setTopupNotes("");
        setTopupKey(createUuid());
        toast.success(`تم تسجيل الشحن ${envelope.data.topup_number} بنجاح.`);
        router.refresh();
      })();
    });
  }

  async function handleTransferSubmit() {
    if (!canManageTransfers) {
      toast.error("التحويلات الداخلية محصورة بالـ Admin.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_account_id: transferFromAccountId,
            to_account_id: transferToAccountId,
            amount: Number(transferAmount),
            notes: transferNotes || undefined,
            idempotency_key: transferKey
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<TransferResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        setTransferResult(envelope.data);
        setTransferAmount("");
        setTransferNotes("");
        setTransferKey(createUuid());
        toast.success(`تم تسجيل التحويل ${envelope.data.transfer_number} بنجاح.`);
        router.refresh();
      })();
    });
  }

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-07-T02</p>
          <h1>الشحن والتحويلات</h1>
          <p className="workspace-lead">
            تسجيل الشحن متاح للـ Admin وPOS، بينما التحويل الداخلي محصور بالـ Admin فقط. نفس
            السطح يعرض أيضًا baseline تقرير الشحن وربحية آخر العمليات.
          </p>
        </div>
      </div>

      <div className="summary-grid">
        <article className="workspace-panel">
          <p className="eyebrow">TopUp Report</p>
          <h2>{formatCurrency(topupSummary.total_profit)}</h2>
          <p className="workspace-footnote">إجمالي ربح الشحن خلال آخر 30 يومًا.</p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Collected Amount</p>
          <h2>{formatCurrency(topupSummary.total_amount)}</h2>
          <p className="workspace-footnote">إجمالي المبالغ المستلمة من عمليات الشحن.</p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Activity</p>
          <h2>{formatCompactNumber(topupSummary.entry_count)}</h2>
          <p className="workspace-footnote">
            {topupSummary.top_supplier_name
              ? `أعلى مزود ربحًا: ${topupSummary.top_supplier_name}`
              : "لا يوجد مزود مهيمن خلال الفترة الحالية."}
          </p>
        </article>
      </div>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TopUp</p>
              <h2>تسجيل شحن جديد</h2>
            </div>
            <SmartphoneCharging size={18} />
          </div>

          <div className="stack-form">
            <label className="stack-field">
              <span>شركة الشحن</span>
              <select value={topupProviderId} onChange={(event) => setTopupProviderId(event.target.value)}>
                <option value="">اختياري — بدون مزود</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="inline-form-grid">
              <label className="stack-field">
                <span>حساب الاستلام</span>
                <select value={topupAccountId} onChange={(event) => setTopupAccountId(event.target.value)}>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-field">
                <span>المبلغ المستلم</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={topupAmount}
                  onChange={(event) => setTopupAmount(event.target.value)}
                  placeholder="100"
                />
              </label>
            </div>

            <div className="inline-form-grid">
              <label className="stack-field">
                <span>الربح</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={topupProfit}
                  onChange={(event) => setTopupProfit(event.target.value)}
                  placeholder="3"
                />
              </label>

              <div className="info-strip">
                <strong>تكلفة الشحن الفعلية</strong>
                <span>
                  {projectedTopupCost == null ? "أدخل المبلغ والربح" : formatCurrency(projectedTopupCost)}
                </span>
              </div>
            </div>

            <label className="stack-field">
              <span>ملاحظة</span>
              <textarea
                rows={3}
                maxLength={255}
                value={topupNotes}
                onChange={(event) => setTopupNotes(event.target.value)}
                placeholder="مثال: شحن رصيد عميل سريع"
              />
            </label>

            <button
              type="button"
              className="primary-button"
              disabled={isPending}
              onClick={() => {
                void handleTopupSubmit();
              }}
            >
              {isPending ? <Loader2 className="spin" size={16} /> : "تأكيد الشحن"}
            </button>
          </div>

          {topupResult ? (
            <div className="result-card">
              <h3>TopUp Saved</h3>
              <p>رقم العملية: {topupResult.topup_number}</p>
              <p>عدد القيود: {topupResult.ledger_entry_ids.length}</p>
            </div>
          ) : null}
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Transfer</p>
              <h2>تحويل داخلي بين الحسابات</h2>
            </div>
            <ArrowRightLeft size={18} />
          </div>

          {canManageTransfers ? (
            <div className="stack-form">
              <div className="inline-form-grid">
                <label className="stack-field">
                  <span>من حساب</span>
                  <select
                    value={transferFromAccountId}
                    onChange={(event) => setTransferFromAccountId(event.target.value)}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="stack-field">
                  <span>إلى حساب</span>
                  <select
                    value={transferToAccountId}
                    onChange={(event) => setTransferToAccountId(event.target.value)}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="inline-form-grid">
                <div className="info-strip">
                  <strong>رصيد المصدر الحالي</strong>
                  <span>
                    {selectedFromAccount?.current_balance == null
                      ? "غير متاح"
                      : formatCurrency(selectedFromAccount.current_balance)}
                  </span>
                </div>

                <div className="info-strip">
                  <strong>الرصيد المتوقع بعد التحويل</strong>
                  <span>
                    {projectedTransferBalance == null
                      ? "أدخل مبلغ التحويل"
                      : formatCurrency(projectedTransferBalance)}
                  </span>
                </div>
              </div>

              <label className="stack-field">
                <span>مبلغ التحويل</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                  placeholder="50"
                />
              </label>

              <label className="stack-field">
                <span>ملاحظة</span>
                <textarea
                  rows={3}
                  maxLength={255}
                  value={transferNotes}
                  onChange={(event) => setTransferNotes(event.target.value)}
                  placeholder="مثال: نقل سيولة إلى حساب فيزا"
                />
              </label>

              <button
                type="button"
                className="secondary-button"
                disabled={isPending}
                onClick={() => {
                  void handleTransferSubmit();
                }}
              >
                {isPending ? <Loader2 className="spin" size={16} /> : "تأكيد التحويل"}
              </button>
            </div>
          ) : (
            <div className="empty-panel">
              <Wallet size={18} />
              <p>التحويلات الداخلية محصورة بالـ Admin. يمكن لحسابات POS تسجيل الشحن فقط.</p>
            </div>
          )}

          {transferResult ? (
            <div className="result-card">
              <h3>Transfer Saved</h3>
              <p>رقم التحويل: {transferResult.transfer_number}</p>
              <p>عدد القيود: {transferResult.ledger_entry_ids.length}</p>
            </div>
          ) : null}
        </section>
      </div>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent TopUps</p>
              <h2>آخر عمليات الشحن</h2>
            </div>
          </div>

          {recentTopups.length === 0 ? (
            <div className="empty-panel">
              <p>لا توجد عمليات شحن حتى الآن.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الرقم</th>
                    <th>التاريخ</th>
                    <th>الحساب</th>
                    <th>المبلغ</th>
                    <th>الربح</th>
                    <th>المزود</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTopups.map((topup) => (
                    <tr key={topup.id}>
                      <td>{topup.topup_number}</td>
                      <td>{formatDate(topup.topup_date)}</td>
                      <td>{topup.account_name}</td>
                      <td>{formatCurrency(topup.amount)}</td>
                      <td>{formatCurrency(topup.profit_amount)}</td>
                      <td>{topup.supplier_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent Transfers</p>
              <h2>آخر التحويلات</h2>
            </div>
          </div>

          {!canManageTransfers ? (
            <div className="empty-panel">
              <p>هذه القائمة تظهر للـ Admin فقط.</p>
            </div>
          ) : recentTransfers.length === 0 ? (
            <div className="empty-panel">
              <p>لا توجد تحويلات داخلية حتى الآن.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الرقم</th>
                    <th>التاريخ</th>
                    <th>من</th>
                    <th>إلى</th>
                    <th>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td>{transfer.transfer_number}</td>
                      <td>{formatDate(transfer.transfer_date)}</td>
                      <td>{transfer.from_account_name}</td>
                      <td>{transfer.to_account_name}</td>
                      <td>{formatCurrency(transfer.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
