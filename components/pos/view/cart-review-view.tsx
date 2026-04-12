import * as React from "react";
import { SectionCard } from "@/components/ui/section-card";
import { PosCartRail } from "@/components/pos/view/pos-cart-rail";
import { PosSuccessState } from "@/components/pos/view/pos-success-state";

type CartReviewViewProps = React.ComponentProps<typeof PosCartRail> & {
  completedSaleFeeTotal: number;
  lastCompletedSale: React.ComponentProps<typeof PosSuccessState>["lastCompletedSale"] | null;
  onStartNewSale: () => void;
  onPrint: () => void;
  panelState: "cart" | "payment" | "processing" | "success";
};

export function CartReviewView({
  completedSaleFeeTotal,
  lastCompletedSale,
  onPrint,
  onStartNewSale,
  panelState,
  ...cartRailProps
}: CartReviewViewProps) {
  return (
    <SectionCard className="transaction-card transaction-card--checkout pos-cart-surface">
      {panelState === "success" && lastCompletedSale ? (
        <PosSuccessState
          completedSaleFeeTotal={completedSaleFeeTotal}
          lastCompletedSale={lastCompletedSale}
          onNewSale={onStartNewSale}
          onPrint={onPrint}
        />
      ) : panelState !== "success" ? (
        <PosCartRail {...cartRailProps} />
      ) : null}
    </SectionCard>
  );
}
