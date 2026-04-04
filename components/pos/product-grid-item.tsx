"use client";

import * as React from "react";
import { AlertTriangle, Minus, Plus } from "lucide-react";
import { ProductThumbnailArt } from "@/components/pos/product-thumbnail-art";
import type { PosProduct } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/formatters";
import { usePosCartStore } from "@/stores/pos-cart";
import styles from "@/components/pos/product-grid-item.module.css";

type ProductGridItemProps = {
  product: PosProduct;
  variant?: "quick-add" | "grid";
  viewMode?: "text" | "thumbnail";
  index?: number;
};

function getProductStockState(product: {
  track_stock: boolean;
  stock_quantity: number;
  min_stock_level: number;
}) {
  if (!product.track_stock) {
    return { label: "متوفر", tone: "available" } as const;
  }

  if (product.stock_quantity <= 0) {
    return { label: "نفد", tone: "out" } as const;
  }

  if (product.stock_quantity <= Math.max(product.min_stock_level, 0)) {
    return { label: `${formatCompactNumber(product.stock_quantity)} فقط`, tone: "low" } as const;
  }

  return { label: `${formatCompactNumber(product.stock_quantity)} متوفر`, tone: "available" } as const;
}

function getProductCategoryTone(category: string) {
  if (category === "device") return "device";
  if (category === "sim") return "sim";
  if (category === "service_general" || category === "service_repair") return "service";
  return "accessory";
}

export function ProductGridItem({
  product,
  variant = "grid",
  viewMode = "thumbnail",
  index
}: ProductGridItemProps) {
  const addProduct = usePosCartStore((state) => state.addProduct);
  const removeItem = usePosCartStore((state) => state.removeItem);
  const setQuantity = usePosCartStore((state) => state.setQuantity);
  const items = usePosCartStore((state) => state.items);

  const cartItem = items.find((item) => item.product_id === product.id);
  const quantityInCart = cartItem?.quantity ?? 0;
  const stockState = getProductStockState(product);
  const isOutOfStock = product.track_stock && product.stock_quantity <= 0;
  const isThumbnailView = viewMode === "thumbnail";
  const categoryTone = getProductCategoryTone(product.category);
  const showQuickAddButton = !isOutOfStock && quantityInCart === 0;

  const productCardClassName = [
    styles.root,
    "pos-product-card",
    "pos-product-card--compact",
    isThumbnailView ? "pos-product-card--compact-thumbnail" : "",
    variant === "quick-add" ? "pos-product-card--quick-add" : "",
    !isOutOfStock ? styles.rootInteractive : styles.rootDisabled,
    quantityInCart > 0 ? styles.rootInCart : "",
    isOutOfStock ? "pos-product-card--disabled" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const handleAdd = (event?: React.MouseEvent | React.KeyboardEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    addProduct(product);
  };

  const handleIncrease = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setQuantity(product.id, quantityInCart + 1);
  };

  const handleDecrease = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    if (quantityInCart > 1) {
      setQuantity(product.id, quantityInCart - 1);
      return;
    }

    removeItem(product.id);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isOutOfStock) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      handleAdd(event);
    }
  };

  return (
    <div
      className={productCardClassName}
      onClick={isOutOfStock ? undefined : handleAdd}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      aria-label={product.name}
      aria-disabled={isOutOfStock}
      title={variant === "quick-add" && index !== undefined ? `${product.name} • ${index + 1}` : product.name}
    >
      <div className={styles.content}>
        <span
          className={
            isThumbnailView
              ? `pos-product-card__thumb pos-product-card__thumb--thumbnail pos-product-card__thumb--${categoryTone}`
              : `pos-product-card__thumb pos-product-card__thumb--${categoryTone}`
          }
          aria-hidden="true"
        >
          <ProductThumbnailArt category={product.category} className="pos-product-card__art" />
        </span>

        <span className={`${styles.info} pos-product-card__info`}>
          <span className="pos-product-card__name">{product.name}</span>
          {!isThumbnailView && product.sku ? (
            <span className="pos-product-card__sku">
              <bdi dir="ltr">{product.sku}</bdi>
            </span>
          ) : null}
        </span>

        <span
          className={
            isThumbnailView
              ? `${styles.pricing} ${styles.pricingThumbnail} pos-product-card__pricing pos-product-card__pricing--thumbnail`
              : `${styles.pricing} pos-product-card__pricing`
          }
        >
          <span className="pos-product-card__price">{formatCurrency(product.sale_price)}</span>
          <span className={`pos-product-card__stock pos-product-card__stock--${stockState.tone}`}>
            {stockState.tone === "low" ? <AlertTriangle size={12} aria-hidden="true" /> : null}
            {stockState.label}
          </span>
        </span>
      </div>

      {isOutOfStock ? (
        <span className={`${styles.outOfStockOverlay} pos-product-card__overlay`}>
          <span className="pos-product-card__badge pos-product-card__badge--out">نفد</span>
        </span>
      ) : null}

      {showQuickAddButton ? (
        <button
          type="button"
          className="pos-product-card__add-button"
          onClick={handleAdd}
          aria-label={`إضافة ${product.name}`}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      ) : null}

      {quantityInCart > 0 && !isOutOfStock ? (
        <div className={styles.quantityBar} onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={handleDecrease}
            aria-label={`إنقاص ${product.name}`}
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <span className={styles.quantityValue}>{quantityInCart}</span>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={handleIncrease}
            aria-label={`زيادة ${product.name}`}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
