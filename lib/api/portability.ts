import * as XLSX from "xlsx";
import { getApiErrorMeta } from "@/lib/api/common";
import {
  getReportBaseline,
  parseSalesHistoryFilters,
  type ReportBaseline
} from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CreateExportPackageInput,
  ExportPackageFilters,
  ExportPackageScope,
  ExportPackageType,
  ImportSourceFormat
} from "@/lib/validations/portability";

const EXPORT_PACKAGE_ERROR_MAP = {
  ERR_EXPORT_PACKAGE_EXPIRED: {
    status: 410,
    message: "الحزمة غير متاحة للتنزيل لأنها منتهية أو موقوفة."
  },
  ERR_EXPORT_TOO_LARGE: {
    status: 400,
    message: "الحزمة المطلوبة تتجاوز الحد المسموح به. قلّص النطاق أو الفلاتر أولًا."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات التصدير غير صالحة."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليست لديك صلاحية لإدارة حزم التصدير."
  }
} as const;

const IMPORT_PRODUCTS_ERROR_MAP = {
  ERR_IMPORT_DRY_RUN_REQUIRED: {
    status: 409,
    message: "يجب تنفيذ dry-run صالح قبل commit."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات الاستيراد غير صالحة."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليست لديك صلاحية لاستيراد المنتجات."
  }
} as const;

const RESTORE_DRILL_ERROR_MAP = {
  ERR_RESTORE_ENV_FORBIDDEN: {
    status: 403,
    message: "الاستعادة مسموحة فقط على isolated-drill."
  },
  ERR_IDEMPOTENCY: {
    status: 409,
    message: "تم تشغيل restore drill بنفس المفتاح سابقًا."
  },
  ERR_EXPORT_PACKAGE_EXPIRED: {
    status: 410,
    message: "حزمة النسخ المطلوبة غير متاحة."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات restore drill غير صالحة."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليست لديك صلاحية لتشغيل restore drill."
  }
} as const;

type ExportPackageErrorCode = keyof typeof EXPORT_PACKAGE_ERROR_MAP;
type ImportProductsErrorCode = keyof typeof IMPORT_PRODUCTS_ERROR_MAP;
type RestoreDrillErrorCode = keyof typeof RESTORE_DRILL_ERROR_MAP;
type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

type ProductExportRow = {
  id: string;
  name: string;
  category: string;
  sale_price: number;
  cost_price: number | null;
  avg_cost_price: number | null;
  stock_quantity: number;
  min_stock_level: number;
  track_stock: boolean;
  is_quick_add: boolean;
  is_active: boolean;
  created_at: string;
};

type CustomerExportRow = {
  id: string;
  name: string;
  phone: string;
  current_balance: number;
  credit_limit: number;
  due_date_days: number;
  is_active: boolean;
  created_at: string;
};

type AccountBackupRow = {
  id: string;
  name: string;
  type: string;
  module_scope: string;
  opening_balance: number;
  current_balance: number;
};

type LedgerBackupRow = {
  id: string;
  account_id: string;
  entry_type: string;
  adjustment_direction: string | null;
  amount: number;
  entry_date: string;
  reference_type: string | null;
  reference_id: string | null;
};

type ExpenseCategoryBackupRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type SnapshotBackupRow = {
  id: string;
  snapshot_date: string;
  net_sales: number;
  net_profit: number;
  invoice_count: number;
  total_expenses: number;
};

type ProductBackupRow = {
  id: string;
  name: string;
  category: string;
  sale_price: number;
  cost_price: number | null;
  avg_cost_price: number | null;
  stock_quantity: number;
  min_stock_level: number;
  track_stock: boolean;
  is_quick_add: boolean;
  is_active: boolean;
};

type ReportMetricRow = {
  section: string;
  metric: string;
  value: string | number;
};

export type ExportPackageStatus = "ready" | "revoked" | "expired";
export type ImportJobStatus = "dry_run_ready" | "dry_run_failed" | "committed";
export type RestoreDrillStatus = "started" | "completed" | "failed";

export type ExportPackageRecord = {
  id: string;
  package_type: ExportPackageType;
  scope: ExportPackageScope;
  status: ExportPackageStatus;
  filters: ExportPackageFilters;
  file_name: string;
  row_count: number;
  content_json: unknown | null;
  content_text: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  created_by: string;
};

