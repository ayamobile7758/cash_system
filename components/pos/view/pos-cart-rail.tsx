import * as React from "react";
import { GripHorizontal, Loader2, Minus, Plus, Trash2, type LucideIcon } from "lucide-react";
import type { PosAccount, PosCartItem } from "@/lib/pos/types";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/formatters";
import type { HeldCart } from "@/stores/pos-cart";

type LastTouchedCartLine = {
  id: string;
  revision: number;
};

type PosCartRailProps = {
  accounts?: PosAccount[];
  canHoldCart: boolean;
  cartHydrated: boolean;
  cartOverviewLabel: string;
  customerSummaryLabel: string;
  effectiveMaxDiscount: number;
  getAccountIcon?: (type: string) => LucideIcon;
  getHeldCartAge: (heldAt: string) => string;
  heldCarts: HeldCart[];
  isHeldCartsOpen: boolean;
  isReviewPaymentDisabled?: boolean;
  items: PosCartItem[];
  lastTouchedLine?: LastTouchedCartLine | null;
  layout?: "inline" | "review";
  onClearCartRequest: () => void;
  onDecreaseItem: (item: PosCartItem) => void;
  onDiscardHeldCart: (cartId: string) => void;
  onDiscountChange: (item: PosCartItem, value: number) => void;
  onHoldCart: () => void;
  onIncreaseItem: (item: PosCartItem) => void;
  onNewSale: () => void;
  onOpenCheckout: () => void;
  onOpenPaymentOptions?: () => void;
  onPaymentAccountSelect?: (accountId: string) => void;
  onRemoveItem: (item: PosCartItem) => void;
  onRestoreHeldCart: (cartId: string) => void;
  onSmartPaymentSubmit?: () => void;
  onToggleHeldCarts: () => void;
  selectedAccountId?: string | null;
  smartPaymentActionLabel?: string;
  smartPaymentAriaLabel?: string;
  smartPaymentErrorMessage?: string | null;
  smartPaymentSubmitDisabled?: boolean;
  smartPaymentSubmitting?: boolean;
};

export function PosCartRail({
  accounts,
  canHoldCart,
  cartHydrated,
  cartOverviewLabel,
  customerSummaryLabel,
  effectiveMaxDiscount,
  getAccountIcon,
  getHeldCartAge,
  heldCarts,
  isHeldCartsOpen,
  isReviewPaymentDisabled = false,
  items,
  lastTouchedLine = null,
  layout = "review",
  onClearCartRequest,
  onDecreaseItem,
  onDiscardHeldCart,
  onDiscountChange,
  onHoldCart,
  onIncreaseItem,
  onNewSale,
  onOpenCheckout,
  onOpenPaymentOptions,
  onPaymentAccountSelect,
  onRemoveItem,
  onRestoreHeldCart,
  onSmartPaymentSubmit,
  onToggleHeldCarts,
  selectedAccountId = null,
  smartPaymentActionLabel,
  smartPaymentAriaLabel,
  smartPaymentErrorMessage = null,
  smartPaymentSubmitDisabled = false,
  smartPaymentSubmitting = false
}: PosCartRailProps) {
  const lineRefs = React.useRef<Record<string, HTMLElement | null>>({});

  React.useLayoutEffect(() => {
    if (!lastTouchedLine) {
      return;
    }

    lineRefs.current[lastTouchedLine.id]?.scrollIntoView({
      block: "nearest"
    });
  }, [items, lastTouchedLine]);

  return (
    <div
      className={
        layout === "inline"
          ? "pos-cart-rail pos-cart-rail--inline"
          : "pos-cart-rail-layout pos-cart-rail-layout--review"
      }
    >
      <div className="pos-cart-rail__header">
        <div className="pos-cart-card__header">
          <div className="pos-cart-card__title-group">
            <div className="pos-cart-card__title-row">
              <h2 className="pos-cart-card__title">السلة</h2>
              <span className="pos-cart-card__count">{formatCompactNumber(items.length)}</span>
            </div>
            <p className="pos-cart-card__summary">{customerSummaryLabel}</p>
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
      </div>

      <div className="pos-cart-rail__items">
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
                const lineDiscountAmount = lineSubtotal * (item.discount_percentage / 100);
                const lineTotal = lineSubtotal - lineDiscountAmount;
                const canIncreaseQuantity =
                  maxQuantity === null || item.quantity < maxQuantity;

                return (
                  <article
                    key={item.product_id}
                    ref={(node) => {
                      lineRefs.current[item.product_id] = node;
                    }}
                    className="cart-line-card"
                  >
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
                          onChange={(event) =>
                            onDiscountChange(item, Number(event.target.value))
                          }
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
      </div>

      <div className="pos-cart-rail__footer">
        <div className="pos-cart-rail__summary-card">
          <p className="pos-cart-card__summary">{cartOverviewLabel}</p>
        </div>

        {items.length === 0 ? (
          <div className="pos-cart-rail__empty-message">ابدأ بإضافة منتج</div>
        ) : layout === "inline" && onSmartPaymentSubmit && onOpenPaymentOptions ? (
          <div className="pos-cart-rail__smart-actions">
            {smartPaymentErrorMessage ? (
              <div className="pos-cart-rail__smart-error" role="alert">
                {smartPaymentErrorMessage}
              </div>
            ) : null}

            {accounts && accounts.length > 0 && getAccountIcon && onPaymentAccountSelect ? (
              <div className="chip-row pos-cart-rail__payment-chips">
                {accounts.map((account) => {
                  const Icon = getAccountIcon(account.type);
                  const isSelected = account.id === selectedAccountId;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      className={
                        isSelected
                          ? "chip chip--active pos-payment-chip is-selected"
                          : "chip pos-payment-chip"
                      }
                      onClick={() => onPaymentAccountSelect(account.id)}
                      disabled={smartPaymentSubmitting}
                    >
                      <Icon size={16} />
                      {account.name?.trim() || "حساب"}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              className="primary-button pos-cart-rail__smart-button"
              onClick={onSmartPaymentSubmit}
              disabled={smartPaymentSubmitDisabled || smartPaymentSubmitting}
              aria-label={smartPaymentAriaLabel}
            >
              {smartPaymentSubmitting ? (
                <>
                  <Loader2 className="spin" size={16} />
                  جارٍ التنفيذ...
                </>
              ) : (
                smartPaymentActionLabel
              )}
            </button>

            <button
              type="button"
              className="pos-cart-rail__smart-link"
              onClick={onOpenPaymentOptions}
              disabled={smartPaymentSubmitting}
            >
              خيارات دفع أخرى
            </button>
          </div>
        ) : (
          <div className="actions-row pos-cart-rail__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenCheckout}
              disabled={isReviewPaymentDisabled}
            >
              مراجعة الدفع
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
