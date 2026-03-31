"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Save, Search, ShoppingCart, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import type {
  AccountOption,
  PurchaseOrderOption,
  PurchaseProductOption,
  SupplierOption,
  SupplierPaymentOption
} from "@/lib/api/dashboard";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/utils/formatters";

type SupplierMutationResponse = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  current_balance: number;
  is_active: boolean;
};

type PurchaseResponse = {
  purchase_order_id: string;
  purchase_number: string;
  total: number;
};

type SupplierPaymentResponse = {
  payment_id: string;
  payment_number: string;
  remaining_balance: number;
};

type SupplierDraft = {
  name: string;
  phone: string;
  address: string;
  is_active: boolean;
};

type PurchaseDraftItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
};

type SuppliersWorkspaceProps = {
  suppliers: SupplierOption[];
  products: PurchaseProductOption[];
  accounts: AccountOption[];
  purchaseOrders: PurchaseOrderOption[];
  supplierPayments: SupplierPaymentOption[];
};

type SupplierBalanceFilter = "all" | "with_balance" | "zero_balance";
type SuppliersRetryAction = "supplier" | "purchase" | "payment";
type SuppliersSection = "directory" | "purchase" | "payment" | "history";

const emptySupplierDraft: SupplierDraft = {
  name: "",
  phone: "",
  address: "",
  is_active: true
};

function createUuid() {
  return crypto.randomUUID();
}

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
}