export type ImportJobRecord = {
  id: string;
  file_name: string;
  source_format: ImportSourceFormat;
  status: ImportJobStatus;
  rows_total: number;
  rows_valid: number;
  rows_invalid: number;
  rows_committed: number;
  validation_errors: ProductImportIssue[];
  source_rows: PortableProductRow[];
  committed_at: string | null;
  created_at: string;
  created_by: string;
};

export type RestoreDrillRecord = {
  id: string;
  export_package_id: string;
  target_env: "isolated-drill";
  status: RestoreDrillStatus;
  drift_count: number | null;
  rto_seconds: number | null;
  result_summary: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
  created_by: string;
  idempotency_key: string;
};

export type ProductImportIssue = {
  row_number: number;
  field: string;
  message: string;
};

export type PortableProductRow = {
  name: string;
  category: string;
  sale_price: number;
  cost_price: number;
  avg_cost_price: number;
  stock_quantity: number;
  min_stock_level: number;
  track_stock: boolean;
  is_quick_add: boolean;
  is_active: boolean;
};

type ProductImportAnalysis = {
  rowsTotal: number;
  rowsValid: number;
  rowsInvalid: number;
  validRows: PortableProductRow[];
  issues: ProductImportIssue[];
};

export type BackupPackageContent = {
  kind: "backup_bundle";
  generated_at: string;
  accounts: AccountBackupRow[];
  ledger_entries: LedgerBackupRow[];
  products: ProductBackupRow[];
  expense_categories: ExpenseCategoryBackupRow[];
  snapshots: SnapshotBackupRow[];
};

export type RestoreDriftEntry = {
  account_id: string;
  account_name: string;
  current_balance: number;
  calculated_balance: number;
  drift: number;
};

export type CreateExportPackageResult = {
  package_id: string;
  download_url: string;
  expires_at: string;
};

export type RevokeExportPackageResult = {
  package_id: string;
  status: "revoked";
  revoked_at: string;
};

export type RunImportDryRunResult = {
  job_id: string;
  mode: "dry_run";
  rows_total: number;
  rows_valid: number;
  rows_invalid: number;
  validation_errors: ProductImportIssue[];
};

export type CommitProductImportResult = {
  job_id: string;
  mode: "commit";
  rows_total: number;
  rows_valid: number;
  rows_invalid: number;
  rows_committed: number;
};

export type RunRestoreDrillResult = {
  drill_id: string;
  status: "completed";
  drift_count: number;
  rto_seconds: number;
};

export function getExportPackageErrorMeta(code: string) {
  if (code in EXPORT_PACKAGE_ERROR_MAP) {
    return EXPORT_PACKAGE_ERROR_MAP[code as ExportPackageErrorCode];
  }

  return getApiErrorMeta(code);
}

export function getImportProductsErrorMeta(code: string) {
  if (code in IMPORT_PRODUCTS_ERROR_MAP) {
    return IMPORT_PRODUCTS_ERROR_MAP[code as ImportProductsErrorCode];
  }

  return getApiErrorMeta(code);
}

export function getRestoreDrillErrorMeta(code: string) {
  if (code in RESTORE_DRILL_ERROR_MAP) {
    return RESTORE_DRILL_ERROR_MAP[code as RestoreDrillErrorCode];
  }

  return getApiErrorMeta(code);
}

export function maskPhoneNumber(phone: string | null) {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length <= 4) {
    return `****${digits}`;
  }

  return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

function roundMetric(value: number) {
  return Number(value.toFixed(3));
}

function buildSearchParams(filters: ExportPackageFilters) {
  const params = new URLSearchParams();

  if (filters.from_date) {
    params.set("from_date", filters.from_date);
  }

  if (filters.to_date) {
    params.set("to_date", filters.to_date);
  }

  if (filters.compare_from_date) {
    params.set("compare_from_date", filters.compare_from_date);
  }

  if (filters.compare_to_date) {
    params.set("compare_to_date", filters.compare_to_date);
  }

  if (filters.created_by) {
    params.set("created_by", filters.created_by);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.pos_terminal_code) {
    params.set("pos_terminal_code", filters.pos_terminal_code);
  }

  return params;
}

export function buildExportPackageDownloadUrl(packageId: string) {
  return `/api/export/packages/${packageId}`;
}

