import { format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import type { AdvancedReportDimension, AdvancedReportGroupBy } from "@/lib/validations/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type WorkspaceRole = "admin" | "pos_staff";

export type SalesHistoryFilters = {
  fromDate: string;
  toDate: string;
  compareFromDate?: string;
  compareToDate?: string;
  groupBy?: AdvancedReportGroupBy;
  dimension?: AdvancedReportDimension;
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
  expense_total: number;
  return_total: number;
  purchase_total: number;
  topup_amount: number;
  topup_profit: number;
  maintenance_delivered_count: number;
  maintenance_revenue: number;
};

export type AdvancedReportPeriodSummary = {
  sales_total: number;
  total_returns: number;
  net_sales: number;
  expense_total: number;
  purchase_total: number;
  topup_profit: number;
  maintenance_revenue: number;
  net_profit: number;
  invoice_count: number;
  snapshot_count: number;
};

export type AdvancedTrendPoint = {
  bucket: string;
  sales_total: number;
  net_profit: number;
  expense_total: number;
};

export type AdvancedBreakdownEntry = {
  label: string;
  amount: number;
  secondary_amount: number;
  item_count: number;
};

export type AdvancedReport = {
  currentPeriod: AdvancedReportPeriodSummary;
  comparePeriod: AdvancedReportPeriodSummary | null;
  trend: AdvancedTrendPoint[];
  breakdown: AdvancedBreakdownEntry[];
  delta: {
    sales_total: number;
    net_profit: number;
    expense_total: number;
    invoice_count: number;
  };
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
  advancedReport: AdvancedReport;
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

type SnapshotMetricRow = {
  snapshot_date: string;
  total_sales: number;
  total_returns: number;
  total_cost: number;
  net_sales: number;
  net_profit: number;
  invoice_count: number;
  total_expenses: number;
  total_purchases: number;
};

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

type ReturnMetricRow = {
  return_date: string;
  total_amount: number;
};

type ReturnReasonRow = {
  reason: string;
  total_amount: number;
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
  purchase_date?: string;
  total_amount: number;
  supplier_id?: string | null;
  is_paid?: boolean;
};

type TopupRow = {
  topup_date?: string;
  amount: number;
  profit_amount: number;
  supplier_id?: string | null;
};

type SupplierNameRow = {
  id: string;
  name: string;
};

type ExpenseBreakdownRow = {
  expense_date?: string;
  amount: number;
  category_id: string;
  created_by?: string;
};

type ExpenseCategoryNameRow = {
  id: string;
  name: string;
};

type InvoiceMetricRow = {
  id: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  created_by: string;
  pos_terminal_code: string | null;
};

type InvoiceItemCostRow = {
  invoice_id: string;
  quantity: number;
  cost_price_at_time: number;
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

function bucketDate(value: string, groupBy: AdvancedReportGroupBy) {
  const parsed = parseISO(value);

  if (groupBy === "month") {
    return format(startOfMonth(parsed), "yyyy-MM-dd");
  }

  if (groupBy === "week") {
    return format(startOfWeek(parsed, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }

  return format(parsed, "yyyy-MM-dd");
}

function buildEmptyAdvancedPeriod(): AdvancedReportPeriodSummary {
  return {
    sales_total: 0,
    total_returns: 0,
    net_sales: 0,
    expense_total: 0,
    purchase_total: 0,
    topup_profit: 0,
    maintenance_revenue: 0,
    net_profit: 0,
    invoice_count: 0,
    snapshot_count: 0
  };
}

function roundMetric(value: number) {
  return Number(value.toFixed(3));
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
  const compareFromDate = isIsoDate(searchParams.get("compare_from_date"))
    ? (searchParams.get("compare_from_date") as string)
    : undefined;
  const compareToDate = isIsoDate(searchParams.get("compare_to_date"))
    ? (searchParams.get("compare_to_date") as string)
    : undefined;
  const groupBy = (searchParams.get("group_by") as AdvancedReportGroupBy | null) ?? "day";
  const dimension = (searchParams.get("dimension") as AdvancedReportDimension | null) ?? "account";
  const page = toPositiveInteger(searchParams.get("page"), 1);
  const pageSize = Math.min(toPositiveInteger(searchParams.get("page_size"), 20), 100);
  const createdBy = searchParams.get("created_by") || undefined;
  const status = searchParams.get("status") || undefined;
  const posTerminalCode = searchParams.get("pos_terminal_code") || undefined;

  return {
    fromDate: fromDate <= toDate ? fromDate : toDate,
    toDate: toDate >= fromDate ? toDate : fromDate,
    compareFromDate:
      compareFromDate && compareToDate ? (compareFromDate <= compareToDate ? compareFromDate : compareToDate) : undefined,
    compareToDate:
      compareFromDate && compareToDate ? (compareToDate >= compareFromDate ? compareToDate : compareFromDate) : undefined,
    groupBy: ["day", "week", "month"].includes(groupBy) ? groupBy : "day",
    dimension: ["account", "entry_type", "expense_category", "supplier", "maintenance_status"].includes(dimension)
      ? dimension
      : "account",
    createdBy,
    status,
    posTerminalCode,
    page,
    pageSize
  };
}

async function loadSupplierNameMap(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  ids: Array<string | null | undefined>
) {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
  const supplierMap = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return supplierMap;
  }

  const { data, error } = await supabase.from("suppliers").select("id, name").in("id", uniqueIds).returns<SupplierNameRow[]>();
  if (error) {
    throw error;
  }

  for (const supplier of data ?? []) {
    supplierMap.set(supplier.id, supplier.name);
  }

  return supplierMap;
}

async function loadExpenseCategoryNameMap(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  ids: Array<string | null | undefined>
) {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
  const categoryMap = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return categoryMap;
  }

  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name")
    .in("id", uniqueIds)
    .returns<ExpenseCategoryNameRow[]>();

  if (error) {
    throw error;
  }

  for (const category of data ?? []) {
    categoryMap.set(category.id, category.name);
  }

  return categoryMap;
}

type PeriodMetrics = {
  useSnapshotTotals: boolean;
  snapshots: SnapshotMetricRow[];
  invoices: InvoiceMetricRow[];
  invoiceItems: InvoiceItemCostRow[];
  returns: ReturnMetricRow[];
  topups: TopupRow[];
  maintenanceJobs: MaintenanceJobRow[];
  ledgerEntries: LedgerEntryRow[];
  expenses: ExpenseBreakdownRow[];
  purchases: PurchaseOrderRow[];
  snapshotCount: number;
};

async function loadPeriodMetrics(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: Pick<SalesHistoryFilters, "fromDate" | "toDate" | "createdBy" | "status" | "posTerminalCode">,
  dimension: AdvancedReportDimension
): Promise<PeriodMetrics> {
  const useSnapshotTotals = !filters.createdBy && !filters.status && !filters.posTerminalCode;
  const needsExpenseRows = dimension === "expense_category" || !useSnapshotTotals;
  const needsPurchaseRows = dimension === "supplier" || !useSnapshotTotals;
  const needsLedgerRows = dimension === "account" || dimension === "entry_type";

  let snapshotsQuery = useSnapshotTotals
    ? supabase
        .from("daily_snapshots")
        .select("snapshot_date, total_sales, total_returns, total_cost, net_sales, net_profit, invoice_count, total_expenses, total_purchases")
        .gte("snapshot_date", filters.fromDate)
        .lte("snapshot_date", filters.toDate)
    : null;

  let invoicesQuery = useSnapshotTotals
    ? null
    : supabase
        .from("invoices")
        .select("id, invoice_date, total_amount, status, created_by, pos_terminal_code")
        .in("status", ["active", "partially_returned"])
        .gte("invoice_date", filters.fromDate)
        .lte("invoice_date", filters.toDate);

  let returnsQuery = useSnapshotTotals
    ? null
    : supabase
        .from("returns")
        .select("return_date, total_amount")
        .gte("return_date", filters.fromDate)
        .lte("return_date", filters.toDate);

  let topupsQuery = supabase
    .from("topups")
    .select("topup_date, amount, profit_amount, supplier_id")
    .gte("topup_date", filters.fromDate)
    .lte("topup_date", filters.toDate);

  let maintenanceQuery = supabase
    .from("maintenance_jobs")
    .select("job_date, status, final_amount, created_by")
    .gte("job_date", filters.fromDate)
    .lte("job_date", filters.toDate);

  let ledgerQuery = needsLedgerRows
    ? supabase
        .from("ledger_entries")
        .select("account_id, entry_type, adjustment_direction, amount")
        .gte("entry_date", filters.fromDate)
        .lte("entry_date", filters.toDate)
    : null;

  let expensesQuery = needsExpenseRows
    ? supabase
        .from("expenses")
        .select("amount, category_id, expense_date, created_by")
        .gte("expense_date", filters.fromDate)
        .lte("expense_date", filters.toDate)
    : null;

  let purchasesQuery = needsPurchaseRows
    ? supabase
        .from("purchase_orders")
        .select("purchase_date, total_amount, supplier_id, is_paid")
        .eq("is_paid", true)
        .gte("purchase_date", filters.fromDate)
        .lte("purchase_date", filters.toDate)
    : null;

  let snapshotCountQuery = supabase
    .from("daily_snapshots")
    .select("id", { count: "exact", head: true })
    .gte("snapshot_date", filters.fromDate)
    .lte("snapshot_date", filters.toDate);

  if (filters.createdBy) {
    if (invoicesQuery) {
      invoicesQuery = invoicesQuery.eq("created_by", filters.createdBy);
    }
    if (returnsQuery) {
      returnsQuery = returnsQuery.eq("created_by", filters.createdBy);
    }
    topupsQuery = topupsQuery.eq("created_by", filters.createdBy);
    maintenanceQuery = maintenanceQuery.eq("created_by", filters.createdBy);
    if (ledgerQuery) {
      ledgerQuery = ledgerQuery.eq("created_by", filters.createdBy);
    }
    if (expensesQuery) {
      expensesQuery = expensesQuery.eq("created_by", filters.createdBy);
    }
    if (purchasesQuery) {
      purchasesQuery = purchasesQuery.eq("created_by", filters.createdBy);
    }
  }

  if (invoicesQuery && filters.status) {
    invoicesQuery = invoicesQuery.eq("status", filters.status);
  }

  if (invoicesQuery && filters.posTerminalCode) {
    invoicesQuery = invoicesQuery.eq("pos_terminal_code", filters.posTerminalCode);
  }

  const [snapshotsResult, invoicesResult, returnsResult, expensesResult, purchasesResult, topupsResult, maintenanceResult, ledgerResult, snapshotCountResult] =
    await Promise.all([
      snapshotsQuery
        ? snapshotsQuery.returns<SnapshotMetricRow[]>()
        : Promise.resolve({ data: [] as SnapshotMetricRow[], error: null }),
      invoicesQuery
        ? invoicesQuery.returns<InvoiceMetricRow[]>()
        : Promise.resolve({ data: [] as InvoiceMetricRow[], error: null }),
      returnsQuery
        ? returnsQuery.returns<ReturnMetricRow[]>()
        : Promise.resolve({ data: [] as ReturnMetricRow[], error: null }),
      expensesQuery ? expensesQuery.returns<ExpenseBreakdownRow[]>() : Promise.resolve({ data: [], error: null }),
      purchasesQuery ? purchasesQuery.returns<PurchaseOrderRow[]>() : Promise.resolve({ data: [], error: null }),
      topupsQuery.returns<TopupRow[]>(),
      maintenanceQuery.returns<MaintenanceJobRow[]>(),
      ledgerQuery ? ledgerQuery.returns<LedgerEntryRow[]>() : Promise.resolve({ data: [] as LedgerEntryRow[], error: null }),
      snapshotCountQuery
    ]);

  if (snapshotsResult.error) {
    throw snapshotsResult.error;
  }
  if (invoicesResult.error) {
    throw invoicesResult.error;
  }
  if (returnsResult.error) {
    throw returnsResult.error;
  }
  if (expensesResult.error) {
    throw expensesResult.error;
  }
  if (purchasesResult.error) {
    throw purchasesResult.error;
  }
  if (topupsResult.error) {
    throw topupsResult.error;
  }
  if (maintenanceResult.error) {
    throw maintenanceResult.error;
  }
  if (ledgerResult.error) {
    throw ledgerResult.error;
  }
  if (snapshotCountResult.error) {
    throw snapshotCountResult.error;
  }

  const invoices = invoicesResult.data ?? [];
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const invoiceItemsResult =
    useSnapshotTotals || invoiceIds.length === 0
      ? { data: [] as InvoiceItemCostRow[], error: null }
      : await supabase
          .from("invoice_items")
          .select("invoice_id, quantity, cost_price_at_time")
          .in("invoice_id", invoiceIds)
          .returns<InvoiceItemCostRow[]>();

  if (invoiceItemsResult.error) {
    throw invoiceItemsResult.error;
  }

  return {
    useSnapshotTotals,
    snapshots: snapshotsResult.data ?? [],
    invoices,
    invoiceItems: invoiceItemsResult.data ?? [],
    returns: returnsResult.data ?? [],
    expenses: expensesResult.data ?? [],
    purchases: purchasesResult.data ?? [],
    topups: topupsResult.data ?? [],
    maintenanceJobs: maintenanceResult.data ?? [],
    ledgerEntries: ledgerResult.data ?? [],
    snapshotCount: snapshotCountResult.count ?? 0
  };
}

function buildPeriodSummary(metrics: PeriodMetrics): AdvancedReportPeriodSummary {
  const topupProfit = metrics.topups.reduce((sum, entry) => sum + entry.profit_amount, 0);
  const maintenanceRevenue = metrics.maintenanceJobs.reduce((sum, job) => {
    if (job.status !== "delivered") {
      return sum;
    }

    return sum + (job.final_amount ?? 0);
  }, 0);

  if (metrics.useSnapshotTotals) {
    const salesTotal = metrics.snapshots.reduce((sum, snapshot) => sum + snapshot.total_sales, 0);
    const returnsTotal = metrics.snapshots.reduce((sum, snapshot) => sum + snapshot.total_returns, 0);
    const expenseTotal = metrics.snapshots.reduce((sum, snapshot) => sum + snapshot.total_expenses, 0);
    const purchaseTotal = metrics.snapshots.reduce((sum, snapshot) => sum + snapshot.total_purchases, 0);
    const netSales = metrics.snapshots.reduce((sum, snapshot) => sum + snapshot.net_sales, 0);
    const snapshotNetProfit = metrics.snapshots.reduce((sum, snapshot) => sum + snapshot.net_profit, 0);

    return {
      sales_total: roundMetric(salesTotal),
      total_returns: roundMetric(returnsTotal),
      net_sales: roundMetric(netSales),
      expense_total: roundMetric(expenseTotal),
      purchase_total: roundMetric(purchaseTotal),
      topup_profit: roundMetric(topupProfit),
      maintenance_revenue: roundMetric(maintenanceRevenue),
      net_profit: roundMetric(snapshotNetProfit + topupProfit + maintenanceRevenue),
      invoice_count: metrics.snapshots.reduce((sum, snapshot) => sum + snapshot.invoice_count, 0),
      snapshot_count: metrics.snapshotCount
    };
  }

  const invoiceCostById = new Map<string, number>();

  for (const item of metrics.invoiceItems) {
    invoiceCostById.set(
      item.invoice_id,
      (invoiceCostById.get(item.invoice_id) ?? 0) + item.quantity * item.cost_price_at_time
    );
  }

  const salesTotal = metrics.invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
  const returnsTotal = metrics.returns.reduce((sum, entry) => sum + entry.total_amount, 0);
  const salesCost = metrics.invoices.reduce((sum, invoice) => sum + (invoiceCostById.get(invoice.id) ?? 0), 0);
  const expenseTotal = metrics.expenses.reduce((sum, entry) => sum + entry.amount, 0);
  const purchaseTotal = metrics.purchases.reduce((sum, entry) => sum + entry.total_amount, 0);
  const netSales = salesTotal - returnsTotal;
  const netProfit = (netSales - salesCost) - expenseTotal + topupProfit + maintenanceRevenue;

  return {
    sales_total: roundMetric(salesTotal),
    total_returns: roundMetric(returnsTotal),
    net_sales: roundMetric(netSales),
    expense_total: roundMetric(expenseTotal),
    purchase_total: roundMetric(purchaseTotal),
    topup_profit: roundMetric(topupProfit),
    maintenance_revenue: roundMetric(maintenanceRevenue),
    net_profit: roundMetric(netProfit),
    invoice_count: metrics.invoices.length,
    snapshot_count: metrics.snapshotCount
  };
}

function buildTrend(metrics: PeriodMetrics, groupBy: AdvancedReportGroupBy): AdvancedTrendPoint[] {
  const buckets = new Map<
    string,
    { sales_total: number; total_returns: number; sales_cost: number; expense_total: number; topup_profit: number; maintenance_revenue: number }
  >();

  const getBucket = (key: string) => {
    if (!buckets.has(key)) {
      buckets.set(key, {
        sales_total: 0,
        total_returns: 0,
        sales_cost: 0,
        expense_total: 0,
        topup_profit: 0,
        maintenance_revenue: 0
      });
    }

    return buckets.get(key)!;
  };

  if (metrics.useSnapshotTotals) {
    for (const snapshot of metrics.snapshots) {
      const bucket = getBucket(bucketDate(snapshot.snapshot_date, groupBy));
      bucket.sales_total += snapshot.total_sales;
      bucket.total_returns += snapshot.total_returns;
      bucket.sales_cost += snapshot.total_cost;
      bucket.expense_total += snapshot.total_expenses;
    }
  } else {
    const invoiceCostById = new Map<string, number>();

    for (const item of metrics.invoiceItems) {
      invoiceCostById.set(
        item.invoice_id,
        (invoiceCostById.get(item.invoice_id) ?? 0) + item.quantity * item.cost_price_at_time
      );
    }

    for (const invoice of metrics.invoices) {
      const bucket = getBucket(bucketDate(invoice.invoice_date, groupBy));
      bucket.sales_total += invoice.total_amount;
      bucket.sales_cost += invoiceCostById.get(invoice.id) ?? 0;
    }

    for (const entry of metrics.returns) {
      const bucket = getBucket(bucketDate(entry.return_date, groupBy));
      bucket.total_returns += entry.total_amount;
    }

    for (const entry of metrics.expenses) {
      if (!entry.expense_date) {
        continue;
      }

      const bucket = getBucket(bucketDate(entry.expense_date, groupBy));
      bucket.expense_total += entry.amount;
    }
  }

  for (const entry of metrics.topups) {
    if (!entry.topup_date) {
      continue;
    }

    const bucket = getBucket(bucketDate(entry.topup_date, groupBy));
    bucket.topup_profit += entry.profit_amount;
  }

  for (const job of metrics.maintenanceJobs) {
    if (job.status !== "delivered") {
      continue;
    }

    const bucket = getBucket(bucketDate(job.job_date, groupBy));
    bucket.maintenance_revenue += job.final_amount ?? 0;
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bucket, values]) => ({
      bucket,
      sales_total: roundMetric(values.sales_total),
      expense_total: roundMetric(values.expense_total),
      net_profit: roundMetric(
        (values.sales_total - values.total_returns - values.sales_cost) -
          values.expense_total +
          values.topup_profit +
          values.maintenance_revenue
      )
    }));
}

async function buildBreakdown(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  metrics: PeriodMetrics,
  dimension: AdvancedReportDimension
): Promise<AdvancedBreakdownEntry[]> {
  if (dimension === "expense_category") {
    const categoryMap = await loadExpenseCategoryNameMap(
      supabase,
      metrics.expenses.map((entry) => entry.category_id)
    );
    const breakdown = new Map<string, AdvancedBreakdownEntry>();

    for (const entry of metrics.expenses) {
      const label = categoryMap.get(entry.category_id) ?? "فئة غير معروفة";
      const current = breakdown.get(label) ?? { label, amount: 0, secondary_amount: 0, item_count: 0 };
      current.amount += entry.amount;
      current.item_count += 1;
      breakdown.set(label, current);
    }

    return [...breakdown.values()].sort((left, right) => right.amount - left.amount);
  }

  if (dimension === "supplier") {
    const supplierMap = await loadSupplierNameMap(
      supabase,
      [...metrics.purchases.map((entry) => entry.supplier_id), ...metrics.topups.map((entry) => entry.supplier_id)]
    );
    const breakdown = new Map<string, AdvancedBreakdownEntry>();

    for (const purchase of metrics.purchases) {
      const label = supplierMap.get(purchase.supplier_id ?? "") ?? "بدون مورد";
      const current = breakdown.get(label) ?? { label, amount: 0, secondary_amount: 0, item_count: 0 };
      current.amount += purchase.total_amount;
      current.item_count += 1;
      breakdown.set(label, current);
    }

    for (const topup of metrics.topups) {
      const label = supplierMap.get(topup.supplier_id ?? "") ?? "بدون مزود";
      const current = breakdown.get(label) ?? { label, amount: 0, secondary_amount: 0, item_count: 0 };
      current.amount += topup.amount;
      current.secondary_amount += topup.profit_amount;
      current.item_count += 1;
      breakdown.set(label, current);
    }

    return [...breakdown.values()].sort((left, right) => right.amount - left.amount);
  }

  if (dimension === "maintenance_status") {
    const breakdown = new Map<string, AdvancedBreakdownEntry>();

    for (const job of metrics.maintenanceJobs) {
      const label = job.status;
      const current = breakdown.get(label) ?? { label, amount: 0, secondary_amount: 0, item_count: 0 };
      current.amount += job.final_amount ?? 0;
      current.item_count += 1;
      breakdown.set(label, current);
    }

    return [...breakdown.values()].sort((left, right) => right.item_count - left.item_count);
  }

  if (dimension === "entry_type") {
    const breakdown = new Map<string, AdvancedBreakdownEntry>();

    for (const entry of metrics.ledgerEntries) {
      const label = entry.entry_type;
      const current = breakdown.get(label) ?? { label, amount: 0, secondary_amount: 0, item_count: 0 };
      current.amount += entry.amount;
      current.item_count += 1;
      breakdown.set(label, current);
    }

    return [...breakdown.values()].sort((left, right) => right.amount - left.amount);
  }

  const accountIds = [...new Set(metrics.ledgerEntries.map((entry) => entry.account_id))];

  if (accountIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("accounts")
    .select("id, name")
    .in("id", accountIds)
    .returns<Array<{ id: string; name: string }>>();

  if (error) {
    throw error;
  }

  const accountMap = new Map((data ?? []).map((account) => [account.id, account.name]));
  const breakdown = new Map<string, AdvancedBreakdownEntry>();

  for (const entry of metrics.ledgerEntries) {
    const label = accountMap.get(entry.account_id) ?? "حساب غير معروف";
    const current = breakdown.get(label) ?? { label, amount: 0, secondary_amount: 0, item_count: 0 };
    current.amount += entry.amount;

    if (entry.entry_type === "income" || entry.adjustment_direction === "increase") {
      current.secondary_amount += entry.amount;
    } else if (entry.entry_type === "expense" || entry.adjustment_direction === "decrease") {
      current.secondary_amount -= entry.amount;
    }

    current.item_count += 1;
    breakdown.set(label, current);
  }

  return [...breakdown.values()].sort((left, right) => right.amount - left.amount);
}

export async function getAdvancedReportData(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: SalesHistoryFilters
): Promise<AdvancedReport> {
  const [currentMetrics, compareMetrics] = await Promise.all([
    loadPeriodMetrics(supabase, filters, filters.dimension ?? "account"),
    filters.compareFromDate && filters.compareToDate
      ? loadPeriodMetrics(
          supabase,
          {
            fromDate: filters.compareFromDate,
            toDate: filters.compareToDate,
            createdBy: filters.createdBy,
            status: filters.status,
            posTerminalCode: filters.posTerminalCode
          },
          filters.dimension ?? "account"
        )
      : Promise.resolve(null)
  ]);

  const currentPeriod = buildPeriodSummary(currentMetrics);
  const comparePeriod = compareMetrics ? buildPeriodSummary(compareMetrics) : null;
  const trend = buildTrend(currentMetrics, filters.groupBy ?? "day");
  const breakdown = await buildBreakdown(supabase, currentMetrics, filters.dimension ?? "account");

  return {
    currentPeriod,
    comparePeriod,
    trend,
    breakdown,
    delta: {
      sales_total: roundMetric(currentPeriod.sales_total - (comparePeriod?.sales_total ?? 0)),
      net_profit: roundMetric(currentPeriod.net_profit - (comparePeriod?.net_profit ?? 0)),
      expense_total: roundMetric(currentPeriod.expense_total - (comparePeriod?.expense_total ?? 0)),
      invoice_count: currentPeriod.invoice_count - (comparePeriod?.invoice_count ?? 0)
    }
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
  let entriesQuery = supabase
    .from("returns")
    .select("id, return_number, return_date, return_type, original_invoice_id, total_amount, reason, created_by")
    .gte("return_date", filters.fromDate)
    .lte("return_date", filters.toDate)
    .order("return_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  let reasonsQuery = supabase
    .from("returns")
    .select("reason, total_amount")
    .gte("return_date", filters.fromDate)
    .lte("return_date", filters.toDate);

  if (filters.createdBy) {
    entriesQuery = entriesQuery.eq("created_by", filters.createdBy);
    reasonsQuery = reasonsQuery.eq("created_by", filters.createdBy);
  }

  const [entriesResult, reasonsResult] = await Promise.all([
    entriesQuery.returns<ReturnRow[]>(),
    reasonsQuery.returns<ReturnReasonRow[]>()
  ]);

  if (entriesResult.error) {
    throw entriesResult.error;
  }
  if (reasonsResult.error) {
    throw reasonsResult.error;
  }

  const listRows = entriesResult.data ?? [];
  const reasonRows = reasonsResult.data ?? [];
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
  for (const row of reasonRows) {
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
    total_returns: reasonRows.reduce((sum, row) => sum + row.total_amount, 0),
    return_count: reasonRows.length,
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
  let summaryQuery = supabase
    .from("ledger_entries")
    .select("account_id, entry_type, adjustment_direction, amount")
    .gte("entry_date", filters.fromDate)
    .lte("entry_date", filters.toDate);

  let entriesQuery = supabase
    .from("ledger_entries")
    .select(
      "id, entry_date, account_id, entry_type, adjustment_direction, reference_type, reference_id, description, amount, created_by"
    )
    .gte("entry_date", filters.fromDate)
    .lte("entry_date", filters.toDate)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(40);

  if (filters.createdBy) {
    summaryQuery = summaryQuery.eq("created_by", filters.createdBy);
    entriesQuery = entriesQuery.eq("created_by", filters.createdBy);
  }

  const [summaryResult, entriesResult, accountsResult] = await Promise.all([
    summaryQuery.returns<LedgerEntryRow[]>(),
    entriesQuery.returns<LedgerEntryRow[]>(),
    supabase
      .from("accounts")
      .select("id, name, current_balance, type, module_scope, is_active, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .returns<AccountSummaryRow[]>()
  ]);

  if (summaryResult.error) {
    throw summaryResult.error;
  }

  if (entriesResult.error) {
    throw entriesResult.error;
  }

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  const rows = summaryResult.data ?? [];
  const listRows = entriesResult.data ?? [];
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
    topupsQuery = topupsQuery.eq("created_by", filters.createdBy);
    maintenanceQuery = maintenanceQuery.eq("created_by", filters.createdBy);
  }

  const [snapshotsResult, topupsResult, maintenanceResult] = await Promise.all([
    supabase
      .from("daily_snapshots")
      .select("id, snapshot_date, net_sales, net_profit, invoice_count, total_expenses, total_returns, total_purchases, created_at")
      .gte("snapshot_date", filters.fromDate)
      .lte("snapshot_date", filters.toDate),
    topupsQuery.returns<TopupRow[]>(),
    maintenanceQuery.returns<Array<{ status: string; final_amount: number | null }>>()
  ]);

  if (snapshotsResult.error) {
    throw snapshotsResult.error;
  }

  if (topupsResult.error) {
    throw topupsResult.error;
  }

  if (maintenanceResult.error) {
    throw maintenanceResult.error;
  }

  const snapshots = (snapshotsResult.data ?? []) as Array<
    SnapshotSummaryRow & { total_expenses: number; total_returns: number; total_purchases: number }
  >;
  const topups = topupsResult.data ?? [];
  const maintenanceRows = maintenanceResult.data ?? [];

  return {
    snapshot_count: snapshots.length,
    snapshot_net_sales: snapshots.reduce((sum, snapshot) => sum + snapshot.net_sales, 0),
    snapshot_net_profit: snapshots.reduce((sum, snapshot) => sum + snapshot.net_profit, 0),
    expense_total: snapshots.reduce((sum, snapshot) => sum + snapshot.total_expenses, 0),
    return_total: snapshots.reduce((sum, snapshot) => sum + snapshot.total_returns, 0),
    purchase_total: snapshots.reduce((sum, snapshot) => sum + snapshot.total_purchases, 0),
    topup_amount: topups.reduce((sum, topup) => sum + topup.amount, 0),
    topup_profit: topups.reduce((sum, topup) => sum + topup.profit_amount, 0),
    maintenance_delivered_count: maintenanceRows.filter((row) => row.status === "delivered").length,
    maintenance_revenue: maintenanceRows.reduce((sum, row) => {
      if (row.status !== "delivered") {
        return sum;
      }

      return sum + (row.final_amount ?? 0);
    }, 0)
  };
}

async function getMaintenanceReport(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  filters: SalesHistoryFilters
): Promise<MaintenanceReport> {
  let summaryQuery = supabase
    .from("maintenance_jobs")
    .select("status, final_amount")
    .gte("job_date", filters.fromDate)
    .lte("job_date", filters.toDate);

  let entriesQuery = supabase
    .from("maintenance_jobs")
    .select("id, job_number, job_date, customer_name, device_type, status, final_amount, created_by")
    .gte("job_date", filters.fromDate)
    .lte("job_date", filters.toDate)
    .order("job_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (filters.createdBy) {
    summaryQuery = summaryQuery.eq("created_by", filters.createdBy);
    entriesQuery = entriesQuery.eq("created_by", filters.createdBy);
  }

  const [summaryResult, entriesResult] = await Promise.all([
    summaryQuery.returns<Array<Pick<MaintenanceJobRow, "status" | "final_amount">>>(),
    entriesQuery.returns<MaintenanceJobRow[]>()
  ]);

  if (summaryResult.error) {
    throw summaryResult.error;
  }

  if (entriesResult.error) {
    throw entriesResult.error;
  }

  const rows = summaryResult.data ?? [];
  const listRows = entriesResult.data ?? [];
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
  const [
    salesHistory,
    snapshotsResult,
    debtsResult,
    accountsResult,
    inventoryResult,
    profitReport,
    returnsReport,
    accountMovementReport,
    maintenanceReport,
    advancedReport
  ] =
    await Promise.all([
      getSalesHistory(supabase, filters, viewer),
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
      getMaintenanceReport(supabase, filters),
      getAdvancedReportData(supabase, filters)
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
    snapshots: snapshotsResult.data ?? [],
    advancedReport
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
