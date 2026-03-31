"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { PackageSearch, PencilLine, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import { useProducts } from "@/hooks/use-products";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
import type { PosProduct, StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/formatters";
import { PRODUCT_CATEGORY_VALUES, type ProductCategory } from "@/lib/validations/products";

type ProductsBrowserProps = {
  role?: "admin" | "pos_staff";
};

type ProductFormState = {
  name: string;
  category: ProductCategory;
  sku: string;
  description: string;
  sale_price: string;
  cost_price: string;
  stock_quantity: string;
  min_stock_level: string;
  track_stock: boolean;
  is_quick_add: boolean;
};

const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  device: "أجهزة",
  accessory: "إكسسوارات",
  sim: "شرائح",
  service_repair: "خدمات صيانة",
  service_general: "خدمات عامة"
};

function normalizeArabic(value: string) {
  return value.toLowerCase().trim();
}

function normalizeSearchValue(value: string) {
  return normalizeArabic(value).replace(/\s+/g, " ");
}

function getStockLabel(trackStock: boolean, stockQuantity: number) {
  if (!trackStock) {
    return "خدمة";
  }

  if (stockQuantity <= 0) {
    return "نفد المخزون";
  }

  if (stockQuantity <= 5) {
    return "مخزون منخفض";
  }

  return "متاح";
}

function createEmptyProductForm(category: ProductCategory): ProductFormState {
  return {
    name: "",
    category,
    sku: "",
    description: "",
    sale_price: "",
    cost_price: "",
    stock_quantity: "",
    min_stock_level: "",
    track_stock: true,
    is_quick_add: false
  };
}

function productFormFromProduct(product: PosProduct): ProductFormState {
  return {
    name: product.name,
    category: product.category as ProductCategory,
    sku: product.sku ?? "",
    description: product.description ?? "",
    sale_price: String(product.sale_price),
    cost_price: "",
    stock_quantity: String(product.stock_quantity),
    min_stock_level: String(product.min_stock_level),
    track_stock: product.track_stock,
    is_quick_add: product.is_quick_add
  };
}