export function buildExportPackageFilename(scope: ExportPackageScope, packageType: ExportPackageType) {
  const stamp = new Date().toISOString().slice(0, 10);
  const extension = packageType === "json" ? "json" : "csv";
  return `aya-${scope}-package-${stamp}.${extension}`;
}

function toCsvText(rows: Array<Record<string, unknown>>) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\n" });
}

function serializeReportRows(reportBaseline: ReportBaseline) {
  const rows: ReportMetricRow[] = [
    { section: "sales_summary", metric: "total_sales", value: reportBaseline.salesSummary.total_sales },
    { section: "sales_summary", metric: "invoice_count", value: reportBaseline.salesSummary.invoice_count },
    { section: "profit_report", metric: "expense_total", value: reportBaseline.profitReport.expense_total },
    { section: "profit_report", metric: "purchase_total", value: reportBaseline.profitReport.purchase_total },
    { section: "profit_report", metric: "topup_profit", value: reportBaseline.profitReport.topup_profit },
    { section: "profit_report", metric: "maintenance_revenue", value: reportBaseline.profitReport.maintenance_revenue },
    { section: "advanced_report", metric: "net_profit", value: reportBaseline.advancedReport.currentPeriod.net_profit },
    { section: "advanced_report", metric: "sales_total", value: reportBaseline.advancedReport.currentPeriod.sales_total },
    { section: "returns_report", metric: "return_count", value: reportBaseline.returnsReport.return_count },
    { section: "inventory_report", metric: "low_stock_count", value: reportBaseline.inventoryReport.low_stock_count }
  ];

  return rows;
}

async function buildProductsExportContent(
  supabase: SupabaseAdminClient,
  filters: ExportPackageFilters
) {
  let query = supabase
    .from("products")
    .select(
      "id, name, category, sale_price, cost_price, avg_cost_price, stock_quantity, min_stock_level, track_stock, is_quick_add, is_active, created_at"
    )
    .order("name", { ascending: true });

  if (filters.active_only === true) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<ProductExportRow[]>();
  if (error) {
    throw error;
  }

  const rows = data ?? [];

  return {
    rowCount: rows.length,
    contentJson: {
      scope: "products",
      generated_at: new Date().toISOString(),
      items: rows
    },
    contentText: rows,
    mimeType: "application/json"
  };
}

async function buildCustomersExportContent(
  supabase: SupabaseAdminClient,
  filters: ExportPackageFilters
) {
  let query = supabase
    .from("debt_customers")
    .select("id, name, phone, current_balance, credit_limit, due_date_days, is_active, created_at")
    .order("name", { ascending: true });

  if (filters.active_only === true) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<CustomerExportRow[]>();
  if (error) {
    throw error;
  }

  const rows = (data ?? []).map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone_masked: maskPhoneNumber(customer.phone),
    current_balance: customer.current_balance,
    credit_limit: customer.credit_limit,
    due_date_days: customer.due_date_days,
    is_active: customer.is_active,
    created_at: customer.created_at
  }));

  return {
    rowCount: rows.length,
    contentJson: {
      scope: "customers",
      generated_at: new Date().toISOString(),
      items: rows
    },
    contentText: rows,
    mimeType: "application/json"
  };
}

async function buildReportsExportContent(
  supabase: SupabaseAdminClient,
  filters: ExportPackageFilters,
  createdBy: string
) {
  const reportFilters = parseSalesHistoryFilters(buildSearchParams(filters));
  const reportBaseline = await getReportBaseline(supabase, reportFilters, {
    role: "admin",
    userId: createdBy
  });

  const rows = serializeReportRows(reportBaseline);

  return {
    rowCount: rows.length,
    contentJson: {
      scope: "reports",
      generated_at: new Date().toISOString(),
      filters: reportFilters,
      rows
    },
    contentText: rows,
    mimeType: "application/json"
  };
}

