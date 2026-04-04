import * as React from "react";
import type { PosProduct } from "@/lib/pos/types";
import { ProductGridItem } from "@/components/pos/product-grid-item";

type PosProductCardProps = {
  product: PosProduct;
  viewMode: "text" | "thumbnail";
};

export function PosProductCard({ product, viewMode }: PosProductCardProps) {
  return <ProductGridItem product={product} variant="grid" viewMode={viewMode} />;
}
