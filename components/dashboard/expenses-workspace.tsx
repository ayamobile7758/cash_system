"use client";

import { useState, useTransition } from "react";
import { BellRing, Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import type {
  ExpenseAccountOption,
  ExpenseCategoryOption,
  ExpenseEntryOption,
  ExpenseSummary
} from "@/lib/api/expenses";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency, formatDateTime } from "@/lib/utils/formatters";

type ExpensesWorkspaceProps = {
  role: "admin" | "pos_staff";
  categories: ExpenseCategoryOption[];
  accounts: ExpenseAccountOption[];
  recentExpenses: ExpenseEntryOption[];
  summary: ExpenseSummary;
};

type CreateExpenseResponse = {
  expense_id: string;
  expense_number: string;
  ledger_entry_id: string;
};

type ExpenseCategoryResponse = ExpenseCategoryOption;

type CategoryDraftState = Record<
  string,
  {
    name: string;
    type: "fixed" | "variable";
    description: string;
    is_active: boolean;
    sort_order: string;
  }
>;
type ExpensesRetryAction = "create-expense" | "create-category" | "update-category";
type ExpensesSection = "create" | "recent" | "categories";

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
}

function formatBalanceLabel(account: ExpenseAccountOption) {
  if (account.current_balance == null) {
    return "الرصيد مخفي لهذا الدور";
  }

  return `الرصيد الحالي: ${formatCurrency(account.current_balance)}`;
}

function getCategoryTypeLabel(type: "fixed" | "variable") {
  return type === "fixed" ? "ثابتة" : "متغيرة";
}