async function buildBackupExportContent(supabase: SupabaseAdminClient) {
  const [accountsResult, ledgerResult, productsResult, categoriesResult, snapshotsResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, module_scope, opening_balance, current_balance")
      .order("display_order", { ascending: true })
      .returns<AccountBackupRow[]>(),
    supabase
      .from("ledger_entries")
      .select("id, account_id, entry_type, adjustment_direction, amount, entry_date, reference_type, reference_id")
      .order("entry_date", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<LedgerBackupRow[]>(),
    supabase
      .from("products")
      .select(
        "id, name, category, sale_price, cost_price, avg_cost_price, stock_quantity, min_stock_level, track_stock, is_quick_add, is_active"
      )
      .order("name", { ascending: true })
      .returns<ProductBackupRow[]>(),
    supabase
      .from("expense_categories")
      .select("id, name, type, description, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .returns<ExpenseCategoryBackupRow[]>(),
    supabase
      .from("daily_snapshots")
      .select("id, snapshot_date, net_sales, net_profit, invoice_count, total_expenses")
      .order("snapshot_date", { ascending: false })
      .limit(30)
      .returns<SnapshotBackupRow[]>()
  ]);

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  if (ledgerResult.error) {
    throw ledgerResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  if (snapshotsResult.error) {
    throw snapshotsResult.error;
  }

  const content: BackupPackageContent = {
    kind: "backup_bundle",
    generated_at: new Date().toISOString(),
    accounts: accountsResult.data ?? [],
    ledger_entries: ledgerResult.data ?? [],
    products: productsResult.data ?? [],
    expense_categories: categoriesResult.data ?? [],
    snapshots: snapshotsResult.data ?? []
  };

  return {
    rowCount:
      content.accounts.length +
      content.ledger_entries.length +
      content.products.length +
      content.expense_categories.length +
      content.snapshots.length,
    contentJson: content,
    contentText: content,
    mimeType: "application/json"
  };
}

export async function buildExportPackageArtifacts(
  supabase: SupabaseAdminClient,
  input: CreateExportPackageInput,
  createdBy: string
) {
  const base =
    input.scope === "products"
      ? await buildProductsExportContent(supabase, input.filters)
      : input.scope === "customers"
        ? await buildCustomersExportContent(supabase, input.filters)
        : input.scope === "reports"
          ? await buildReportsExportContent(supabase, input.filters, createdBy)
          : await buildBackupExportContent(supabase);

  const fileName = buildExportPackageFilename(input.scope, input.package_type);
  const serializedText =
    input.package_type === "json"
      ? JSON.stringify(base.contentJson, null, 2)
      : toCsvText(base.contentText as Array<Record<string, unknown>>);

  return {
    fileName,
    rowCount: base.rowCount,
    contentJson: input.package_type === "json" ? base.contentJson : null,
    contentText: serializedText,
    mimeType:
      input.package_type === "json"
        ? "application/json; charset=utf-8"
        : "text/csv; charset=utf-8"
  };
}

function readRowsFromWorkbookContent(format: ImportSourceFormat, content: string) {
  if (format === "json") {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as Array<Record<string, unknown>>;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "rows" in parsed &&
      Array.isArray((parsed as { rows?: unknown[] }).rows)
    ) {
      return (parsed as { rows: Array<Record<string, unknown>> }).rows;
    }

    throw new Error("ERR_API_VALIDATION_FAILED");
  }

  const workbook = XLSX.read(content, { type: "string" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: ""
  });
}

const PRODUCT_CATEGORY_VALUES = new Set([
  "device",
  "accessory",
  "sim",
  "service_repair",
  "service_general"
]);

function toStringCell(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function toBooleanCell(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function toNumberCell(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

export async function analyzeProductImportSource(
  supabase: SupabaseAdminClient,
  sourceFormat: ImportSourceFormat,
  sourceContent: string
): Promise<ProductImportAnalysis> {
  const rawRows = readRowsFromWorkbookContent(sourceFormat, sourceContent);
  const issues: ProductImportIssue[] = [];
  const validRows: PortableProductRow[] = [];

  const { data: existingProducts, error: existingProductsError } = await supabase
    .from("products")
    .select("name")
    .returns<Array<{ name: string }>>();

  if (existingProductsError) {
    throw existingProductsError;
  }

  const existingNames = new Set((existingProducts ?? []).map((product) => product.name.trim().toLowerCase()));
  const batchNames = new Set<string>();

  rawRows.forEach((row, index) => {
    const rowNumber = sourceFormat === "csv" ? index + 2 : index + 1;
    const name = toStringCell(row.name);
    const category = toStringCell(row.category).toLowerCase();
    const salePrice = toNumberCell(row.sale_price);
    const costPrice = toNumberCell(row.cost_price);
    const avgCostPrice = Number.isFinite(toNumberCell(row.avg_cost_price))
      ? toNumberCell(row.avg_cost_price)
      : costPrice;
    const stockQuantity = toNumberCell(row.stock_quantity);
    const minStockLevel = Number.isFinite(toNumberCell(row.min_stock_level))
      ? toNumberCell(row.min_stock_level)
      : 0;

    if (!name) {
      issues.push({ row_number: rowNumber, field: "name", message: "اسم المنتج مطلوب." });
    }

    if (!category || !PRODUCT_CATEGORY_VALUES.has(category)) {
      issues.push({
        row_number: rowNumber,
        field: "category",
        message: "تصنيف المنتج غير صالح."
      });
    }

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      issues.push({
        row_number: rowNumber,
        field: "sale_price",
        message: "سعر البيع يجب أن يكون رقمًا صفرًا أو أكبر."
      });
    }

    if (!Number.isFinite(costPrice) || costPrice < 0) {
      issues.push({
        row_number: rowNumber,
        field: "cost_price",
        message: "التكلفة يجب أن تكون رقمًا صفرًا أو أكبر."
      });
    }

    if (!Number.isFinite(avgCostPrice) || avgCostPrice < 0) {
      issues.push({
        row_number: rowNumber,
        field: "avg_cost_price",
        message: "متوسط التكلفة يجب أن يكون رقمًا صفرًا أو أكبر."
      });
    }

    if (!Number.isFinite(stockQuantity) || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
      issues.push({
        row_number: rowNumber,
        field: "stock_quantity",
        message: "الكمية يجب أن تكون عددًا صحيحًا صفرًا أو أكبر."
      });
    }

    if (!Number.isFinite(minStockLevel) || !Number.isInteger(minStockLevel) || minStockLevel < 0) {
      issues.push({
        row_number: rowNumber,
        field: "min_stock_level",
        message: "الحد الأدنى للمخزون يجب أن يكون عددًا صحيحًا صفرًا أو أكبر."
      });
    }

    const loweredName = name.toLowerCase();
    if (name && batchNames.has(loweredName)) {
      issues.push({
        row_number: rowNumber,
        field: "name",
        message: "اسم المنتج مكرر داخل ملف الاستيراد."
      });
    }

    if (name && existingNames.has(loweredName)) {
      issues.push({
        row_number: rowNumber,
        field: "name",
        message: "اسم المنتج موجود مسبقًا في النظام."
      });
    }

    batchNames.add(loweredName);

    const rowHasIssues = issues.some((issue) => issue.row_number === rowNumber);
    if (rowHasIssues) {
      return;
    }

    validRows.push({
      name,
      category,
      sale_price: roundMetric(salePrice),
      cost_price: roundMetric(costPrice),
      avg_cost_price: roundMetric(avgCostPrice),
      stock_quantity: stockQuantity,
      min_stock_level: minStockLevel,
      track_stock: toBooleanCell(row.track_stock, true),
      is_quick_add: toBooleanCell(row.is_quick_add, false),
      is_active: toBooleanCell(row.is_active, true)
    });
  });

  return {
    rowsTotal: rawRows.length,
    rowsValid: validRows.length,
    rowsInvalid: rawRows.length - validRows.length,
    validRows,
    issues
  };
}

export async function commitProductImportRows(
  supabase: SupabaseAdminClient,
  rows: PortableProductRow[],
  createdBy: string
) {
  if (rows.length === 0) {
    return { insertedCount: 0 };
  }

  const { error } = await supabase.from("products").insert(
    rows.map((row) => ({
      name: row.name,
      category: row.category,
      sale_price: row.sale_price,
      cost_price: row.cost_price,
      avg_cost_price: row.avg_cost_price,
      stock_quantity: row.stock_quantity,
      min_stock_level: row.min_stock_level,
      track_stock: row.track_stock,
      is_quick_add: row.is_quick_add,
      is_active: row.is_active,
      created_by: createdBy
    }))
  );

  if (error) {
    throw error;
  }

  return { insertedCount: rows.length };
}

function toSignedLedgerAmount(entry: LedgerBackupRow) {
  if (entry.entry_type === "income") {
    return entry.amount;
  }

  if (entry.entry_type === "expense") {
    return -entry.amount;
  }

  if (entry.entry_type === "adjustment" && entry.adjustment_direction === "increase") {
    return entry.amount;
  }

  if (entry.entry_type === "adjustment" && entry.adjustment_direction === "decrease") {
    return -entry.amount;
  }

  return 0;
}

export function calculateRestoreDriftFromBackup(content: BackupPackageContent) {
  const drifts: RestoreDriftEntry[] = [];

  for (const account of content.accounts) {
    const ledgerTotal = content.ledger_entries
      .filter((entry) => entry.account_id === account.id)
      .reduce((sum, entry) => sum + toSignedLedgerAmount(entry), 0);

    const calculatedBalance = roundMetric(account.opening_balance + ledgerTotal);
    const drift = roundMetric(account.current_balance - calculatedBalance);

    if (drift !== 0) {
      drifts.push({
        account_id: account.id,
        account_name: account.name,
        current_balance: account.current_balance,
        calculated_balance: calculatedBalance,
        drift
      });
    }
  }

  return drifts;
}

export function isBackupPackageContent(value: unknown): value is BackupPackageContent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<BackupPackageContent>;
  return (
    candidate.kind === "backup_bundle" &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.ledger_entries) &&
    Array.isArray(candidate.products) &&
    Array.isArray(candidate.expense_categories) &&
    Array.isArray(candidate.snapshots)
  );
}

export async function listActiveAdminIds(supabase: SupabaseAdminClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true)
    .returns<Array<{ id: string }>>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.id);
}

