"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PosAccount } from "@/lib/pos/types";

const ACCOUNT_COLUMNS = [
  "id",
  "name",
  "type",
  "module_scope",
  "fee_percentage",
  "is_active",
  "display_order",
  "created_at",
  "updated_at"
].join(", ");

export function usePosAccounts() {
  const [accounts, setAccounts] = useState<PosAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadAccounts() {
      setIsLoading(true);
      setErrorMessage(null);

      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("v_pos_accounts")
        .select(ACCOUNT_COLUMNS)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (isCancelled) {
        return;
      }

      if (error) {
        setAccounts([]);
        setErrorMessage(error.message);
      } else {
        setAccounts((data ?? []) as unknown as PosAccount[]);
      }

      setIsLoading(false);
    }

    void loadAccounts();

    const handleReconnect = () => {
      setIsOffline(false);
      setReloadToken((value) => value + 1);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleReconnect);
    window.addEventListener("offline", handleOffline);

    return () => {
      isCancelled = true;
      window.removeEventListener("online", handleReconnect);
      window.removeEventListener("offline", handleOffline);
    };
  }, [reloadToken]);

  return {
    accounts,
    isLoading,
    isOffline,
    errorMessage,
    refresh() {
      setReloadToken((value) => value + 1);
    }
  };
}
