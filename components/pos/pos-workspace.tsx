"use client";

import * as React from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Clock3,
  CreditCard,
  GripHorizontal,
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { StatusBanner } from "@/components/ui/status-banner";
import { CartReviewView } from "@/components/pos/view/cart-review-view";
import { PosSettingsButton } from "@/components/pos/pos-settings-button";
import { PosSettingsModal } from "@/components/pos/pos-settings-modal";
import { PaymentCheckoutOverlay } from "@/components/pos/view/payment-checkout-overlay";
import { PosCartRail } from "@/components/pos/view/pos-cart-rail";
import { PosSuccessState } from "@/components/pos/view/pos-success-state";
import { ProductSelectionView } from "@/components/pos/view/product-selection-view";
import { PosSurfaceShell } from "@/components/pos/view/pos-surface-shell";
import { useCustomerSearch } from "@/hooks/use-customer-search";
import { usePosAccounts } from "@/hooks/use-pos-accounts";
import { usePosSettings } from "@/hooks/use-pos-settings";
import { useProducts } from "@/hooks/use-products";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
import { PosMobileCartSheet } from "@/components/pos/view/pos-mobile-cart-sheet";
import type {
  PosAccount,
  PosProduct,
  SaleCompletionPayment,
  SaleResponseData,
  StandardEnvelope
} from "@/lib/pos/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PRODUCT_CATEGORY_VALUES } from "@/lib/validations/products";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/formatters";
import {
  calculateCartDiscount,
  calculateCartSubtotal,
  calculateCartTotal,
  usePosCartStore
} from "@/stores/pos-cart";

type PosWorkspaceProps = {
  maxDiscountPercentage: number | null;
};

type CartPanelState = "products" | "cart" | "payment" | "processing" | "success";
type MobileTab = "products" | "cart";
type ProductViewMode = "text" | "thumbnail";
type LastTouchedCartLine = {
  id: string;
  revision: number;
};

type CustomerSearchResult = {
  id: string;
  name: string;
  phone: string | null;
  current_balance: number;
};

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  accessory: "إكسسوارات",
  device: "أجهزة",
  service_general: "خدمات عامة",
  service_repair: "خدمات صيانة",
  sim: "شرائح"
};

function normalizeArabic(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ");
}

function filterProductsByQuery(products: PosProduct[], query: string) {
  const normalizedQuery = normalizeArabic(query);

  if (!normalizedQuery) {
    return products;
  }

  const rawQuery = query.toLowerCase().trim();

  return [...products]
    .filter((product) => {
      const normalizedName = normalizeArabic(product.name);
      const normalizedSku = product.sku?.toLowerCase().trim() ?? "";
      const normalizedDescription = normalizeArabic(product.description ?? "");

      return (
        normalizedSku === rawQuery ||
        normalizedName.includes(normalizedQuery) ||
        normalizedSku.includes(rawQuery) ||
        normalizedDescription.includes(normalizedQuery)
      );
    })
    .sort((left, right) => {
      const leftSkuExact = (left.sku?.toLowerCase().trim() ?? "") === rawQuery ? 1 : 0;
      const rightSkuExact = (right.sku?.toLowerCase().trim() ?? "") === rawQuery ? 1 : 0;
      return rightSkuExact - leftSkuExact;
    });
}

function roundAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function parseAmount(value: string) {
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function getCategoryLabel(category: string) {
  return PRODUCT_CATEGORY_LABELS[category] ?? category;
}

function getProductStockState(product: {
  track_stock: boolean;
  stock_quantity: number;
  min_stock_level: number;
}) {
  if (!product.track_stock) {
    return {
      label: "متوفر",
      tone: "available"
    } as const;
  }

  if (product.stock_quantity <= 0) {
    return {
      label: "نفد",
      tone: "out"
    } as const;
  }

  if (product.stock_quantity <= Math.max(product.min_stock_level, 0)) {
    return {
      label: `${formatCompactNumber(product.stock_quantity)} فقط`,
      tone: "low"
    } as const;
  }

  return {
    label: `${formatCompactNumber(product.stock_quantity)} متوفر`,
    tone: "available"
  } as const;
}

function getProductCategoryTone(category: string) {
  if (category === "device") {
    return "device";
  }

  if (category === "sim") {
    return "sim";
  }

  if (category === "service_general" || category === "service_repair") {
    return "service";
  }

  return "accessory";
}

function getAccountIcon(type: string) {
  if (type === "cash") {
    return Banknote;
  }

  if (type === "card" || type === "visa" || type === "mastercard") {
    return CreditCard;
  }

  return ShieldCheck;
}

function getValidationToneClasses(tone: "success" | "warning" | "error") {
  if (tone === "success") {
    return "validation-tone--success";
  }

  if (tone === "warning") {
    return "validation-tone--warning";
  }

  return "validation-tone--error";
}

function getAccountChipLabel(account: PosAccount) {
  const baseLabel =
    account.type === "cash"
      ? "كاش"
      : account.type === "card" ||
          account.type === "visa" ||
          account.type === "mastercard"
        ? "بطاقة"
        : account.type === "cliq"
          ? "CliQ"
          : account.name;

  return account.fee_percentage > 0
    ? `${baseLabel} (${account.fee_percentage}%)`
    : baseLabel;
}

function getHeldCartAge(heldAt: string) {
  const diffInMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(heldAt).getTime()) / 60000)
  );

  if (diffInMinutes < 1) {
    return "الآن";
  }

  if (diffInMinutes < 60) {
    return `منذ ${formatCompactNumber(diffInMinutes)} دقيقة`;
  }

  const hours = Math.floor(diffInMinutes / 60);

  if (hours < 24) {
    return `منذ ${formatCompactNumber(hours)} ساعة`;
  }

  return `منذ ${formatCompactNumber(Math.floor(hours / 24))} يوم`;
}

function formatStatusTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    timeZone: "Asia/Amman",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function getInitialCompactViewportState() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 1023px)").matches;
}

function getInitialMobileViewportState() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 767px)").matches;
}

function supportsContainerQueries() {
  return (
    typeof window !== "undefined" &&
    typeof window.CSS !== "undefined" &&
    typeof window.CSS.supports === "function" &&
    window.CSS.supports("container-type: inline-size")
  );
}

declare global {
  interface Window {
    __ayaPosSalesWarmupDone__?: boolean;
  }
}