async function getExportPackageById(
  supabase: SupabaseAdminClient,
  packageId: string
) {
  const { data, error } = await supabase
    .from("export_packages")
    .select(
      "id, package_type, scope, status, filters, file_name, row_count, content_json, content_text, expires_at, revoked_at, created_at, created_by"
    )
    .eq("id", packageId)
    .maybeSingle<ExportPackageRecord>();

  if (error) {
    throw error;
  }

  return data;
}

async function createPortabilityNotifications(
  supabase: SupabaseAdminClient,
  rows: Array<{
    title: string;
    body: string;
    reference_type: string;
    reference_id: string;
  }>
) {
  const adminIds = await listActiveAdminIds(supabase);
  if (adminIds.length === 0 || rows.length === 0) {
    return;
  }

  const notifications = adminIds.flatMap((adminId) =>
    rows.map((row) => ({
      user_id: adminId,
      type: "portability_event",
      title: row.title,
      body: row.body,
      reference_type: row.reference_type,
      reference_id: row.reference_id
    }))
  );

  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) {
    throw error;
  }
}

export async function createExportPackage(
  supabase: SupabaseAdminClient,
  userId: string,
  input: CreateExportPackageInput
): Promise<CreateExportPackageResult> {
  const artifacts = await buildExportPackageArtifacts(supabase, input, userId);

  if (artifacts.rowCount > 10_000) {
    throw new Error("ERR_EXPORT_TOO_LARGE");
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const packageId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("export_packages").insert({
    id: packageId,
    package_type: input.package_type,
    scope: input.scope,
    status: "ready",
    filters: input.filters,
    file_name: artifacts.fileName,
    row_count: artifacts.rowCount,
    content_json: artifacts.contentJson,
    content_text: artifacts.contentText,
    expires_at: expiresAt,
    created_by: userId
  });

  if (insertError) {
    throw insertError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    user_id: userId,
    action_type: "create_export_package",
    table_name: "export_packages",
    record_id: packageId,
    description: `Create export package ${input.scope}/${input.package_type}`,
    new_values: {
      scope: input.scope,
      package_type: input.package_type,
      row_count: artifacts.rowCount,
      file_name: artifacts.fileName,
      expires_at: expiresAt
    }
  });

  if (auditError) {
    throw auditError;
  }

  await createPortabilityNotifications(supabase, [
    {
      title: "Export package ready",
      body: `Package ${input.scope} (${input.package_type}) is ready with ${artifacts.rowCount} rows.`,
      reference_type: "export_package",
      reference_id: packageId
    }
  ]);

  return {
    package_id: packageId,
    download_url: buildExportPackageDownloadUrl(packageId),
    expires_at: expiresAt
  };
}