export function ExpensesWorkspace({
  role,
  categories,
  accounts,
  recentExpenses,
  summary
}: ExpensesWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [createResult, setCreateResult] = useState<CreateExpenseResponse | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"fixed" | "variable">("variable");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryIsActive, setNewCategoryIsActive] = useState(true);
  const [newCategorySortOrder, setNewCategorySortOrder] = useState("0");
  const [categoryResult, setCategoryResult] = useState<ExpenseCategoryResponse | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<ExpensesRetryAction | null>(null);
  const [retryCategoryId, setRetryCategoryId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ExpensesSection>("create");
  const visibleSection = role === "admin" || activeSection !== "categories" ? activeSection : "create";
  const [categoryDrafts, setCategoryDrafts] = useState<CategoryDraftState>(() =>
    Object.fromEntries(
      categories.map((category) => [
        category.id,
        {
          name: category.name,
          type: category.type,
          description: category.description ?? "",
          is_active: category.is_active,
          sort_order: String(category.sort_order)
        }
      ])
    )
  );

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
    setRetryCategoryId(null);
  }

  function failAction(message: string, action: ExpensesRetryAction, categoryIdToUpdate?: string) {
    setActionErrorMessage(message);
    setRetryAction(action);
    setRetryCategoryId(categoryIdToUpdate ?? null);
    toast.error(message);
  }

  async function handleCreateExpense() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(amount),
            account_id: accountId,
            expense_category_id: categoryId,
            description,
            notes: notes || undefined,
            idempotency_key: crypto.randomUUID()
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<CreateExpenseResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), "create-expense");
          return;
        }

        setCreateResult(envelope.data);
        setAmount("");
        setDescription("");
        setNotes("");
        clearActionFeedback();
        toast.success("تم تسجيل المصروف بنجاح.");
        router.refresh();
      })();
    });
  }

  async function handleCreateCategory() {
    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/expense-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCategoryName,
            type: newCategoryType,
            description: newCategoryDescription || undefined,
            is_active: newCategoryIsActive,
            sort_order: Number(newCategorySortOrder || "0")
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<ExpenseCategoryResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), "create-category");
          return;
        }

        setCategoryResult(envelope.data);
        setNewCategoryName("");
        setNewCategoryDescription("");
        setNewCategoryType("variable");
        setNewCategoryIsActive(true);
        setNewCategorySortOrder("0");
        clearActionFeedback();
        toast.success("تم إنشاء فئة المصروف بنجاح.");
        router.refresh();
      })();
    });
  }

  async function handleUpdateCategory(categoryIdToUpdate: string) {
    const draft = categoryDrafts[categoryIdToUpdate];
    if (!draft) {
      return;
    }

    clearActionFeedback();
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/expense-categories/${categoryIdToUpdate}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            type: draft.type,
            description: draft.description || null,
            is_active: draft.is_active,
            sort_order: Number(draft.sort_order || "0")
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<ExpenseCategoryResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), "update-category", categoryIdToUpdate);
          return;
        }

        setCategoryResult(envelope.data);
        clearActionFeedback();
        toast.success(`تم تحديث فئة المصروف "${envelope.data.name}".`);
        router.refresh();
      })();
    });
  }

  function retryLastAction() {
    switch (retryAction) {
      case "create-expense":
        void handleCreateExpense();
        break;
      case "create-category":
        void handleCreateCategory();
        break;
      case "update-category":
        if (retryCategoryId) {
          void handleUpdateCategory(retryCategoryId);
        }
        break;
      default:
        break;
    }
  }

  return (
    <section className="operational-page expenses-page">
      <PageHeader
        title="المصروفات"
        meta={
          <>
            <span className="status-pill badge badge--warning">
              الشهر {formatCurrency(summary.total_expenses)}
            </span>
            <span className="status-pill badge badge--neutral">
              قيود {formatCompactNumber(summary.expense_count)}
            </span>
            <span className="status-pill badge badge--neutral">
              فئات {formatCompactNumber(summary.active_category_count)}
            </span>
          </>
        }
        actions={
          <div className="transaction-action-cluster">
            {role === "admin" ? (
              <button
                type="button"
                className={visibleSection === "categories" ? "secondary-button" : "ghost-button btn btn--ghost"}
                onClick={() => setActiveSection("categories")}
              >
                إدارة الفئات
              </button>
            ) : null}
            <button type="button" className="primary-button" onClick={() => setActiveSection("create")}>
              تسجيل المصروف
            </button>
          </div>
        }
      />

      <div className="operational-page__meta-grid expenses-page__summary">
        <article className="operational-page__meta-card stat-card">
          <span className="operational-page__meta-label">إجمالي الشهر</span>
          <strong className="operational-page__meta-value">{formatCurrency(summary.total_expenses)}</strong>
        </article>
        <article className="operational-page__meta-card stat-card">
          <span className="operational-page__meta-label">عدد القيود</span>
          <strong className="operational-page__meta-value">{formatCompactNumber(summary.expense_count)}</strong>
        </article>
        <article className="operational-page__meta-card stat-card">
          <span className="operational-page__meta-label">الفئات النشطة</span>
          <strong className="operational-page__meta-value">{formatCompactNumber(summary.active_category_count)}</strong>
        </article>
      </div>

      <div className="operational-section-nav expenses-page__sections" aria-label="أقسام شاشة المصروفات">
        <button
          type="button"
          className={visibleSection === "create" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("create")}
        >
          تسجيل المصروف
        </button>
        <button
          type="button"
          className={visibleSection === "recent" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("recent")}
        >
          آخر القيود
        </button>
        {role === "admin" ? (
          <button
            type="button"
            className={visibleSection === "categories" ? "chip-button is-selected" : "chip-button"}
            onClick={() => setActiveSection("categories")}
          >
            إدارة الفئات
          </button>
        ) : null}
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

      {visibleSection === "create" ? <div className="operational-layout operational-layout--split expenses-page__create">
        <section className="workspace-panel expenses-page__form-panel">
          <div className="section-heading">
            <div>
              <h2>تسجيل مصروف</h2>
            </div>
            <Wallet size={18} />
          </div>

          <div className="stack-form">
            <label className="stack-field">
              <span>الحساب</span>
              <select className="field-input" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {formatBalanceLabel(account)}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack-field">
              <span>فئة المصروف</span>
              <select className="field-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({getCategoryTypeLabel(category.type)})
                  </option>
                ))}
              </select>
            </label>

            <label className="stack-field">
              <span>المبلغ</span>
              <input
                className="field-input"
                type="number"
                min={0.001}
                step="0.001"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>

            <label className="stack-field">
              <span>الوصف</span>
              <input className="field-input" value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>

            <label className="stack-field">
              <span>ملاحظات</span>
              <textarea className="field-input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>

            <button
              type="button"
              className="primary-button"
              disabled={isPending || !amount || !accountId || !categoryId || !description.trim()}
              onClick={() => void handleCreateExpense()}
            >
              {isPending ? <Loader2 className="spin" size={16} /> : "تسجيل المصروف"}
            </button>
          </div>

          {createResult ? (
            <div className="result-card">
              <h3>تم حفظ المصروف</h3>
              <p>رقم المصروف: {createResult.expense_number}</p>
            </div>
          ) : null}
        </section>

        <section className="workspace-panel operational-sidebar operational-sidebar--sticky expenses-page__recent-panel">
          <div className="section-heading">
            <div>
              <h2>آخر القيود</h2>
            </div>
            <BellRing size={18} />
          </div>

          <div className="stack-list expenses-page__list">
            {recentExpenses.length > 0 ? (
              recentExpenses.map((expense) => (
                <article key={expense.id} className="list-card expense-entry-card">
                  <div className="list-card__header">
                    <strong><bdi dir="ltr">{expense.expense_number}</bdi></strong>
                    <span className="status-pill badge badge--warning">{formatCurrency(expense.amount)}</span>
                  </div>
                  <p className="expense-entry-card__title">{expense.description}</p>
                  <div className="expense-entry-card__chips">
                    <span className="product-pill product-pill--accent">{expense.category_name}</span>
                    <span className="product-pill">{expense.account_name}</span>
                  </div>
                  <div className="expense-entry-card__meta">
                    <span>{expense.created_by_name ?? "غير معروف"}</span>
                    <span>{formatDateTime(expense.created_at)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-panel expenses-page__empty">
                <Wallet size={20} />
                <h3>لا توجد مصروفات مسجلة</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveSection("create")}
                >
                  تسجيل المصروف
                </button>
              </div>
            )}
          </div>
        </section>
      </div> : null}

      {visibleSection === "recent" ? (
        <div className="operational-layout operational-layout--wide expenses-page__recent">
          <section className="workspace-panel operational-content">
            <div className="section-heading">
              <div>
                <h2>القيود المسجلة</h2>
              </div>
              <BellRing size={18} />
            </div>

            <div className="stack-list expenses-page__list">
              {recentExpenses.length > 0 ? (
                recentExpenses.map((expense) => (
                  <article key={expense.id} className="list-card expense-entry-card">
                    <div className="list-card__header">
                      <strong><bdi dir="ltr">{expense.expense_number}</bdi></strong>
                      <span className="status-pill badge badge--warning">{formatCurrency(expense.amount)}</span>
                    </div>
                    <p className="expense-entry-card__title">{expense.description}</p>
                    <div className="expense-entry-card__chips">
                      <span className="product-pill product-pill--accent">{expense.category_name}</span>
                      <span className="product-pill">{expense.account_name}</span>
                    </div>
                    <div className="expense-entry-card__meta">
                      <span>{expense.created_by_name ?? "غير معروف"}</span>
                      <span>{formatDateTime(expense.created_at)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-panel expenses-page__empty">
                  <Wallet size={20} />
                  <h3>لا توجد مصروفات مسجلة</h3>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveSection("create")}
                  >
                    تسجيل المصروف
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {visibleSection === "categories" ? (
        <section className="workspace-panel expenses-page__categories">
          <div className="section-heading">
            <div>
              <h2>إدارة الفئات</h2>
            </div>
            <Wallet size={18} />
          </div>

          <div className="detail-grid">
            <section className="workspace-panel">
              <div className="stack-form">
                <label className="stack-field">
                  <span>اسم الفئة</span>
                  <input className="field-input" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
                </label>

                <label className="stack-field">
                  <span>النوع</span>
                  <select
                    className="field-input"
                    value={newCategoryType}
                    onChange={(event) => setNewCategoryType(event.target.value as "fixed" | "variable")}
                  >
                    <option value="fixed">ثابتة</option>
                    <option value="variable">متغيرة</option>
                  </select>
                </label>

                <label className="stack-field">
                  <span>الترتيب</span>
                  <input
                    className="field-input"
                    type="number"
                    step="1"
                    value={newCategorySortOrder}
                    onChange={(event) => setNewCategorySortOrder(event.target.value)}
                  />
                </label>

                <label className="stack-field">
                  <span>الوصف</span>
                  <textarea
                    className="field-input"
                    rows={3}
                    value={newCategoryDescription}
                    onChange={(event) => setNewCategoryDescription(event.target.value)}
                  />
                </label>

                <label className="checkbox-field">
                  <input
                    className="field-input"
                    type="checkbox"
                    checked={newCategoryIsActive}
                    onChange={(event) => setNewCategoryIsActive(event.target.checked)}
                  />
                  <span>الفئة مفعّلة</span>
                </label>

                <button
                  type="button"
                  className="primary-button"
                  disabled={isPending || !newCategoryName.trim()}
                  onClick={() => void handleCreateCategory()}
                >
                  {isPending ? <Loader2 className="spin" size={16} /> : "إنشاء فئة جديدة"}
                </button>
              </div>

              {categoryResult ? (
                <div className="result-card">
                  <h3>آخر تحديث على الفئات</h3>
                  <p>{categoryResult.name}</p>
                  <p>النوع: {getCategoryTypeLabel(categoryResult.type)}</p>
                </div>
              ) : null}
            </section>

            <section className="workspace-panel">
              <div className="stack-list">
                {categories.map((category) => {
                  const draft = categoryDrafts[category.id];
                  const baseDraft = draft ?? {
                    name: category.name,
                    type: category.type,
                    description: category.description ?? "",
                    is_active: category.is_active,
                    sort_order: String(category.sort_order)
                  };

                  return (
                    <article key={category.id} className="list-card">
                      <div className="stack-form">
                        <label className="stack-field">
                          <span>الاسم</span>
                          <input
                            className="field-input"
                            value={baseDraft.name}
                            onChange={(event) =>
                              setCategoryDrafts((current) => ({
                                ...current,
                                [category.id]: {
                                  ...baseDraft,
                                  name: event.target.value
                                }
                              }))
                            }
                          />
                        </label>

                        <label className="stack-field">
                          <span>النوع</span>
                          <select
                            className="field-input"
                            value={baseDraft.type}
                            onChange={(event) =>
                              setCategoryDrafts((current) => ({
                                ...current,
                                [category.id]: {
                                  ...baseDraft,
                                  type: event.target.value as "fixed" | "variable"
                                }
                              }))
                            }
                          >
                            <option value="fixed">ثابتة</option>
                            <option value="variable">متغيرة</option>
                          </select>
                        </label>

                        <label className="stack-field">
                          <span>الوصف</span>
                          <textarea
                            className="field-input"
                            rows={2}
                            value={baseDraft.description}
                            onChange={(event) =>
                              setCategoryDrafts((current) => ({
                                ...current,
                                [category.id]: {
                                  ...baseDraft,
                                  description: event.target.value
                                }
                              }))
                            }
                          />
                        </label>

                        <label className="stack-field">
                          <span>الترتيب</span>
                          <input
                            className="field-input"
                            type="number"
                            value={baseDraft.sort_order}
                            onChange={(event) =>
                              setCategoryDrafts((current) => ({
                                ...current,
                                [category.id]: {
                                  ...baseDraft,
                                  sort_order: event.target.value
                                }
                              }))
                            }
                          />
                        </label>

                        <label className="checkbox-field">
                          <input
                            className="field-input"
                            type="checkbox"
                            checked={baseDraft.is_active}
                            onChange={(event) =>
                              setCategoryDrafts((current) => ({
                                ...current,
                                [category.id]: {
                                  ...baseDraft,
                                  is_active: event.target.checked
                                }
                              }))
                            }
                          />
                          <span>مفعّلة</span>
                        </label>

                        <button
                          type="button"
                          className="secondary-button"
                          disabled={isPending}
                          onClick={() => void handleUpdateCategory(category.id)}
                        >
                          حفظ التعديلات
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      ) : null}
    </section>
  );
}
