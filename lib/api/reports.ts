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

export type SnapshotSummary = {
  id: string;
  snapshot_date: string;
  net_sales: number;
  net_profit: number;
  invoice_count: number;
  created_at: string;
};

export type DebtCustomerSummary = {
  id: string;
  name: string;
  phone: string | null;
  current_balance: number;
  credit_limit: number;
  due_date_days: number | null;
};

export type AccountSummary = {
  id: string;
  name: string;
  current_balance: number;
  type: string;
  module_scope: string;
  is_active: boolean;
};

export type InventoryProductSummary = {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock_level: number;
  is_active: boolean;
};

export type ProfitReport = {
  snapshot_count: number;
  snapshot_net_sales: number;
  snapshot_net_profit: number;
  return_total: number;
  purchase_total: number;
  topup_amount: number;
  topup_profit: number;
  maintenance_delivered_count: number;
  maintenance_revenue: number;
};

export type ReturnReasonSummary = {
  reason: string;
  count: number;
  total_amount: number;
};

export type ReturnReportEntry = {
  return_id: string;
  return_number: string;
  return_date: string;
  return_type: string;
  invoice_number: string | null;
  reason: string;
  total_amount: number;
  created_by_name: string | null;
};

export type ReturnsReport = {
  total_returns: number;
  return_count: number;
  reasons: ReturnReasonSummary[];
  entries: ReturnReportEntry[];
};

export type AccountMovementEntry = {
  id: string;
  entry_date: string;
  account_name: string;
  account_scope: string;
  entry_type: string;
  adjustment_direction: string | null;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  amount: number;
  created_by_name: string | null;
};

export type AccountMovementSummary = {
  account_id: string;
  account_name: string;
  current_balance: number;
  movement_count: number;
  income_total: number;
  expense_total: number;
  adjustment_increase_total: number;
  adjustment_decrease_total: number;
};

export type AccountMovementReport = {
  total_movements: number;
  entries: AccountMovementEntry[];
  summaries: AccountMovementSummary[];
};

export type MaintenanceReportEntry = {
  job_id: string;
  job_number: string;
  job_date: string;
  customer_name: string;
  device_type: string;
  status: string;
  final_amount: number | null;
  created_by_name: string | null;
};

export type MaintenanceReport = {
  open_count: number;
  ready_count: number;
  delivered_count: number;
  delivered_revenue: number;
  jobs: MaintenanceReportEntry[];
};