export async function revokeExportPackage(
  supabase: SupabaseAdminClient,
  userId: string,
  packageId: string
): Promise<RevokeExportPackageResult> {
  const packageRecord = await getExportPackageById(supabase, packageId);
  if (!packageRecord) {
    throw new Error("ERR_EXPORT_PACKAGE_EXPIRED");
  }

  const revokedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("export_packages")
    .update({
      status: "revoked",
      revoked_at: revokedAt
    })
    .eq("id", packageRecord.id);

  if (updateError) {
    throw updateError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    user_id: userId,
    action_type: "revoke_export_package",
    table_name: "export_packages",
    record_id: packageRecord.id,
    description: `Revoke export package ${packageRecord.scope}/${packageRecord.package_type}`,
    old_values: {
      status: packageRecord.status,
      file_name: packageRecord.file_name
    }
  });

  if (auditError) {
    throw auditError;
  }

  await createPortabilityNotifications(supabase, [
    {
      title: "Export package revoked",
      body: `Package ${packageRecord.scope} (${packageRecord.file_name}) was revoked.`,
      reference_type: "export_package",
      reference_id: packageRecord.id
    }
  ]);

  return {
    package_id: packageRecord.id,
    status: "revoked",
    revoked_at: revokedAt
  };
}

export async function runProductImportDryRun(
  supabase: SupabaseAdminClient,
  userId: string,
  input: {
    source_format: ImportSourceFormat;
    source_content: string;
    file_name: string;
  }
): Promise<RunImportDryRunResult> {
  const analysis = await analyzeProductImportSource(supabase, input.source_format, input.source_content);
  const jobId = crypto.randomUUID();
  const status = analysis.rowsInvalid === 0 && analysis.rowsValid > 0 ? "dry_run_ready" : "dry_run_failed";

  const { error: insertError } = await supabase.from("import_jobs").insert({
    id: jobId,
    file_name: input.file_name,
    source_format: input.source_format,
    status,
    rows_total: analysis.rowsTotal,
    rows_valid: analysis.rowsValid,
    rows_invalid: analysis.rowsInvalid,
    rows_committed: 0,
    source_rows: analysis.validRows,
    validation_errors: analysis.issues,
    created_by: userId
  });

  if (insertError) {
    throw insertError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    user_id: userId,
    action_type: "import_products_dry_run",
    table_name: "import_jobs",
    record_id: jobId,
    description: `Run products dry-run import from ${input.file_name}`,
    new_values: {
      status,
      rows_total: analysis.rowsTotal,
      rows_valid: analysis.rowsValid,
      rows_invalid: analysis.rowsInvalid
    }
  });

  if (auditError) {
    throw auditError;
  }

  await createPortabilityNotifications(supabase, [
    {
      title: status === "dry_run_ready" ? "Products dry-run ready" : "Products dry-run has issues",
      body:
        status === "dry_run_ready"
          ? `${input.file_name} is ready for commit with ${analysis.rowsValid} valid rows.`
          : `${input.file_name} contains ${analysis.rowsInvalid} invalid rows.`,
      reference_type: "import_job",
      reference_id: jobId
    }
  ]);

  return {
    job_id: jobId,
    mode: "dry_run",
    rows_total: analysis.rowsTotal,
    rows_valid: analysis.rowsValid,
    rows_invalid: analysis.rowsInvalid,
    validation_errors: analysis.issues
  };
}

