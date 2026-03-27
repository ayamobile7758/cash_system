"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type CustomerSearchResult = {
  id: string;
  name: string;
  phone: string | null;
  current_balance: number;
};

export function useCustomerSearch(query: string) {
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const supabase = createSupabaseBrowserClient();
    const pattern = `%${trimmed}%`;

    supabase
      .from("debt_customers")
      .select("id, name, phone, current_balance")
      .eq("is_active", true)
      .or(`name.ilike.${pattern},phone.ilike.${pattern}`)
      .order("name", { ascending: true })
      .limit(8)
      .then(({ data, error }) => {
        if (cancelled) {
          return;
        }

        setResults(error ? [] : ((data ?? []) as CustomerSearchResult[]));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return { results, isLoading };
}