function parseOptionalNumber(value: string) {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getCategoryLabel(category: string) {
  return PRODUCT_CATEGORY_LABELS[category as ProductCategory] ?? category;
}

export function ProductsBrowser({ role = "pos_staff" }: ProductsBrowserProps) {
  const isAdmin = role === "admin";
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(
    createEmptyProductForm(PRODUCT_CATEGORY_VALUES[0])
  );
  const [formError, setFormError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(searchQuery);
  const normalizedQuery = normalizeArabic(deferredQuery);
  const { products, isLoading, isLoadingMore, isOffline, errorMessage, hasMore, totalCount, loadMore, refresh } =
    useProducts({
      searchQuery: "",
      category: activeCategory
    });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchQuery(searchInput);
    }, 200);

    return () => {
      window.clearTimeout(handle);
    };
  }, [searchInput]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeElement = document.activeElement;
      const isTypingField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;
      const isSearchFieldFocused = activeElement === searchInputRef.current;

      if (event.key === "/" && !isTypingField) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }

      if (
        event.key === "Escape" &&
        searchInput.trim().length > 0 &&
        (!isTypingField || isSearchFieldFocused)
      ) {
        event.preventDefault();
        setSearchInput("");
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchInput]);

  const categories = ["all", ...PRODUCT_CATEGORY_VALUES];
  const categoryOptions = [...PRODUCT_CATEGORY_VALUES];
  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) {
      return products;
    }

    const query = normalizeSearchValue(deferredQuery);

    return [...products]
      .filter((product) => {
        const normalizedName = normalizeArabic(product.name);
        const normalizedSku = product.sku?.toLowerCase().trim() ?? "";
        const normalizedDescription = product.description ? normalizeArabic(product.description) : "";

        return (
          normalizedSku === query ||
          normalizedName.includes(query) ||
          normalizedSku.includes(query) ||
          normalizedDescription.includes(query)
        );
      })
      .sort((left, right) => {
        const leftSkuExact = (left.sku?.toLowerCase().trim() ?? "") === query ? 1 : 0;
        const rightSkuExact = (right.sku?.toLowerCase().trim() ?? "") === query ? 1 : 0;

        if (leftSkuExact !== rightSkuExact) {
          return rightSkuExact - leftSkuExact;
        }

        const leftQuickAdd = left.is_quick_add ? 1 : 0;
        const rightQuickAdd = right.is_quick_add ? 1 : 0;

        if (leftQuickAdd !== rightQuickAdd) {
          return rightQuickAdd - leftQuickAdd;
        }

        return left.name.localeCompare(right.name, "ar");
      });
  }, [deferredQuery, normalizedQuery, products]);

  const quickAddProducts = useMemo(
    () => products.filter((product) => product.is_quick_add).slice(0, 8),
    [products]
  );
  const quickAddCount = quickAddProducts.length;
  const lowStockCount = products.filter(
    (product) => product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5
  ).length;
  const selectedProduct = selectedProductId
    ? products.find((product) => product.id === selectedProductId) ?? null
    : null;

  function clearFormState() {
    setSelectedProductId(null);
    setProductForm(createEmptyProductForm(categoryOptions[0] ?? PRODUCT_CATEGORY_VALUES[0]));
    setFormError(null);
  }

  function openProductForEdit(product: PosProduct) {
    setSelectedProductId(product.id);
    setProductForm(productFormFromProduct(product));
    setFormError(null);
  }

  async function submitProductForm() {
    setFormError(null);

    const name = productForm.name.trim();
    if (name.length === 0) {
      setFormError("اسم المنتج مطلوب.");
      return;
    }

    const salePrice = Number(productForm.sale_price);
    const stockQuantity = Number(productForm.stock_quantity);
    const minStockLevel = Number(productForm.min_stock_level);
    const costPrice = parseOptionalNumber(productForm.cost_price);

    if (Number.isNaN(salePrice) || salePrice < 0) {
      setFormError("سعر البيع غير صالح.");
      return;
    }

    if (Number.isNaN(stockQuantity) || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setFormError("الكمية يجب أن تكون عددًا صحيحًا غير سالب.");
      return;
    }

    if (Number.isNaN(minStockLevel) || !Number.isInteger(minStockLevel) || minStockLevel < 0) {
      setFormError("حد التنبيه يجب أن يكون عددًا صحيحًا غير سالب.");
      return;
    }

    if (productForm.cost_price.trim().length > 0 && costPrice === null) {
      setFormError("سعر التكلفة غير صالح.");
      return;
    }

    setIsSaving(true);

    try {
      const endpoint = selectedProductId ? `/api/products/${selectedProductId}` : "/api/products";
      const response = await fetch(endpoint, {
        method: selectedProductId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          category: productForm.category,
          sku: productForm.sku.trim() || undefined,
          description: productForm.description.trim() || undefined,
          sale_price: salePrice,
          cost_price: costPrice ?? undefined,
          stock_quantity: stockQuantity,
          min_stock_level: minStockLevel,
          track_stock: productForm.track_stock,
          is_quick_add: productForm.is_quick_add
        })
      });

      const envelope = (await response.json()) as StandardEnvelope<PosProduct>;

      if (!response.ok || !envelope.success || !envelope.data) {
        const message = getSafeArabicErrorMessage(envelope.error, "تعذر حفظ المنتج.");
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success(
        selectedProductId ? `تم تحديث المنتج ${envelope.data.name} بنجاح.` : `تم إنشاء المنتج ${envelope.data.name} بنجاح.`
      );
      refresh();
      clearFormState();
    } catch (error) {
      const message = getSafeArabicErrorMessage(error, "تعذر حفظ المنتج.");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivateProduct(product: PosProduct) {
    setFormError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_active: false })
      });

      const envelope = (await response.json()) as StandardEnvelope<PosProduct>;

      if (!response.ok || !envelope.success || !envelope.data) {
        const message = getSafeArabicErrorMessage(envelope.error, "تعذر تعطيل المنتج.");
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success(`تم تعطيل المنتج ${envelope.data.name}.`);
      if (selectedProductId === product.id) {
        clearFormState();
      }
      refresh();
    } catch (error) {
      const message = getSafeArabicErrorMessage(error, "تعذر تعطيل المنتج.");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="operational-page catalog-page">
      <PageHeader
        title="المنتجات"
        meta={
          <>
            <span className="status-pill badge badge--neutral">
              {formatCompactNumber(filteredProducts.length)} منتج
            </span>
            <span className="status-pill badge badge--neutral">
              منخفض: {formatCompactNumber(lowStockCount)}
            </span>
            <span className="status-pill badge badge--neutral">
              {role === "admin" ? "عرض إداري" : "عرض البيع"}
            </span>
          </>
        }
        actions={
          <div className="transaction-action-cluster">
            {isAdmin ? (
              <button type="button" className="primary-button" onClick={clearFormState}>
                <Plus size={16} />
                منتج جديد
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={refresh}>
              <RefreshCcw size={16} />
              تحديث
            </button>
          </div>
        }
      />

      {isAdmin ? (
        <SectionCard
          title={selectedProduct ? `تعديل: ${selectedProduct.name}` : "منتج جديد"}
          tone="accent"
          className="operational-card product-admin-card"
        >
          {formError ? <StatusBanner variant="danger" title="تعذر حفظ المنتج" message={formError} /> : null}

          <form
            className="product-admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitProductForm();
            }}
          >
            <div className="product-admin-form__grid">
              <label className="stack-field">
                <span>اسم المنتج</span>
                <input
                  className="field-input"
                  type="text"
                  maxLength={200}
                  value={productForm.name}
                  onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="اسم المنتج"
                  disabled={isSaving}
                />
              </label>

              <label className="stack-field">
                <span>التصنيف</span>
                <select
                  className="field-input"
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, category: event.target.value as ProductCategory }))
                  }
                  disabled={isSaving}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-field">
                <span>SKU</span>
                <input
                  className="field-input"
                  type="text"
                  maxLength={50}
                  value={productForm.sku}
                  onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))}
                  placeholder="رمز المنتج"
                  disabled={isSaving}
                />
              </label>

              <label className="stack-field product-admin-form__field--wide">
                <span>الوصف</span>
                <textarea
                  className="field-input"
                  rows={3}
                  maxLength={1000}
                  value={productForm.description}
                  onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="وصف اختياري للمنتج"
                  disabled={isSaving}
                />
              </label>

              <label className="stack-field">
                <span>سعر البيع</span>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  step="0.001"
                  value={productForm.sale_price}
                  onChange={(event) => setProductForm((current) => ({ ...current, sale_price: event.target.value }))}
                  placeholder="0.000"
                  disabled={isSaving}
                />
              </label>

              <label className="stack-field">
                <span>سعر التكلفة</span>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  step="0.001"
                  value={productForm.cost_price}
                  onChange={(event) => setProductForm((current) => ({ ...current, cost_price: event.target.value }))}
                  placeholder="0.000"
                  disabled={isSaving}
                />
              </label>

              <label className="stack-field">
                <span>الكمية</span>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  step={1}
                  value={productForm.stock_quantity}
                  onChange={(event) => setProductForm((current) => ({ ...current, stock_quantity: event.target.value }))}
                  placeholder="0"
                  disabled={isSaving}
                />
              </label>

              <label className="stack-field">
                <span>حد التنبيه</span>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  step={1}
                  value={productForm.min_stock_level}
                  onChange={(event) => setProductForm((current) => ({ ...current, min_stock_level: event.target.value }))}
                  placeholder="0"
                  disabled={isSaving}
                />
              </label>

              <label className="stack-checkbox">
                <input
                  className="field-input"
                  type="checkbox"
                  checked={productForm.track_stock}
                  onChange={(event) => setProductForm((current) => ({ ...current, track_stock: event.target.checked }))}
                  disabled={isSaving}
                />
                <span>يتتبع المخزون</span>
              </label>

              <label className="stack-checkbox">
                <input
                  className="field-input"
                  type="checkbox"
                  checked={productForm.is_quick_add}
                  onChange={(event) => setProductForm((current) => ({ ...current, is_quick_add: event.target.checked }))}
                  disabled={isSaving}
                />
                <span>إضافة سريعة</span>
              </label>
            </div>

            <div className="product-admin-form__actions">
              <div className="product-admin-form__status">
                <span className="status-pill badge badge--neutral">
                  {selectedProduct ? "وضع التعديل" : "وضع الإنشاء"}
                </span>
              </div>

              <div className="transaction-action-cluster">
                {selectedProduct ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={clearFormState}
                    disabled={isSaving}
                  >
                    إلغاء التعديل
                  </button>
                ) : null}
                <button type="submit" className="primary-button" disabled={isSaving}>
                  <Save size={16} />
                  {isSaving ? "جارٍ الحفظ..." : selectedProduct ? "حفظ التعديلات" : "إنشاء المنتج"}
                </button>
              </div>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <section className="operational-layout operational-layout--wide">
        <SectionCard
          title="بحث وتصفية"
          tone="accent"
          className="operational-sidebar operational-sidebar--sticky catalog-page__filters"
          actions={
            searchInput.trim() || activeCategory !== "all" ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setActiveCategory("all");
                  searchInputRef.current?.focus();
                }}
              >
                مسح التصفية
              </button>
            ) : null
          }
        >
          <label className="workspace-search catalog-page__search">
            <PackageSearch size={18} />
            <input
              ref={searchInputRef}
              className="field-input"
              type="search"
              autoFocus
              placeholder="ابحث باسم المنتج أو SKU أو الوصف"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
            />
          </label>

          <div className="chip-row catalog-page__filters-row" aria-label="تصنيفات المنتجات">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={category === activeCategory ? "chip chip--active" : "chip"}
                aria-pressed={category === activeCategory}
                onClick={() => setActiveCategory(category)}
              >
                {category === "all" ? "الكل" : getCategoryLabel(category)}
              </button>
            ))}
          </div>

          {quickAddProducts.length > 0 ? (
            <div className="catalog-quick-add">
              <div className="catalog-quick-add__header">
                <strong>الإضافة السريعة</strong>
                <span className="status-pill badge badge--neutral">
                  {formatCompactNumber(quickAddCount)} عنصر
                </span>
              </div>
              <div className="catalog-quick-add__grid">
                {quickAddProducts.map((product) => (
                  <article key={product.id} className="catalog-quick-add__card">
                    <div className="catalog-quick-add__copy">
                      <h3>{product.name}</h3>
                      <p>{product.sku ? <bdi dir="ltr">{product.sku}</bdi> : "بدون SKU"}</p>
                    </div>
                    <div className="catalog-quick-add__meta">
                      <strong>{formatCurrency(product.sale_price)}</strong>
                      <span className="product-pill product-pill--accent">سريع</span>
                    </div>
                    <div className="catalog-quick-add__footer">
                      <span className="workspace-footnote">
                        {product.track_stock
                          ? `${formatCompactNumber(product.stock_quantity)} متاح`
                          : "خدمة"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>

        <div className="operational-content">
          {isOffline ? (
            <StatusBanner
              variant="offline"
              title="أنت الآن خارج الاتصال"
              message="سيستمر عرض آخر بيانات تم تحميلها، لكن تحديث القائمة يحتاج عودة الشبكة."
              actionLabel="إعادة المحاولة"
              onAction={refresh}
            />
          ) : null}

          {isLoading ? (
            <div className="product-grid" aria-label="جارٍ تحميل المنتجات">
              {Array.from({ length: 6 }).map((_, index) => (
                <article key={`product-skeleton-${index}`} className="product-card product-card--skeleton">
                  <div className="skeleton-line skeleton-line--sm" />
                  <div className="skeleton-line skeleton-line--lg" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                </article>
              ))}
            </div>
          ) : errorMessage ? (
            <StatusBanner
              variant="danger"
              title="تعذر تحميل المنتجات"
              message={errorMessage}
              actionLabel="إعادة المحاولة"
              onAction={refresh}
            />
          ) : filteredProducts.length === 0 ? (
            <SectionCard title="المنتجات" className="catalog-page__results">
              <div className="empty-panel transaction-empty-panel">
                <PackageSearch size={20} />
              <h3 className="catalog-page__empty-title">
                {searchInput.trim()
                  ? `لا توجد نتائج تطابق "${searchInput.trim()}". جرّب SKU أو وصفاً أقصر.`
                  : "ابدأ بالبحث أو بدّل التصنيف للعثور على المنتجات الأسرع استخداماً."}
              </h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (searchInput.trim() || activeCategory !== "all") {
                    setSearchInput("");
                    setSearchQuery("");
                    setActiveCategory("all");
                    return;
                  }

                  if (isAdmin) {
                    clearFormState();
                    return;
                  }

                  refresh();
                }}
              >
                {searchInput.trim() || activeCategory !== "all"
                  ? "مسح التصفية"
                  : isAdmin
                    ? "منتج جديد"
                    : "إعادة المحاولة"}
              </button>
              </div>
              {hasMore ? (
                <div className="transaction-action-cluster">
                  <button type="button" className="secondary-button" onClick={loadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? "جارٍ تحميل المزيد..." : "تحميل المزيد من المنتجات"}
                  </button>
                </div>
              ) : null}
            </SectionCard>
          ) : (
            <SectionCard
              title="المنتجات"
              className="catalog-page__results"
              actions={
                <span className="product-pill product-pill--accent">
                  {formatCompactNumber(filteredProducts.length)}
                  {totalCount !== null ? ` من ${formatCompactNumber(totalCount)}` : ""}
                </span>
              }
            >
              <div className="product-grid catalog-page__grid">
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className={
                      isAdmin
                        ? "product-card product-card--interactive product-admin-card catalog-product-card"
                        : "product-card catalog-product-card"
                    }
                    role={isAdmin ? "button" : undefined}
                    tabIndex={isAdmin ? 0 : undefined}
                    aria-label={isAdmin ? `تحرير ${product.name}` : undefined}
                    onClick={
                      isAdmin
                        ? () => {
                            openProductForEdit(product);
                          }
                        : undefined
                    }
                    onKeyDown={
                      isAdmin
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openProductForEdit(product);
                            }
                          }
                        : undefined
                    }
                  >
                    <div className="product-card__meta catalog-product-card__badges">
                      <span className="product-pill">{getCategoryLabel(product.category)}</span>
                      {product.is_quick_add ? <span className="product-pill product-pill--accent">سريع</span> : null}
                      <span
                        className={product.track_stock && product.stock_quantity <= 5 ? "product-pill product-pill--warning" : "product-pill"}
                      >
                        {getStockLabel(product.track_stock, product.stock_quantity)}
                      </span>
                    </div>

                    <div className="catalog-product-card__body">
                      <h2>{product.name}</h2>
                      <p>
                        {product.sku ? (
                          <>
                            SKU <bdi dir="ltr">{product.sku}</bdi>
                          </>
                        ) : product.description ? (
                          product.description
                        ) : (
                          "بدون SKU"
                        )}
                      </p>
                    </div>

                    <div className="catalog-product-card__footer">
                      <strong className="catalog-product-card__price">
                        {formatCurrency(product.sale_price)}
                      </strong>
                      <span className="catalog-product-card__stock-meta">
                        {product.track_stock
                          ? `${formatCompactNumber(product.stock_quantity)} في المخزون`
                          : "خدمة"}
                      </span>
                    </div>

                    {isAdmin ? (
                      <div className="product-admin-card__actions catalog-product-card__actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openProductForEdit(product);
                          }}
                        >
                          <PencilLine size={16} />
                          تحرير
                        </button>
                        <button
                          type="button"
                          className="primary-button confirmation-dialog__confirm is-danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deactivateProduct(product);
                          }}
                        >
                          <Trash2 size={16} />
                          تعطيل
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className="transaction-action-cluster catalog-page__results-footer">
                {hasMore ? (
                  <button type="button" className="secondary-button" onClick={loadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? "جارٍ تحميل المزيد..." : "تحميل المزيد"}
                  </button>
                ) : null}
                <span className="workspace-footnote">
                  {formatCompactNumber(products.length)}
                  {totalCount !== null ? ` من ${formatCompactNumber(totalCount)}` : ""} منتج محمل
                </span>
              </div>
            </SectionCard>
          )}
        </div>
      </section>
    </section>
  );
}
