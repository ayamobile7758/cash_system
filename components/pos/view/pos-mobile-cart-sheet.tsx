import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/formatters";
import styles from "@/components/pos/pos-view.module.css";

type PosMobileCartSheetProps = {
  itemCount: number;
  netTotal: number;
  onOpenCart: () => void;
};

export function PosMobileCartSheet({
  itemCount,
  netTotal,
  onOpenCart
}: PosMobileCartSheetProps) {
  return (
    <div className={`${styles.mobileCartAccess} pos-workspace__mobile-cart-access`}>
      <button
        type="button"
        className={`${styles.mobileCartButton} pos-cart-sheet pos-mobile-cart-access pos-cart-sheet__summary`}
        onClick={onOpenCart}
      >
        <span className={styles.mobileCartCount}>
          <ShoppingCart size={16} />
          {formatCompactNumber(itemCount)}
        </span>
        <span className={styles.mobileCartLabel}>السلة والدفع</span>
        <strong className={styles.mobileCartTotal}>{formatCurrency(netTotal)}</strong>
      </button>
    </div>
  );
}
