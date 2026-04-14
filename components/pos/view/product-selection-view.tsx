import * as React from "react";
import { PosToolbar } from "@/components/pos/toolbar";
import { PosProductGrid } from "@/components/pos/view/pos-product-grid";
import type { PosProduct } from "@/lib/pos/types";

type ProductSelectionViewProps = {
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
  showHeldCartsButton: boolean;
  onRefreshProducts: () => void;
  showRefreshButton: boolean;
  productView: "text" | "thumbnail";
  onProductViewChange: (view: "text" | "thumbnail") => void;
  showViewToggle: boolean;
  onClearSearch: () => void;
  onLoadMore: () => void;
  productResultsLabel: string;
  products: PosProduct[];
  productsHasMore: boolean;
  productsLoading: boolean;
  productsLoadingMore: boolean;
  searchInput: string;
  showEmptySearchState: boolean;
  children?: React.ReactNode;
};

export function ProductSelectionView({
  search,
  categories,
  onCategorySelect,
  heldCartsCount,
  onHeldCartsOpen,
  showHeldCartsButton,
  onRefreshProducts,
  showRefreshButton,
  productView,
  onProductViewChange,
  showViewToggle,
  onClearSearch,
  onLoadMore,
  productResultsLabel,
  products,
  productsHasMore,
  productsLoading,
  productsLoadingMore,
  searchInput,
  showEmptySearchState,
  children
}: ProductSelectionViewProps) {
  return (
    <div className="transaction-stack pos-products-stack">
      <PosToolbar
        search={search}
        categories={categories}
        onCategorySelect={onCategorySelect}
        heldCartsCount={heldCartsCount}
        onHeldCartsOpen={onHeldCartsOpen}
        showHeldCartsButton={showHeldCartsButton}
        onRefreshProducts={onRefreshProducts}
        showRefreshButton={showRefreshButton}
        productView={productView}
        onProductViewChange={onProductViewChange}
        showViewToggle={showViewToggle}
      >
        {children}
      </PosToolbar>
      <PosProductGrid
        onClearSearch={onClearSearch}
        onLoadMore={onLoadMore}
        productResultsLabel={productResultsLabel}
        productView={productView}
        products={products}
        productsHasMore={productsHasMore}
        productsLoading={productsLoading}
        productsLoadingMore={productsLoadingMore}
        searchInput={searchInput}
        showEmptySearchState={showEmptySearchState}
      />
    </div>
  );
}
