import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type WorkspaceRole = "admin" | "pos_staff";

export type SalesHistoryFilters = {
  fromDate: string;
  toDate: string;
  createdBy?: string;
  status?: string;
  posTerminalCode?: string;
  page: number;
  pageSize: number;
};

export type SalesHistoryEntry = {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  created_at: string;
  created_by: string;
  created_by_name: string | null;
  pos_terminal_code: string | null;
  total: number;
  status: string;
};

type InvoiceHistoryRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  created_at: string;
  created_by: string;
  pos_terminal_code: string | null;
  total_amount: number;
  status: string;
};

type ProfileNameRow = {
  id: string;
  full_name: string | null;
};

type SalesHistoryViewer = {
  role: WorkspaceRole;
  userId: string;
};

type SnapshotSummaryRow = {
  id: string;
  snapshot_date: string;
  net_sales: number;
  net_profit: number;
  invoice_count: number;
  created_at: string;
};

type DebtCustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  current_balance: number;
  credit_limit: number;
  due_date_days: number | null;
};

type AccountSummaryRow = {
  id: string;
  name: string;
  current_balance: number;
  type: string;
  module_scope: string;
  is_active: boolean;
};

type ProductInventoryRow = {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock_level: number;
  is_active: boolean;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isIsoDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function toPositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function parseSalesHistoryFilters(searchParams: URLSearchParams): SalesHistoryFilters {
  const today = todayIsoDate();
  const fromDate = isIsoDate(searchParams.get("from_date")) ? (searchParams.get("from_date") as string) : today;
  const toDate = isIsoDate(searchParams.get("to_date")) ? (searchParams.get("to_date") as string) : today;
  const page = toPositiveInteger(searchParams.get("page"), 1);
  const pageSize = Math.min(toPositiveInteger(searchParams.get("page_size"), 20), 100);
  const createdBy = searchParams.get("created_by") || undefined;
  const status = searchParams.get("status") || undefined;
  const posTerminalCode = searchParams.get("pos_terminal_code") || undefined;

  return {
    fromDate: fromDate <= toDate ? fromDate : toDate,
    toDate: toDate >= fromDate ? toDate : fromDate,
    createdBy,
    status,
    posTerminalCode,
    page,
    pageSize
  };
}

export async function getSalesHistory(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: SalesHistoryFilters,
  viewer: SalesHistoryViewer
) {
  const rangeFrom = (filters.page - 1) * filters.pageSize;
  const rangeTo = rangeFrom + filters.pageSize - 1;

  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, invoice_date, created_at, created_by, pos_terminal_code, total_amount, status",
      { count: "exact" }
    )
    .gte("invoice_date", filters.fromDate)
    .lte("invoice_date", filters.toDate)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (viewer.role === "pos_staff") {
    query = query.eq("created_by", viewer.userId);
  } else if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.posTerminalCode) {
    query = query.eq("pos_terminal_code", filters.posTerminalCode);
  }

  const { data: invoices, error, count } = await query.returns<InvoiceHistoryRow[]>();
  if (error) {
    throw error;
  }

  const creatorIds = [...new Set((invoices ?? []).map((invoice) => invoice.created_by))];
  const profileNames = new Map<string, string | null>();

  if (creatorIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", creatorIds)
      .returns<ProfileNameRow[]>();

    if (profileError) {
      throw profileError;
    }

    for (const profile of profiles ?? []) {
      profileNames.set(profile.id, profile.full_name);
    }
  }

  const entries: SalesHistoryEntry[] = (invoices ?? []).map((invoice) => ({
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    created_at: invoice.created_at,
    created_by: invoice.created_by,
    created_by_name: profileNames.get(invoice.created_by) ?? null,
    pos_terminal_code: invoice.pos_terminal_code,
    total: invoice.total_amount,
    status: invoice.status
  }));

  return {
    data: entries,
    total_count: count ?? entries.length,
    page: filters.page,
    page_size: filters.pageSize
  };
}

export async function getReportBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: SalesHistoryFilters,
  viewer: SalesHistoryViewer
) {
  const salesHistory = await getSalesHistory(supabase, filters, viewer);

  const [snapshotsResult, debtsResult, accountsResult, inventoryResult] = await Promise.all([
    supabase
      .from("daily_snapshots")
      .select("id, snapshot_date, net_sales, net_profit, invoice_count, created_at")
      .order("snapshot_date", { ascending: false })
      .limit(5)
      .returns<SnapshotSummaryRow[]>(),
    supabase
      .from("debt_customers")
      .select("id, name, phone, current_balance, credit_limit, due_date_days")
      .order("current_balance", { ascending: false })
      .limit(8)
      .returns<DebtCustomerRow[]>(),
    supabase
      .from("accounts")
      .select("id, name, current_balance, type, module_scope, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .returns<AccountSummaryRow[]>(),
    supabase
      .from("products")
      .select("id, name, stock_quantity, min_stock_level, is_active")
      .eq("is_active", true)
      .order("stock_quantity", { ascending: true })
      .limit(8)
      .returns<ProductInventoryRow[]>()
  ]);

  if (snapshotsResult.error) {
    throw snapshotsResult.error;
  }

  if (debtsResult.error) {
    throw debtsResult.error;
  }

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  if (inventoryResult.error) {
    throw inventoryResult.error;
  }

  const salesTotal = salesHistory.data.reduce((sum, item) => sum + item.total, 0);
  const activeInvoices = salesHistory.data.filter((item) => item.status !== "cancelled").length;
  const debtTotal = (debtsResult.data ?? []).reduce((sum, customer) => sum + customer.current_balance, 0);
  const lowStockProducts = (inventoryResult.data ?? []).filter(
    (product) => product.stock_quantity <= product.min_stock_level
  );

  return {
    salesHistory,
    salesSummary: {
      total_sales: salesTotal,
      invoice_count: activeInvoices,
      cancelled_count: salesHistory.data.length - activeInvoices
    },
    debtReport: {
      total_outstanding: debtTotal,
      customers: debtsResult.data ?? []
    },
    accountReport: {
      accounts: accountsResult.data ?? []
    },
    inventoryReport: {
      low_stock_count: lowStockProducts.length,
      products: inventoryResult.data ?? []
    },
    snapshots: snapshotsResult.data ?? []
  };
}

export async function resolveFirstAdminActorId(
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw new Error("ERR_API_INTERNAL");
  }

  return data.id;
}
