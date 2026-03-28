"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PosProduct } from "@/lib/pos/types";
import type { ProductCategory } from "@/lib/validations/products";

const PRODUCT_COLUMNS = [
  "id",
  "name",
  "category",
  "sku",
  "description",
  "sale_price",
  "stock_quantity",
  "min_stock_level",
  "track_stock",
  "is_quick_add",
  "is_active",
  "created_at",
  "updated_at",
  "created_by"
].join(", ");

const PAGE_SIZE = 150;

type UseProductsOptions = {
  searchQuery?: string;
  category?: string;
};

function sanitizeSearchTerm(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
}

export function useProducts({ searchQuery = "", category = "all" }: UseProductsOptions = {}) {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [refreshNonce, bumpRefreshNonce] = useReducer((value: number) => value + 1, 0);
  const loadedCountRef = useRef(0);
  const filterSignatureRef = useRef("");
  const normalizedSearchQuery = sanitizeSearchTerm(searchQuery);
  const normalizedCategory = category !== "all" ? (category as ProductCategory) : null;
  const filterSignature = `${normalizedSearchQuery}\u0000${normalizedCategory ?? ""}`;

  useEffect(() => {
    let isCancelled = false;
    const filtersChanged = filterSignatureRef.current !== filterSignature;

    if (filtersChanged && page !== 0) {
      filterSignatureRef.current = filterSignature;
      loadedCountRef.current = 0;
      setProducts([]);
      setHasMore(false);
      setTotalCount(null);
      setPage(0);
      return () => {
        isCancelled = true;
      };
    }

    filterSignatureRef.current = filterSignature;

    async function loadProducts() {
      const loadingMore = page > 0;
      if (loadingMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setErrorMessage(null);
        setProducts([]);
        setHasMore(false);
        setTotalCount(null);
        loadedCountRef.current = 0;
      }

      const supabase = createSupabaseBrowserClient();
      let query = supabase
        .from("v_pos_products")
        .select(PRODUCT_COLUMNS, { count: "exact" })
        .order("is_quick_add", { ascending: false })
        .order("name", { ascending: true });

      if (normalizedCategory) {
        query = query.eq("category", normalizedCategory);
      }

      if (normalizedSearchQuery.length > 0) {
        const pattern = `%${normalizedSearchQuery}%`;
        query = query.or(`name.ilike.${pattern},sku.ilike.${pattern}`);
      }

      const { data, error, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (isCancelled) {
        return;
      }

      if (error) {
        setProducts([]);
        setErrorMessage(getSafeArabicErrorMessage(error, "تعذر جلب المنتجات الآن."));
        setHasMore(false);
      } else {
        const nextProducts = (data ?? []) as unknown as PosProduct[];
        const nextCount = loadingMore ? loadedCountRef.current + nextProducts.length : nextProducts.length;
        loadedCountRef.current = nextCount;

        setProducts((current) => (page === 0 ? nextProducts : [...current, ...nextProducts]));
        setTotalCount(typeof count === "number" ? count : nextCount);
        setHasMore(typeof count === "number" ? nextCount < count : nextProducts.length === PAGE_SIZE);
        setErrorMessage(null);
      }

      setIsLoading(false);
      setIsLoadingMore(false);
    }

    void loadProducts();
  }, [filterSignature, normalizedCategory, normalizedSearchQuery, page, refreshNonce]);

  useEffect(() => {
    const handleReconnect = () => {
      setIsOffline(false);
      setPage(0);
      bumpRefreshNonce();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleReconnect);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleReconnect);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function loadMore() {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }

    setPage((value) => value + 1);
  }

  return {
    products,
    isLoading,
    isLoadingMore,
    isOffline,
    errorMessage,
    hasMore,
    totalCount,
    loadMore,
    refresh() {
      if (page === 0) {
        bumpRefreshNonce();
        return;
      }

      setPage(0);
    }
  };
}