export async function commitProductImportJob(
  supabase: SupabaseAdminClient,
  userId: string,
  jobId: string
): Promise<CommitProductImportResult> {
  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .select(
      "id, file_name, source_format, status, rows_total, rows_valid, rows_invalid, rows_committed, validation_errors, source_rows, committed_at, created_at, created_by"
    )
    .eq("id", jobId)
    .maybeSingle<ImportJobRecord>();

  if (jobError) {
    throw jobError;
  }

  if (!job || job.status !== "dry_run_ready" || job.rows_invalid > 0 || job.rows_valid === 0) {
    throw new Error("ERR_IMPORT_DRY_RUN_REQUIRED");
  }

  const commitResult = await commitProductImportRows(supabase, job.source_rows, userId);
  const committedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("import_jobs")
    .update({
      status: "committed",
      rows_committed: commitResult.insertedCount,
      committed_at: committedAt
    })
    .eq("id", job.id);

  if (updateError) {
    throw updateError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    user_id: userId,
    action_type: "import_products_commit",
    table_name: "import_jobs",
    record_id: job.id,
    description: `Commit products import from ${job.file_name}`,
    new_values: {
      rows_committed: commitResult.insertedCount,
      committed_at: committedAt
    }
  });

  if (auditError) {
    throw auditError;
  }

  await createPortabilityNotifications(supabase, [
    {
      title: "Products import committed",
      body: `${commitResult.insertedCount} products were imported from ${job.file_name}.`,
      reference_type: "import_job",
      reference_id: job.id
    }
  ]);

  return {
    job_id: job.id,
    mode: "commit",
    rows_total: job.rows_total,
    rows_valid: job.rows_valid,
    rows_invalid: job.rows_invalid,
    rows_committed: commitResult.insertedCount
  };
}

