"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PosCartItem, PosProduct, SaleResponseData } from "@/lib/pos/types";

function createDraftIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}`;
}

export function calculateCartSubtotal(items: PosCartItem[]) {
  return items.reduce((sum, item) => sum + item.sale_price * item.quantity, 0);
}

export function calculateCartDiscount(items: PosCartItem[]) {
  return items.reduce((sum, item) => {
    const lineSubtotal = item.sale_price * item.quantity;
    return sum + lineSubtotal * (item.discount_percentage / 100);
  }, 0);
}

export function calculateCartTotal(items: PosCartItem[]) {
  return calculateCartSubtotal(items) - calculateCartDiscount(items);
}

function clampQuantity(item: PosCartItem, nextQuantity: number) {
  const normalized = Math.max(1, nextQuantity);

  if (!item.track_stock) {
    return normalized;
  }

  return Math.min(normalized, Math.max(item.stock_quantity, 1));
}

type SubmissionState = "idle" | "submitting" | "success" | "error";

interface PosCartStore {
  items: PosCartItem[];
  selectedAccountId: string | null;
  posTerminalCode: string;
  notes: string;
  currentIdempotencyKey: string;
  submissionState: SubmissionState;
  lastCompletedSale: SaleResponseData | null;
  lastErrorCode: string | null;
  addProduct: (product: PosProduct) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setDiscountPercentage: (productId: string, discountPercentage: number) => void;
  setSelectedAccountId: (accountId: string) => void;
  setNotes: (notes: string) => void;
  setPosTerminalCode: (code: string) => void;
  clearCart: () => void;
  markSubmitting: () => void;
  markError: (errorCode: string) => void;
  refreshIdempotencyKey: () => void;
  completeSale: (sale: SaleResponseData) => void;
  resetStore: () => void;
}

function createDefaultState() {
  return {
    items: [] as PosCartItem[],
    selectedAccountId: null,
    posTerminalCode: "POS-01",
    notes: "",
    currentIdempotencyKey: "",
    submissionState: "idle" as SubmissionState,
    lastCompletedSale: null as SaleResponseData | null,
    lastErrorCode: null as string | null
  };
}

export const usePosCartStore = create<PosCartStore>()(
  persist(
    (set) => ({
      ...createDefaultState(),
      addProduct(product) {
        set((state) => {
          const existing = state.items.find((item) => item.product_id === product.id);

          if (!existing) {
            return {
              items: [
                ...state.items,
                {
                  product_id: product.id,
                  name: product.name,
                  category: product.category,
                  sale_price: product.sale_price,
                  quantity: 1,
                  discount_percentage: 0,
                  stock_quantity: product.stock_quantity,
                  track_stock: product.track_stock
                }
              ],
              submissionState: "idle",
              lastErrorCode: null
            };
          }

          return {
            items: state.items.map((item) =>
              item.product_id === product.id
                ? { ...item, quantity: clampQuantity(item, item.quantity + 1) }
                : item
            ),
            submissionState: "idle",
            lastErrorCode: null
          };
        });
      },
      removeItem(productId) {
        set((state) => ({
          items: state.items.filter((item) => item.product_id !== productId),
          submissionState: "idle",
          lastErrorCode: null
        }));
      },
      setQuantity(productId, quantity) {
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === productId
              ? { ...item, quantity: clampQuantity(item, quantity) }
              : item
          ),
          submissionState: "idle",
          lastErrorCode: null
        }));
      },
      setDiscountPercentage(productId, discountPercentage) {
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === productId
              ? {
                  ...item,
                  discount_percentage: Math.min(Math.max(discountPercentage, 0), 100)
                }
              : item
          ),
          submissionState: "idle",
          lastErrorCode: null
        }));
      },
      setSelectedAccountId(accountId) {
        set({ selectedAccountId: accountId });
      },
      setNotes(notes) {
        set({ notes });
      },
      setPosTerminalCode(code) {
        set({ posTerminalCode: code });
      },
      clearCart() {
        set((state) => ({
          ...state,
          items: [],
          notes: "",
          submissionState: "idle",
          lastErrorCode: null,
          currentIdempotencyKey: createDraftIdempotencyKey()
        }));
      },
      markSubmitting() {
        set({ submissionState: "submitting", lastErrorCode: null });
      },
      markError(errorCode) {
        set({ submissionState: "error", lastErrorCode: errorCode });
      },
      refreshIdempotencyKey() {
        set({ currentIdempotencyKey: createDraftIdempotencyKey() });
      },
      completeSale(sale) {
        set((state) => ({
          ...state,
          items: [],
          notes: "",
          submissionState: "success",
          lastCompletedSale: sale,
          lastErrorCode: null,
          currentIdempotencyKey: createDraftIdempotencyKey()
        }));
      },
      resetStore() {
        set(createDefaultState());
      }
    }),
    {
      name: "aya-mobile-pos-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        selectedAccountId: state.selectedAccountId,
        posTerminalCode: state.posTerminalCode,
        notes: state.notes,
        currentIdempotencyKey: state.currentIdempotencyKey,
        lastCompletedSale: state.lastCompletedSale
      })
    }
  )
);
