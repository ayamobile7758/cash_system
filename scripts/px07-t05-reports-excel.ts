import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getReportBaseline, type SalesHistoryFilters } from "../lib/api/reports";
import { buildReportWorkbookBuffer } from "../lib/reports/export";
import { readWorkbookRows } from "../lib/spreadsheet-core";

function assert(condition: unknown, message: string) {
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

async function createAdminUser(supabase: any, fullName: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: nowEmail("px07t05-admin"),
    password: "LocalPass123!",
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "admin"
    }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create admin fixture: ${error?.message ?? "unknown error"}`);
  }

  return data.user.id;
}

async function maybeSingleOrThrow<T>(promise: PromiseLike<any>, label: string) {
  const { data, error } = await promise;

  if (error || !data) {
    throw new Error(`${label}: ${error?.message ?? "record not found"}`);
  }

  return data;
}

async function runRpc<T>(supabase: any, fn: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, params);

  if (error) {
    throw new Error(`${fn}: ${error.message}`);
  }

  return data as T;
}

async function main() {
  const env = getLocalSupabaseEnv();
  const supabase: any = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const adminId = await createAdminUser(supabase, "PX07T05 Admin");
  const today = new Date().toISOString().slice(0, 10);

  const cashAccount = await maybeSingleOrThrow(
    supabase.from("accounts").select("id, name").eq("type", "cash").eq("module_scope", "core").maybeSingle(),
    "Core cash account not found"
  );

  const maintenanceAccount = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("id, name")
      .eq("type", "cash")
      .eq("module_scope", "maintenance")
      .maybeSingle(),
    "Maintenance cash account not found"
  );

  const insertedProduct = await maybeSingleOrThrow(
    supabase
      .from("products")
      .insert({
        name: `PX07 T05 Product ${Date.now()}`,
        category: "accessory",
        sale_price: 20,
        cost_price: 10,
        avg_cost_price: 10,
        stock_quantity: 10,
        min_stock_level: 2,
        track_stock: true,
        is_quick_add: false,
        created_by: adminId
      })
      .select("id, name, stock_quantity")
      .maybeSingle(),
    "Failed to insert product fixture"
  );

  const insertedSupplier = await maybeSingleOrThrow(
    supabase
      .from("suppliers")
      .insert({
        name: `PX07 T05 Supplier ${Date.now()}`,
        phone: "0793333333",
        address: "Amman"
      })
      .select("id, name")
      .maybeSingle(),
    "Failed to insert supplier fixture"
  );

  const sale = await runRpc<{ invoice_id: string; invoice_number: string }>(supabase, "create_sale", {
    p_items: [{ product_id: insertedProduct.id, quantity: 2 }],
    p_payments: [{ account_id: cashAccount.id, amount: 40 }],
    p_pos_terminal: "PX07-REPORTS-01",
    p_notes: "PX07 T05 sale",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  const saleItem = await maybeSingleOrThrow(
    supabase
      .from("invoice_items")
      .select("id")
      .eq("invoice_id", sale.invoice_id)
      .maybeSingle(),
    "Sale item fixture missing"
  );

  await runRpc(supabase, "create_return", {
    p_invoice_id: sale.invoice_id,
    p_items: [{ invoice_item_id: saleItem.id, quantity: 1 }],
    p_return_type: "partial",
    p_refund_account_id: cashAccount.id,
    p_reason: "PX07 T05 return",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  await runRpc(supabase, "create_purchase", {
    p_supplier_id: insertedSupplier.id,
    p_items: [{ product_id: insertedProduct.id, quantity: 3, unit_cost: 12 }],
    p_is_paid: true,
    p_payment_account_id: cashAccount.id,
    p_notes: "PX07 T05 purchase",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  await runRpc(supabase, "create_topup", {
    p_account_id: cashAccount.id,
    p_amount: 50,
    p_profit_amount: 5,
    p_supplier_id: insertedSupplier.id,
    p_notes: "PX07 T05 topup",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  const maintenanceJob = await runRpc<{ job_id: string }>(supabase, "create_maintenance_job", {
    p_customer_name: "عميل صيانة PX07",
    p_customer_phone: "0794444444",
    p_device_type: "iPhone 15",
    p_issue_description: "تبديل بطارية",
    p_estimated_cost: 15,
    p_notes: "PX07 T05 maintenance",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  await runRpc(supabase, "update_maintenance_job_status", {
    p_job_id: maintenanceJob.job_id,
    p_new_status: "in_progress",
    p_notes: "بدء التنفيذ",
    p_created_by: adminId
  });

  await runRpc(supabase, "update_maintenance_job_status", {
    p_job_id: maintenanceJob.job_id,
    p_new_status: "ready",
    p_notes: "جاهز للتسليم",
    p_created_by: adminId
  });

  await runRpc(supabase, "update_maintenance_job_status", {
    p_job_id: maintenanceJob.job_id,
    p_new_status: "delivered",
    p_final_amount: 18,
    p_payment_account_id: maintenanceAccount.id,
    p_notes: "تم التسليم",
    p_created_by: adminId
  });

  await runRpc(supabase, "create_daily_snapshot", {
    p_notes: "PX07 T05 snapshot",
    p_created_by: adminId
  });

  const filters: SalesHistoryFilters = {
    fromDate: today,
    toDate: today,
    createdBy: adminId,
    page: 1,
    pageSize: 20
  };

  const reportBaseline = await getReportBaseline(supabase as never, filters, {
    role: "admin",
    userId: adminId
  });

  assert(reportBaseline.salesHistory.total_count >= 1, "Sales history should include the created sale.");
  assert(reportBaseline.returnsReport.return_count === 1, "Returns report should include the created return.");
  assert(reportBaseline.returnsReport.reasons[0]?.reason === "PX07 T05 return", "Return reason summary mismatch.");
  assert(reportBaseline.profitReport.topup_profit === 5, "Topup profit mismatch in report baseline.");
  assert(reportBaseline.profitReport.purchase_total === 36, "Purchase total mismatch in report baseline.");
  assert(reportBaseline.profitReport.maintenance_revenue === 18, "Maintenance revenue mismatch in report baseline.");
  assert(reportBaseline.accountMovementReport.total_movements >= 5, "Account movements should include all created operations.");

  const referenceTypes = new Set(
    reportBaseline.accountMovementReport.entries.map((entry) => entry.reference_type).filter(Boolean)
  );
  assert(referenceTypes.has("invoice"), "Account movement report should include invoice entries.");
  assert(referenceTypes.has("return"), "Account movement report should include return entries.");
  assert(referenceTypes.has("purchase"), "Account movement report should include purchase entries.");
  assert(referenceTypes.has("topup"), "Account movement report should include topup entries.");
  assert(referenceTypes.has("maintenance_job"), "Account movement report should include maintenance entries.");

  const workbookBuffer = buildReportWorkbookBuffer({
    filters,
    reportBaseline,
    generatedAt: `${today}T12:00:00.000Z`
  });

  mkdirSync("output/spreadsheet", { recursive: true });
  const workbookPath = join("output", "spreadsheet", "px07-t05-reports-export.xlsx");
  writeFileSync(workbookPath, workbookBuffer);

  const workbook = readWorkbookRows(workbookBuffer);
  assert(Object.keys(workbook).includes("Summary"), "Workbook should include Summary sheet.");
  assert(Object.keys(workbook).includes("Returns"), "Workbook should include Returns sheet.");
  assert(Object.keys(workbook).includes("Account Movements"), "Workbook should include Account Movements sheet.");

  const summaryRows = workbook.Summary;
  assert(summaryRows[8]?.[1] === reportBaseline.salesSummary.total_sales, "Workbook sales total mismatch.");

  const output = {
    fixtures: {
      admin_id: adminId,
      product_id: insertedProduct.id,
      supplier_id: insertedSupplier.id,
      cash_account_id: cashAccount.id,
      maintenance_account_id: maintenanceAccount.id
    },
    probes: {
      sales_total: reportBaseline.salesSummary.total_sales,
      return_count: reportBaseline.returnsReport.return_count,
      top_return_reason: reportBaseline.returnsReport.reasons[0]?.reason ?? null,
      purchase_total: reportBaseline.profitReport.purchase_total,
      topup_profit: reportBaseline.profitReport.topup_profit,
      maintenance_revenue: reportBaseline.profitReport.maintenance_revenue,
      movement_count: reportBaseline.accountMovementReport.total_movements,
      workbook_path: workbookPath,
      workbook_sheets: Object.keys(workbook)
    }
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