export async function runRestoreDrill(
  supabase: SupabaseAdminClient,
  userId: string,
  input: {
    backup_id: string;
    target_env: "isolated-drill";
    idempotency_key: string;
  }
): Promise<RunRestoreDrillResult> {
  if (input.target_env !== "isolated-drill") {
    throw new Error("ERR_RESTORE_ENV_FORBIDDEN");
  }

  const { data: existingDrill, error: existingDrillError } = await supabase
    .from("restore_drills")
    .select("id")
    .eq("idempotency_key", input.idempotency_key)
    .maybeSingle<{ id: string }>();

  if (existingDrillError) {
    throw existingDrillError;
  }

  if (existingDrill) {
    throw new Error("ERR_IDEMPOTENCY");
  }

  const packageRecord = await getExportPackageById(supabase, input.backup_id);
  const expired = !packageRecord || new Date(packageRecord.expires_at).getTime() <= Date.now();
  if (
    !packageRecord ||
    packageRecord.scope !== "backup" ||
    packageRecord.revoked_at ||
    packageRecord.status === "revoked" ||
    expired
  ) {
    throw new Error("ERR_EXPORT_PACKAGE_EXPIRED");
  }

  if (!isBackupPackageContent(packageRecord.content_json)) {
    throw new Error("ERR_API_VALIDATION_FAILED");
  }

  const drillId = crypto.randomUUID();
  const startedAt = Date.now();
  const { error: insertError } = await supabase.from("restore_drills").insert({
    id: drillId,
    export_package_id: packageRecord.id,
    target_env: input.target_env,
    status: "started",
    idempotency_key: input.idempotency_key,
    created_by: userId
  });

  if (insertError) {
    throw insertError;
  }

  const drifts = calculateRestoreDriftFromBackup(packageRecord.content_json);
  const completedAt = new Date().toISOString();
  const rtoSeconds = Math.max(1, Math.ceil((Date.now() - startedAt) / 1000));
  const summary = {
    backup_file_name: packageRecord.file_name,
    account_count: packageRecord.content_json.accounts.length,
    ledger_entry_count: packageRecord.content_json.ledger_entries.length,
    product_count: packageRecord.content_json.products.length,
    snapshot_count: packageRecord.content_json.snapshots.length,
    drift_count: drifts.length,
    drifts
  };

  const { error: updateError } = await supabase
    .from("restore_drills")
    .update({
      status: "completed",
      drift_count: drifts.length,
      rto_seconds: rtoSeconds,
      result_summary: summary,
      completed_at: completedAt
    })
    .eq("id", drillId);

  if (updateError) {
    throw updateError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    user_id: userId,
    action_type: "restore_drill",
    table_name: "restore_drills",
    record_id: drillId,
    description: `Run restore drill from ${packageRecord.file_name}`,
    new_values: {
      target_env: input.target_env,
      drift_count: drifts.length,
      rto_seconds: rtoSeconds
    }
  });

  if (auditError) {
    throw auditError;
  }

  await createPortabilityNotifications(supabase, [
    {
      title: "Restore drill completed",
      body: `Restore drill for ${packageRecord.file_name} completed with drift=${drifts.length} and RTO=${rtoSeconds}s.`,
      reference_type: "restore_drill",
      reference_id: drillId
    }
  ]);

  return {
    drill_id: drillId,
    status: "completed",
    drift_count: drifts.length,
    rto_seconds: rtoSeconds
  };
}
