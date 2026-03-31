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
  CheckCircle2,
  CreditCard,
  GripHorizontal,
  ImageIcon,
  List,
  Loader2,
  Minus,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import { useCustomerSearch } from "@/hooks/use-customer-search";
import { usePosAccounts } from "@/hooks/use-pos-accounts";
import { useProducts } from "@/hooks/use-products";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
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

type CartPanelState = "cart" | "checkout" | "processing" | "success";
type MobileTab = "products" | "cart" | "checkout";
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
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  }

  if (tone === "warning") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  }

  return "border-destructive/20 bg-destructive/10 text-destructive";
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
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [productView, setProductView] = useState<ProductViewMode>("thumbnail");
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isCartSheetExpanded, setIsCartSheetExpanded] = useState(false);
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
  const quickAddProducts = useMemo(
    () => products.filter((product) => product.is_quick_add).slice(0, 8),
    [products]
  );
  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) {
      return products;
    }

    const rawQuery = deferredQuery.toLowerCase().trim();

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
        const rightSkuExact =
          (right.sku?.toLowerCase().trim() ?? "") === rawQuery ? 1 : 0;
        return rightSkuExact - leftSkuExact;
      });
  }, [deferredQuery, normalizedQuery, products]);

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

  function renderCompactProductCard(product: PosProduct, variant: "quick-add" | "grid") {
    const stockState = getProductStockState(product);
    const isThumbnailView = productView === "thumbnail";
    const isOutOfStock = product.track_stock && product.stock_quantity <= 0;
    const productCardClassName = [
      "pos-product-card",
      "pos-product-card--compact",
      isThumbnailView ? "pos-product-card--compact-thumbnail" : "",
      variant === "quick-add" ? "pos-product-card--quick-add" : "",
      isOutOfStock ? "pos-product-card--disabled" : ""
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        key={product.id}
        type="button"
        className={productCardClassName}
        onClick={() => {
          handleAddProduct(product);
        }}
        disabled={isOutOfStock}
        title={product.name}
      >
        {isOutOfStock ? (
          <span className="pos-product-card__badge pos-product-card__badge--out">
            نفد
          </span>
        ) : null}

        <span
          className={
            isThumbnailView
              ? "pos-product-card__thumb pos-product-card__thumb--thumbnail"
              : "pos-product-card__thumb"
          }
          aria-hidden="true"
        >
          <ImageIcon size={isThumbnailView ? 24 : 18} />
        </span>

        <span className="pos-product-card__info">
          <span className="pos-product-card__name">{product.name}</span>
          {isThumbnailView ? (
            stockState.tone === "low" ? (
              <span
                className={`pos-product-card__stock pos-product-card__stock--${stockState.tone}`}
              >
                {stockState.label}
              </span>
            ) : null
          ) : (
            <span className="pos-product-card__sku">
              {product.sku ? <bdi dir="ltr">{product.sku}</bdi> : "بدون SKU"}
            </span>
          )}
        </span>

        <span
          className={
            isThumbnailView
              ? "pos-product-card__pricing pos-product-card__pricing--thumbnail"
              : "pos-product-card__pricing"
          }
        >
          <span className="pos-product-card__price">{formatCurrency(product.sale_price)}</span>
          {!isThumbnailView ? (
            <span
              className={`pos-product-card__stock pos-product-card__stock--${stockState.tone}`}
            >
              {stockState.label}
            </span>
          ) : null}
        </span>
      </button>
    );
  }

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
      return;
    }

    // Changed from (max-width: 767px) to (max-width: 1023px) to ensure sidebar is visible on laptop screens
    const compactQuery = window.matchMedia("(max-width: 1023px)");

    const handleViewportChange = () => {
      setIsCompactViewport(compactQuery.matches);
    };

    handleViewportChange();
    compactQuery.addEventListener("change", handleViewportChange);

    return () => {
      compactQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    const storedView = window.localStorage.getItem("aya-pos-product-view");
    const storedMobileTab = window.localStorage.getItem("aya-pos-mobile-tab");

    if (storedView === "text" || storedView === "thumbnail") {
      setProductView(storedView);
    }

    if (
      storedMobileTab === "products" ||
      storedMobileTab === "cart" ||
      storedMobileTab === "checkout"
    ) {
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

        if (
          isCompactViewport &&
          activeMobileTab === "checkout" &&
          panelState !== "success"
        ) {
          event.preventDefault();
          goBackToCart();
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

      const quickAddIndex = Number(event.key);
      if (
        Number.isInteger(quickAddIndex) &&
        quickAddIndex >= 1 &&
        quickAddIndex <= quickAddProducts.length
      ) {
        event.preventDefault();
        handleAddProduct(quickAddProducts[quickAddIndex - 1]);
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
        if (isCompactViewport) {
          setActiveMobileTab("checkout");
          setPanelState("checkout");
        }
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
    isCompactViewport,
    isHeldCartsOpen,
    isOffline,
    isSubmitting,
    items,
    panelState,
    quickAddProducts,
    searchInput
  ]);

  function clearSubmissionFeedback() {
    if (submissionErrorMessage) {
      setSubmissionErrorMessage(null);
    }
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
    setActiveMobileTab("products");
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
    if (items.length === 0) {
      return;
    }

    setPanelState("checkout");
    if (isCompactViewport) {
      setActiveMobileTab("checkout");
    }
  }

  function goBackToCart() {
    setPanelState("cart");
    if (isCompactViewport) {
      setActiveMobileTab("cart");
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
        setPanelState("checkout");

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
      setActiveMobileTab("checkout");
      toast.success(`تم إنشاء الفاتورة ${envelope.data.invoice_number} بنجاح.`);
      refreshOperationalData();
    } catch (error) {
      const message = getSafeArabicErrorMessage(error, "تعذر الوصول إلى مسار البيع.");

      markError("ERR_API_INTERNAL");
      setPanelState("checkout");
      setSubmissionErrorMessage(message);
      toast.error(message);
    }
  }

  const cartSheetClassName = [
    "transaction-stack",
    "pos-cart-sheet",
    "pos-cart-panel",
    panelState === "cart" && !isCartSheetExpanded ? "pos-cart-sheet--collapsed" : "",
    panelState === "cart" && isCartSheetExpanded ? "pos-cart-sheet--expanded" : "",
    panelState !== "cart" ? "pos-cart-sheet--fullscreen" : ""
  ]
    .filter(Boolean)
    .join(" ");
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

  return (
    <section className="workspace-stack transaction-page">
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

      <div className="pos-layout">
        <div className="pos-products">
          <div className="pos-topbar">
            <div className="pos-topbar__identity">
              <h1 className="pos-topbar__label">نقطة البيع السريعة</h1>
              {selectedAccount ? (
                <span className="pos-topbar__account">{selectedAccount.name}</span>
              ) : null}
            </div>

            <div className="pos-topbar__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handleTopbarNewSale}
              >
                بيع جديد
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsHeldCartsOpen((currentValue) => !currentValue)}
              >
                السلال المعلقة ({formatCompactNumber(heldCarts.length)})
              </button>
            </div>
          </div>

          <div className="pos-products__content">
            <div className="transaction-stack">
              <SectionCard
                tone="accent"
                className="transaction-card transaction-card--filters"
                title="ابحث وأضف"
                actions={
                  <div className="transaction-action-cluster">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={refreshProducts}
                    >
                      <RefreshCcw size={16} />
                      تحديث
                    </button>
                    <div className="pos-view-toggle" aria-label="طريقة عرض المنتجات">
                      <button
                        type="button"
                        className={
                          productView === "text"
                            ? "icon-button pos-view-toggle__button is-active"
                            : "icon-button pos-view-toggle__button"
                        }
                        onClick={() => setProductView("text")}
                        aria-label="عرض مدمج"
                        title="عرض مدمج"
                      >
                        <List size={16} />
                      </button>
                      <button
                        type="button"
                        className={
                          productView === "thumbnail"
                            ? "icon-button pos-view-toggle__button is-active"
                            : "icon-button pos-view-toggle__button"
                        }
                        onClick={() => setProductView("thumbnail")}
                        aria-label="عرض بالصور"
                        title="عرض بالصور"
                      >
                        <ImageIcon size={16} />
                      </button>
                    </div>
                  </div>
                }
              >
                <div className="transaction-toolbar pos-products-header">
                  <label className="workspace-search transaction-toolbar__search pos-search-shell">
                    <Search size={18} />
                    <input
                      ref={searchRef}
                      type="search"
                      autoFocus
                      placeholder="ابحث عن منتج..."
                      value={searchInput}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        startTransition(() => {
                          setSearchInput(nextValue);
                        });
                      }}
                    />
                    {searchInput.trim().length > 0 ? (
                      <button
                        type="button"
                        className="icon-button pos-search-clear"
                        onClick={() => {
                          setSearchInput("");
                          setSearchQuery("");
                          searchRef.current?.focus();
                        }}
                        aria-label="مسح البحث"
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                  </label>
                </div>

                <div
                  className="chip-row transaction-chip-row pos-category-row"
                  aria-label="فئات المنتجات"
                >
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={
                        category === activeCategory
                          ? "chip chip--active pos-category-chip is-active"
                          : "chip pos-category-chip"
                      }
                      aria-pressed={category === activeCategory}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category === "all" ? "الكل" : getCategoryLabel(category)}
                    </button>
                  ))}
                </div>

                {quickAddProducts.length > 0 ? (
                  <div className="quick-add-row pos-quick-add-row">
                    {quickAddProducts.map((product) =>
                      renderCompactProductCard(product, "quick-add")
                    )}
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard
                title="المنتجات"
                className="transaction-card"
              >
                {productsLoading ? (
                  <div
                    className="product-grid product-grid--compact pos-product-grid pos-product-grid--loading"
                    aria-label="جارٍ تحميل منتجات نقطة البيع"
                  >
                    {Array.from({ length: 8 }).map((_, index) => (
                      <article
                        key={`pos-product-skeleton-${index}`}
                        className="product-card product-card--skeleton pos-product-card-skeleton"
                      >
                        <div className="skeleton-line skeleton-line--sm" />
                        <div className="skeleton-line skeleton-line--lg" />
                        <div className="skeleton-line" />
                        <div className="skeleton-line" />
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="pos-product-grid product-grid product-grid--compact transaction-product-grid">
                    {filteredProducts.length === 0 && normalizedQuery ? (
                      <div className="empty-state pos-search-empty">
                        <Search className="empty-state__icon" size={32} />
                        <h3 className="empty-state__title">لا توجد نتائج</h3>
                        <p className="empty-state__description">
                          لم يُعثر على منتج يطابق &quot;{searchInput}&quot;
                        </p>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setSearchInput("")}
                        >
                          مسح البحث
                        </button>
                      </div>
                    ) : (
                      filteredProducts.map((product) =>
                        renderCompactProductCard(product, "grid")
                      )
                    )}
                  </div>
                )}

                <div className="transaction-card__footer">
                  <div className="transaction-action-cluster">
                    {productsHasMore ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={loadMoreProducts}
                        disabled={productsLoadingMore}
                      >
                        {productsLoadingMore ? "جارٍ تحميل المزيد..." : "تحميل المزيد"}
                      </button>
                    ) : null}

                    <span className="product-pill product-pill--accent">
                      {formatCompactNumber(filteredProducts.length)} منتجًا
                      {productsTotalCount !== null
                        ? ` من ${formatCompactNumber(productsTotalCount)}`
                        : ""}
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        <aside className={cartSheetClassName}>
          <div className="pos-cart-sheet__bar">
            <button
              type="button"
              className="pos-cart-sheet__summary"
              onClick={() => {
                if (panelState !== "cart") {
                  return;
                }

                setIsCartSheetExpanded((currentValue) => !currentValue);
              }}
            >
              <span className="pos-cart-sheet__summary-handle" aria-hidden="true">
                <GripHorizontal size={18} />
              </span>
              <span>
                {formatCompactNumber(items.length)} بنود — {formatCurrency(netTotal)}
              </span>
              <strong>{isCartSheetExpanded ? "إخفاء" : "إظهار"}</strong>
            </button>
            <button
              type="button"
              className={
                canCreateDebt
                  ? "pos-cart-sheet__confirm-cta btn btn--warning"
                  : "pos-cart-sheet__confirm-cta btn btn--primary"
              }
              disabled={
                panelState === "processing" ||
                isSubmitting ||
                !canConfirmSale ||
                isOffline
              }
              onClick={() => {
                startSubmission(() => {
                  void submitSale();
                });
              }}
            >
              {panelState === "processing" || isSubmitting
                ? "جارٍ التنفيذ..."
                : "إتمام البيع"}
            </button>
          </div>

          <SectionCard
            title={
              panelState === "success"
                ? "تمت العملية بنجاح"
                : panelState === "cart"
                  ? "السلة الحالية"
                  : "إتمام البيع"
            }
            description={
              panelState === "success"
                ? "أصبح بإمكانك طباعة الإيصال أو بدء بيع جديد."
                : panelState === "checkout"
                  ? `${activePaymentLabel} • ${checkoutStatusLabel}`
                  : undefined
            }
            actions={
              panelState === "cart" ? (
                <div className="cart-panel__actions">
                  <button
                    type="button"
                    className="secondary-button cart-panel__header-button"
                    onClick={() =>
                      setIsCartSheetExpanded((currentValue) => !currentValue)
                    }
                  >
                    <GripHorizontal size={16} />
                    {isCartSheetExpanded ? "إخفاء" : "إظهار"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button cart-panel__header-button"
                    onClick={handleHoldCart}
                    disabled={!canHoldCart}
                  >
                    تعليق
                  </button>
                  <button
                    type="button"
                    className="secondary-button cart-panel__header-button"
                    onClick={() => setIsHeldCartsOpen((currentValue) => !currentValue)}
                  >
                    السلال المعلقة
                    <span className="product-pill product-pill--accent">
                      {formatCompactNumber(heldCarts.length)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ghost-button btn btn--ghost cart-panel__header-button cart-panel__clear-button"
                    onClick={() => setIsClearCartDialogOpen(true)}
                    disabled={items.length === 0}
                  >
                    تفريغ السلة
                  </button>
                </div>
              ) : panelState === "checkout" ? (
                <button
                  type="button"
                  className="ghost-button btn btn--ghost cart-panel__header-button"
                  onClick={goBackToCart}
                  disabled={isSubmitting}
                >
                  <ArrowRight size={16} />
                  عودة
                </button>
              ) : null
            }
            className="transaction-card transaction-card--checkout"
          >
            {panelState === "success" && lastCompletedSale ? (
              <div className="cart-success-overlay pos-success-screen">
                <div className="cart-success-overlay__icon">
                  <CheckCircle2 size={64} />
                </div>
                <h3 className="cart-success-overlay__title">تم إتمام البيع بنجاح</h3>
                <strong className="pos-success-screen__total">
                  {formatCurrency(lastCompletedSale.net_total ?? lastCompletedSale.total)}
                </strong>
                <span className="pos-success-screen__invoice">
                  فاتورة #{lastCompletedSale.invoice_number}
                </span>

                <dl className="cart-success-overlay__details pos-success-screen__details">
                  {(lastCompletedSale.payments ?? []).map((payment) => (
                    <div key={`${payment.account_id}-${payment.amount}`}>
                      <dt>{payment.account_name}</dt>
                      <dd>{formatCurrency(payment.amount)}</dd>
                    </div>
                  ))}

                  {completedSaleFeeTotal > 0 ? (
                    <div>
                      <dt>رسوم الدفع</dt>
                      <dd>{formatCurrency(completedSaleFeeTotal)}</dd>
                    </div>
                  ) : null}

                  {lastCompletedSale.change !== null && lastCompletedSale.change > 0 ? (
                    <div>
                      <dt>الباقي للعميل</dt>
                      <dd>{formatCurrency(lastCompletedSale.change)}</dd>
                    </div>
                  ) : null}
                  {lastCompletedSale.debt_amount && lastCompletedSale.debt_amount > 0 ? (
                    <div className="pos-success-screen__detail pos-success-screen__detail--warning">
                      <dt>دين مسجل</dt>
                      <dd>{formatCurrency(lastCompletedSale.debt_amount)}</dd>
                    </div>
                  ) : null}
                </dl>

                {lastCompletedSale.customer_name ? (
                  <div className="info-strip">
                    <span>العميل: {lastCompletedSale.customer_name}</span>
                  </div>
                ) : null}

                <div className="cart-success-overlay__actions actions-row">
                  <button
                    type="button"
                    className="primary-button btn btn--primary"
                    onClick={() => {
                      window.open(
                        `/invoices/${lastCompletedSale.invoice_id}?print=1`,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                  >
                    <Printer size={16} />
                    طباعة إيصال
                  </button>
                  <button
                    type="button"
                    className="secondary-button btn btn--secondary"
                    onClick={handleStartNewSale}
                  >
                    بيع جديد
                  </button>
                </div>
              </div>
            ) : panelState === "cart" ? (
              <>
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
                                onClick={() => handleRestoreHeldCart(heldCart.id)}
                              >
                                استعادة
                              </button>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => handleDiscardHeldCart(heldCart.id)}
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
                  <div className="cart-line-list">
                    {items.map((item) => {
                      const maxQuantity = item.track_stock
                        ? Math.max(item.stock_quantity, 1)
                        : null;
                      const lineSubtotal = roundAmount(item.sale_price * item.quantity);
                      const lineDiscountAmount = roundAmount(
                        lineSubtotal * (item.discount_percentage / 100)
                      );
                      const lineTotal = roundAmount(lineSubtotal - lineDiscountAmount);
                      const canIncreaseQuantity =
                        maxQuantity === null || item.quantity < maxQuantity;

                      return (
                        <article key={item.product_id} className="cart-line-card">
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
                                onClick={() => {
                                  clearSubmissionFeedback();
                                  removeItem(item.product_id);
                                }}
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
                                onClick={() => {
                                  clearSubmissionFeedback();

                                  if (item.quantity <= 1) {
                                    removeItem(item.product_id);
                                    return;
                                  }

                                  setQuantity(item.product_id, item.quantity - 1);
                                }}
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
                                onClick={() => {
                                  clearSubmissionFeedback();
                                  setQuantity(item.product_id, item.quantity + 1);
                                }}
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
                                onChange={(event) => {
                                  clearSubmissionFeedback();
                                  const raw = Number(event.target.value);
                                  const clampedValue = Number.isNaN(raw)
                                    ? 0
                                    : Math.min(raw, effectiveMaxDiscount);
                                  setDiscountPercentage(item.product_id, clampedValue);
                                }}
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
                )}

                <div className="cart-summary pos-cart-mode-summary">
                  <dl>
                    <div className="cart-summary__total">
                      <dt>الإجمالي</dt>
                      <dd>{formatCurrency(netTotal)}</dd>
                    </div>
                  </dl>

                  <div className="cart-panel__cta-row">
                    <button
                      type="button"
                      className="secondary-button btn btn--secondary transaction-checkout-button transaction-checkout-button--secondary"
                      disabled={items.length === 0}
                      onClick={openCheckout}
                    >
                      مراجعة الدفع
                    </button>
                    <button
                      type="button"
                      className={
                        canCreateDebt
                          ? "primary-button btn btn--warning transaction-checkout-button transaction-checkout-button--primary"
                          : "primary-button btn btn--primary transaction-checkout-button transaction-checkout-button--primary"
                      }
                      disabled={isSubmitting || !canConfirmSale || isOffline}
                      onClick={() => {
                        startSubmission(() => {
                          void submitSale();
                        });
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="spin" size={16} />
                          جارٍ التنفيذ...
                        </>
                      ) : (
                        "إتمام البيع"
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  className={
                    panelState === "processing"
                      ? "transaction-checkout-fields is-processing"
                      : "transaction-checkout-fields"
                  }
                  aria-busy={panelState === "processing"}
                >
                  {!isSplitMode ? (
                    <div className="stack-field">
                      <span className="field-label">طريقة الدفع</span>
                      <div className="chip-row pos-payment-chip-row">
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
                              onClick={() => {
                                clearSubmissionFeedback();
                                setSelectedAccountId(account.id);
                              }}
                              disabled={panelState === "processing"}
                            >
                              <Icon size={16} />
                              {getAccountChipLabel(account)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {!isSplitMode && selectedAccount?.type === "cash" ? (
                    <label className="stack-field">
                      <span className="field-label">المبلغ المستلم</span>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        step="0.001"
                        value={amountReceived ?? ""}
                        onChange={(event) => {
                          clearSubmissionFeedback();
                          const rawValue = event.target.value;
                          const parsedValue = parseAmount(rawValue);
                          setAmountReceived(rawValue === "" ? null : parsedValue);
                        }}
                        placeholder="المبلغ المدفوع من العميل"
                        disabled={panelState === "processing"}
                      />
                    </label>
                  ) : null}

                  {isSplitMode ? (
                    <div className="pos-split-payments">
                      <div className="pos-split-payment-row pos-split-payment-row--primary">
                        {selectedAccount
                          ? (() => {
                              const SelectedAccountIcon = getAccountIcon(
                                selectedAccount.type
                              );

                              return (
                                <button
                                  type="button"
                                  className="chip chip--active pos-payment-chip is-selected"
                                  onClick={() =>
                                    setIsPrimarySplitSelectorOpen(
                                      (currentValue) => !currentValue
                                    )
                                  }
                                  disabled={panelState === "processing"}
                                >
                                  <SelectedAccountIcon size={16} />
                                  {getAccountChipLabel(selectedAccount)}
                                </button>
                              );
                            })()
                          : null}
                        <label className="stack-field">
                          <span className="field-label">المبلغ</span>
                          <input
                            className="field-input"
                            type="number"
                            min={0}
                            step="0.001"
                            value={primarySplitAmount ?? ""}
                            onChange={(event) => {
                              clearSubmissionFeedback();
                              const parsedValue = parseAmount(event.target.value);
                              setPrimarySplitAmount(
                                event.target.value === "" ? null : parsedValue
                              );
                            }}
                            disabled={panelState === "processing"}
                          />
                        </label>
                      </div>

                      {isPrimarySplitSelectorOpen ? (
                        <div className="chip-row pos-split-primary-selector">
                          {availablePrimarySplitAccounts.map((account) => {
                            const Icon = getAccountIcon(account.type);
                            const isSelected = account.id === selectedAccountId;

                            return (
                              <button
                                key={`primary-selector-${account.id}`}
                                type="button"
                                className={
                                  isSelected
                                    ? "chip chip--active pos-payment-chip is-selected"
                                    : "chip pos-payment-chip"
                                }
                                onClick={() => selectPrimarySplitAccount(account.id)}
                                disabled={panelState === "processing"}
                              >
                                <Icon size={16} />
                                {getAccountChipLabel(account)}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {splitPayments.map((payment, index) => (
                        <div
                          key={`${payment.accountId}-${index}`}
                          className="pos-split-payment-row"
                        >
                          <div className="chip-row pos-payment-chip-row">
                            {getAvailableAccountsForSplitRow(payment.accountId).map(
                              (account) => {
                                const Icon = getAccountIcon(account.type);
                                const isSelected = account.id === payment.accountId;

                                return (
                                  <button
                                    key={`${index}-${account.id}`}
                                    type="button"
                                    className={
                                      isSelected
                                        ? "chip chip--active pos-payment-chip is-selected"
                                        : "chip pos-payment-chip"
                                    }
                                    onClick={() => {
                                      clearSubmissionFeedback();
                                      updateSplitPaymentAccount(index, account.id);
                                    }}
                                    disabled={panelState === "processing"}
                                  >
                                    <Icon size={16} />
                                    {getAccountChipLabel(account)}
                                  </button>
                                );
                              }
                            )}
                          </div>

                          <div className="actions-row">
                            <label className="stack-field">
                              <span className="field-label">المبلغ</span>
                              <input
                                className="field-input"
                                type="number"
                                min={0}
                                step="0.001"
                                value={payment.amount}
                                onChange={(event) => {
                                  clearSubmissionFeedback();
                                  updateSplitPaymentAmount(
                                    index,
                                    parseAmount(event.target.value) ?? 0
                                  );
                                }}
                                disabled={panelState === "processing"}
                              />
                            </label>

                            <button
                              type="button"
                              className="icon-button btn btn--ghost"
                              onClick={() => {
                                clearSubmissionFeedback();
                                removeSplitPayment(index);
                              }}
                              disabled={panelState === "processing"}
                              aria-label="حذف طريقة الدفع"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="ghost-button btn btn--ghost pos-add-split-payment"
                    onClick={handleAddSplitPayment}
                    disabled={
                      panelState === "processing" ||
                      splitPayments.length >= 2 ||
                      accounts.length <= paymentRows.length
                    }
                  >
                    <Plus size={16} />
                    أضف طريقة دفع أخرى
                  </button>

                  {isCustomerExpanded ? (
                    <div className="stack-field customer-search-field">
                      <span className="field-label">العميل</span>
                      <input
                        className="field-input"
                        type="text"
                        value={customerSearchInput}
                        onChange={(event) => {
                          clearSubmissionFeedback();
                          setCustomerSearchInput(event.target.value);
                        }}
                        placeholder="بحث العميل"
                        disabled={panelState === "processing"}
                      />

                      {shouldShowCustomerResults ? (
                        <div className="customer-search-results">
                          {customersLoading ? (
                            <div className="customer-search-results__empty">
                              جارٍ البحث عن العملاء...
                            </div>
                          ) : customerResults.length === 0 ? (
                            <div className="customer-search-results__empty">
                              لا توجد نتائج مطابقة.
                            </div>
                          ) : (
                            customerResults.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                className="customer-search-option"
                                onClick={() =>
                                  selectCustomer(customer as CustomerSearchResult)
                                }
                              >
                                <strong>{customer.name}</strong>
                                <span>
                                  {customer.phone || "بدون هاتف"} • الرصيد الحالي{" "}
                                  {formatCurrency(customer.current_balance)}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}

                      {selectedCustomerId && selectedCustomerName ? (
                        <div className="selected-customer-card">
                          <div>
                            <strong>{selectedCustomerName}</strong>
                            <span>
                              الرصيد الحالي:{" "}
                              {selectedCustomerBalance !== null
                                ? formatCurrency(selectedCustomerBalance)
                                : "جارٍ التحميل..."}
                              {selectedCustomerPhone ? ` • ${selectedCustomerPhone}` : ""}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={clearCustomerSelection}
                            disabled={panelState === "processing"}
                          >
                            إزالة
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="pos-optional-field-toggle"
                      onClick={() => setIsCustomerExpanded(true)}
                      disabled={panelState === "processing"}
                    >
                      ▸ إضافة عميل (اختياري)
                    </button>
                  )}

                  {isDiscountExpanded ? (
                    <label className="stack-field">
                      <span className="field-label">خصم الفاتورة</span>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        max={effectiveMaxDiscount}
                        value={invoiceDiscountPercentage}
                        onChange={(event) => {
                          clearSubmissionFeedback();
                          const rawValue = Number(event.target.value);
                          setInvoiceDiscountPercentage(
                            Number.isNaN(rawValue)
                              ? 0
                              : Math.min(Math.max(rawValue, 0), effectiveMaxDiscount)
                          );
                        }}
                        disabled={panelState === "processing"}
                      />
                    </label>
                  ) : (
                    <button
                      type="button"
                      className="pos-optional-field-toggle"
                      onClick={() => setIsDiscountExpanded(true)}
                      disabled={panelState === "processing"}
                    >
                      ▸ إضافة خصم (اختياري)
                    </button>
                  )}

                  {isTerminalCodeExpanded ? (
                    <div className="stack-field terminal-code-field">
                      <span className="field-label">رمز الجهاز</span>

                      {terminalCodeLocked ? (
                        <div className="terminal-code-field__locked">
                          <strong>{posTerminalCode}</strong>
                        </div>
                      ) : (
                        <div className="terminal-code-field__edit">
                          <input
                            className="field-input"
                            type="text"
                            maxLength={30}
                            value={posTerminalCode}
                            onChange={(event) => {
                              clearSubmissionFeedback();
                              setPosTerminalCode(event.target.value);
                            }}
                            placeholder="POS-01"
                            disabled={panelState === "processing"}
                          />
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              if (posTerminalCode.trim()) {
                                lockTerminalCode();
                              }
                            }}
                            disabled={
                              !posTerminalCode.trim() || panelState === "processing"
                            }
                          >
                            تثبيت
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="pos-optional-field-toggle"
                      onClick={() => setIsTerminalCodeExpanded(true)}
                      disabled={panelState === "processing"}
                    >
                      ▸ رمز الجهاز (اختياري)
                    </button>
                  )}

                  <div className="stack-field pos-notes-field">
                    {!isNotesExpanded ? (
                      <button
                        type="button"
                        className="pos-optional-field-toggle"
                        onClick={() => setIsNotesExpanded(true)}
                        disabled={panelState === "processing"}
                      >
                        ▸ إضافة ملاحظة (اختياري)
                      </button>
                    ) : (
                      <>
                        <span className="field-label">ملاحظات</span>
                        <textarea
                          className="field-input pos-notes-field__textarea"
                          rows={3}
                          maxLength={500}
                          value={notes}
                          onChange={(event) => {
                            clearSubmissionFeedback();
                            setNotes(event.target.value);
                          }}
                          placeholder="ملاحظة على الفاتورة"
                          disabled={panelState === "processing"}
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="cart-summary transaction-checkout-summary pos-checkout-summary">
                  <dl>
                    <div>
                      <dt>المجموع</dt>
                      <dd>{formatCurrency(subtotal)}</dd>
                    </div>
                    <div>
                      <dt>خصومات البنود</dt>
                      <dd>{formatCurrency(totalDiscount)}</dd>
                    </div>
                    {invoiceDiscountAmount > 0 ? (
                      <div>
                        <dt>خصم الفاتورة</dt>
                        <dd>{formatCurrency(invoiceDiscountAmount)}</dd>
                      </div>
                    ) : null}
                    <div className="cart-summary__total">
                      <dt>الصافي</dt>
                      <dd>{formatCurrency(netTotal)}</dd>
                    </div>
                    {totalFees > 0 ? (
                      <div>
                        <dt>رسوم الدفع</dt>
                        <dd>{formatCurrency(totalFees)}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div
                    className={
                      remainingToSettle > 0
                        ? "pos-remaining-balance pos-remaining-balance--danger"
                        : "pos-remaining-balance pos-remaining-balance--success"
                    }
                  >
                    {remainingToSettle > 0 ? (
                      <strong>المتبقي للسداد: {formatCurrency(remainingToSettle)}</strong>
                    ) : changeToReturn !== null ? (
                      <strong>الباقي للعميل: {formatCurrency(changeToReturn)}</strong>
                    ) : (
                      <strong>تم تسديد المبلغ</strong>
                    )}
                  </div>

                  {shouldBlockForDebt ? (
                    <p className="field-error pos-debt-block-message">
                      يجب اختيار عميل أو إكمال المبلغ
                    </p>
                  ) : null}

                  {canCreateDebt ? (
                    <div className="debt-preview-panel">
                      <strong>⚠ سيتم تسجيل دين</strong>
                      <span>المبلغ المتبقي: {formatCurrency(remainingToSettle)}</span>
                      {selectedCustomerName ? (
                        <span>على حساب: {selectedCustomerName}</span>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className={
                      canCreateDebt
                        ? "primary-button btn btn--warning transaction-checkout-button"
                        : "primary-button btn btn--primary transaction-checkout-button"
                    }
                    disabled={
                      panelState === "processing" ||
                      isSubmitting ||
                      !canConfirmSale ||
                      isOffline
                    }
                    onClick={() => {
                      startSubmission(() => {
                        void submitSale();
                      });
                    }}
                  >
                    {panelState === "processing" || isSubmitting ? (
                      <>
                        <Loader2 className="spin" size={16} />
                        جارٍ التنفيذ...
                      </>
                    ) : canCreateDebt ? (
                      "إتمام البيع وتسجيل الدين"
                    ) : (
                      "إتمام البيع"
                    )}
                  </button>
                </div>
              </>
            )}
          </SectionCard>
        </aside>
      </div>

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
