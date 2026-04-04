import * as React from "react";
import { Search } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import type { PosProduct } from "@/lib/pos/types";
import styles from "@/components/pos/pos-view.module.css";
import { PosProductCard } from "@/components/pos/view/pos-product-card";

type PosProductGridProps = {
  onClearSearch: () => void;
  onLoadMore: () => void;
  productResultsLabel: string;
  productView: "text" | "thumbnail";
  products: PosProduct[];
  productsHasMore: boolean;
  productsLoading: boolean;
  productsLoadingMore: boolean;
  searchInput: string;
  showEmptySearchState: boolean;
};

export function PosProductGrid({
  onClearSearch,
  onLoadMore,
  productResultsLabel,
  productView,
  products,
  productsHasMore,
  productsLoading,
  productsLoadingMore,
  searchInput,
  showEmptySearchState
}: PosProductGridProps) {
  return (
    <SectionCard className={`${styles.productPanel} transaction-card pos-product-panel`}>
      <div className={`${styles.productPanelHeader} pos-product-panel__header`}>
        <div className={`${styles.productPanelTitleGroup} pos-product-panel__title-group`}>
          <h2 className={`${styles.productPanelTitle} pos-product-panel__title`}>المنتجات</h2>
          <p className={`${styles.productPanelSummary} pos-product-panel__summary`}>
            {productResultsLabel}
          </p>
        </div>
      </div>

      {productsLoading ? (
        <div
          className={`${styles.skeletonGrid} transaction-product-grid pos-product-grid pos-product-grid--skeleton`}
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="pos-product-card-skeleton" />
          ))}
        </div>
      ) : (
        <div className={`${styles.productGrid} transaction-product-grid pos-product-grid`}>
          {showEmptySearchState ? (
            <div className={`${styles.emptyState} empty-panel pos-product-panel__empty`}>
              <Search className="empty-state__icon" size={40} />
              <h3 className="empty-state__title">لا توجد نتائج</h3>
              <p className="empty-state__description">
                لم يُعثر على منتج يطابق &quot;{searchInput}&quot;
              </p>
              <button type="button" className="secondary-button" onClick={onClearSearch}>
                مسح البحث
              </button>
            </div>
          ) : (
            products.map((product) => (
              <PosProductCard key={product.id} product={product} viewMode={productView} />
            ))
          )}
        </div>
      )}

      {productsHasMore ? (
        <div className={`${styles.panelFooter} pos-product-panel__footer`}>
          <button
            type="button"
            className={`${styles.loadMore} secondary-button pos-product-panel__load-more`}
            onClick={onLoadMore}
            disabled={productsLoadingMore}
          >
            {productsLoadingMore ? "جارٍ تحميل المزيد..." : "تحميل المزيد"}
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}
