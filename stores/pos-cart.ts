"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PosCartItem, PosProduct, SaleResponseData, SplitPayment } from "@/lib/pos/types";

function createDraftIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}`;
}

function roundCartAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function calculateCartSubtotal(items: PosCartItem[]) {
  return roundCartAmount(items.reduce((sum, item) => sum + item.sale_price * item.quantity, 0));
}

export function calculateCartDiscount(items: PosCartItem[]) {
  return roundCartAmount(
    items.reduce((sum, item) => {
      const lineSubtotal = item.sale_price * item.quantity;
      return sum + lineSubtotal * (item.discount_percentage / 100);
    }, 0)
  );
}

export function calculateCartTotal(items: PosCartItem[]) {
  return roundCartAmount(calculateCartSubtotal(items) - calculateCartDiscount(items));
}

function clampQuantity(item: PosCartItem, nextQuantity: number) {
  const normalized = Math.max(1, nextQuantity);

  if (!item.track_stock) {
    return normalized;
  }

  return Math.min(normalized, Math.max(item.stock_quantity, 1));
}

type SubmissionState = "idle" | "submitting" | "success" | "error";

export type HeldCart = {
  id: string;
  label: string;
  items: PosCartItem[];
  selectedAccountId: string | null;
  selectedCustomerId: string | null;
  selectedCustomerName: string | null;
  amountReceived: number | null;
  splitPayments: SplitPayment[];
  invoiceDiscountPercentage: number;
  notes: string;
  heldAt: string;
};

interface PosCartStore {
  items: PosCartItem[];
  selectedAccountId: string | null;
  selectedCustomerId: string | null;
  selectedCustomerName: string | null;
  amountReceived: number | null;
  splitPayments: SplitPayment[];
  invoiceDiscountPercentage: number;
  posTerminalCode: string;
  terminalCodeLocked: boolean;
  notes: string;
  heldCarts: HeldCart[];
  currentIdempotencyKey: string;
  submissionState: SubmissionState;
  lastCompletedSale: SaleResponseData | null;
  lastErrorCode: string | null;
  addProduct: (product: PosProduct) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setDiscountPercentage: (productId: string, discountPercentage: number) => void;
  setSelectedAccountId: (accountId: string) => void;
  setSelectedCustomer: (customerId: string | null, customerName: string | null) => void;
  clearSelectedCustomer: () => void;
  setAmountReceived: (amount: number | null) => void;
  addSplitPayment: (accountId: string, amount: number) => void;
  removeSplitPayment: (index: number) => void;
  updateSplitPaymentAmount: (index: number, amount: number) => void;
  updateSplitPaymentAccount: (index: number, accountId: string) => void;
  clearSplitPayments: () => void;
  setInvoiceDiscountPercentage: (percentage: number) => void;
  setNotes: (notes: string) => void;
  setPosTerminalCode: (code: string) => void;
  lockTerminalCode: () => void;
  unlockTerminalCode: () => void;
  holdCurrentCart: (label: string) => void;
  restoreHeldCart: (cartId: string) => void;
  discardHeldCart: (cartId: string) => void;
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
    selectedCustomerId: null as string | null,
    selectedCustomerName: null as string | null,
    amountReceived: null as number | null,
    splitPayments: [] as SplitPayment[],
    invoiceDiscountPercentage: 0,
    posTerminalCode: "POS-01",
    terminalCodeLocked: false,
    notes: "",
    heldCarts: [] as HeldCart[],
    currentIdempotencyKey: createDraftIdempotencyKey(),
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
                  sale_price: roundCartAmount(product.sale_price),
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
                ? (() => {
                    const refreshedItem: PosCartItem = {
                      ...item,
                      name: product.name,
                      category: product.category,
                      sale_price: roundCartAmount(product.sale_price),
                      stock_quantity: product.stock_quantity,
                      track_stock: product.track_stock
                    };

                    return {
                      ...refreshedItem,
                      quantity: clampQuantity(refreshedItem, refreshedItem.quantity + 1)
                    };
                  })()
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
      setSelectedCustomer(customerId, customerName) {
        set({
          selectedCustomerId: customerId,
          selectedCustomerName: customerName,
          submissionState: "idle",
          lastErrorCode: null
        });
      },
      clearSelectedCustomer() {
        set({
          selectedCustomerId: null,
          selectedCustomerName: null,
          submissionState: "idle",
          lastErrorCode: null
        });
      },
      setAmountReceived(amount) {
        set({ amountReceived: amount });
      },
      addSplitPayment(accountId, amount) {
        set((state) => {
          if (state.splitPayments.length >= 2) {
            return state;
          }

          return {
            splitPayments: [
              ...state.splitPayments,
              {
                accountId,
                amount: roundCartAmount(Math.max(0, amount))
              }
            ],
            submissionState: "idle",
            lastErrorCode: null
          };
        });
      },
      removeSplitPayment(index) {
        set((state) => ({
          splitPayments: state.splitPayments.filter((_, currentIndex) => currentIndex !== index),
          submissionState: "idle",
          lastErrorCode: null
        }));
      },
      updateSplitPaymentAmount(index, amount) {
        set((state) => ({
          splitPayments: state.splitPayments.map((payment, currentIndex) =>
            currentIndex === index
              ? {
                  ...payment,
                  amount: roundCartAmount(Math.max(0, amount))
                }
              : payment
          ),
          submissionState: "idle",
          lastErrorCode: null
        }));
      },
      updateSplitPaymentAccount(index, accountId) {
        set((state) => ({
          splitPayments: state.splitPayments.map((payment, currentIndex) =>
            currentIndex === index
              ? {
                  ...payment,
                  accountId
                }
              : payment
          ),
          submissionState: "idle",
          lastErrorCode: null
        }));
      },
      clearSplitPayments() {
        set({
          splitPayments: [],
          submissionState: "idle",
          lastErrorCode: null
        });
      },
      setInvoiceDiscountPercentage(percentage) {
        set({
          invoiceDiscountPercentage: Math.min(Math.max(percentage, 0), 100),
          submissionState: "idle",
          lastErrorCode: null
        });
      },
      setNotes(notes) {
        set({ notes });
      },
      setPosTerminalCode(code) {
        set({ posTerminalCode: code });
      },
      lockTerminalCode() {
        set({ terminalCodeLocked: true });
      },
      unlockTerminalCode() {
        set({ terminalCodeLocked: false });
      },
      holdCurrentCart(label) {
        set((state) => {
          const normalizedLabel = label.trim();

          if (state.items.length === 0 || state.heldCarts.length >= 5 || normalizedLabel.length === 0) {
            return state;
          }

          const heldCart: HeldCart = {
            id: createDraftIdempotencyKey(),
            label: normalizedLabel,
            items: state.items,
            selectedAccountId: state.selectedAccountId,
            selectedCustomerId: state.selectedCustomerId,
            selectedCustomerName: state.selectedCustomerName,
            amountReceived: state.amountReceived,
            splitPayments: state.splitPayments,
            invoiceDiscountPercentage: state.invoiceDiscountPercentage,
            notes: state.notes,
            heldAt: new Date().toISOString()
          };

          return {
            ...state,
            items: [],
            selectedAccountId: "",
            selectedCustomerId: null,
            selectedCustomerName: null,
            amountReceived: null,
            splitPayments: [],
            invoiceDiscountPercentage: 0,
            notes: "",
            heldCarts: [...state.heldCarts, heldCart],
            submissionState: "idle",
            lastErrorCode: null,
            currentIdempotencyKey: createDraftIdempotencyKey()
          };
        });
      },
      restoreHeldCart(cartId) {
        set((state) => {
          const heldCart = state.heldCarts.find((cart) => cart.id === cartId);

          if (!heldCart) {
            return state;
          }

          return {
            ...state,
            items: heldCart.items,
            selectedAccountId: "",
            selectedCustomerId: heldCart.selectedCustomerId,
            selectedCustomerName: heldCart.selectedCustomerName,
            amountReceived: null,
            splitPayments: [],
            invoiceDiscountPercentage: heldCart.invoiceDiscountPercentage ?? 0,
            notes: heldCart.notes,
            heldCarts: state.heldCarts.filter((cart) => cart.id !== cartId),
            submissionState: "idle",
            lastErrorCode: null,
            currentIdempotencyKey: createDraftIdempotencyKey()
          };
        });
      },
      discardHeldCart(cartId) {
        set((state) => ({
          heldCarts: state.heldCarts.filter((cart) => cart.id !== cartId)
        }));
      },
      clearCart() {
        set((state) => ({
          ...state,
          items: [],
          selectedAccountId: "",
          selectedCustomerId: null,
          selectedCustomerName: null,
          amountReceived: null,
          splitPayments: [],
          invoiceDiscountPercentage: 0,
          notes: "",
          submissionState: "idle",
          lastCompletedSale: null,
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
          selectedAccountId: "",
          selectedCustomerId: null,
          selectedCustomerName: null,
          amountReceived: null,
          splitPayments: [],
          invoiceDiscountPercentage: 0,
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
      merge: (persistedState, currentState) => {
        const snapshot =
          persistedState && typeof persistedState === "object"
            ? (persistedState as Partial<ReturnType<typeof createDefaultState>>)
            : {};

        return {
          ...currentState,
          ...snapshot,
          currentIdempotencyKey:
            typeof snapshot.currentIdempotencyKey === "string" && snapshot.currentIdempotencyKey.trim().length > 0
              ? snapshot.currentIdempotencyKey
              : createDraftIdempotencyKey()
        };
      },
      partialize: (state) => ({
        items: state.items,
        selectedAccountId: state.selectedAccountId,
        selectedCustomerId: state.selectedCustomerId,
        selectedCustomerName: state.selectedCustomerName,
        amountReceived: state.amountReceived,
        splitPayments: state.splitPayments,
        invoiceDiscountPercentage: state.invoiceDiscountPercentage,
        posTerminalCode: state.posTerminalCode,
        terminalCodeLocked: state.terminalCodeLocked,
        notes: state.notes,
        heldCarts: state.heldCarts,
        currentIdempotencyKey: state.currentIdempotencyKey,
        lastCompletedSale: state.lastCompletedSale
      })
    }
  )
);