export type ReportBaseline = {
  salesHistory: {
    data: SalesHistoryEntry[];
    total_count: number;
    page: number;
    page_size: number;
  };
  salesSummary: {
    total_sales: number;
    invoice_count: number;
    cancelled_count: number;
  };
  debtReport: {
    total_outstanding: number;
    customers: DebtCustomerSummary[];
  };
  accountReport: {
    accounts: AccountSummary[];
  };
  inventoryReport: {
    low_stock_count: number;
    products: InventoryProductSummary[];
  };
  profitReport: ProfitReport;
  returnsReport: ReturnsReport;
  accountMovementReport: AccountMovementReport;
  maintenanceReport: MaintenanceReport;
  snapshots: SnapshotSummary[];
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

type SnapshotSummaryRow = SnapshotSummary;

type DebtCustomerRow = DebtCustomerSummary;

type AccountSummaryRow = AccountSummary & {
  display_order?: number;
};

type ProductInventoryRow = InventoryProductSummary;

type ReturnRow = {
  id: string;
  return_number: string;
  return_date: string;
  return_type: string;
  original_invoice_id: string;
  total_amount: number;
  reason: string;
  created_by: string;
};

type InvoiceNumberRow = {
  id: string;
  invoice_number: string;
};

type LedgerEntryRow = {
  id: string;
  entry_date: string;
  account_id: string;
  entry_type: string;
  adjustment_direction: string | null;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  amount: number;
  created_by: string;
};

type PurchaseOrderRow = {
  total_amount: number;
};

type TopupRow = {
  amount: number;
  profit_amount: number;
};

type MaintenanceJobRow = {
  id: string;
  job_number: string;
  job_date: string;
  customer_name: string;
  device_type: string;
  status: string;
  final_amount: number | null;
  created_by: string;
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

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

async function loadProfileNameMap(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  ids: string[]
) {
  const map = new Map<string, string | null>();
  const creatorIds = unique(ids.filter(Boolean));

  if (creatorIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", creatorIds)
    .returns<ProfileNameRow[]>();

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    map.set(row.id, row.full_name);
  }

  return map;
}

async function loadInvoiceNumberMap(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  ids: string[]
) {
  const map = new Map<string, string>();
  const invoiceIds = unique(ids.filter(Boolean));

  if (invoiceIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .in("id", invoiceIds)
    .returns<InvoiceNumberRow[]>();

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    map.set(row.id, row.invoice_number);
  }

  return map;
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

  const profileNames = await loadProfileNameMap(
    supabase,
    (invoices ?? []).map((invoice) => invoice.created_by)
  );

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

async function getReturnsReport(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: SalesHistoryFilters
): Promise<ReturnsReport> {
  let query = supabase
    .from("returns")
    .select("id, return_number, return_date, return_type, original_invoice_id, total_amount, reason, created_by")
    .gte("return_date", filters.fromDate)
    .lte("return_date", filters.toDate)
    .order("return_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }

  const { data, error } = await query.returns<ReturnRow[]>();
  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const listRows = rows.slice(0, 20);
  const [profileNames, invoiceNumbers] = await Promise.all([
    loadProfileNameMap(
      supabase,
      listRows.map((row) => row.created_by)
    ),
    loadInvoiceNumberMap(
      supabase,
      listRows.map((row) => row.original_invoice_id)
    )
  ]);

  const reasonMap = new Map<string, ReturnReasonSummary>();
  for (const row of rows) {
    const current = reasonMap.get(row.reason) ?? {
      reason: row.reason,
      count: 0,
      total_amount: 0
    };

    current.count += 1;
    current.total_amount += row.total_amount;
    reasonMap.set(row.reason, current);
  }

  return {
    total_returns: rows.reduce((sum, row) => sum + row.total_amount, 0),
    return_count: rows.length,
    reasons: [...reasonMap.values()].sort((left, right) => right.total_amount - left.total_amount),
    entries: listRows.map((row) => ({
      return_id: row.id,
      return_number: row.return_number,
      return_date: row.return_date,
      return_type: row.return_type,
      invoice_number: invoiceNumbers.get(row.original_invoice_id) ?? null,
      reason: row.reason,
      total_amount: row.total_amount,
      created_by_name: profileNames.get(row.created_by) ?? null
    }))
  };
}

async function getAccountMovementReport(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: SalesHistoryFilters
): Promise<AccountMovementReport> {
  let query = supabase
    .from("ledger_entries")
    .select(
      "id, entry_date, account_id, entry_type, adjustment_direction, reference_type, reference_id, description, amount, created_by"
    )
    .gte("entry_date", filters.fromDate)
    .lte("entry_date", filters.toDate)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }

  const [ledgerResult, accountsResult] = await Promise.all([
    query.returns<LedgerEntryRow[]>(),
    supabase
      .from("accounts")
      .select("id, name, current_balance, type, module_scope, is_active, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .returns<AccountSummaryRow[]>()
  ]);

  if (ledgerResult.error) {
    throw ledgerResult.error;
  }

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  const rows = ledgerResult.data ?? [];
  const listRows = rows.slice(0, 40);
  const accounts = accountsResult.data ?? [];
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const profileNames = await loadProfileNameMap(
    supabase,
    listRows.map((row) => row.created_by)
  );

  const summaries = new Map<string, AccountMovementSummary>();
  for (const account of accounts) {
    summaries.set(account.id, {
      account_id: account.id,
      account_name: account.name,
      current_balance: account.current_balance,
      movement_count: 0,
      income_total: 0,
      expense_total: 0,
      adjustment_increase_total: 0,
      adjustment_decrease_total: 0
    });
  }

  for (const row of rows) {
    const summary = summaries.get(row.account_id);
    if (!summary) {
      continue;
    }

    summary.movement_count += 1;

    if (row.entry_type === "income") {
      summary.income_total += row.amount;
    } else if (row.entry_type === "expense") {
      summary.expense_total += row.amount;
    } else if (row.adjustment_direction === "increase") {
      summary.adjustment_increase_total += row.amount;
    } else if (row.adjustment_direction === "decrease") {
      summary.adjustment_decrease_total += row.amount;
    }
  }

  return {
    total_movements: rows.length,
    entries: listRows.map((row) => ({
      id: row.id,
      entry_date: row.entry_date,
      account_name: accountMap.get(row.account_id)?.name ?? "حساب غير معروف",
      account_scope: accountMap.get(row.account_id)?.module_scope ?? "core",
      entry_type: row.entry_type,
      adjustment_direction: row.adjustment_direction,
      reference_type: row.reference_type,
      reference_id: row.reference_id,
      description: row.description,
      amount: row.amount,
      created_by_name: profileNames.get(row.created_by) ?? null
    })),
    summaries: [...summaries.values()].filter((summary) => summary.movement_count > 0)
  };
}

async function getProfitReport(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: SalesHistoryFilters
): Promise<ProfitReport> {
  let purchasesQuery = supabase
    .from("purchase_orders")
    .select("total_amount")
    .gte("purchase_date", filters.fromDate)
    .lte("purchase_date", filters.toDate);

  let returnsQuery = supabase
    .from("returns")
    .select("total_amount")
    .gte("return_date", filters.fromDate)
    .lte("return_date", filters.toDate);

  let topupsQuery = supabase
    .from("topups")
    .select("amount, profit_amount")
    .gte("topup_date", filters.fromDate)
    .lte("topup_date", filters.toDate);

  let maintenanceQuery = supabase
    .from("maintenance_jobs")
    .select("status, final_amount")
    .gte("job_date", filters.fromDate)
    .lte("job_date", filters.toDate);

  if (filters.createdBy) {
    purchasesQuery = purchasesQuery.eq("created_by", filters.createdBy);
    returnsQuery = returnsQuery.eq("created_by", filters.createdBy);
    topupsQuery = topupsQuery.eq("created_by", filters.createdBy);
    maintenanceQuery = maintenanceQuery.eq("created_by", filters.createdBy);
  }

  const [snapshotsResult, purchasesResult, returnsResult, topupsResult, maintenanceResult] = await Promise.all([
    supabase
      .from("daily_snapshots")
      .select("id, snapshot_date, net_sales, net_profit, invoice_count, created_at")
      .gte("snapshot_date", filters.fromDate)
      .lte("snapshot_date", filters.toDate)
      .returns<SnapshotSummaryRow[]>(),
    purchasesQuery.returns<PurchaseOrderRow[]>(),
    returnsQuery.returns<Array<{ total_amount: number }>>(),
    topupsQuery.returns<TopupRow[]>(),
    maintenanceQuery.returns<Array<{ status: string; final_amount: number | null }>>()
  ]);

  if (snapshotsResult.error) {
    throw snapshotsResult.error;
  }

  if (purchasesResult.error) {
    throw purchasesResult.error;
  }

  if (returnsResult.error) {
    throw returnsResult.error;
  }

  if (topupsResult.error) {
    throw topupsResult.error;
  }

  if (maintenanceResult.error) {
    throw maintenanceResult.error;
  }

  const snapshots = snapshotsResult.data ?? [];
  const purchases = purchasesResult.data ?? [];
  const returns = returnsResult.data ?? [];
  const topups = topupsResult.data ?? [];
  const maintenanceJobs = maintenanceResult.data ?? [];

  return {
    snapshot_count: snapshots.length,
    snapshot_net_sales: snapshots.reduce((sum, snapshot) => sum + snapshot.net_sales, 0),
    snapshot_net_profit: snapshots.reduce((sum, snapshot) => sum + snapshot.net_profit, 0),
    return_total: returns.reduce((sum, entry) => sum + entry.total_amount, 0),
    purchase_total: purchases.reduce((sum, entry) => sum + entry.total_amount, 0),
    topup_amount: topups.reduce((sum, entry) => sum + entry.amount, 0),
    topup_profit: topups.reduce((sum, entry) => sum + entry.profit_amount, 0),
    maintenance_delivered_count: maintenanceJobs.filter((entry) => entry.status === "delivered").length,
    maintenance_revenue: maintenanceJobs.reduce((sum, entry) => {
      if (entry.status !== "delivered") {
        return sum;
      }

      return sum + (entry.final_amount ?? 0);
    }, 0)
  };
}

async function getMaintenanceReport(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: SalesHistoryFilters
): Promise<MaintenanceReport> {
  let query = supabase
    .from("maintenance_jobs")
    .select("id, job_number, job_date, customer_name, device_type, status, final_amount, created_by")
    .gte("job_date", filters.fromDate)
    .lte("job_date", filters.toDate)
    .order("job_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }

  const { data, error } = await query.returns<MaintenanceJobRow[]>();
  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const listRows = rows.slice(0, 20);
  const profileNames = await loadProfileNameMap(
    supabase,
    listRows.map((row) => row.created_by)
  );

  return {
    open_count: rows.filter((row) => row.status === "new" || row.status === "in_progress").length,
    ready_count: rows.filter((row) => row.status === "ready").length,
    delivered_count: rows.filter((row) => row.status === "delivered").length,
    delivered_revenue: rows.reduce((sum, row) => {
      if (row.status !== "delivered") {
        return sum;
      }

      return sum + (row.final_amount ?? 0);
    }, 0),
    jobs: listRows.map((row) => ({
      job_id: row.id,
      job_number: row.job_number,
      job_date: row.job_date,
      customer_name: row.customer_name,
      device_type: row.device_type,
      status: row.status,
      final_amount: row.final_amount,
      created_by_name: profileNames.get(row.created_by) ?? null
    }))
  };
}

export async function getReportBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: SalesHistoryFilters,
  viewer: SalesHistoryViewer
): Promise<ReportBaseline> {
  const salesHistory = await getSalesHistory(supabase, filters, viewer);

  const [snapshotsResult, debtsResult, accountsResult, inventoryResult, profitReport, returnsReport, accountMovementReport, maintenanceReport] =
    await Promise.all([
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
        .returns<ProductInventoryRow[]>(),
      getProfitReport(supabase, filters),
      getReturnsReport(supabase, filters),
      getAccountMovementReport(supabase, filters),
      getMaintenanceReport(supabase, filters)
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

  const activeSales = salesHistory.data.filter((item) => item.status !== "cancelled");
  const salesTotal = activeSales.reduce((sum, item) => sum + item.total, 0);
  const activeInvoices = activeSales.length;
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
    profitReport,
    returnsReport,
    accountMovementReport,
    maintenanceReport,
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
