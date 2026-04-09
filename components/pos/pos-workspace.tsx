"use client";

import * as React from "react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";
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
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import { PosCartRail } from "@/components/pos/view/pos-cart-rail";
import { PosCheckoutPanel } from "@/components/pos/view/pos-checkout-panel";
import { PosProductGrid } from "@/components/pos/view/pos-product-grid";
import { PosSuccessState } from "@/components/pos/view/pos-success-state";
import { PosSurfaceShell } from "@/components/pos/view/pos-surface-shell";
import { PosToolbar } from "@/components/pos/view/pos-toolbar";
import { useCustomerSearch } from "@/hooks/use-customer-search";
import { usePosAccounts } from "@/hooks/use-pos-accounts";
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

type CartPanelState = "cart" | "processing" | "success";
type MobileTab = "products" | "cart";
type ProductViewMode = "text" | "thumbnail";

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

  const searchRef = useRef<HTMLInputElement | null>(null);

  const [panelState, setPanelState] = useState<CartPanelState>("cart");
  const [cartHydrated, setCartHydrated] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("products");
  const [isHeldCartsOpen, setIsHeldCartsOpen] = useState(false);
  const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number | null>(
    null
  );
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [submissionErrorMessage, setSubmissionErrorMessage] = useState<string | null>(
    null
  );
  const [primarySplitAmount, setPrimarySplitAmount] = useState<number | null>(null);
  const [isCustomerExpanded, setIsCustomerExpanded] = useState(false);
  const [isDiscountExpanded, setIsDiscountExpanded] = useState(false);
  const [isTerminalCodeExpanded, setIsTerminalCodeExpanded] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isPrimarySplitSelectorOpen, setIsPrimarySplitSelectorOpen] = useState(false);
  const [isCheckoutOptionsOpen, setIsCheckoutOptionsOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [productView, setProductView] = useState<ProductViewMode>("thumbnail");
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [, startTransition] = useTransition();
  const [isSubmitting, startSubmission] = useTransition();

  const deferredQuery = useDeferredValue(searchQuery);
  const deferredCustomerQuery = useDeferredValue(customerSearchInput);
  const normalizedQuery = normalizeArabic(deferredQuery);
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
    searchQuery: deferredQuery,
    category: categoryFilter
  });

  const {
    accounts,
    isOffline: accountsOffline,
    errorMessage: accountsError,
    refresh: refreshAccounts
  } = usePosAccounts();

  const { results: customerResults, isLoading: customersLoading } =
    useCustomerSearch(deferredCustomerQuery);

  const isOffline = productsOffline || accountsOffline;
  const categories = ["all", ...PRODUCT_CATEGORY_VALUES];
  const filteredProducts = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      if (a.is_quick_add && !b.is_quick_add) return -1;
      if (!a.is_quick_add && b.is_quick_add) return 1;
      return 0;
    });
    return filterProductsByQuery(sorted, deferredQuery);
  }, [deferredQuery, products]);

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
    const timeoutHandle = window.setTimeout(() => {
      setSearchQuery(searchInput);
    }, 200);

    return () => {
      window.clearTimeout(timeoutHandle);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

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
    if (selectedCustomerId) {
      setIsCustomerExpanded(true);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (!isSplitMode) {
      setIsPrimarySplitSelectorOpen(false);
    }
  }, [isSplitMode]);

  useEffect(() => {
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
    function handleKeyDown(event: KeyboardEvent) {
      const activeElement = document.activeElement;
      const isTypingField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;
      const isSearchFocused = activeElement === searchRef.current;

      if (event.key === "Escape") {
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
        openCheckout();
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
        setIsDiscountExpanded(true);
        openCheckout();
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

    setQuantity(lastItem.product_id, lastItem.quantity + delta);
  }

  function refreshOperationalData() {
    void refreshProducts();
    void refreshAccounts();
  }

  function resetCheckoutState() {
    setPanelState("cart");
    goBackToCart();
    setSubmissionErrorMessage(null);
    setCustomerSearchInput("");
    setSelectedCustomerBalance(null);
    setSelectedCustomerPhone(null);
    setIsHeldCartsOpen(false);
    setPrimarySplitAmount(null);
    setIsCustomerExpanded(false);
    setIsDiscountExpanded(false);
    setIsTerminalCodeExpanded(false);
    setIsNotesExpanded(false);
    setIsPrimarySplitSelectorOpen(false);
    setIsCheckoutOptionsOpen(false);
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

  function openCheckout() {
    if (isMobileViewport) {
      setActiveMobileTab("cart");
    }
  }

  function goBackToCart() {
    if (isMobileViewport) {
      setActiveMobileTab("products");
    }
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

  function buildSalePayloadPayments() {
    if (!selectedAccountId) {
      return [];
    }

    const payments = isSplitMode
      ? [
          {
            account_id: selectedAccountId,
            amount: roundAmount(primarySplitAmount ?? 0)
          },
          ...splitPayments.map((payment) => ({
            account_id: payment.accountId,
            amount: roundAmount(payment.amount)
          }))
        ]
      : [
          {
            account_id: selectedAccountId,
            amount: primaryPaymentAmount
          }
        ];

    if (netTotal === 0) {
      return payments.slice(0, 1);
    }

    return payments.filter((payment) => payment.amount > 0);
  }

  async function submitSale() {
    if (!cartHydrated) {
      return;
    }

    if (items.length === 0) {
      const message = "أضف منتجًا واحدًا على الأقل قبل تأكيد البيع.";
      setSubmissionErrorMessage(message);
      toast.error(message);
      return;
    }

    if (!selectedAccountId) {
      const message = "يلزم تحديد طريقة الدفع.";
      setSubmissionErrorMessage(message);
      toast.error(message);
      return;
    }

    if (!currentIdempotencyKey) {
      refreshIdempotencyKey();
      const message = "جارٍ تهيئة الطلب. أعد المحاولة بعد لحظة.";
      setSubmissionErrorMessage(message);
      toast.error(message);
      return;
    }

    if (!canConfirmSale) {
      const message = shouldBlockForDebt
        ? "يجب اختيار عميل أو إكمال المبلغ."
        : "أكمل طريقة الدفع قبل تأكيد البيع.";
      setSubmissionErrorMessage(message);
      toast.error(message);
      return;
    }

    if (outOfStockItems.length > 0) {
      const message = `الكميات غير متاحة: ${outOfStockItems.map((item) => item.name).join("، ")}`;
      setSubmissionErrorMessage(message);
      toast.error(message);
      return;
    }

    const payments = buildSalePayloadPayments();

    if (payments.length === 0) {
      const message = "يجب إدخال مبلغ صحيح للدفع.";
      setSubmissionErrorMessage(message);
      toast.error(message);
      return;
    }

    markSubmitting();
    setSubmissionErrorMessage(null);
    setPanelState("processing");

    const payload = {
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        discount_percentage: item.discount_percentage
      })),
      payments,
      customer_id: selectedCustomerId || undefined,
      invoice_discount_percentage: invoiceDiscountPercentage || undefined,
      pos_terminal_code: posTerminalCode || undefined,
      notes: notes || undefined,
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
        setPanelState("cart");

        if (errorCode === "ERR_IDEMPOTENCY") {
          const existingInvoice = (
            envelope.error?.details as { existing_result?: SaleResponseData } | undefined
          )?.existing_result;
          const duplicateMessage = existingInvoice
            ? `تم تنفيذ الطلب مسبقًا. الفاتورة السابقة: ${existingInvoice.invoice_number}.`
            : "تم استخدام نفس الطلب مسبقًا، لذلك لم تُنشأ فاتورة جديدة.";

          setSubmissionErrorMessage(duplicateMessage);
          toast.warning(duplicateMessage);
          return;
        }

        if (errorCode === "ERR_CONCURRENT_STOCK_UPDATE") {
          refreshIdempotencyKey();
          const concurrencyMessage =
            "تغير المخزون أثناء التنفيذ. حدّث السلة ثم أعد المحاولة.";
          setSubmissionErrorMessage(concurrencyMessage);
          toast.error(concurrencyMessage);
          void refreshProducts();
          return;
        }

        setSubmissionErrorMessage(message);
        toast.error(message);
        return;
      }

      completeSale({
        ...envelope.data,
        change: changeToReturn ?? envelope.data.change,
        customer_name: selectedCustomerName,
        debt_amount: remainingToSettle > 0 ? remainingToSettle : 0,
        invoice_discount_amount: invoiceDiscountAmount,
        net_total: netTotal,
        payments: paymentRows
      });

      setIsCustomerExpanded(false);
      setIsDiscountExpanded(false);
      setIsTerminalCodeExpanded(false);
      setIsNotesExpanded(false);
      setIsPrimarySplitSelectorOpen(false);
      setPanelState("success");
      setActiveMobileTab("cart");
      toast.success(`تم إنشاء الفاتورة ${envelope.data.invoice_number} بنجاح.`);
      refreshOperationalData();
    } catch (error) {
      const message = getSafeArabicErrorMessage(error, "تعذر الوصول إلى مسار البيع.");

      markError("ERR_API_INTERNAL");
      setPanelState("cart");
      setSubmissionErrorMessage(message);
      toast.error(message);
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
  const checkoutOptionsToggleLabel = isCheckoutOptionsOpen
    ? "إخفاء الخيارات"
    : "خيارات إضافية";

  function handleCartLineRemove(item: (typeof items)[number]) {
    clearSubmissionFeedback();
    removeItem(item.product_id);
  }

  function handleCartLineDecrease(item: (typeof items)[number]) {
    clearSubmissionFeedback();

    if (item.quantity <= 1) {
      removeItem(item.product_id);
      return;
    }

    setQuantity(item.product_id, item.quantity - 1);
  }

  function handleCartLineIncrease(item: (typeof items)[number]) {
    clearSubmissionFeedback();
    setQuantity(item.product_id, item.quantity + 1);
  }

  function handleCartLineDiscountChange(item: (typeof items)[number], rawValue: number) {
    clearSubmissionFeedback();
    const clampedValue = Number.isNaN(rawValue) ? 0 : Math.min(rawValue, effectiveMaxDiscount);
    setDiscountPercentage(item.product_id, clampedValue);
  }

  const headerSlot = (
    <>
      {/* Mobile-only header, since Desktop already has the Dashboard Navbar */}
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
                ? "pos-mobile-tabs__button pos-cart-sheet__summary is-active"
                : "pos-mobile-tabs__button pos-cart-sheet__summary"
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
        <bdi dir="ltr">{formatStatusTime(now)}</bdi>
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
    <div className="transaction-stack pos-products-stack">
      <PosToolbar
        activeCategory={activeCategory}
        categories={categories}
        getCategoryLabel={getCategoryLabel}
        heldCartsCount={heldCarts.length}
        onCategoryChange={setActiveCategory}
        onClearSearch={() => {
          setSearchInput("");
          setSearchQuery("");
          searchRef.current?.focus();
        }}
        onNewSale={handleTopbarNewSale}
        onProductViewChange={setProductView}
        onRefreshProducts={refreshProducts}
        onSearchInputChange={(nextValue) => {
          startTransition(() => {
            setSearchInput(nextValue);
          });
        }}
        onSearchSubmit={handleSearchSubmit}
        onToggleHeldCarts={() => setIsHeldCartsOpen((currentValue) => !currentValue)}
        productView={productView}
        searchInput={searchInput}
        searchRef={searchRef}
      />

      <PosProductGrid
        onClearSearch={() => setSearchInput("")}
        onLoadMore={loadMoreProducts}
        productResultsLabel={productResultsLabel}
        productView={productView}
        products={filteredProducts}
        productsHasMore={productsHasMore}
        productsLoading={productsLoading}
        productsLoadingMore={productsLoadingMore}
        searchInput={searchInput}
        showEmptySearchState={filteredProducts.length === 0 && normalizedQuery.length > 0}
      />
    </div>
  );

  const cartSurface = (
    <SectionCard className="transaction-card transaction-card--checkout pos-cart-surface">
      {panelState === "success" && lastCompletedSale ? (
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
      ) : panelState !== "success" ? (
        <PosCartRail
          canHoldCart={canHoldCart}
          cartHydrated={cartHydrated}
          cartOverviewLabel={cartOverviewLabel}
          customerSummaryLabel={customerSummaryLabel}
          effectiveMaxDiscount={effectiveMaxDiscount}
          getHeldCartAge={getHeldCartAge}
          heldCarts={heldCarts}
          isHeldCartsOpen={isHeldCartsOpen}
          items={items}
          onClearCartRequest={() => setIsClearCartDialogOpen(true)}
          onDecreaseItem={handleCartLineDecrease}
          onDiscardHeldCart={handleDiscardHeldCart}
          onDiscountChange={handleCartLineDiscountChange}
          onHoldCart={handleHoldCart}
          onIncreaseItem={handleCartLineIncrease}
          onRemoveItem={handleCartLineRemove}
          onRestoreHeldCart={handleRestoreHeldCart}
          onToggleHeldCarts={() => setIsHeldCartsOpen((currentValue) => !currentValue)}
          checkoutPanel={
            <PosCheckoutPanel
              accounts={accounts}
              amountReceived={amountReceived}
              availablePrimarySplitAccounts={availablePrimarySplitAccounts}
              canCompleteSale={canCompleteSale}
              canCreateDebt={canCreateDebt}
              canHoldCart={canHoldCart}
              changeToReturn={changeToReturn}
              checkoutOptionsToggleLabel={checkoutOptionsToggleLabel}
              customerResults={customerResults}
              customerSearchInput={customerSearchInput}
              customersLoading={customersLoading}
              effectiveMaxDiscount={effectiveMaxDiscount}
              getAccountChipLabel={getAccountChipLabel}
              getAccountIcon={getAccountIcon}
              getAvailableAccountsForSplitRow={getAvailableAccountsForSplitRow}
              heldCartsCount={heldCarts.length}
              itemCount={items.length}
              invoiceDiscountAmount={invoiceDiscountAmount}
              invoiceDiscountPercentage={invoiceDiscountPercentage}
              isCheckoutOptionsOpen={isCheckoutOptionsOpen}
              isCustomerExpanded={isCustomerExpanded}
              isDiscountExpanded={isDiscountExpanded}
              isNotesExpanded={isNotesExpanded}
              isOffline={isOffline}
              isPrimarySplitSelectorOpen={isPrimarySplitSelectorOpen}
              isProcessing={panelState === "processing"}
              isSplitMode={isSplitMode}
              isSubmitting={isSubmitting}
              isTerminalCodeExpanded={isTerminalCodeExpanded}
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
              onConfirmSale={() => {
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
                  Number.isNaN(rawValue)
                    ? 0
                    : Math.min(Math.max(rawValue, 0), effectiveMaxDiscount)
                );
              }}
              onNotesChange={(value) => {
                clearSubmissionFeedback();
                setNotes(value);
              }}
              onOpenCustomer={() => setIsCustomerExpanded(true)}
              onOpenDiscount={() => setIsDiscountExpanded(true)}
              onOpenNotes={() => setIsNotesExpanded(true)}
              onOpenTerminalCode={() => setIsTerminalCodeExpanded(true)}
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
              onToggleCheckoutOptions={() =>
                setIsCheckoutOptionsOpen((currentValue) => !currentValue)
              }
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
          }
        />
      ) : null}
    </SectionCard>
  );

  return (
    <section className="pos-workspace">
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

      {isMobileViewport && activeMobileTab === "products" && items.length > 0 && panelState !== "success" ? (
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
  );
}
