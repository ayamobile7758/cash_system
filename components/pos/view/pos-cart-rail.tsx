import * as React from "react";
import { GripHorizontal, Minus, Plus, Trash2 } from "lucide-react";
import type { PosCartItem } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/formatters";
import type { HeldCart } from "@/stores/pos-cart";

type PosCartRailProps = {
  canHoldCart: boolean;
  cartHydrated: boolean;
  cartOverviewLabel: string;
  customerSummaryLabel: string;
  effectiveMaxDiscount: number;
  getHeldCartAge: (heldAt: string) => string;
  heldCarts: HeldCart[];
  isHeldCartsOpen: boolean;
  isReviewPaymentDisabled?: boolean;
  items: PosCartItem[];
  onClearCartRequest: () => void;
  onDecreaseItem: (item: PosCartItem) => void;
  onDiscardHeldCart: (cartId: string) => void;
  onDiscountChange: (item: PosCartItem, value: number) => void;
  onHoldCart: () => void;
  onIncreaseItem: (item: PosCartItem) => void;
  onNewSale: () => void;
  onOpenCheckout: () => void;
  onRemoveItem: (item: PosCartItem) => void;
  onRestoreHeldCart: (cartId: string) => void;
  onToggleHeldCarts: () => void;
};

export function PosCartRail({
  canHoldCart,
  cartHydrated,
  cartOverviewLabel,
  customerSummaryLabel,
  effectiveMaxDiscount,
  getHeldCartAge,
  heldCarts,
  isHeldCartsOpen,
  isReviewPaymentDisabled = false,
  items,
  onClearCartRequest,
  onDecreaseItem,
  onDiscardHeldCart,
  onDiscountChange,
  onHoldCart,
  onIncreaseItem,
  onNewSale,
  onOpenCheckout,
  onRemoveItem,
  onRestoreHeldCart,
  onToggleHeldCarts
}: PosCartRailProps) {
  return (
    <>
      <div className="pos-cart-card__header">
        <div className="pos-cart-card__title-group">
          <div className="pos-cart-card__title-row">
            <h2 className="pos-cart-card__title">السلة</h2>
            <span className="pos-cart-card__count">{formatCompactNumber(items.length)}</span>
          </div>
          <p className="pos-cart-card__summary">{customerSummaryLabel}</p>
          <p className="pos-cart-card__summary">{cartOverviewLabel}</p>
        </div>
        <button
          type="button"
          className="icon-button pos-cart-card__clear"
          onClick={onClearCartRequest}
          disabled={items.length === 0}
          aria-label="تفريغ السلة"
          title="Ctrl+Q"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="cart-panel__actions pos-cart-card__toolbar">
        <button
          type="button"
          className="primary-button cart-panel__header-button pos-cart-new-sale"
          onClick={onNewSale}
        >
          <Plus size={14} />
          بيع جديد
        </button>
        <button
          type="button"
          className="secondary-button cart-panel__header-button"
          onClick={onHoldCart}
          disabled={!canHoldCart}
        >
          تعليق
        </button>
        <button
          type="button"
          className="secondary-button cart-panel__header-button"
          onClick={onToggleHeldCarts}
        >
          السلال المعلقة
          <span className="product-pill product-pill--accent">
            {formatCompactNumber(heldCarts.length)}
          </span>
        </button>
      </div>

      {isHeldCartsOpen ? (
        <div className="held-carts-panel">
          {heldCarts.length === 0 ? (
            <div className="held-carts-empty">لا توجد سلال معلقة حاليًا.</div>
          ) : (
            <div className="held-carts-list">
              {heldCarts.map((heldCart) => (
                <article key={heldCart.id} className="held-cart-card">
                  <div className="held-cart-card__copy">
                    <strong>{heldCart.label}</strong>
                    <span>
                      {formatCompactNumber(heldCart.items.length)} بند •{" "}
                      {getHeldCartAge(heldCart.heldAt)}
                    </span>
                  </div>

                  <div className="held-cart-card__actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onRestoreHeldCart(heldCart.id)}
                    >
                      استعادة
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => onDiscardHeldCart(heldCart.id)}
                      aria-label={`حذف السلة المعلقة ${heldCart.label}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {!cartHydrated ? (
        <div className="stack-list" aria-label="جارٍ استعادة السلة">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state transaction-empty-panel">
          <GripHorizontal className="empty-state__icon" />
          <h3 className="empty-state__title">السلة فارغة</h3>
          <p className="empty-state__description">لا توجد بنود مضافة.</p>
        </div>
      ) : (
        <div className="pos-cart-card__body">
          <div className="pos-cart-card__table-head" aria-hidden="true">
            <span>المنتج</span>
            <span>الكمية</span>
            <span>الإجمالي</span>
          </div>

          <div className="cart-line-list">
            {items.map((item) => {
              const maxQuantity = item.track_stock ? Math.max(item.stock_quantity, 1) : null;
              const lineSubtotal = item.sale_price * item.quantity;
              const lineDiscountAmount =
                lineSubtotal * (item.discount_percentage / 100);
              const lineTotal = lineSubtotal - lineDiscountAmount;
              const canIncreaseQuantity =
                maxQuantity === null || item.quantity < maxQuantity;

              return (
                <article key={item.product_id} className="cart-line-card">
                  <div className="cart-line-card__header">
                    <div className="cart-line-card__copy">
                      <strong>{item.name}</strong>
                      <p>{formatCurrency(item.sale_price)} للوحدة</p>
                    </div>

                    <div className="cart-line-card__header-side">
                      <strong className="cart-line-card__line-total">
                        {formatCurrency(lineTotal)}
                      </strong>
                      <button
                        type="button"
                        className="icon-button cart-line-card__remove"
                        onClick={() => onRemoveItem(item)}
                        aria-label={`حذف ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="cart-line-card__controls">
                    <div
                      className="cart-line-card__quantity"
                      aria-label={`تعديل كمية ${item.name}`}
                    >
                      <button
                        type="button"
                        className="icon-button cart-line-card__quantity-button"
                        onClick={() => onDecreaseItem(item)}
                        aria-label={`تقليل كمية ${item.name}`}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="cart-line-card__quantity-value">
                        <bdi dir="ltr">{formatCompactNumber(item.quantity)}</bdi>
                      </span>
                      <button
                        type="button"
                        className="icon-button cart-line-card__quantity-button"
                        onClick={() => onIncreaseItem(item)}
                        disabled={!canIncreaseQuantity}
                        aria-label={`زيادة كمية ${item.name}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <label className="cart-line-card__discount">
                      <span>خصم %</span>
                      <input
                        type="number"
                        min={0}
                        max={effectiveMaxDiscount}
                        value={item.discount_percentage}
                        onChange={(event) => onDiscountChange(item, Number(event.target.value))}
                      />
                    </label>
                  </div>

                  {lineDiscountAmount > 0 ? (
                    <div className="cart-line-card__meta">
                      <span className="product-pill product-pill--warning">
                        خصم {formatCurrency(lineDiscountAmount)}
                      </span>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div className="actions-row">
        <button
          type="button"
          className="secondary-button"
          onClick={onOpenCheckout}
          disabled={isReviewPaymentDisabled}
        >
          مراجعة الدفع
        </button>
      </div>
    </>
  );
}