export function SuppliersWorkspace({
  suppliers,
  products,
  accounts,
  purchaseOrders,
  supplierPayments
}: SuppliersWorkspaceProps) {
  const router = useRouter();
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<SupplierBalanceFilter>("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id ?? "");
  const [isCreateMode, setIsCreateMode] = useState(suppliers.length === 0);
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(emptySupplierDraft);
  const [productSearch, setProductSearch] = useState("");
  const [purchaseSupplierId, setPurchaseSupplierId] = useState(suppliers[0]?.id ?? "");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseDraftItem[]>([]);
  const [purchaseIsPaid, setPurchaseIsPaid] = useState(true);
  const [purchaseAccountId, setPurchaseAccountId] = useState(accounts[0]?.id ?? "");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchaseKey, setPurchaseKey] = useState("");
  const [paymentSupplierId, setPaymentSupplierId] = useState(suppliers[0]?.id ?? "");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState(accounts[0]?.id ?? "");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentKey, setPaymentKey] = useState("");
  const [supplierResult, setSupplierResult] = useState<SupplierMutationResponse | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResponse | null>(null);
  const [paymentResult, setPaymentResult] = useState<SupplierPaymentResponse | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<SuppliersRetryAction | null>(null);
  const [activeSection, setActiveSection] = useState<SuppliersSection>("directory");
  const [isPending, startTransition] = useTransition();

  const filteredSuppliers = useMemo(() => {
    const normalized = supplierSearch.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      if (supplierFilter === "with_balance" && supplier.current_balance <= 0) {
        return false;
      }

      if (supplierFilter === "zero_balance" && supplier.current_balance > 0) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return `${supplier.name} ${supplier.phone ?? ""}`.toLowerCase().includes(normalized);
    });
  }, [supplierFilter, supplierSearch, suppliers]);

  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === selectedSupplierId) ??
    filteredSuppliers.find((supplier) => supplier.id === selectedSupplierId) ??
    null;
  const payableSuppliers = suppliers.filter((supplier) => supplier.current_balance > 0);
  const paymentSupplier =
    suppliers.find((supplier) => supplier.id === paymentSupplierId) ?? payableSuppliers[0] ?? null;

  const filteredProducts = useMemo(() => {
    const normalized = productSearch.trim().toLowerCase();
    const existingIds = new Set(purchaseItems.map((item) => item.product_id));

    return products.filter((product) => {
      if (existingIds.has(product.id)) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return `${product.name} ${product.category}`.toLowerCase().includes(normalized);
    });
  }, [productSearch, products, purchaseItems]);

  const purchaseTotal = useMemo(
    () => purchaseItems.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0),
    [purchaseItems]
  );

  useEffect(() => {
    if (!purchaseKey) {
      setPurchaseKey(createUuid());
    }

    if (!paymentKey) {
      setPaymentKey(createUuid());
    }
  }, [paymentKey, purchaseKey]);

  useEffect(() => {
    if (isCreateMode) {
      return;
    }

    if (!selectedSupplier) {
      return;
    }

    setSupplierDraft({
      name: selectedSupplier.name,
      phone: selectedSupplier.phone ?? "",
      address: selectedSupplier.address ?? "",
      is_active: selectedSupplier.is_active
    });
  }, [isCreateMode, selectedSupplier]);

  useEffect(() => {
    if (!paymentSupplierId && payableSuppliers[0]) {
      setPaymentSupplierId(payableSuppliers[0].id);
    }
  }, [payableSuppliers, paymentSupplierId]);

  useEffect(() => {
    if (!purchaseSupplierId && suppliers[0]) {
      setPurchaseSupplierId(suppliers[0].id);
    }
  }, [purchaseSupplierId, suppliers]);

  const projectedSupplierBalance =
    paymentSupplier && paymentAmount ? paymentSupplier.current_balance - Number(paymentAmount) : null;

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
  }

  function failAction(message: string, action: SuppliersRetryAction) {
    setActionErrorMessage(message);
    setRetryAction(action);
    toast.error(message);
  }

  function addProductToDraft(product: PurchaseProductOption) {
    setPurchaseItems((current) => {
      const existing = current.find((item) => item.product_id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...current,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_cost: product.cost_price || product.avg_cost_price || 0
        }
      ];
    });
  }

  async function handleSupplierSubmit() {
    clearActionFeedback();
    const targetUrl = isCreateMode ? "/api/suppliers" : `/api/suppliers/${selectedSupplierId}`;
    const method = isCreateMode ? "POST" : "PATCH";

    const response = await fetch(targetUrl, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: supplierDraft.name,
        phone: supplierDraft.phone || undefined,
        address: supplierDraft.address || undefined,
        is_active: supplierDraft.is_active
      })
    });

    const envelope = (await response.json()) as StandardEnvelope<SupplierMutationResponse>;
    if (!response.ok || !envelope.success || !envelope.data) {
      failAction(getApiErrorMessage(envelope), "supplier");
      return;
    }

    setSupplierResult(envelope.data);
    setIsCreateMode(false);
    setSelectedSupplierId(envelope.data.id);
    setPaymentSupplierId(envelope.data.id);
    setPurchaseSupplierId(envelope.data.id);
    clearActionFeedback();
    toast.success(isCreateMode ? "تم إنشاء المورد بنجاح." : "تم تحديث بيانات المورد بنجاح.");
    router.refresh();
  }

  async function handlePurchaseSubmit() {
    clearActionFeedback();
    const response = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier_id: purchaseSupplierId || undefined,
        items: purchaseItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost
        })),
        is_paid: purchaseIsPaid,
        payment_account_id: purchaseIsPaid ? purchaseAccountId : undefined,
        notes: purchaseNotes || undefined,
        idempotency_key: purchaseKey
      })
    });

    const envelope = (await response.json()) as StandardEnvelope<PurchaseResponse>;
    if (!response.ok || !envelope.success || !envelope.data) {
      failAction(getApiErrorMessage(envelope), "purchase");
      return;
    }

    setPurchaseResult(envelope.data);
    setPurchaseItems([]);
    setPurchaseNotes("");
    setPurchaseKey(createUuid());
    clearActionFeedback();
    toast.success("تم تسجيل أمر الشراء بنجاح.");
    router.refresh();
  }

  async function handleSupplierPaymentSubmit() {
    clearActionFeedback();
    const response = await fetch("/api/payments/supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier_id: paymentSupplierId,
        account_id: paymentAccountId,
        amount: Number(paymentAmount),
        notes: paymentNotes || undefined,
        idempotency_key: paymentKey
      })
    });

    const envelope = (await response.json()) as StandardEnvelope<SupplierPaymentResponse>;
    if (!response.ok || !envelope.success || !envelope.data) {
      failAction(getApiErrorMessage(envelope), "payment");
      return;
    }

    setPaymentResult(envelope.data);
    setPaymentAmount("");
    setPaymentNotes("");
    setPaymentKey(createUuid());
    clearActionFeedback();
    toast.success("تم تسجيل تسديد المورد بنجاح.");
    router.refresh();
  }

  function retryLastAction() {
    switch (retryAction) {
      case "supplier":
        void handleSupplierSubmit();
        break;
      case "purchase":
        void handlePurchaseSubmit();
        break;
      case "payment":
        void handleSupplierPaymentSubmit();
        break;
      default:
        break;
    }
  }

  return (
    <section className="operational-page suppliers-page">
      <PageHeader
        title="الموردون"
        meta={
          <>
            <span className="status-pill badge badge--neutral">
              الموردون {formatCompactNumber(suppliers.length)}
            </span>
            <span className="status-pill badge badge--neutral">
              الشراء {formatCompactNumber(purchaseOrders.length)}
            </span>
            <span className="status-pill badge badge--neutral">
              التسديدات {formatCompactNumber(supplierPayments.length)}
            </span>
          </>
        }
        actions={
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setActiveSection("directory");
              setIsCreateMode(true);
              setSupplierDraft(emptySupplierDraft);
              setSupplierResult(null);
            }}
          >
            <Plus size={16} />
            مورد جديد
          </button>
        }
      />

      <section className="operational-page__meta-grid suppliers-page__summary" aria-label="ملخص الموردين">
        <article className="operational-page__meta-card">
          <span className="operational-page__meta-label">الدليل النشط</span>
          <strong className="operational-page__meta-value">{formatCompactNumber(suppliers.filter((supplier) => supplier.is_active).length)}</strong>
        </article>
        <article className="operational-page__meta-card">
          <span className="operational-page__meta-label">موردون برصيد مستحق</span>
          <strong className="operational-page__meta-value">{formatCompactNumber(payableSuppliers.length)}</strong>
        </article>
        <article className="operational-page__meta-card">
          <span className="operational-page__meta-label">إجمالي المشتريات المعروضة</span>
          <strong className="operational-page__meta-value">{formatCompactNumber(purchaseOrders.length)}</strong>
        </article>
      </section>

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

      <div className="operational-section-nav suppliers-page__sections" aria-label="أقسام الموردين والمشتريات">
        <button
          type="button"
          className={activeSection === "directory" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("directory")}
        >
          الدليل والتفاصيل
        </button>
        <button
          type="button"
          className={activeSection === "purchase" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("purchase")}
        >
          أوامر الشراء
        </button>
        <button
          type="button"
          className={activeSection === "payment" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("payment")}
        >
          التسديدات
        </button>
        <button
          type="button"
          className={activeSection === "history" ? "chip-button is-selected" : "chip-button"}
          onClick={() => setActiveSection("history")}
        >
          السجل الأخير
        </button>
      </div>

      {activeSection === "directory" ? <div className="detail-grid">
        <section className="workspace-panel suppliers-page__directory">
          <div className="workspace-toolbar">
            <label className="workspace-search">
              <Search size={18} />
              <input
                type="search"
                placeholder="ابحث باسم المورد أو الهاتف"
                value={supplierSearch}
                onChange={(event) => setSupplierSearch(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setIsCreateMode(true);
                setSupplierDraft(emptySupplierDraft);
                setSupplierResult(null);
              }}
            >
              <Plus size={16} />
              مورد جديد
            </button>
          </div>

          <div className="chip-row">
            <button
              type="button"
              className={supplierFilter === "all" ? "chip-button is-selected" : "chip-button"}
              onClick={() => setSupplierFilter("all")}
            >
              الكل
            </button>
            <button
              type="button"
              className={supplierFilter === "with_balance" ? "chip-button is-selected" : "chip-button"}
              onClick={() => setSupplierFilter("with_balance")}
            >
              عليه رصيد
            </button>
            <button
              type="button"
              className={supplierFilter === "zero_balance" ? "chip-button is-selected" : "chip-button"}
              onClick={() => setSupplierFilter("zero_balance")}
            >
              بدون رصيد
            </button>
          </div>

          <div className="stack-list suppliers-page__directory-list">
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  className={
                    supplier.id === selectedSupplierId && !isCreateMode
                      ? "list-card list-card--interactive is-selected supplier-directory-card"
                      : "list-card list-card--interactive supplier-directory-card"
                  }
                  onClick={() => {
                    setSelectedSupplierId(supplier.id);
                    setPaymentSupplierId(supplier.id);
                    setPurchaseSupplierId(supplier.id);
                    setIsCreateMode(false);
                    setSupplierResult(null);
                  }}
                >
                  <div className="list-card__header">
                    <strong>{supplier.name}</strong>
                    <span
                      className={
                        supplier.current_balance > 0
                          ? "status-pill badge badge--warning"
                          : "status-pill badge badge--neutral"
                      }
                    >
                      {formatCurrency(supplier.current_balance)}
                    </span>
                  </div>
                  <div className="supplier-directory-card__meta">
                    <span>{supplier.phone ?? "بدون هاتف"}</span>
                    <span>{supplier.is_active ? "نشط" : "غير نشط"}</span>
                    <span>{formatDate(supplier.updated_at)}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-panel suppliers-page__empty">
                <Search size={20} />
                <h3>لا توجد نتائج مطابقة</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSupplierSearch("");
                    setSupplierFilter("all");
                  }}
                >
                  مسح التصفية
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="workspace-panel suppliers-page__detail">
          <div className="section-heading">
            <div>
              <h2>{isCreateMode ? "إضافة مورد" : selectedSupplier?.name ?? "اختر موردًا"}</h2>
            </div>
          </div>

          {!isCreateMode && selectedSupplier ? (
            <div className="info-strip">
              <span>الرصيد الحالي: {formatCurrency(selectedSupplier.current_balance)}</span>
              <span>الهاتف: {selectedSupplier.phone ?? "غير متوفر"}</span>
              <span>{selectedSupplier.is_active ? "نشط" : "غير نشط"}</span>
            </div>
          ) : null}

          <div className="stack-form">
            <label className="stack-field">
              <span>اسم المورد</span>
              <input
                type="text"
                maxLength={100}
                value={supplierDraft.name}
                onChange={(event) => setSupplierDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="اسم المورد"
              />
            </label>

            <label className="stack-field">
              <span>الهاتف</span>
              <input
                type="text"
                maxLength={20}
                value={supplierDraft.phone}
                onChange={(event) => setSupplierDraft((current) => ({ ...current, phone: event.target.value }))}
                placeholder="079..."
              />
            </label>

            <label className="stack-field">
              <span>العنوان</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={supplierDraft.address}
                onChange={(event) => setSupplierDraft((current) => ({ ...current, address: event.target.value }))}
                placeholder="عنوان المورد"
              />
            </label>

            <label className="stack-checkbox">
              <input
                type="checkbox"
                checked={supplierDraft.is_active}
                onChange={(event) => setSupplierDraft((current) => ({ ...current, is_active: event.target.checked }))}
              />
              <span>المورد نشط</span>
            </label>

            <div className="workspace-toolbar">
              <button
                type="button"
                className="primary-button"
                disabled={isPending || !supplierDraft.name.trim()}
                onClick={() => {
                  startTransition(() => {
                    void handleSupplierSubmit();
                  });
                }}
              >
                {isPending ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                {isCreateMode ? "حفظ المورد" : "حفظ التعديلات"}
              </button>

              {!isCreateMode ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setIsCreateMode(true);
                    setSupplierDraft(emptySupplierDraft);
                    setSupplierResult(null);
                  }}
                >
                  <Plus size={16} />
                  نسخة جديدة
                </button>
              ) : null}
            </div>
          </div>

          {supplierResult ? (
            <div className="result-card">
              <h3>تم حفظ المورد</h3>
              <p>{supplierResult.name}</p>
              <p>الرصيد الحالي: {formatCurrency(supplierResult.current_balance)}</p>
            </div>
          ) : null}
        </section>
      </div> : null}

      {activeSection === "purchase" ? <div className="detail-grid">
        <section className="workspace-panel suppliers-page__purchase">
          <div className="section-heading">
            <div>
              <p className="eyebrow">أمر شراء</p>
              <h2>أمر شراء جديد</h2>
            </div>
          </div>

          <div className="stack-form">
            <label className="stack-field">
              <span>المورد</span>
              <select value={purchaseSupplierId} onChange={(event) => setPurchaseSupplierId(event.target.value)}>
                <option value="">بدون مورد</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="workspace-search">
              <Search size={18} />
              <input
                type="search"
                placeholder="ابحث عن منتج لإضافته"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </label>

            <div className="stack-list">
              {filteredProducts.slice(0, 6).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="list-card list-card--interactive"
                  onClick={() => addProductToDraft(product)}
                >
                  <div className="list-card__header">
                    <strong>{product.name}</strong>
                    <span>{formatCompactNumber(product.stock_quantity)} متاح</span>
                  </div>
                  <p>آخر تكلفة: {formatCurrency(product.cost_price)}</p>
                  <p className="workspace-footnote">المتوسط: {formatCurrency(product.avg_cost_price)}</p>
                </button>
              ))}
            </div>

            <div className="stack-list">
              {purchaseItems.length > 0 ? (
                purchaseItems.map((item) => (
                  <article key={item.product_id} className="list-card">
                    <div className="list-card__header">
                      <strong>{item.product_name}</strong>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setPurchaseItems((current) =>
                            current.filter((currentItem) => currentItem.product_id !== item.product_id)
                          )
                        }
                      >
                        حذف
                      </button>
                    </div>

                    <div className="detail-grid">
                      <label className="stack-field">
                        <span>الكمية</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={item.quantity}
                          onChange={(event) =>
                            setPurchaseItems((current) =>
                              current.map((currentItem) =>
                                currentItem.product_id === item.product_id
                                  ? {
                                      ...currentItem,
                                      quantity: Math.max(1, Number(event.target.value) || 1)
                                    }
                                  : currentItem
                              )
                            )
                          }
                        />
                      </label>

                      <label className="stack-field">
                        <span>تكلفة الوحدة</span>
                        <input
                          type="number"
                          min={0}
                          step={0.001}
                          value={item.unit_cost}
                          onChange={(event) =>
                            setPurchaseItems((current) =>
                              current.map((currentItem) =>
                                currentItem.product_id === item.product_id
                                  ? {
                                      ...currentItem,
                                      unit_cost: Math.max(0, Number(event.target.value) || 0)
                                    }
                                  : currentItem
                              )
                            )
                          }
                        />
                      </label>
                    </div>

                    <p className="workspace-footnote">
                      إجمالي السطر: {formatCurrency(item.quantity * item.unit_cost)}
                    </p>
                  </article>
                ))
              ) : (
                <div className="empty-panel">
                  <p>أضف منتجات إلى أمر الشراء أولًا.</p>
                </div>
              )}
            </div>

            <div className="chip-row">
              <button
                type="button"
                className={purchaseIsPaid ? "chip-button is-selected" : "chip-button"}
                onClick={() => setPurchaseIsPaid(true)}
              >
                نقدي
              </button>
              <button
                type="button"
                className={!purchaseIsPaid ? "chip-button is-selected" : "chip-button"}
                onClick={() => setPurchaseIsPaid(false)}
              >
                على الحساب
              </button>
            </div>

            <label className="stack-field">
              <span>حساب الدفع</span>
              <select
                value={purchaseAccountId}
                onChange={(event) => setPurchaseAccountId(event.target.value)}
                disabled={!purchaseIsPaid}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack-field">
              <span>ملاحظات</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={purchaseNotes}
                onChange={(event) => setPurchaseNotes(event.target.value)}
                placeholder="ملاحظات أمر الشراء"
              />
            </label>

            <div className="info-strip">
              <span>الإجمالي: {formatCurrency(purchaseTotal)}</span>
              <span>يتم حماية تسجيل أمر الشراء من التكرار تلقائيًا.</span>
            </div>

            <button
              type="button"
              className="primary-button"
              disabled={
                isPending ||
                purchaseItems.length === 0 ||
                (purchaseIsPaid && !purchaseAccountId) ||
                (!purchaseIsPaid && !purchaseSupplierId)
              }
              onClick={() => {
                startTransition(() => {
                  void handlePurchaseSubmit();
                });
              }}
            >
              {isPending ? <Loader2 className="spin" size={16} /> : <ShoppingCart size={16} />}
              تأكيد الشراء
            </button>
          </div>

          {purchaseResult ? (
            <div className="result-card">
              <h3>تم إنشاء أمر الشراء</h3>
              <p>رقم أمر الشراء: {purchaseResult.purchase_number}</p>
              <p>الإجمالي: {formatCurrency(purchaseResult.total)}</p>
            </div>
          ) : null}
        </section>

      </div> : null}

      {activeSection === "history" ? <div className="detail-grid">
        <section className="workspace-panel suppliers-page__history">
          <div className="section-heading">
            <div>
              <p className="eyebrow">آخر المشتريات</p>
              <h2>آخر أوامر الشراء</h2>
            </div>
          </div>

          <div className="stack-list">
            {purchaseOrders.length > 0 ? (
              purchaseOrders.map((purchase) => (
                <article key={purchase.id} className="list-card">
                  <div className="list-card__header">
                    <strong>{purchase.purchase_number}</strong>
                    <span>{purchase.is_paid ? "نقدي" : "على الحساب"}</span>
                  </div>
                  <p>المورد: {purchase.supplier_name ?? "بدون مورد"}</p>
                  <p>الحساب: {purchase.account_name ?? "—"}</p>
                  <p>الإجمالي: {formatCurrency(purchase.total_amount)}</p>
                  <p className="workspace-footnote">التاريخ: {formatDate(purchase.purchase_date)}</p>
                  <div className="stack-list">
                    {purchase.items.map((item) => (
                      <div key={item.id} className="list-card">
                        <div className="list-card__header">
                          <strong>{item.product_name}</strong>
                          <span>{formatCurrency(item.total_cost)}</span>
                        </div>
                        <p>
                          {formatCompactNumber(item.quantity)} × {formatCurrency(item.unit_cost)}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-panel suppliers-page__empty">
                <ShoppingCart size={20} />
                <h3>لا توجد أوامر شراء</h3>
              </div>
            )}
          </div>
        </section>

        <section className="workspace-panel suppliers-page__history">
          <div className="section-heading">
            <div>
              <p className="eyebrow">آخر التسديدات</p>
              <h2>آخر تسديدات الموردين</h2>
            </div>
          </div>

          <div className="stack-list">
            {supplierPayments.length > 0 ? (
              supplierPayments.map((payment) => (
                <article key={payment.id} className="list-card">
                  <div className="list-card__header">
                    <strong>{payment.payment_number}</strong>
                    <span>{formatCurrency(payment.amount)}</span>
                  </div>
                  <p>المورد: {payment.supplier_name}</p>
                  <p>الحساب: {payment.account_name}</p>
                  <p className="workspace-footnote">
                    {formatDate(payment.payment_date)}
                    {payment.notes ? ` | ${payment.notes}` : ""}
                  </p>
                </article>
              ))
            ) : (
              <div className="empty-panel suppliers-page__empty">
                <Wallet size={20} />
                <h3>لا توجد تسديدات موردين</h3>
              </div>
            )}
          </div>
        </section>
      </div> : null}

      {activeSection === "payment" ? (
        <div className="detail-grid">
          <section className="workspace-panel suppliers-page__payment">
            <div className="section-heading">
              <div>
                <p className="eyebrow">تسديد المورد</p>
                <h2>تسديد مورد</h2>
              </div>
            </div>

            <div className="stack-form">
              <label className="stack-field">
                <span>المورد</span>
                <select value={paymentSupplierId} onChange={(event) => setPaymentSupplierId(event.target.value)}>
                  {payableSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              {paymentSupplier ? (
                <div className="info-strip">
                  <span>الرصيد المستحق: {formatCurrency(paymentSupplier.current_balance)}</span>
                  {projectedSupplierBalance !== null ? <span>بعد التسديد: {formatCurrency(projectedSupplierBalance)}</span> : null}
                </div>
              ) : (
                <div className="empty-panel suppliers-page__empty">
                  <Wallet size={20} />
                  <h3>لا يوجد رصيد مستحق حاليًا</h3>
                </div>
              )}

              <label className="stack-field">
                <span>مبلغ التسديد</span>
                <input
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="0.000"
                />
              </label>

              <label className="stack-field">
                <span>حساب الدفع</span>
                <select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)}>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-field">
                <span>ملاحظات</span>
                <textarea
                  rows={3}
                  maxLength={255}
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  placeholder="ملاحظة التسديد"
                />
              </label>

              <div className="info-strip">
                <span>يتم حماية تسجيل التسديد من التكرار تلقائيًا.</span>
              </div>

              <button
                type="button"
                className="primary-button"
                disabled={isPending || !paymentSupplier || !paymentAmount || !paymentAccountId}
                onClick={() => {
                  startTransition(() => {
                    void handleSupplierPaymentSubmit();
                  });
                }}
              >
                {isPending ? <Loader2 className="spin" size={16} /> : <Wallet size={16} />}
                تأكيد التسديد
              </button>
            </div>

            {paymentResult ? (
              <div className="result-card">
                <h3>تم تسجيل التسديد</h3>
                <p>رقم التسديد: {paymentResult.payment_number}</p>
                <p>الرصيد المتبقي: {formatCurrency(paymentResult.remaining_balance)}</p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