export function PosWorkspace({ maxDiscountPercentage }: PosWorkspaceProps) {
  const items = usePosCartStore((state) => state.items);
  const selectedAccountId = usePosCartStore((state) => state.selectedAccountId);
  const selectedCustomerId = usePosCartStore((state) => state.selectedCustomerId);
  const selectedCustomerName = usePosCartStore((state) => state.selectedCustomerName);
  const amountReceived = usePosCartStore((state) => state.amountReceived);
  const splitPayments = usePosCartStore((state) => state.splitPayments);
  const invoiceDiscountPercentage = usePosCartStore(
    (state) => state.invoiceDiscountPercentage
  );
  const posTerminalCode = usePosCartStore((state) => state.posTerminalCode);
  const terminalCodeLocked = usePosCartStore((state) => state.terminalCodeLocked);
  const notes = usePosCartStore((state) => state.notes);
  const heldCarts = usePosCartStore((state) => state.heldCarts);
  const currentIdempotencyKey = usePosCartStore((state) => state.currentIdempotencyKey);
  const lastCompletedSale = usePosCartStore((state) => state.lastCompletedSale);
  const lastPaymentMethod = usePosCartStore((state) => state.lastPaymentMethod);
  const addProduct = usePosCartStore((state) => state.addProduct);
  const removeItem = usePosCartStore((state) => state.removeItem);
  const setQuantity = usePosCartStore((state) => state.setQuantity);
  const setDiscountPercentage = usePosCartStore((state) => state.setDiscountPercentage);
  const setSelectedAccountId = usePosCartStore((state) => state.setSelectedAccountId);
  const setSelectedCustomer = usePosCartStore((state) => state.setSelectedCustomer);
  const clearSelectedCustomer = usePosCartStore((state) => state.clearSelectedCustomer);
  const setAmountReceived = usePosCartStore((state) => state.setAmountReceived);
  const addSplitPayment = usePosCartStore((state) => state.addSplitPayment);
  const removeSplitPayment = usePosCartStore((state) => state.removeSplitPayment);
  const updateSplitPaymentAmount = usePosCartStore(
    (state) => state.updateSplitPaymentAmount
  );
  const updateSplitPaymentAccount = usePosCartStore(
    (state) => state.updateSplitPaymentAccount
  );
  const setInvoiceDiscountPercentage = usePosCartStore(
    (state) => state.setInvoiceDiscountPercentage
  );
  const setNotes = usePosCartStore((state) => state.setNotes);
  const setPosTerminalCode = usePosCartStore((state) => state.setPosTerminalCode);
  const lockTerminalCode = usePosCartStore((state) => state.lockTerminalCode);
  const unlockTerminalCode = usePosCartStore((state) => state.unlockTerminalCode);
  const holdCurrentCart = usePosCartStore((state) => state.holdCurrentCart);
  const restoreHeldCart = usePosCartStore((state) => state.restoreHeldCart);
  const discardHeldCart = usePosCartStore((state) => state.discardHeldCart);
  const clearCart = usePosCartStore((state) => state.clearCart);
  const markSubmitting = usePosCartStore((state) => state.markSubmitting);
  const markError = usePosCartStore((state) => state.markError);
  const refreshIdempotencyKey = usePosCartStore((state) => state.refreshIdempotencyKey);
  const completeSale = usePosCartStore((state) => state.completeSale);
  const hydrateLastPaymentMethod = usePosCartStore(
    (state) => state.hydrateLastPaymentMethod
  );
  const setLastPaymentMethod = usePosCartStore((state) => state.setLastPaymentMethod);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const previousItemCountRef = useRef(0);

  const [panelState, setPanelState] = useState<CartPanelState>("products");
  const [cartHydrated, setCartHydrated] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("products");
  const [isHeldCartsOpen, setIsHeldCartsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number | null>(
    null
  );
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [submissionErrorMessage, setSubmissionErrorMessage] = useState<string | null>(
    null
  );
  const [smartPaymentErrorMessage, setSmartPaymentErrorMessage] = useState<string | null>(
    null
  );
  const [primarySplitAmount, setPrimarySplitAmount] = useState<number | null>(null);
  const [isPrimarySplitSelectorOpen, setIsPrimarySplitSelectorOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [lastTouchedCartLine, setLastTouchedCartLine] =
    useState<LastTouchedCartLine | null>(null);
  const [productView, setProductView] = useState<ProductViewMode>("thumbnail");
  const [isCompactViewport, setIsCompactViewport] = useState(getInitialCompactViewportState);
  const [isMobileViewport, setIsMobileViewport] = useState(getInitialMobileViewportState);
  const [hasContainerQuerySupport, setHasContainerQuerySupport] = useState(false);
  const [hasHydratedLastPaymentMethod, setHasHydratedLastPaymentMethod] = useState(false);
  const [isSmartSubmitting, setIsSmartSubmitting] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [isSubmitting, startSubmission] = useTransition();
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const posSettings = usePosSettings();

  const normalizedQuery = normalizeArabic(searchQuery);
  const categoryFilter = activeCategory === "all" ? "all" : activeCategory;

  const {
    products,
    isLoading: productsLoading,
    isLoadingMore: productsLoadingMore,
    isOffline: productsOffline,
    errorMessage: productsError,
    hasMore: productsHasMore,
    totalCount: productsTotalCount,
    loadMore: loadMoreProducts,
    refresh: refreshProducts
  } = useProducts({
    searchQuery,
    category: categoryFilter
  });

  const {
    accounts,
    isOffline: accountsOffline,
    errorMessage: accountsError,
    refresh: refreshAccounts
  } = usePosAccounts();

  const { results: customerResults, isLoading: customersLoading } =
    useCustomerSearch(customerSearchInput);

  const isOffline = productsOffline || accountsOffline;
  const supportedPaymentMethodIds = useMemo(
    () => Array.from(new Set(accounts.map((account) => account.type))),
    [accounts]
  );
  const categories = React.useMemo(() => ["all", ...PRODUCT_CATEGORY_VALUES], []);
  const toolbarCategories = useMemo(
    () =>
      categories.map((category) => ({
        id: category,
        label: category === "all" ? "الكل" : getCategoryLabel(category),
        active: category === activeCategory
      })),
    [activeCategory, categories]
  );
  const filteredProducts = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      if (a.is_quick_add && !b.is_quick_add) return -1;
      if (!a.is_quick_add && b.is_quick_add) return 1;
      return 0;
    });
    return filterProductsByQuery(sorted, searchQuery);
  }, [products, searchQuery]);

  const subtotal = calculateCartSubtotal(items);
  const totalDiscount = calculateCartDiscount(items);
  const total = calculateCartTotal(items);
  const effectiveMaxDiscount = maxDiscountPercentage ?? 100;
  const invoiceDiscountAmount =
    total > 0 ? roundAmount((total * invoiceDiscountPercentage) / 100) : 0;
  const netTotal = roundAmount(total - invoiceDiscountAmount);

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? null;
  const isSplitMode = splitPayments.length > 0;
  const primaryPaymentAmount = isSplitMode
    ? roundAmount(primarySplitAmount ?? 0)
    : selectedAccount?.type === "cash"
      ? roundAmount(amountReceived ?? 0)
      : roundAmount(netTotal);

  const paymentRows: SaleCompletionPayment[] = [
    ...(selectedAccount
      ? [
          {
            account_id: selectedAccount.id,
            account_name: selectedAccount.name,
            account_type: selectedAccount.type,
            amount: primaryPaymentAmount,
            fee_percentage: selectedAccount.fee_percentage,
            fee_amount: roundAmount(
              (primaryPaymentAmount * selectedAccount.fee_percentage) / 100
            )
          }
        ]
      : []),
    ...splitPayments
      .map((payment) => {
        const account = accounts.find((entry) => entry.id === payment.accountId);

        if (!account) {
          return null;
        }

        return {
          account_id: account.id,
          account_name: account.name,
          account_type: account.type,
          amount: roundAmount(payment.amount),
          fee_percentage: account.fee_percentage,
          fee_amount: roundAmount((payment.amount * account.fee_percentage) / 100)
        };
      })
      .filter((payment): payment is SaleCompletionPayment => payment !== null)
  ];

  const totalPaid = roundAmount(
    paymentRows.reduce((sum, payment) => sum + payment.amount, 0)
  );
  const totalFees = roundAmount(
    paymentRows.reduce((sum, payment) => sum + payment.fee_amount, 0)
  );
  const remainingToSettle = roundAmount(netTotal - totalPaid);
  const hasCashPayment = paymentRows.some((payment) => payment.account_type === "cash");
  const changeToReturn =
    hasCashPayment && remainingToSettle < 0
      ? roundAmount(Math.abs(remainingToSettle))
      : null;
  const canCreateDebt = remainingToSettle > 0 && Boolean(selectedCustomerId);
  const canConfirmSale = items.length > 0 && (remainingToSettle <= 0 || canCreateDebt);
  const shouldBlockForDebt = remainingToSettle > 0 && !selectedCustomerId;
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const outOfStockItems = items.filter(
    (item) => item.track_stock && item.quantity > item.stock_quantity
  );
  const remainingBalanceToneClass = getValidationToneClasses(
    remainingToSettle > 0 ? (canCreateDebt ? "warning" : "error") : "success"
  );
  const hasInvalidDiscount = invoiceDiscountPercentage > effectiveMaxDiscount;
  const canCompleteSale =
    cartHydrated &&
    Boolean(selectedAccountId) &&
    canConfirmSale &&
    !hasInvalidDiscount &&
    outOfStockItems.length === 0;
  const canHoldCart = items.length > 0 && heldCarts.length < 5;
  const shouldShowCustomerResults = customerSearchInput.trim().length >= 2;
  const usedAdditionalAccountIds = splitPayments.map((payment) => payment.accountId);
  const availablePrimarySplitAccounts = accounts.filter(
    (account) =>
      account.id === selectedAccountId || !usedAdditionalAccountIds.includes(account.id)
  );

  useEffect(() => {
    setCartHydrated(usePosCartStore.persist.hasHydrated());
    const unsubscribe = usePosCartStore.persist.onFinishHydration(() => {
      setCartHydrated(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (searchQuery !== searchInput) {
      setSearchQuery(searchInput);
    }
  }, [searchInput, searchQuery]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
      return;
    }

    if (window.__ayaPosSalesWarmupDone__) {
      return;
    }

    window.__ayaPosSalesWarmupDone__ = true;

    void fetch("/api/sales", {
      method: "GET",
      cache: "no-store"
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }

    hydrateLastPaymentMethod(supportedPaymentMethodIds);
    setHasHydratedLastPaymentMethod(true);
  }, [accounts.length, hydrateLastPaymentMethod, supportedPaymentMethodIds]);

  useEffect(() => {
    if (!hasHydratedLastPaymentMethod || accounts.length === 0) {
      return;
    }

    if (selectedAccountId && accounts.some((account) => account.id === selectedAccountId)) {
      return;
    }

    const defaultAccount =
      (lastPaymentMethod
        ? accounts.find((account) => account.type === lastPaymentMethod)
        : null) ?? accounts[0];

    setSelectedAccountId(defaultAccount.id);
  }, [
    accounts,
    hasHydratedLastPaymentMethod,
    lastPaymentMethod,
    selectedAccountId,
    setSelectedAccountId
  ]);

  useEffect(() => {
    if (cartHydrated && !currentIdempotencyKey) {
      refreshIdempotencyKey();
    }
  }, [cartHydrated, currentIdempotencyKey, refreshIdempotencyKey]);

  useEffect(() => {
    if (!selectedAccountId || !isSplitMode) {
      setPrimarySplitAmount(null);
      return;
    }

    if (primarySplitAmount === null) {
      setPrimarySplitAmount(
        Math.max(
          0,
          netTotal - splitPayments.reduce((sum, payment) => sum + payment.amount, 0)
        )
      );
    }
  }, [isSplitMode, netTotal, primarySplitAmount, selectedAccountId, splitPayments]);

  useEffect(() => {
    if (
      ((!isSplitMode && selectedAccount?.type !== "cash") || isSplitMode) &&
      amountReceived !== null
    ) {
      setAmountReceived(null);
    }
  }, [amountReceived, isSplitMode, selectedAccount?.type, setAmountReceived]);

  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomerBalance(null);
      setSelectedCustomerPhone(null);
      return;
    }

    const matchedCustomer = customerResults.find(
      (customer) => customer.id === selectedCustomerId
    );

    if (matchedCustomer) {
      setSelectedCustomerBalance(matchedCustomer.current_balance);
      setSelectedCustomerPhone(matchedCustomer.phone);
      return;
    }

    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    void supabase
      .from("debt_customers")
      .select("current_balance, phone")
      .eq("id", selectedCustomerId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) {
          return;
        }

        setSelectedCustomerBalance(data?.current_balance ?? null);
        setSelectedCustomerPhone(data?.phone ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [customerResults, selectedCustomerId]);

  useEffect(() => {
    // Selection handled natively without state expansion
  }, [selectedCustomerId]);

  useEffect(() => {
    if (!isSplitMode) {
      setIsPrimarySplitSelectorOpen(false);
    }
  }, [isSplitMode]);

  useLayoutEffect(() => {
    if (typeof window.matchMedia !== "function") {
      setIsCompactViewport(false);
      setIsMobileViewport(false);
      return;
    }

    const compactQuery = window.matchMedia("(max-width: 1023px)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");

    const handleViewportChange = () => {
      setIsCompactViewport(compactQuery.matches);
      setIsMobileViewport(mobileQuery.matches);
    };

    handleViewportChange();
    compactQuery.addEventListener("change", handleViewportChange);
    mobileQuery.addEventListener("change", handleViewportChange);

    return () => {
      compactQuery.removeEventListener("change", handleViewportChange);
      mobileQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    setHasContainerQuerySupport(supportsContainerQueries());
  }, []);

  useEffect(() => {
    setNow(new Date());
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const storedView = window.localStorage.getItem("aya-pos-product-view");
    const storedMobileTab = window.localStorage.getItem("aya-pos-mobile-tab");
    const isMobileViewport =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 767px)").matches;

    if (storedView === "text" || storedView === "thumbnail") {
      setProductView(storedView);
    } else if (isMobileViewport) {
      setProductView("text");
    }

    if (storedMobileTab === "products" || storedMobileTab === "cart") {
      setActiveMobileTab(storedMobileTab);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("aya-pos-product-view", productView);
  }, [productView]);

  useEffect(() => {
    window.localStorage.setItem("aya-pos-mobile-tab", activeMobileTab);
  }, [activeMobileTab]);

  useEffect(() => {
    if (!cartHydrated) {
      previousItemCountRef.current = items.length;
      return;
    }

    const previousItemCount = previousItemCountRef.current;

    if (
      isMobileCartViewport() &&
      activeMobileTab === "products" &&
      panelState !== "success" &&
      items.length > previousItemCount
    ) {
      setActiveMobileTab("cart");
    }

    previousItemCountRef.current = items.length;
  }, [activeMobileTab, cartHydrated, items.length, panelState]);

  const barcodeBuffer = useRef("");
  const barcodeTimeout = useRef<number | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeElement = document.activeElement;
      const isTypingField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;
      const isSearchFocused = activeElement === searchRef.current;

      if (event.key === "Escape") {
        if (panelState === "payment") {
          event.preventDefault();
          returnToActiveCartSurface();
          return;
        }

        if (isHeldCartsOpen) {
          event.preventDefault();
          setIsHeldCartsOpen(false);
          return;
        }

        if (isSearchFocused && searchInput.trim()) {
          event.preventDefault();
          setSearchInput("");
          setSearchQuery("");
          return;
        }

        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();

        if (!canCompleteSale || isOffline || isSubmitting) {
          return;
        }

        startSubmission(() => {
          void submitSale();
        });
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "q") {
        event.preventDefault();
        if (items.length > 0) {
          setIsClearCartDialogOpen(true);
        }
        return;
      }

      if (!isTypingField) {
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          barcodeBuffer.current += event.key;
          if (barcodeTimeout.current) window.clearTimeout(barcodeTimeout.current);
          barcodeTimeout.current = window.setTimeout(() => {
            barcodeBuffer.current = "";
          }, 50);
        } else if (event.key === "Enter" && barcodeBuffer.current.length >= 3) {
          const scannedCode = barcodeBuffer.current;
          barcodeBuffer.current = "";
          const matched = products.find(
            (p) => p.sku?.toLowerCase() === scannedCode.toLowerCase()
          );
          if (matched && (!matched.track_stock || matched.stock_quantity > 0)) {
            event.preventDefault();
            handleAddProduct(matched);
            return;
          }
        }
      }

      if (isTypingField) {
        return;
      }

      if (event.key === "/" || event.key === "F1") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (event.key === "F2" && items.length > 0) {
        event.preventDefault();
        openPaymentOverlay();
        return;
      }

      const gridAddIndex = Number(event.key);
      if (
        Number.isInteger(gridAddIndex) &&
        gridAddIndex >= 1 &&
        gridAddIndex <= 9 &&
        gridAddIndex <= filteredProducts.length
      ) {
        event.preventDefault();
        handleAddProduct(filteredProducts[gridAddIndex - 1]);
        return;
      }

      if (
        (event.key === "+" || event.key === "=" || event.key === "Add") &&
        items.length > 0
      ) {
        event.preventDefault();
        adjustLastCartItem(1);
        return;
      }

      if (
        (event.key === "-" || event.key === "_" || event.key === "Subtract") &&
        items.length > 0
      ) {
        event.preventDefault();
        adjustLastCartItem(-1);
        return;
      }

      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        openPaymentOverlay();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeMobileTab,
    canCompleteSale,
    isHeldCartsOpen,
    isMobileViewport,
    isOffline,
    isSubmitting,
    items,
    panelState,
    filteredProducts,
    searchInput
  ]);

  function clearSubmissionFeedback() {
    if (submissionErrorMessage) {
      setSubmissionErrorMessage(null);
    }

    if (smartPaymentErrorMessage) {
      setSmartPaymentErrorMessage(null);
    }
  }

  function markLastTouchedCartLine(productId: string) {
    setLastTouchedCartLine((currentValue) => ({
      id: productId,
      revision: (currentValue?.revision ?? 0) + 1
    }));
  }

  function handleSearchSubmit() {
    const firstMatch = filterProductsByQuery(products, searchInput).find(
      (product) => !(product.track_stock && product.stock_quantity <= 0)
    );

    if (!firstMatch) {
      return;
    }

    handleAddProduct(firstMatch);
    setSearchInput("");
    setSearchQuery("");
    searchRef.current?.focus();
  }

  function handleAddProduct(product: PosProduct) {
    clearSubmissionFeedback();
    addProduct(product);

    if (isMobileViewport) {
      openCheckout();
    }

    toast.success(`تمت إضافة ${product.name}`, {
      id: "pos-product-added",
      duration: 1400
    });

    if (
      product.track_stock &&
      product.stock_quantity > 0 &&
      product.stock_quantity <= Math.max(product.min_stock_level, 0)
    ) {
      toast.warning(
        `مخزون منخفض: ${product.name} (${formatCompactNumber(product.stock_quantity)})`,
        {
          id: `pos-low-stock-${product.id}`,
          duration: 2200
        }
      );
    }
  }

  function adjustLastCartItem(delta: number) {
    const lastItem = items[items.length - 1];

    if (!lastItem) {
      return;
    }

    clearSubmissionFeedback();

    if (delta < 0 && lastItem.quantity <= 1) {
      removeItem(lastItem.product_id);
      return;
    }

    markLastTouchedCartLine(lastItem.product_id);
    setQuantity(lastItem.product_id, lastItem.quantity + delta);
  }

  function refreshOperationalData() {
    void refreshProducts();
    void refreshAccounts();
  }

  function setProductsPanelState() {
    setPanelState((currentValue) => (currentValue === "success" ? currentValue : "products"));
  }

  function setCartPanelState() {
    setPanelState((currentValue) => (currentValue === "success" ? currentValue : "cart"));
  }

  function returnToActiveCartSurface() {
    if (isMobileCartViewport()) {
      setCartPanelState();
      setActiveMobileTab("cart");
      return;
    }

    setProductsPanelState();
  }

  function resetCheckoutState() {
    setPanelState("products");
    setActiveMobileTab("products");
    setSubmissionErrorMessage(null);
    setSmartPaymentErrorMessage(null);
    setCustomerSearchInput("");
    setSelectedCustomerBalance(null);
    setSelectedCustomerPhone(null);
    setIsHeldCartsOpen(false);
    setPrimarySplitAmount(null);
    setIsPrimarySplitSelectorOpen(false);
    setIsSmartSubmitting(false);
    setLastTouchedCartLine(null);
  }

  function handleTopbarNewSale() {
    if (items.length > 0 && panelState !== "success") {
      setIsClearCartDialogOpen(true);
      return;
    }

    handleStartNewSale();
  }

  function handleStartNewSale() {
    clearCart();
    resetCheckoutState();
  }

  function isMobileCartViewport() {
    return typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 767px)").matches;
  }

  function openCheckout() {
    if (isMobileCartViewport()) {
      setCartPanelState();
      setActiveMobileTab("cart");
      return;
    }

    setProductsPanelState();
  }

  function openPaymentOverlay() {
    clearSubmissionFeedback();
    setIsSmartSubmitting(false);

    if (items.length === 0) {
      if (isMobileCartViewport()) {
        openCheckout();
        return;
      }

      setProductsPanelState();
      return;
    }

    if (isMobileCartViewport()) {
      setActiveMobileTab("cart");
    }

    setPanelState("payment");
  }

  function goBackToCart() {
    setProductsPanelState();
    setActiveMobileTab("products");
  }

  function handleOpenHeldCarts() {
    setIsHeldCartsOpen(true);

    if (isMobileCartViewport()) {
      setCartPanelState();
      setActiveMobileTab("cart");
      return;
    }

    setProductsPanelState();
  }

  function selectCustomer(customer: CustomerSearchResult) {
    clearSubmissionFeedback();
    setSelectedCustomer(customer.id, customer.name);
    setSelectedCustomerBalance(customer.current_balance);
    setSelectedCustomerPhone(customer.phone);
    setCustomerSearchInput("");
  }

  function clearCustomerSelection() {
    clearSubmissionFeedback();
    clearSelectedCustomer();
    setSelectedCustomerBalance(null);
    setSelectedCustomerPhone(null);
    setCustomerSearchInput("");
  }

  function handleSmartPaymentSubmit() {
    if (!selectedAccount || !canUseSmartPayment || isSmartSubmitting) {
      return;
    }

    clearSubmissionFeedback();
    setIsSmartSubmitting(true);

    startSubmission(() => {
      void submitSale({
        amountReceived: selectedAccount.type === "cash" ? netTotal : null,
        mode: "smart",
        notes: "",
        selectedAccountId: selectedAccount.id,
        selectedCustomerId: null,
        selectedCustomerName: null,
        splitPayments: []
      });
    });
  }

  function handleHoldCart() {
    if (!canHoldCart) {
      return;
    }

    const suggestedLabel = selectedCustomerName ?? `طلب ${heldCarts.length + 1}`;
    const nextLabel = window.prompt("أدخل اسمًا مختصرًا للسلة المعلقة", suggestedLabel);

    if (!nextLabel || !nextLabel.trim()) {
      return;
    }

    clearSubmissionFeedback();
    holdCurrentCart(nextLabel);
    resetCheckoutState();
    toast.success("تم تعليق السلة الحالية.");
  }

  function handleRestoreHeldCart(cartId: string) {
    if (
      items.length > 0 &&
      !window.confirm("سيتم استبدال السلة الحالية بالمعلقة. هل تريد المتابعة؟")
    ) {
      return;
    }

    clearSubmissionFeedback();
    restoreHeldCart(cartId);
    resetCheckoutState();
    toast.info("تم استرجاع السلة المعلقة.");
  }

  function handleDiscardHeldCart(cartId: string) {
    discardHeldCart(cartId);
    toast.info("تم حذف السلة المعلقة.");
  }

  function handleAddSplitPayment() {
    if (!selectedAccountId) {
      return;
    }

    const availableAccount = accounts.find(
      (account) =>
        account.id !== selectedAccountId && !usedAdditionalAccountIds.includes(account.id)
    );

    if (!availableAccount) {
      return;
    }

    setPrimarySplitAmount(roundAmount(primarySplitAmount ?? primaryPaymentAmount));
    addSplitPayment(availableAccount.id, 0);
    setIsPrimarySplitSelectorOpen(false);
  }

  function getAvailableAccountsForSplitRow(currentAccountId: string) {
    return accounts.filter(
      (account) =>
        account.id === currentAccountId ||
        (account.id !== selectedAccountId &&
          !usedAdditionalAccountIds.includes(account.id))
    );
  }

  function selectPrimarySplitAccount(accountId: string) {
    clearSubmissionFeedback();
    setSelectedAccountId(accountId);
    setIsPrimarySplitSelectorOpen(false);
  }

  type SubmitSaleOptions = {
    amountReceived?: number | null;
    mode?: "overlay" | "smart";
    notes?: string;
    selectedAccountId?: string | null;
    selectedCustomerId?: string | null;
    selectedCustomerName?: string | null;
    splitPayments?: typeof splitPayments;
  };

  function buildSalePayloadPayments(
    effectiveSelectedAccountId: string | null,
    effectivePrimaryPaymentAmount: number,
    effectiveSplitPayments: typeof splitPayments
  ) {
    if (!effectiveSelectedAccountId) {
      return [];
    }

    const payments = effectiveSplitPayments.length > 0
      ? [
          {
            account_id: effectiveSelectedAccountId,
            amount: roundAmount(primarySplitAmount ?? 0)
          },
          ...effectiveSplitPayments.map((payment) => ({
            account_id: payment.accountId,
            amount: roundAmount(payment.amount)
          }))
        ]
      : [
          {
            account_id: effectiveSelectedAccountId,
            amount: effectivePrimaryPaymentAmount
          }
        ];

    if (netTotal === 0) {
      return payments.slice(0, 1);
    }

    return payments.filter((payment) => payment.amount > 0);
  }

  async function submitSale(options: SubmitSaleOptions = {}) {
    const mode = options.mode ?? "overlay";
    const effectiveSelectedAccountId = options.selectedAccountId ?? selectedAccountId;
    const effectiveSelectedCustomerId = options.selectedCustomerId ?? selectedCustomerId;
    const effectiveSelectedCustomerName =
      options.selectedCustomerName ?? selectedCustomerName;
    const effectiveAmountReceived = options.amountReceived ?? amountReceived;
    const effectiveSplitPayments = options.splitPayments ?? splitPayments;
    const effectiveNotes = options.notes ?? notes;
    const effectiveSelectedAccount =
      accounts.find((account) => account.id === effectiveSelectedAccountId) ?? null;
    const effectiveIsSplitMode = effectiveSplitPayments.length > 0;
    const effectivePrimaryPaymentAmount = effectiveIsSplitMode
      ? roundAmount(primarySplitAmount ?? 0)
      : effectiveSelectedAccount?.type === "cash"
        ? roundAmount(effectiveAmountReceived ?? 0)
        : roundAmount(netTotal);
    const effectivePaymentRows: SaleCompletionPayment[] = [
      ...(effectiveSelectedAccount
        ? [
            {
              account_id: effectiveSelectedAccount.id,
              account_name: effectiveSelectedAccount.name,
              account_type: effectiveSelectedAccount.type,
              amount: effectivePrimaryPaymentAmount,
              fee_percentage: effectiveSelectedAccount.fee_percentage,
              fee_amount: roundAmount(
                (effectivePrimaryPaymentAmount * effectiveSelectedAccount.fee_percentage) /
                  100
              )
            }
          ]
        : []),
      ...effectiveSplitPayments
        .map((payment) => {
          const account = accounts.find((entry) => entry.id === payment.accountId);

          if (!account) {
            return null;
          }

          return {
            account_id: account.id,
            account_name: account.name,
            account_type: account.type,
            amount: roundAmount(payment.amount),
            fee_percentage: account.fee_percentage,
            fee_amount: roundAmount((payment.amount * account.fee_percentage) / 100)
          };
        })
        .filter((payment): payment is SaleCompletionPayment => payment !== null)
    ];
    const effectiveTotalPaid = roundAmount(
      effectivePaymentRows.reduce((sum, payment) => sum + payment.amount, 0)
    );
    const effectiveRemainingToSettle = roundAmount(netTotal - effectiveTotalPaid);
    const effectiveHasCashPayment = effectivePaymentRows.some(
      (payment) => payment.account_type === "cash"
    );
    const effectiveChangeToReturn =
      effectiveHasCashPayment && effectiveRemainingToSettle < 0
        ? roundAmount(Math.abs(effectiveRemainingToSettle))
        : null;
    const effectiveCanCreateDebt =
      effectiveRemainingToSettle > 0 && Boolean(effectiveSelectedCustomerId);
    const effectiveShouldBlockForDebt =
      effectiveRemainingToSettle > 0 && !effectiveSelectedCustomerId;
    const effectiveCanConfirmSale =
      items.length > 0 && (effectiveRemainingToSettle <= 0 || effectiveCanCreateDebt);
    const finishSmartSubmission = () => {
      if (mode === "smart") {
        setIsSmartSubmitting(false);
      }
    };
    const setActiveErrorMessage = (message: string | null) => {
      if (mode === "smart") {
        setSmartPaymentErrorMessage(message);
        return;
      }

      setSubmissionErrorMessage(message);
    };

    if (!cartHydrated) {
      finishSmartSubmission();
      return;
    }

    if (items.length === 0) {
      const message = "أضف منتجًا واحدًا على الأقل قبل تأكيد البيع.";
      setActiveErrorMessage(message);
      toast.error(message);
      finishSmartSubmission();
      return;
    }

    if (!effectiveSelectedAccountId) {
      const message = "يلزم تحديد طريقة الدفع.";
      setActiveErrorMessage(message);
      toast.error(message);
      finishSmartSubmission();
      return;
    }

    if (!currentIdempotencyKey) {
      refreshIdempotencyKey();
      const message = "جارٍ تهيئة الطلب. أعد المحاولة بعد لحظة.";
      setActiveErrorMessage(message);
      toast.error(message);
      finishSmartSubmission();
      return;
    }

    if (!effectiveCanConfirmSale) {
      const message = effectiveShouldBlockForDebt
        ? "يجب اختيار عميل أو إكمال المبلغ."
        : "أكمل طريقة الدفع قبل تأكيد البيع.";
      setActiveErrorMessage(message);
      toast.error(message);
      finishSmartSubmission();
      return;
    }

    if (outOfStockItems.length > 0) {
      const message = `الكميات غير متاحة: ${outOfStockItems.map((item) => item.name).join("، ")}`;
      setActiveErrorMessage(message);
      toast.error(message);
      finishSmartSubmission();
      return;
    }

    const payments = buildSalePayloadPayments(
      effectiveSelectedAccountId,
      effectivePrimaryPaymentAmount,
      effectiveSplitPayments
    );

    if (payments.length === 0) {
      const message = "يجب إدخال مبلغ صحيح للدفع.";
      setActiveErrorMessage(message);
      toast.error(message);
      finishSmartSubmission();
      return;
    }

    markSubmitting();
    setSubmissionErrorMessage(null);
    setSmartPaymentErrorMessage(null);
    setPanelState("processing");

    const payload = {
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        discount_percentage: item.discount_percentage
      })),
      payments,
      customer_id: effectiveSelectedCustomerId || undefined,
      invoice_discount_percentage: invoiceDiscountPercentage || undefined,
      pos_terminal_code: posTerminalCode || undefined,
      notes: effectiveNotes || undefined,
      idempotency_key: currentIdempotencyKey
    };

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const envelope = (await response.json()) as StandardEnvelope<SaleResponseData>;

      if (!response.ok || !envelope.success || !envelope.data) {
        const errorCode = envelope.error?.code ?? "ERR_API_INTERNAL";
        const message = getSafeArabicErrorMessage(envelope.error, "تعذر تنفيذ البيع.");

        markError(errorCode);
        returnToActiveCartSurface();

        if (errorCode === "ERR_IDEMPOTENCY") {
          const existingInvoice = (
            envelope.error?.details as { existing_result?: SaleResponseData } | undefined
          )?.existing_result;
          const duplicateMessage = existingInvoice
            ? `تم تنفيذ الطلب مسبقًا. الفاتورة السابقة: ${existingInvoice.invoice_number}.`
            : "تم استخدام نفس الطلب مسبقًا، لذلك لم تُنشأ فاتورة جديدة.";

          setActiveErrorMessage(duplicateMessage);
          toast.warning(duplicateMessage);
          finishSmartSubmission();
          return;
        }

        if (errorCode === "ERR_CONCURRENT_STOCK_UPDATE") {
          refreshIdempotencyKey();
          const concurrencyMessage =
            "تغير المخزون أثناء التنفيذ. حدّث السلة ثم أعد المحاولة.";
          setActiveErrorMessage(concurrencyMessage);
          toast.error(concurrencyMessage);
          void refreshProducts();
          finishSmartSubmission();
          return;
        }

        setActiveErrorMessage(message);
        toast.error(message);
        finishSmartSubmission();
        return;
      }

      if (effectiveSelectedAccount?.type) {
        setLastPaymentMethod(effectiveSelectedAccount.type);
      }

      completeSale({
        ...envelope.data,
        change: effectiveChangeToReturn ?? envelope.data.change,
        customer_name: effectiveSelectedCustomerName,
        debt_amount: effectiveRemainingToSettle > 0 ? effectiveRemainingToSettle : 0,
        invoice_discount_amount: invoiceDiscountAmount,
        net_total: netTotal,
        payments: effectivePaymentRows
      });

      setIsPrimarySplitSelectorOpen(false);
      finishSmartSubmission();
      setPanelState("success");
      setActiveMobileTab("cart");
      toast.success(`تم إنشاء الفاتورة ${envelope.data.invoice_number} بنجاح.`);
      refreshOperationalData();
    } catch (error) {
      const message = getSafeArabicErrorMessage(error, "تعذر الوصول إلى مسار البيع.");

      markError("ERR_API_INTERNAL");
      returnToActiveCartSurface();
      setActiveErrorMessage(message);
      toast.error(message);
      finishSmartSubmission();
    }
  }

  const completedSaleFeeTotal = lastCompletedSale
    ? roundAmount(
        (lastCompletedSale.payments ?? []).reduce(
          (sum, payment) => sum + payment.fee_amount,
          0
        )
      )
    : 0;
  const activePaymentLabel = isSplitMode
    ? `تقسيط ${formatCompactNumber(splitPayments.length + 1)} أجزاء`
    : selectedAccount
      ? getAccountChipLabel(selectedAccount)
      : "طريقة الدفع غير محددة";
  const cartOverviewLabel =
    items.length > 0
      ? `${formatCompactNumber(totalItemCount)} بند • ${formatCurrency(netTotal)}`
      : "السلة فارغة";
  const checkoutStatusLabel =
    remainingToSettle > 0
      ? `المتبقي ${formatCurrency(remainingToSettle)}`
      : changeToReturn !== null
        ? `الباقي ${formatCurrency(changeToReturn)}`
        : "جاهز للإتمام";
  const productResultsLabel =
    productsTotalCount !== null
      ? `${formatCompactNumber(filteredProducts.length)} من ${formatCompactNumber(productsTotalCount)}`
      : `${formatCompactNumber(filteredProducts.length)} منتجًا`;

  const customerSummaryLabel = selectedCustomerName
    ? `العميل: ${selectedCustomerName}`
    : "العميل: ضيف جديد";


  const smartPaymentActionLabel = selectedAccount
    ? `دفع ${selectedAccount.type === "cash" ? "كاش" : selectedAccount.name?.trim() || "حساب"}`
    : "دفع";
  const smartPaymentAriaLabel = `${smartPaymentActionLabel} — الإجمالي ${formatCurrency(netTotal)}`;
  const canUseSmartPayment =
    cartHydrated &&
    items.length > 0 &&
    Boolean(selectedAccount) &&
    splitPayments.length === 0 &&
    !selectedCustomerId &&
    notes.trim().length === 0 &&
    !hasInvalidDiscount &&
    outOfStockItems.length === 0 &&
    !isOffline &&
    panelState !== "payment" &&
    panelState !== "processing" &&
    panelState !== "success";

  function handleCartLineRemove(item: (typeof items)[number]) {
    clearSubmissionFeedback();
    setLastTouchedCartLine(null);
    removeItem(item.product_id);
  }

  function handleCartLineDecrease(item: (typeof items)[number]) {
    clearSubmissionFeedback();

    if (item.quantity <= 1) {
      setLastTouchedCartLine(null);
      removeItem(item.product_id);
      return;
    }

    markLastTouchedCartLine(item.product_id);
    setQuantity(item.product_id, item.quantity - 1);
  }

  function handleCartLineIncrease(item: (typeof items)[number]) {
    clearSubmissionFeedback();
    markLastTouchedCartLine(item.product_id);
    setQuantity(item.product_id, item.quantity + 1);
  }

  function handleCartLineDiscountChange(item: (typeof items)[number], rawValue: number) {
    clearSubmissionFeedback();
    setLastTouchedCartLine(null);
    const clampedValue = Number.isNaN(rawValue) ? 0 : Math.min(rawValue, effectiveMaxDiscount);
    setDiscountPercentage(item.product_id, clampedValue);
  }

  const headerSlot = (
    <>
      <header className="pos-mobile-header">
        <div className="pos-mobile-header__account">
          <span className="pos-mobile-header__account-name">
            {selectedAccount ? selectedAccount.name : "جاهز للبيع"}
          </span>
        </div>

        <div className="pos-mobile-header__actions">
          <button
            type="button"
            className="primary-button pos-mobile-header__action"
            onClick={handleTopbarNewSale}
          >
            <Plus size={14} />
            بيع جديد
          </button>
          <button
            type="button"
            className="secondary-button pos-mobile-header__action"
            onClick={() => setIsHeldCartsOpen((currentValue) => !currentValue)}
          >
            معلقة
            <span className="product-pill product-pill--warning pos-mobile-header__count">
              {formatCompactNumber(heldCarts.length)}
            </span>
          </button>
        </div>
      </header>

      {isMobileViewport ? (
        <nav className="pos-mobile-tabs" aria-label="تبويبات نقطة البيع">
          <button
            type="button"
            className={
              activeMobileTab === "products"
                ? "pos-mobile-tabs__button is-active"
                : "pos-mobile-tabs__button"
            }
            onClick={goBackToCart}
            aria-pressed={activeMobileTab === "products"}
          >
            <span>المنتجات</span>
          </button>
          <button
            type="button"
            className={
              activeMobileTab === "cart"
                ? "pos-mobile-tabs__button is-active"
                : "pos-mobile-tabs__button"
            }
            onClick={openCheckout}
            aria-pressed={activeMobileTab === "cart"}
          >
            <span>السلة</span>
            <strong>
              {formatCompactNumber(items.length)} • {formatCurrency(netTotal)}
            </strong>
          </button>
        </nav>
      ) : null}

    </>
  );

  const footerSlot = (
    <footer className="pos-status-bar" data-compact={isCompactViewport ? "true" : "false"}>
      <span className="pos-status-bar__item">
        <GripHorizontal size={14} />
        <strong>{posTerminalCode}</strong>
      </span>
      <span className="pos-status-bar__item">
        <Search size={14} />
        <span>{searchInput.trim() ? "وضع البحث" : "بحث بالباركود"}</span>
      </span>
      <span className="pos-status-bar__item">
        <Clock3 size={14} />
        <bdi dir="ltr">{now ? formatStatusTime(now) : ""}</bdi>
      </span>
      {lastCompletedSale ? (
        <button
          type="button"
          className="pos-status-bar__print-btn"
          onClick={() => {
            window.open(
              `/invoices/${lastCompletedSale.invoice_id}?print=1`,
              "_blank",
              "noopener,noreferrer"
            );
          }}
        >
          <Printer size={14} />
          طباعة آخر إيصال
        </button>
      ) : null}
    </footer>
  );

  const productsSurface = (
    <ProductSelectionView
      search={{
        value: searchInput,
        onChange: (nextValue) => {
          setSearchInput(nextValue);
          setSearchQuery(nextValue);
        },
        placeholder: "ابحث بالاسم أو رمز المنتج...",
        onClear: () => {
          setSearchInput("");
          setSearchQuery("");
          searchRef.current?.focus();
        },
        onSubmit: handleSearchSubmit,
        inputRef: searchRef
      }}
      categories={toolbarCategories}
      onCategorySelect={setActiveCategory}
      heldCartsCount={heldCarts.length}
      onHeldCartsOpen={handleOpenHeldCarts}
      showHeldCartsButton={!isMobileViewport}
      onRefreshProducts={refreshProducts}
      showRefreshButton={!isMobileViewport}
      productView={productView}
      onProductViewChange={setProductView}
      showViewToggle={!isMobileViewport}
      onClearSearch={() => setSearchInput("")}
      onLoadMore={loadMoreProducts}
      productResultsLabel={productResultsLabel}
      products={filteredProducts}
      productsHasMore={productsHasMore}
      productsLoading={productsLoading}
      productsLoadingMore={productsLoadingMore}
      searchInput={searchInput}
      showEmptySearchState={filteredProducts.length === 0 && normalizedQuery.length > 0}
    >
      <PosSettingsButton
        buttonRef={settingsTriggerRef}
        onClick={() => setIsSettingsOpen(true)}
      />
    </ProductSelectionView>
  );

  const paymentOverlay = (
    <PaymentCheckoutOverlay
      accounts={accounts}
      amountReceived={amountReceived}
      availablePrimarySplitAccounts={availablePrimarySplitAccounts}
      canCompleteSale={canCompleteSale}
      canCreateDebt={canCreateDebt}
      canHoldCart={canHoldCart}
      changeToReturn={changeToReturn}
      customerResults={customerResults}
      customerSearchInput={customerSearchInput}
      customersLoading={customersLoading}
      effectiveMaxDiscount={effectiveMaxDiscount}
      getAccountChipLabel={getAccountChipLabel}
      getAccountIcon={getAccountIcon}
      getAvailableAccountsForSplitRow={getAvailableAccountsForSplitRow}
      heldCartsCount={heldCarts.length}
      isMobileViewport={isMobileViewport}
      itemCount={items.length}
      invoiceDiscountAmount={invoiceDiscountAmount}
      invoiceDiscountPercentage={invoiceDiscountPercentage}
      isOffline={isOffline}
      isPrimarySplitSelectorOpen={isPrimarySplitSelectorOpen}
      isProcessing={panelState === "processing"}
      isSplitMode={isSplitMode}
      isSubmitting={isSubmitting}
      netTotal={netTotal}
      notes={notes}
      onAddSplitPayment={handleAddSplitPayment}
      onAmountReceivedChange={(value) => {
        clearSubmissionFeedback();
        const parsedValue = parseAmount(value);
        setAmountReceived(value === "" ? null : parsedValue);
      }}
      onClearCartRequest={() => setIsClearCartDialogOpen(true)}
      onClearCustomerSelection={clearCustomerSelection}
      onClose={returnToActiveCartSurface}
      onConfirmSale={() => {
        setIsSmartSubmitting(false);
        startSubmission(() => {
          void submitSale();
        });
      }}
      onCustomerSearchInputChange={(value) => {
        clearSubmissionFeedback();
        setCustomerSearchInput(value);
      }}
      onHeldCartsToggle={() => setIsHeldCartsOpen((currentValue) => !currentValue)}
      onHoldCart={handleHoldCart}
      onInvoiceDiscountChange={(value) => {
        clearSubmissionFeedback();
        const rawValue = Number(value);
        setInvoiceDiscountPercentage(
          Number.isNaN(rawValue) ? 0 : Math.min(Math.max(rawValue, 0), effectiveMaxDiscount)
        );
      }}
      onNotesChange={(value) => {
        clearSubmissionFeedback();
        setNotes(value);
      }}
      onPaymentAccountSelect={(accountId) => {
        clearSubmissionFeedback();
        setSelectedAccountId(accountId);
      }}
      onPosTerminalCodeChange={(value) => {
        clearSubmissionFeedback();
        setPosTerminalCode(value.toUpperCase());
      }}
      onPrimarySplitAccountSelect={selectPrimarySplitAccount}
      onPrimarySplitAmountChange={(value) => {
        clearSubmissionFeedback();
        const parsedValue = parseAmount(value);
        setPrimarySplitAmount(value === "" ? null : parsedValue);
      }}
      onPrimarySplitSelectorToggle={() =>
        setIsPrimarySplitSelectorOpen((currentValue) => !currentValue)
      }
      onRemoveSplitPayment={(index) => {
        clearSubmissionFeedback();
        removeSplitPayment(index);
      }}
      onSelectCustomer={(customer) => selectCustomer(customer as CustomerSearchResult)}
      onSplitPaymentAccountChange={(index, accountId) => {
        clearSubmissionFeedback();
        updateSplitPaymentAccount(index, accountId);
      }}
      onSplitPaymentAmountChange={(index, value) => {
        clearSubmissionFeedback();
        updateSplitPaymentAmount(index, parseAmount(value) ?? 0);
      }}
      onTerminalCodeLockToggle={() => {
        if (terminalCodeLocked) {
          unlockTerminalCode();
          return;
        }

        lockTerminalCode();
      }}
      open={panelState === "payment" || (panelState === "processing" && !isSmartSubmitting)}
      paymentRowCount={paymentRows.length}
      posTerminalCode={posTerminalCode}
      primarySplitAmount={primarySplitAmount}
      remainingToSettle={remainingToSettle}
      remainingBalanceToneClass={remainingBalanceToneClass}
      selectedAccount={selectedAccount}
      selectedAccountId={selectedAccountId}
      selectedCustomerBalance={selectedCustomerBalance}
      selectedCustomerId={selectedCustomerId}
      selectedCustomerName={selectedCustomerName}
      selectedCustomerPhone={selectedCustomerPhone}
      shouldBlockForDebt={shouldBlockForDebt}
      shouldShowCustomerResults={shouldShowCustomerResults}
      splitPayments={splitPayments}
      subtotal={subtotal}
      terminalCodeLocked={terminalCodeLocked}
      totalDiscount={totalDiscount}
    />
  );

  const successSurface =
    panelState === "success" && lastCompletedSale ? (
      <div
        className="pos-success-surface"
        style={{
          alignItems: "center",
          background: "rgba(24, 23, 21, 0.26)",
          display: "flex",
          inset: 0,
          justifyContent: "center",
          padding: isMobileViewport ? "16px" : "24px",
          position: "fixed",
          zIndex: "var(--z-fullscreen)"
        }}
      >
        <div
          className="transaction-card transaction-card--checkout pos-cart-surface"
          role="dialog"
          aria-modal="true"
          aria-label="تم إتمام البيع بنجاح"
          style={{
            background: "var(--color-bg-surface)",
            maxHeight: "min(100%, 720px)",
            overflowY: "auto",
            width: isMobileViewport ? "100%" : "min(100%, 520px)"
          }}
        >
          <PosSuccessState
            completedSaleFeeTotal={completedSaleFeeTotal}
            lastCompletedSale={lastCompletedSale}
            onNewSale={handleStartNewSale}
            onPrint={() => {
              window.open(
                `/invoices/${lastCompletedSale.invoice_id}?print=1`,
                "_blank",
                "noopener,noreferrer"
              );
            }}
          />
        </div>
      </div>
    ) : null;

  const cartRailProps = {
    canHoldCart,
    cartHydrated,
    cartOverviewLabel,
    customerSummaryLabel,
    effectiveMaxDiscount,
    getHeldCartAge,
    heldCarts,
    isHeldCartsOpen,
    isReviewPaymentDisabled: items.length === 0 || panelState === "processing",
    items,
    lastTouchedLine: lastTouchedCartLine,
    onClearCartRequest: () => setIsClearCartDialogOpen(true),
    onDecreaseItem: handleCartLineDecrease,
    onDiscardHeldCart: handleDiscardHeldCart,
    onDiscountChange: handleCartLineDiscountChange,
    onHoldCart: handleHoldCart,
    onIncreaseItem: handleCartLineIncrease,
    onNewSale: handleTopbarNewSale,
    onOpenCheckout: openPaymentOverlay,
    onOpenPaymentOptions: openPaymentOverlay,
    onRemoveItem: handleCartLineRemove,
    onRestoreHeldCart: handleRestoreHeldCart,
    onSmartPaymentSubmit: handleSmartPaymentSubmit,
    onToggleHeldCarts: () => setIsHeldCartsOpen((currentValue) => !currentValue),
    smartPaymentActionLabel,
    smartPaymentAriaLabel,
    smartPaymentErrorMessage,
    smartPaymentSubmitting: isSmartSubmitting,
    smartPaymentSubmitDisabled: !canUseSmartPayment
  } satisfies React.ComponentProps<typeof PosCartRail>;

  const cartSurface = (
    hasContainerQuerySupport ? (
      <>
        {!isMobileViewport ? (
          <div className="pos-cart-rail-shell">
            <PosCartRail {...cartRailProps} layout="inline" />
          </div>
        ) : null}

        <div className="pos-cart-review-shell">
          <CartReviewView
            {...cartRailProps}
            layout="review"
          />
        </div>
      </>
    ) : isMobileViewport ? (
      <div className="pos-cart-review-shell">
        <CartReviewView
          {...cartRailProps}
          layout="review"
        />
      </div>
    ) : (
      <div className="pos-cart-rail-shell">
        <PosCartRail {...cartRailProps} layout="inline" />
      </div>
    )
  );

  return (
    <>
      <section
        className="pos-workspace pos-settings-scope"
        data-pos-density={posSettings.density}
        data-pos-font-size={posSettings.fontSize}
        data-pos-contrast={posSettings.contrast}
      >
      {isOffline ? (
        <StatusBanner
          variant="offline"
          title="لا يوجد اتصال بالإنترنت"
          message="تعذرت مزامنة الحسابات والبيع حتى عودة الاتصال."
          actionLabel="إعادة تحميل البيانات"
          onAction={refreshOperationalData}
        />
      ) : null}

      {productsError || accountsError ? (
        <StatusBanner
          variant="danger"
          title="تعذر تحديث بيانات نقطة البيع"
          message={productsError ?? accountsError ?? "تعذر تحميل البيانات التشغيلية."}
          actionLabel="إعادة المحاولة"
          onAction={refreshOperationalData}
          onDismiss={() => setSubmissionErrorMessage(null)}
        />
      ) : null}

      {submissionErrorMessage ? (
        <StatusBanner
          variant="warning"
          title="تحتاج العملية إلى متابعة"
          message={submissionErrorMessage}
          actionLabel="إعادة المحاولة"
          onAction={() => {
            startSubmission(() => {
              void submitSale();
            });
          }}
          onDismiss={() => setSubmissionErrorMessage(null)}
        />
      ) : null}

      <PosSurfaceShell
        activeMobileTab={activeMobileTab}
        cart={cartSurface}
        footer={footerSlot}
        header={headerSlot}
        isMobileViewport={isMobileViewport}
        products={productsSurface}
      />

      {paymentOverlay}
      {successSurface}

      {isMobileViewport && activeMobileTab === "products" && panelState !== "success" ? (
        <PosMobileCartSheet
          itemCount={totalItemCount}
          netTotal={netTotal}
          onOpenCart={openCheckout}
        />
      ) : null}

      
      <ConfirmationDialog
        open={isClearCartDialogOpen}
        title="تفريغ السلة الحالية"
        confirmLabel="تفريغ السلة"
        cancelLabel="إلغاء"
        tone="danger"
        onCancel={() => setIsClearCartDialogOpen(false)}
        onConfirm={() => {
          clearCart();
          resetCheckoutState();
          setIsClearCartDialogOpen(false);
        }}
      />
      </section>

      <PosSettingsModal
        open={isSettingsOpen}
        density={posSettings.density}
        fontSize={posSettings.fontSize}
        contrast={posSettings.contrast}
        onChange={posSettings.set}
        onReset={posSettings.reset}
        onClose={() => setIsSettingsOpen(false)}
        triggerRef={settingsTriggerRef}
      />
    </>
  );
}
