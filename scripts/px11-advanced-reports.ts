import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getReportBaseline, type SalesHistoryFilters } from "@/lib/api/reports";
import { buildAdvancedReportWorkbookBuffer } from "@/lib/reports/export";
import { readWorkbookRows } from "../lib/spreadsheet-core";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function extractStatusJson(rawOutput: string) {
  const start = rawOutput.indexOf("{");
  const end = rawOutput.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Failed to parse `supabase status -o json` output.");
  }

  return rawOutput.slice(start, end + 1);
}

function getLocalSupabaseEnv() {
  const raw = execSync("npx supabase status -o json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  return JSON.parse(extractStatusJson(raw)) as {
    API_URL: string;
    SERVICE_ROLE_KEY: string;
  };
}

function nowEmail(prefix: string) {
  return `${prefix}-${Date.now()}@local.test`;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

async function maybeSingleOrThrow<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>, label: string) {
  const { data, error } = await query;

  if (error || !data) {
    throw new Error(`${label}: ${error?.message ?? "record not found"}`);
  }

  return data;
}

async function runRpc<T>(supabase: any, fnName: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fnName, params);

  if (error) {
    throw new Error(`${fnName}: ${error.message}`);
  }

  return data as T;
}

async function createAdminUser(supabase: any) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: nowEmail("px11-admin"),
    password: "LocalPass123!",
    email_confirm: true,
    user_metadata: {
      full_name: "PX11 Admin",
      role: "admin"
    }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create admin fixture: ${error?.message ?? "unknown error"}`);
  }

  return data.user.id;
}

async function insertCompareInvoiceFixture(
  supabase: any,
  params: {
    adminId: string;
    productId: string;
    accountId: string;
    compareDate: string;
  }
) {
  const invoiceId = randomUUID();
  const invoiceNumber = `PX11CMP${Date.now().toString().slice(-8)}`;

  const { error: invoiceError } = await supabase.from("invoices").insert({
    id: invoiceId,
    invoice_number: invoiceNumber,
    invoice_date: params.compareDate,
    subtotal: 80,
    discount_amount: 0,
    total_amount: 80,
    debt_amount: 0,
    status: "active",
    pos_terminal_code: "PX11-COMPARE",
    notes: "PX11 compare sale",
    created_by: params.adminId
  });
  if (invoiceError) {
    throw invoiceError;
  }

  const { error: itemError } = await supabase.from("invoice_items").insert({
    invoice_id: invoiceId,
    product_id: params.productId,
    product_name_at_time: "PX11 Compare Product",
    quantity: 1,
    unit_price: 80,
    cost_price_at_time: 50,
    discount_percentage: 0,
    discount_amount: 0,
    total_price: 80,
    returned_quantity: 0,
    is_returned: false
  });
  if (itemError) {
    throw itemError;
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    account_id: params.accountId,
    amount: 80,
    fee_amount: 0,
    net_amount: 80
  });
  if (paymentError) {
    throw paymentError;
  }

  const { error: ledgerError } = await supabase.from("ledger_entries").insert({
    entry_date: params.compareDate,
    account_id: params.accountId,
    entry_type: "income",
    amount: 80,
    reference_type: "invoice",
    reference_id: invoiceId,
    description: "PX11 compare sale",
    created_by: params.adminId
  });
  if (ledgerError) {
    throw ledgerError;
  }

  return { invoiceId, invoiceNumber };
}

async function insertCompareExpenseFixture(
  supabase: any,
  params: {
    adminId: string;
    accountId: string;
    categoryId: string;
    compareDate: string;
  }
) {
  const expenseId = randomUUID();
  const ledgerEntryId = randomUUID();
  const expenseNumber = `PX11EXP${Date.now().toString().slice(-8)}`;

  const { error: expenseError } = await supabase.from("expenses").insert({
    id: expenseId,
    expense_number: expenseNumber,
    expense_date: params.compareDate,
    account_id: params.accountId,
    category_id: params.categoryId,
    amount: 8,
    description: "PX11 compare expense",
    notes: "PX11 compare expense",
    created_by: params.adminId
  });
  if (expenseError) {
    throw expenseError;
  }

  const { error: ledgerError } = await supabase.from("ledger_entries").insert({
    id: ledgerEntryId,
    entry_date: params.compareDate,
    account_id: params.accountId,
    entry_type: "expense",
    amount: 8,
    reference_type: "expense",
    reference_id: expenseId,
    description: "PX11 compare expense",
    created_by: params.adminId
  });
  if (ledgerError) {
    throw ledgerError;
  }

  return { expenseId, ledgerEntryId };
}

async function main() {
  const env = getLocalSupabaseEnv();
  const supabase = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const adminId = await createAdminUser(supabase);
  const currentDate = toIsoDate(new Date());
  const compareDate = shiftDays(-30);

  const cashAccount = await maybeSingleOrThrow<{ id: string; current_balance: number; name: string }>(
    supabase
      .from("accounts")
      .select("id, current_balance, name")
      .eq("type", "cash")
      .eq("module_scope", "core")
      .maybeSingle<{ id: string; current_balance: number; name: string }>(),
    "Core cash account not found"
  );

  const currentProduct = await maybeSingleOrThrow<{ id: string }>(
    supabase
      .from("products")
      .insert({
        name: `PX11 Current Product ${Date.now()}`,
        category: "accessory",
        sale_price: 100,
        cost_price: 60,
        avg_cost_price: 60,
        stock_quantity: 10,
        min_stock_level: 1,
        track_stock: true,
        is_quick_add: false,
        created_by: adminId
      })
      .select("id")
      .maybeSingle<{ id: string }>(),
    "Current period product create failed"
  );

  const compareProduct = await maybeSingleOrThrow<{ id: string }>(
    supabase
      .from("products")
      .insert({
        name: `PX11 Compare Product ${Date.now()}`,
        category: "accessory",
        sale_price: 80,
        cost_price: 50,
        avg_cost_price: 50,
        stock_quantity: 10,
        min_stock_level: 1,
        track_stock: true,
        is_quick_add: false,
        created_by: adminId
      })
      .select("id")
      .maybeSingle<{ id: string }>(),
    "Compare period product create failed"
  );

  const expenseCategory = await maybeSingleOrThrow<{ id: string }>(
    supabase
      .from("expense_categories")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<{ id: string }>(),
    "Expense category missing"
  );

  await insertCompareInvoiceFixture(supabase, {
    adminId,
    productId: compareProduct.id,
    accountId: cashAccount.id,
    compareDate
  });

  await insertCompareExpenseFixture(supabase, {
    adminId,
    accountId: cashAccount.id,
    categoryId: expenseCategory.id,
    compareDate
  });

  const { error: compareSnapshotError } = await supabase.from("daily_snapshots").insert({
    snapshot_date: compareDate,
    total_sales: 80,
    total_returns: 0,
    total_cost: 50,
    gross_profit: 30,
    net_sales: 80,
    invoice_count: 1,
    return_count: 0,
    total_debt_added: 0,
    total_debt_collected: 0,
    total_expenses: 8,
    total_purchases: 0,
    net_profit: 22,
    accounts_snapshot: {},
    notes: "PX11 compare snapshot",
    created_by: adminId
  });
  if (compareSnapshotError) {
    throw compareSnapshotError;
  }

  await runRpc(supabase, "create_sale", {
    p_items: [{ product_id: currentProduct.id, quantity: 2 }],
    p_payments: [{ account_id: cashAccount.id, amount: 200 }],
    p_pos_terminal: "PX11-CURRENT",
    p_notes: "PX11 current sale",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  await runRpc(supabase, "create_expense", {
    p_amount: 12,
    p_account_id: cashAccount.id,
    p_category_id: expenseCategory.id,
    p_description: "PX11 current expense",
    p_notes: "PX11 current expense",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  const currentSnapshot = await runRpc<{
    snapshot_id: string;
    total_sales: number;
    net_sales: number;
    net_profit: number;
    invoice_count: number;
  }>(supabase, "create_daily_snapshot", {
    p_snapshot_date: currentDate,
    p_notes: "PX11 current snapshot",
    p_created_by: adminId
  });

  const filters: SalesHistoryFilters = {
    fromDate: currentDate,
    toDate: currentDate,
    compareFromDate: compareDate,
    compareToDate: compareDate,
    groupBy: "day",
    dimension: "account",
    createdBy: adminId,
    page: 1,
    pageSize: 20
  };

  const reportBaseline = await getReportBaseline(supabase as never, filters, {
    role: "admin",
    userId: adminId
  });

  assert(reportBaseline.advancedReport.currentPeriod.sales_total === 200, "Current sales total mismatch.");
  assert(reportBaseline.advancedReport.currentPeriod.expense_total === 12, "Current expense total mismatch.");
  assert(reportBaseline.advancedReport.currentPeriod.net_profit === 68, "Current net profit mismatch.");
  assert(reportBaseline.advancedReport.comparePeriod?.sales_total === 80, "Compare sales total mismatch.");
  assert(reportBaseline.advancedReport.comparePeriod?.expense_total === 8, "Compare expense total mismatch.");
  assert(reportBaseline.advancedReport.comparePeriod?.net_profit === 22, "Compare net profit mismatch.");
  assert(reportBaseline.advancedReport.delta.sales_total === 120, "Sales delta mismatch.");
  assert(reportBaseline.advancedReport.delta.net_profit === 46, "Net profit delta mismatch.");
  assert(reportBaseline.advancedReport.trend.length === 1, "Current trend should contain one bucket.");
  assert(reportBaseline.advancedReport.trend[0]?.bucket === currentDate, "Trend bucket mismatch.");
  assert(reportBaseline.snapshots[0]?.id === currentSnapshot.snapshot_id, "Current snapshot should appear in baseline.");
  assert(reportBaseline.profitReport.snapshot_net_profit === 68, "Snapshot net profit mismatch in baseline.");
  assert(reportBaseline.profitReport.expense_total === 12, "Profit report expense total mismatch.");

  const { data: cashMovements, error: cashMovementsError } = await supabase
    .from("ledger_entries")
    .select("amount, entry_type")
    .eq("account_id", cashAccount.id)
    .eq("entry_date", currentDate);
  if (cashMovementsError) {
    throw cashMovementsError;
  }

  const currentLedgerNet = (cashMovements ?? []).reduce((sum, row) => {
    if (row.entry_type === "income") {
      return sum + Number(row.amount);
    }

    if (row.entry_type === "expense") {
      return sum - Number(row.amount);
    }

    return sum;
  }, 0);
  assert(currentLedgerNet === 188, "Current ledger truth mismatch.");

  const workbookBuffer = buildAdvancedReportWorkbookBuffer({
    filters,
    reportBaseline,
    generatedAt: new Date().toISOString()
  });
  const workbook = readWorkbookRows(workbookBuffer);
  const summaryRows = workbook.Summary;
  assert(summaryRows[7]?.[1] === 200, "Workbook current sales mismatch.");
  assert(summaryRows[7]?.[2] === 80, "Workbook compare sales mismatch.");
  assert(summaryRows[7]?.[3] === 120, "Workbook sales delta mismatch.");

  const outputDir = join(process.cwd(), "output", "spreadsheet");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, "px11-advanced-report.xlsx");
  writeFileSync(outputPath, workbookBuffer);

  const evidence = {
    current_period: reportBaseline.advancedReport.currentPeriod,
    compare_period: reportBaseline.advancedReport.comparePeriod,
    delta: reportBaseline.advancedReport.delta,
    trend_bucket: reportBaseline.advancedReport.trend[0]?.bucket,
    workbook_path: outputPath,
    snapshot_current_net_profit: currentSnapshot.net_profit,
    ledger_current_net: currentLedgerNet
  };

  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
