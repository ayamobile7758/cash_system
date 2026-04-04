"use client";

import * as React from "react";
import { Banknote, CreditCard, Split } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

type QuickCheckoutPanelProps = {
  netTotal: number;
  onExactCash: () => void;
  onExactCard: () => void;
  onCustomSplit: () => void;
  suggestedAmounts: number[];
  onSuggestedAmountSelect: (amount: number) => void;
  isSubmitting?: boolean;
};

export function QuickCheckoutPanel({
  netTotal,
  onExactCash,
  onExactCard,
  onCustomSplit,
  suggestedAmounts,
  onSuggestedAmountSelect,
  isSubmitting
}: QuickCheckoutPanelProps) {
  return (
    <div className="w-full flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500 font-medium">الإجمالي المطلوب</span>
        <span className="text-2xl font-black text-slate-800">{formatCurrency(netTotal)}</span>
      </div>

      {/* Suggested Fast Cash Buttons */}
      {suggestedAmounts.length > 0 && (
        <div className="flex gap-2 w-full overflow-x-auto hide-scrollbar snap-x pb-1">
          {suggestedAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={isSubmitting}
              onClick={() => onSuggestedAmountSelect(amount)}
              className="snap-start min-w-[30%] flex-1 bg-emerald-100 text-emerald-800 font-bold py-2 px-3 rounded-lg hover:bg-emerald-200 active:bg-emerald-300 transition-colors whitespace-nowrap text-center"
            >
              {formatCurrency(amount)}
            </button>
          ))}
        </div>
      )}

      {/* Primary Payment Actions */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onExactCash}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-white border-2 border-emerald-500 rounded-xl hover:bg-emerald-50 active:scale-[0.98] transition-all shadow-sm group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Banknote size={20} />
          </div>
          <span className="font-bold text-slate-700">دفع نقدي</span>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={onExactCard}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 active:scale-[0.98] transition-all shadow-sm group"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CreditCard size={20} />
          </div>
          <span className="font-bold text-slate-700">بطاقة بالكامل</span>
        </button>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={onCustomSplit}
        className="w-full flex items-center justify-center gap-2 py-3 mt-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <Split size={16} />
        <span className="font-medium">تقسيم الدفع / دفع جزئي</span>
      </button>
    </div>
  );
}
