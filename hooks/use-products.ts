"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
import type { PosProduct, StandardEnvelope } from "@/lib/pos/types";
import type { ProductCategory } from "@/lib/validations/products";

const PAGE_SIZE = 150;

type UseProductsOptions = {
  searchQuery?: string;
  category?: string;
};

type ProductsResponseData = {
  items: PosProduct[];
  totalCount: number;
  hasMore: boolean;
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
  const requestIdRef = useRef(0);
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
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
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

      const params = new URLSearchParams({
        page: String(page)
      });

      if (normalizedCategory) {
        params.set("category", normalizedCategory);
      }

      if (normalizedSearchQuery.length > 0) {
        params.set("q", normalizedSearchQuery);
      }

      let data: ProductsResponseData | undefined;
      let error: Error | null = null;

      try {
        const response = await fetch(`/api/pos/products?${params.toString()}`, {
          method: "GET",
          cache: "no-store"
        });
        const envelope = (await response.json()) as StandardEnvelope<ProductsResponseData>;

        if (!response.ok || !envelope.success || !envelope.data) {
          error = new Error(envelope.error?.message ?? "تعذر جلب المنتجات الآن.");
        } else {
          data = envelope.data;
        }
      } catch (fetchError) {
        error =
          fetchError instanceof Error
            ? fetchError
            : new Error("تعذر جلب المنتجات الآن.");
      }

      if (isCancelled || requestId !== requestIdRef.current) {
        return;
      }

      if (error) {
        setProducts([]);
        setErrorMessage(getSafeArabicErrorMessage(error, "تعذر جلب المنتجات الآن."));
        setHasMore(false);
      } else {
        const nextProducts = data?.items ?? [];
        const nextCount = loadingMore ? loadedCountRef.current + nextProducts.length : nextProducts.length;
        loadedCountRef.current = nextCount;

        setProducts((current) => (page === 0 ? nextProducts : [...current, ...nextProducts]));
        setTotalCount(data?.totalCount ?? nextCount);
        setHasMore(data?.hasMore ?? nextProducts.length === PAGE_SIZE);
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
