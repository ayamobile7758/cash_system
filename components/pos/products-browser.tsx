"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { PackageSearch, PencilLine, Plus, RefreshCcw, Save, ShieldCheck, Trash2 } from "lucide-react";
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
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isTyping, startTransition] = useTransition();
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
      searchQuery: normalizedQuery,
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

  const categories = ["all", ...PRODUCT_CATEGORY_VALUES];
  const categoryOptions = [...PRODUCT_CATEGORY_VALUES];
  const filteredProducts = products;
  const quickAddProducts = filteredProducts.filter((product) => product.is_quick_add).slice(0, 8);
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
    <section className="operational-page">
      <PageHeader
        eyebrow="فهرس المنتجات"
        title="المنتجات الجاهزة للبيع"
        description="تصفح الكتالوج بحسب التصنيف، راقب حالة المخزون، وادِر المنتجات مباشرة إذا كان الحساب إداريًا."
        meta={
          <>
            <span className="status-pill badge badge--brand">الدور: {role === "admin" ? "إداري" : "نقطة بيع"}</span>
            <span className="status-pill badge badge--neutral">التصنيفات: {formatCompactNumber(categories.length - 1)}</span>
            <span className="status-pill badge badge--neutral">السريعة: {formatCompactNumber(products.filter((product) => product.is_quick_add).length)}</span>
          </>
        }
        actions={
          <div className="transaction-action-cluster">
            {isAdmin ? (
              <button type="button" className="secondary-button" onClick={clearFormState}>
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

      <section className="operational-page__meta-grid" aria-label="ملخص الكتالوج">
        <article className="operational-page__meta-card stat-card">
          <span className="operational-page__meta-label">المنتجات الظاهرة</span>
          <strong className="operational-page__meta-value">{formatCompactNumber(filteredProducts.length)}</strong>
          <span className="operational-page__meta-hint">العدد يتغير مباشرة بحسب البحث والتصنيف الحاليين.</span>
        </article>
        <article className="operational-page__meta-card stat-card">
          <span className="operational-page__meta-label">مخزون منخفض</span>
          <strong className="operational-page__meta-value">{formatCompactNumber(lowStockCount)}</strong>
          <span className="operational-page__meta-hint">يعرض المنتجات التي تحتاج متابعة سريعة قبل نفاد الكمية.</span>
        </article>
        <article className="operational-page__meta-card stat-card">
          <span className="operational-page__meta-label">حالة العرض</span>
          <strong className="operational-page__meta-value">{role === "admin" ? "كتالوج إداري" : "عرض مخصص للبيع"}</strong>
          <span className="operational-page__meta-hint">
            {role === "admin"
              ? "إدارة المخزون والتعديل المباشر متاحان في هذه الشاشة."
              : "هذا العرض مخصص للبيع اليومي."}
          </span>
        </article>
      </section>

      {isAdmin ? (
        <SectionCard
          eyebrow="إدارة المنتجات"
          title={selectedProduct ? `تعديل المنتج: ${selectedProduct.name}` : "إضافة منتج جديد"}
          description="أنشئ منتجًا جديدًا أو عدّل منتجًا موجودًا مباشرة من نفس الصفحة، ثم احفظ التغييرات فورًا."
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
                <span className="status-pill badge badge--neutral">{selectedProduct ? "وضع التعديل" : "وضع الإنشاء"}</span>
                <span className="workspace-footnote">احفظ التغييرات لتحديث الكتالوج فورًا.</span>
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
          eyebrow="البحث والتصنيف"
          title="ابدأ من المنتج أو التصنيف"
          description="حرّك الكتالوج بسرعة عبر البحث المباشر أو تصفية النتائج بحسب نوع المنتج."
          tone="accent"
          className="operational-sidebar operational-sidebar--sticky"
        >
          <label className="workspace-search">
            <PackageSearch size={18} />
            <input
              className="field-input"
              type="search"
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

          <div className="chip-row" aria-label="تصنيفات المنتجات">
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

          <p className="workspace-footnote">
            {isTyping
              ? "تحديث نتائج البحث..."
              : "يُنفَّذ البحث والتصنيف من المصدر نفسه مع مهلة 200ms للحفاظ على سرعة التصفح."}
          </p>

          {quickAddProducts.length > 0 ? (
            <div className="operational-list">
              <p className="workspace-footnote">الأكثر استخدامًا داخل البيع اليومي:</p>
              {quickAddProducts.map((product) => (
                <article key={product.id} className="operational-list-card">
                  <div className="operational-list-card__header">
                    <div>
                      <h3 className="operational-list-card__title">{product.name}</h3>
                      <p className="operational-list-card__description">{formatCurrency(product.sale_price)}</p>
                    </div>
                    <div className="operational-list-card__meta">
                      <span className="status-pill badge badge--brand">سريع</span>
                    </div>
                  </div>
                </article>
              ))}
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
              title="تعذر جلب المنتجات"
              message={errorMessage}
              actionLabel="إعادة المحاولة"
              onAction={refresh}
            />
          ) : filteredProducts.length === 0 ? (
            <SectionCard
              eyebrow="لا توجد نتائج"
              title="لم نصل إلى منتجات مطابقة"
              description="جرّب عبارة أخرى أو انتقل إلى تصنيف مختلف لإظهار المنتجات المتاحة للبيع."
              tone="subtle"
            >
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
              eyebrow="الكتالوج"
              title="بطاقات المنتجات"
              description="بطاقات مضغوطة تسهّل قراءة الاسم والسعر والمخزون دون إخفاء المعلومات الضرورية للبيع."
            >
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className={isAdmin ? "product-card product-card--interactive product-admin-card" : "product-card"}
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
                    <div className="product-card__meta">
                      <span className="product-pill">{getCategoryLabel(product.category)}</span>
                      {product.is_quick_add ? <span className="product-pill product-pill--accent">سريع</span> : null}
                      <span
                        className={product.track_stock && product.stock_quantity <= 5 ? "product-pill product-pill--warning" : "product-pill"}
                      >
                        {getStockLabel(product.track_stock, product.stock_quantity)}
                      </span>
                    </div>

                    <div className="product-card__copy">
                      <h2>{product.name}</h2>
                      <p>{product.description || "بدون وصف إضافي لهذا المنتج."}</p>
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
                      <div>
                        <dt>رمز المنتج</dt>
                        <dd>{product.sku || "غير محدد"}</dd>
                      </div>
                    </dl>

                    {isAdmin ? (
                      <div className="product-admin-card__actions">
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
              <div className="transaction-action-cluster">
                {hasMore ? (
                  <button type="button" className="secondary-button" onClick={loadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? "جارٍ تحميل المزيد..." : "تحميل المزيد من المنتجات"}
                  </button>
                ) : null}
                <span className="workspace-footnote">
                  {formatCompactNumber(products.length)}
                  {totalCount !== null ? ` من ${formatCompactNumber(totalCount)}` : ""} منتج محمّل حتى الآن.
                </span>
              </div>
            </SectionCard>
          )}

          <SectionCard
            eyebrow="ملاحظات العرض"
            title="استخدام تشغيلي أوضح"
            description="الكتالوج هنا مخصص للمراجعة والبحث السريع فقط. عمليات البيع والتحكم بالكميات تبقى داخل مساحة نقطة البيع نفسها."
            tone="subtle"
          >
            <div className="operational-inline-summary">
              <span className="status-pill badge badge--neutral">
                <ShieldCheck size={16} />
                العرض مناسب للبيع اليومي
              </span>
              <span className="status-pill badge badge--neutral">البحث يشمل الاسم وSKU</span>
            </div>
          </SectionCard>
        </div>
      </section>
    </section>
  );
}
