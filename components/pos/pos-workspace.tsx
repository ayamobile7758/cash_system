"use client";

import React from "react";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { AlertTriangle, Loader2, RefreshCcw, ScanSearch, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/hooks/use-products";
import { usePosAccounts } from "@/hooks/use-pos-accounts";
import type { SaleResponseData, StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/formatters";
import {
  calculateCartDiscount,
  calculateCartSubtotal,
  calculateCartTotal,
  usePosCartStore
} from "@/stores/pos-cart";

function normalizeArabic(value: string) {
  return value.toLowerCase().trim();
}

export function PosWorkspace() {
  const { products, isLoading: productsLoading, errorMessage: productsError, refresh: refreshProducts } = useProducts();
  const { accounts, isLoading: accountsLoading, errorMessage: accountsError, refresh: refreshAccounts } = usePosAccounts();

  const items = usePosCartStore((state) => state.items);
  const selectedAccountId = usePosCartStore((state) => state.selectedAccountId);
  const posTerminalCode = usePosCartStore((state) => state.posTerminalCode);
  const notes = usePosCartStore((state) => state.notes);
  const currentIdempotencyKey = usePosCartStore((state) => state.currentIdempotencyKey);
  const submissionState = usePosCartStore((state) => state.submissionState);
  const lastCompletedSale = usePosCartStore((state) => state.lastCompletedSale);
  const addProduct = usePosCartStore((state) => state.addProduct);
  const removeItem = usePosCartStore((state) => state.removeItem);
  const setQuantity = usePosCartStore((state) => state.setQuantity);
  const setDiscountPercentage = usePosCartStore((state) => state.setDiscountPercentage);
  const setSelectedAccountId = usePosCartStore((state) => state.setSelectedAccountId);
  const setNotes = usePosCartStore((state) => state.setNotes);
  const setPosTerminalCode = usePosCartStore((state) => state.setPosTerminalCode);
  const clearCart = usePosCartStore((state) => state.clearCart);
  const markSubmitting = usePosCartStore((state) => state.markSubmitting);
  const markError = usePosCartStore((state) => state.markError);
  const refreshIdempotencyKey = usePosCartStore((state) => state.refreshIdempotencyKey);
  const completeSale = usePosCartStore((state) => state.completeSale);

  const [cartHydrated, setCartHydrated] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isTyping, startTransition] = useTransition();
  const [isSubmitting, startSubmission] = useTransition();
  const deferredQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setCartHydrated(usePosCartStore.persist.hasHydrated());

    const unsubscribe = usePosCartStore.persist.onFinishHydration(() => {
      setCartHydrated(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchQuery(searchInput);
    }, 200);

    return () => {
      window.clearTimeout(handle);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  useEffect(() => {
    if (cartHydrated && !currentIdempotencyKey) {
      refreshIdempotencyKey();
    }
  }, [cartHydrated, currentIdempotencyKey, refreshIdempotencyKey]);

  const categories = ["all", ...new Set(products.map((product) => product.category))];
  const normalizedQuery = normalizeArabic(deferredQuery);
  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      normalizeArabic(product.name).includes(normalizedQuery) ||
      normalizeArabic(product.sku ?? "").includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
  const quickAddProducts = products.filter((product) => product.is_quick_add).slice(0, 8);
  const subtotal = calculateCartSubtotal(items);
  const totalDiscount = calculateCartDiscount(items);
  const total = calculateCartTotal(items);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;

  async function submitSale() {
    if (!cartHydrated) {
      return;
    }

    if (items.length === 0) {
      toast.error("أضف منتجًا واحدًا على الأقل قبل تأكيد البيع.");
      return;
    }

    if (!selectedAccountId) {
      toast.error("اختر حساب الدفع أولًا.");
      return;
    }

    if (!currentIdempotencyKey) {
      refreshIdempotencyKey();
      toast.error("جاري تهيئة مفتاح الطلب. أعد المحاولة خلال ثوانٍ.");
      return;
    }

    markSubmitting();

    const payload = {
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        discount_percentage: item.discount_percentage
      })),
      payments: [
        {
          account_id: selectedAccountId,
          amount: Number(total.toFixed(3))
        }
      ],
      pos_terminal_code: posTerminalCode || undefined,
      notes: notes || undefined,
      idempotency_key: currentIdempotencyKey
    };

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const envelope = (await response.json()) as StandardEnvelope<SaleResponseData>;

      if (!response.ok || !envelope.success || !envelope.data) {
        const errorCode = envelope.error?.code ?? "ERR_API_INTERNAL";
        markError(errorCode);

        if (errorCode === "ERR_IDEMPOTENCY") {
          const existingInvoice = (envelope.error?.details as { existing_result?: SaleResponseData } | undefined)
            ?.existing_result;

          toast.warning(
            existingInvoice
              ? `الطلب تكرر مسبقًا. الفاتورة السابقة: ${existingInvoice.invoice_number}.`
              : "هذا المفتاح استُخدم مسبقًا. لم تُنشأ فاتورة جديدة."
          );
          return;
        }

        if (errorCode === "ERR_CONCURRENT_STOCK_UPDATE") {
          refreshIdempotencyKey();
          toast.error("تغير المخزون أثناء التنفيذ. تم توليد مفتاح جديد وأعد المحاولة بعد تحديث السلة.");
          void refreshProducts();
          return;
        }

        toast.error(envelope.error?.message ?? "فشل تنفيذ البيع.");
        return;
      }

      completeSale(envelope.data);
      toast.success(`تم إنشاء الفاتورة ${envelope.data.invoice_number} بنجاح.`);
      void refreshProducts();
      void refreshAccounts();
    } catch (error) {
      markError("ERR_API_INTERNAL");
      toast.error((error as Error).message || "تعذر الوصول إلى مسار البيع.");
    }
  }

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-03 / Sales Core Slice</p>
          <h1>نقطة البيع الأساسية</h1>
          <p className="workspace-lead">
            قراءة المنتجات تتم من المسارات الآمنة فقط، والبيع يمر عبر <code>POST /api/sales</code> مع
            <code>service_role + p_created_by</code> وبدون أي سعر قادم من العميل.
          </p>
        </div>

        <div className="hero-stat-grid">
          <article className="hero-stat-card">
            <span>عناصر السلة</span>
            <strong>{formatCompactNumber(items.length)}</strong>
          </article>
          <article className="hero-stat-card">
            <span>الإجمالي الحالي</span>
            <strong>{formatCurrency(total)}</strong>
          </article>
          <article className="hero-stat-card hero-stat-card--safe">
            <ShieldCheck size={18} />
            <strong>Server-authoritative</strong>
          </article>
        </div>
      </div>

      <div className="pos-grid">
        <section className="workspace-panel">
          <div className="workspace-toolbar">
            <label className="workspace-search">
              <ScanSearch size={18} />
              <input
                type="search"
                autoFocus
                placeholder="ابحث باسم المنتج أو SKU"
                value={searchInput}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => {
                    setSearchInput(nextValue);
                  });
                }}
              />
            </label>

            <button type="button" className="secondary-button" onClick={refreshProducts}>
              <RefreshCcw size={16} />
              تحديث المنتجات
            </button>
          </div>

          <div className="chip-row" aria-label="product categories">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={category === activeCategory ? "chip chip--active" : "chip"}
                onClick={() => setActiveCategory(category)}
              >
                {category === "all" ? "الكل" : category}
              </button>
            ))}
          </div>

          {quickAddProducts.length > 0 ? (
            <div className="quick-add-row">
              {quickAddProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="quick-add-card"
                  onClick={() => addProduct(product)}
                >
                  <span>{product.name}</span>
                  <strong>{formatCurrency(product.sale_price)}</strong>
                </button>
              ))}
            </div>
          ) : null}

          {productsLoading ? (
            <div className="empty-panel">
              <Loader2 className="spin" size={18} />
              <p>جارٍ تحميل منتجات نقطة البيع...</p>
            </div>
          ) : productsError ? (
            <div className="empty-panel empty-panel--danger">
              <h2>تعذر جلب المنتجات</h2>
              <p>{productsError}</p>
            </div>
          ) : (
            <div className="product-grid product-grid--compact">
              {filteredProducts.map((product) => {
                const lowStock = product.track_stock && product.stock_quantity <= product.min_stock_level;

                return (
                  <button
                    key={product.id}
                    type="button"
                    className="product-card product-card--interactive"
                    onClick={() => addProduct(product)}
                  >
                    <div className="product-card__meta">
                      <span className="product-pill">{product.category}</span>
                      {product.is_quick_add ? (
                        <span className="product-pill product-pill--accent">سريع</span>
                      ) : null}
                    </div>

                    <div className="product-card__copy">
                      <h2>{product.name}</h2>
                      <p>{product.description || "بدون وصف إضافي."}</p>
                    </div>

                    <dl className="product-card__stats">
                      <div>
                        <dt>السعر</dt>
                        <dd>{formatCurrency(product.sale_price)}</dd>
                      </div>
                      <div>
                        <dt>المخزون</dt>
                        <dd>{product.track_stock ? formatCompactNumber(product.stock_quantity) : "خدمة"}</dd>
                      </div>
                    </dl>

                    {lowStock ? (
                      <p className="warning-inline">
                        <AlertTriangle size={14} />
                        الكمية قريبة من حد التنبيه
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          <p className="workspace-footnote">
            {isTyping
              ? "تحديث نتائج البحث..."
              : "البحث محلي، debounce = 200ms، ولا يتم إرسال أي طلب كتابة أثناء بناء السلة."}
          </p>
        </section>

        <aside className="workspace-panel cart-panel">
          <div className="cart-panel__header">
            <div>
              <p className="eyebrow">Cart State</p>
              <h2>السلة المحلية</h2>
            </div>

            <button type="button" className="secondary-button" onClick={clearCart} disabled={items.length === 0}>
              <Trash2 size={16} />
              تفريغ
            </button>
          </div>

          {!cartHydrated ? (
            <div className="empty-panel">
              <p>جارٍ استعادة السلة المحلية...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-panel">
              <h3>السلة فارغة</h3>
              <p>اختر منتجًا من القائمة أو من شريط الإضافة السريعة.</p>
            </div>
          ) : (
            <div className="cart-line-list">
              {items.map((item) => (
                <article key={item.product_id} className="cart-line-card">
                  <div className="cart-line-card__header">
                    <div>
                      <strong>{item.name}</strong>
                      <p>{formatCurrency(item.sale_price)} للوحدة</p>
                    </div>

                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => removeItem(item.product_id)}
                      aria-label={`حذف ${item.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="cart-line-card__controls">
                    <label>
                      <span>الكمية</span>
                      <input
                        type="number"
                        min={1}
                        max={item.track_stock ? Math.max(item.stock_quantity, 1) : undefined}
                        value={item.quantity}
                        onChange={(event) => setQuantity(item.product_id, Number(event.target.value))}
                      />
                    </label>

                    <label>
                      <span>خصم %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount_percentage}
                        onChange={(event) =>
                          setDiscountPercentage(item.product_id, Number(event.target.value))
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="cart-summary">
            <dl>
              <div>
                <dt>المجموع قبل الخصم</dt>
                <dd>{formatCurrency(subtotal)}</dd>
              </div>
              <div>
                <dt>إجمالي الخصم</dt>
                <dd>{formatCurrency(totalDiscount)}</dd>
              </div>
              <div className="cart-summary__total">
                <dt>الإجمالي النهائي</dt>
                <dd>{formatCurrency(total)}</dd>
              </div>
            </dl>

            <label className="stack-field">
              <span>حساب الدفع</span>
              <select
                value={selectedAccountId ?? ""}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                disabled={accountsLoading || accounts.length === 0}
              >
                <option value="" disabled>
                  {accountsLoading ? "تحميل الحسابات..." : "اختر حساب الدفع"}
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack-field">
              <span>رمز الجهاز</span>
              <input
                type="text"
                maxLength={30}
                value={posTerminalCode}
                onChange={(event) => setPosTerminalCode(event.target.value)}
                placeholder="POS-01"
              />
            </label>

            <label className="stack-field">
              <span>ملاحظات</span>
              <textarea
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="ملاحظات اختيارية للفاتورة"
              />
            </label>

            <div className="info-strip">
              <span>الحساب الحالي: {selectedAccount?.name ?? "غير محدد"}</span>
              <span>idempotency_key: {currentIdempotencyKey}</span>
            </div>

            {accountsError ? (
              <p className="warning-inline">
                <AlertTriangle size={14} />
                {accountsError}
              </p>
            ) : null}

            <button
              type="button"
              className="primary-button"
              disabled={isSubmitting || submissionState === "submitting" || items.length === 0}
              onClick={() => {
                startSubmission(() => {
                  void submitSale();
                });
              }}
            >
              {isSubmitting || submissionState === "submitting" ? (
                <>
                  <Loader2 className="spin" size={16} />
                  جارٍ تنفيذ البيع...
                </>
              ) : (
                "تأكيد البيع"
              )}
            </button>
          </div>

          {lastCompletedSale ? (
            <div className="result-card">
              <p className="eyebrow">Last Sale</p>
              <h3>{lastCompletedSale.invoice_number}</h3>
              <p>الإجمالي: {formatCurrency(lastCompletedSale.total)}</p>
              <p>الباقي: {formatCurrency(lastCompletedSale.change ?? 0)}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
