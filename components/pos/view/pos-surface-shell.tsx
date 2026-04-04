import * as React from "react";
import styles from "@/components/pos/pos-view.module.css";

type PosSurfaceShellProps = {
  activeMobileTab: "products" | "cart";
  cart: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  isMobileViewport: boolean;
  products: React.ReactNode;
};

export function PosSurfaceShell({
  activeMobileTab,
  cart,
  footer,
  header,
  isMobileViewport,
  products
}: PosSurfaceShellProps) {
  return (
    <div className={`${styles.stage} pos-workspace__stage`}>
      {header}

      <div className={`${styles.layout} pos-layout`}>
        <div
          className={
            isMobileViewport && activeMobileTab !== "products"
              ? `${styles.productsPane} pos-products is-hidden`
              : `${styles.productsPane} pos-products`
          }
        >
          <div className={`${styles.productsContent} pos-products__content`}>
            {products}
          </div>
        </div>

        <aside
          className={
            isMobileViewport && activeMobileTab === "products"
              ? "pos-cart-sheet is-hidden"
              : "pos-cart-sheet"
          }
        >
          {cart}
        </aside>
      </div>

      {footer}
    </div>
  );
}
