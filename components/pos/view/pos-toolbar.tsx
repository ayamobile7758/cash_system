import * as React from "react";
import { ImageIcon, List, Plus, RefreshCcw, Search, X } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import styles from "@/components/pos/pos-view.module.css";
import { formatCompactNumber } from "@/lib/utils/formatters";

type PosToolbarProps = {
  activeCategory: string;
  categories: string[];
  getCategoryLabel: (category: string) => string;
  heldCartsCount: number;
  onCategoryChange: (category: string) => void;
  onClearSearch: () => void;
  onNewSale: () => void;
  onProductViewChange: (view: "text" | "thumbnail") => void;
  onRefreshProducts: () => void;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onToggleHeldCarts: () => void;
  productView: "text" | "thumbnail";
  searchInput: string;
  searchRef: React.Ref<HTMLInputElement>;
};

export function PosToolbar({
  activeCategory,
  categories,
  getCategoryLabel,
  heldCartsCount,
  onCategoryChange,
  onClearSearch,
  onNewSale,
  onProductViewChange,
  onRefreshProducts,
  onSearchInputChange,
  onSearchSubmit,
  onToggleHeldCarts,
  productView,
  searchInput,
  searchRef
}: PosToolbarProps) {
  return (
    <SectionCard className={`${styles.discoveryCard} transaction-card pos-discovery-card`}>
      <div className={`${styles.discoveryToolbar} transaction-toolbar pos-discovery-toolbar`}>
        <label
          className={`${styles.searchField} workspace-search transaction-toolbar__search pos-search-field`}
        >
          <Search size={18} className={`${styles.searchIcon} pos-search-field__icon`} />
          <input
            ref={searchRef}
            type="search"
            autoFocus
            className={`${styles.searchInput} pos-search-field__input`}
            placeholder="ابحث بالاسم أو رمز المنتج..."
            title="F1"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearchSubmit();
              }
            }}
          />
          {searchInput.trim().length > 0 ? (
            <button
              type="button"
              className={`${styles.searchClear} icon-button pos-search-field__clear`}
              onClick={onClearSearch}
              aria-label="مسح البحث"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          className={`${styles.iconButton} icon-button pos-discovery-toolbar__icon-button`}
          onClick={onRefreshProducts}
          title="تحديث المنتجات"
        >
          <RefreshCcw size={18} />
        </button>

        <div className={`${styles.toolbarActions} pos-discovery-toolbar__actions`}>
          <button
            type="button"
            className={`${styles.secondaryAction} secondary-button pos-discovery-toolbar__secondary-action`}
            onClick={onToggleHeldCarts}
          >
            سلال معلقة
            {heldCartsCount > 0 ? (
              <span className="product-pill product-pill--warning">
                {formatCompactNumber(heldCartsCount)}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={`${styles.primaryAction} primary-button pos-discovery-toolbar__primary-action`}
            onClick={onNewSale}
          >
            <Plus size={16} />
            بيع جديد
          </button>
        </div>

        <div className={`${styles.viewToggle} pos-view-toggle`}>
          <button
            type="button"
            className={
              productView === "text"
                ? `${styles.viewToggleButton} icon-button pos-view-toggle__button is-active`
                : `${styles.viewToggleButton} icon-button pos-view-toggle__button`
            }
            onClick={() => onProductViewChange("text")}
            title="عرض مدمج"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={
              productView === "thumbnail"
                ? `${styles.viewToggleButton} icon-button pos-view-toggle__button is-active`
                : `${styles.viewToggleButton} icon-button pos-view-toggle__button`
            }
            onClick={() => onProductViewChange("thumbnail")}
            title="عرض بالصور"
          >
            <ImageIcon size={16} />
          </button>
        </div>
      </div>

      <div className={`${styles.categoryRow} chip-row transaction-chip-row pos-category-row`}>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={
              category === activeCategory
                ? `${styles.categoryChip} chip-button is-selected`
                : `${styles.categoryChip} chip-button`
            }
            aria-pressed={category === activeCategory}
            onClick={() => onCategoryChange(category)}
          >
            {category === "all" ? "الكل" : getCategoryLabel(category)}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
