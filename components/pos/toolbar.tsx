"use client";

import * as React from "react";
import { Archive, ImageIcon, List, RefreshCcw, Search, X } from "lucide-react";
import styles from "@/components/pos/pos-view.module.css";
import { formatCompactNumber } from "@/lib/utils/formatters";

type PosToolbarProps = {
  search: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    onClear?: () => void;
    onSubmit?: () => void;
    inputRef?: React.Ref<HTMLInputElement>;
  };
  categories: Array<{
    id: string;
    label: string;
    active: boolean;
  }>;
  onCategorySelect: (id: string) => void;
  heldCartsCount: number;
  onHeldCartsOpen: () => void;
  showHeldCartsButton?: boolean;
  onRefreshProducts?: () => void;
  showRefreshButton?: boolean;
  productView?: "text" | "thumbnail";
  onProductViewChange?: (view: "text" | "thumbnail") => void;
  showViewToggle?: boolean;
};

export function PosToolbar({
  search,
  categories,
  onCategorySelect,
  heldCartsCount,
  onHeldCartsOpen,
  showHeldCartsButton = true,
  onRefreshProducts,
  showRefreshButton = true,
  productView,
  onProductViewChange,
  showViewToggle = true
}: PosToolbarProps) {
  return (
    <div
      data-primitive="pos-toolbar"
      className={`${styles.discoveryCard} pos-toolbar pos-sub-topbar__inner transaction-card pos-discovery-card`}
    >
      <div className={`${styles.discoveryToolbar} transaction-toolbar pos-discovery-toolbar`}>
        <label
          className={`${styles.searchField} workspace-search transaction-toolbar__search pos-search-field`}
        >
          <Search size={18} className={`${styles.searchIcon} pos-search-field__icon`} />
          <input
            ref={search.inputRef}
            type="search"
            autoFocus
            className={`${styles.searchInput} pos-search-field__input`}
            placeholder={search.placeholder}
            title="F1"
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                search.onSubmit?.();
              }
            }}
          />
          {search.value.trim().length > 0 && search.onClear ? (
            <button
              type="button"
              className={`${styles.searchClear} icon-button pos-search-field__clear`}
              onClick={search.onClear}
              aria-label="مسح البحث"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        <div className={`${styles.toolbarActions} pos-toolbar__actions`}>
          {showHeldCartsButton ? (
            <button
              type="button"
              className="secondary-button pos-toolbar__held-carts"
              onClick={onHeldCartsOpen}
              aria-label="السلال المعلقة"
            >
              <Archive size={16} />
              <span>السلال المعلقة</span>
              <span className="product-pill product-pill--warning pos-toolbar__held-carts-count">
                {formatCompactNumber(heldCartsCount)}
              </span>
            </button>
          ) : null}

          {onRefreshProducts && showRefreshButton ? (
            <button
              type="button"
              className={`${styles.iconButton} icon-button pos-discovery-toolbar__icon-button`}
              onClick={onRefreshProducts}
              title="تحديث المنتجات"
            >
              <RefreshCcw size={18} />
            </button>
          ) : null}

          {productView && onProductViewChange && showViewToggle ? (
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
          ) : null}
        </div>
      </div>

      <div className={`${styles.categoryRow} chip-row transaction-chip-row pos-category-row`}>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={
              category.active
                ? `${styles.categoryChip} chip-button is-selected`
                : `${styles.categoryChip} chip-button`
            }
            aria-pressed={category.active}
            onClick={() => onCategorySelect(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
