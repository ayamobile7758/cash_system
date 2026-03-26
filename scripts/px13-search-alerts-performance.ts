import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getReportsPageBaseline } from "@/lib/api/dashboard";
import { getAlertsSummary, getGlobalSearchPageBaseline, searchGlobal } from "@/lib/api/search";
import { ALL_PERMISSIONS_TOKEN, POS_BASE_PERMISSIONS } from "@/lib/permissions";

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

  const parsed = JSON.parse(extractStatusJson(raw)) as Partial<{
    ANON_KEY: string;
    API_URL: string;
    SERVICE_ROLE_KEY: string;
  }>;

  if (!parsed.API_URL || !parsed.SERVICE_ROLE_KEY || !parsed.ANON_KEY) {
    throw new Error("PX13 proof requires a local Supabase stack with API/auth enabled.");
  }

  return {
    ANON_KEY: parsed.ANON_KEY,
    API_URL: parsed.API_URL,
    SERVICE_ROLE_KEY: parsed.SERVICE_ROLE_KEY
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

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * p) - 1);
  return sorted[index] ?? 0;
}

async function maybeSingleOrThrow<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string
) {
  const { data, error } = await query;

  if (error || !data) {
    throw new Error(`${label}: ${error?.message ?? "record not found"}`);
  }

  return data;
}

async function createFixtureUser(supabase: any, role: "admin" | "pos_staff", prefix: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: nowEmail(prefix),
    password: "LocalPass123!",
    email_confirm: true,
    user_metadata: {
      full_name: prefix,
      role
    }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create ${role} fixture: ${error?.message ?? "unknown error"}`);
  }

  return data.user.id;
}

async function waitForProfiles(supabase: any, userIds: string[]) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id")
      .in("id", userIds);

    if (error) {
      throw new Error(`Failed to poll profiles: ${error.message}`);
    }

    if (profiles?.length === userIds.length) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Profile rows did not appear for ${userIds.join(", ")}.`);
}

async function runRpc<T>(supabase: any, fnName: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fnName, params);

  if (error) {
    throw new Error(`${fnName}: ${error.message}`);
  }

  return data as T;
}

async function main() {
  const env = getLocalSupabaseEnv();
  process.env.NEXT_PUBLIC_SUPABASE_URL = env.API_URL;
  process.env.SUPABASE_URL = env.API_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
  const supabase: any = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const adminId = await createFixtureUser(supabase, "admin", "px13-admin");
  const posId = await createFixtureUser(supabase, "pos_staff", "px13-pos");
  await waitForProfiles(supabase, [adminId, posId]);
  const currentDate = toIsoDate(new Date());
  const yesterday = shiftDays(-1);

  const coreCash = await maybeSingleOrThrow<{ id: string }>(
    supabase
      .from("accounts")
      .select("id")
      .eq("type", "cash")
      .eq("module_scope", "core")
      .maybeSingle(),
    "Core cash account not found"
  );

  const lowStockProduct = await maybeSingleOrThrow<{ id: string; name: string }>(
    supabase
      .from("products")
      .insert({
        name: `PX13 Search Low Stock ${Date.now()}`,
        category: "accessory",
        sku: `PX13-LS-${Date.now().toString().slice(-5)}`,
        sale_price: 20,
        cost_price: 10,
        avg_cost_price: 10,
        stock_quantity: 1,
        min_stock_level: 2,
        track_stock: true,
        is_quick_add: false,
        created_by: adminId
      })
      .select("id, name")
      .maybeSingle(),
    "Low-stock product create failed"
  );

  const saleProduct = await maybeSingleOrThrow<{ id: string }>(
    supabase
      .from("products")
      .insert({
        name: `PX13 Search Sale ${Date.now()}`,
        category: "accessory",
        sku: `PX13-SALE-${Date.now().toString().slice(-5)}`,
        sale_price: 30,
        cost_price: 14,
        avg_cost_price: 14,
        stock_quantity: 10,
        min_stock_level: 1,
        track_stock: true,
        is_quick_add: false,
        created_by: adminId
      })
      .select("id")
      .maybeSingle(),
    "Sale product create failed"
  );

  const debtCustomer = await maybeSingleOrThrow<{ id: string; name: string }>(
    supabase
      .from("debt_customers")
      .insert({
        name: `PX13 Debt Customer ${Date.now()}`,
        phone: `0799${Date.now().toString().slice(-6)}`,
        current_balance: 25,
        credit_limit: 100,
        due_date_days: 30,
        created_by: adminId
      })
      .select("id, name")
      .maybeSingle(),
    "Debt customer create failed"
  );

  const overdueDebtEntry = await maybeSingleOrThrow<{ id: string }>(
    supabase
      .from("debt_entries")
      .insert({
        debt_customer_id: debtCustomer.id,
        entry_type: "manual",
        amount: 25,
        due_date: yesterday,
        description: "PX13 overdue debt",
        is_paid: false,
        paid_amount: 0,
        remaining_amount: 25,
        idempotency_key: randomUUID(),
        created_by: adminId
      })
      .select("id")
      .maybeSingle(),
    "Debt entry create failed"
  );

  const maintenanceJob = await maybeSingleOrThrow<{ id: string; job_number: string }>(
    supabase
      .from("maintenance_jobs")
      .insert({
        job_number: `PX13-MAINT-${Date.now().toString().slice(-6)}`,
        job_date: currentDate,
        customer_name: `PX13 Maintenance Customer ${Date.now()}`,
        customer_phone: `0788${Date.now().toString().slice(-6)}`,
        device_type: "iPhone",
        issue_description: "PX13 ready job",
        estimated_cost: 15,
        status: "ready",
        notes: "PX13 maintenance ready",
        created_by: adminId
      })
      .select("id, job_number")
      .maybeSingle(),
    "Maintenance job create failed"
  );

  await maybeSingleOrThrow<{ id: string }>(
    supabase
      .from("reconciliation_entries")
      .insert({
        reconciliation_date: currentDate,
        account_id: coreCash.id,
        expected_balance: 0,
        actual_balance: 5,
        difference: 5,
        difference_reason: "PX13 unresolved drift",
        is_resolved: false,
        created_by: adminId
      })
      .select("id")
      .maybeSingle(),
    "Reconciliation drift create failed"
  );

  await runRpc(supabase, "create_sale", {
    p_items: [{ product_id: saleProduct.id, quantity: 1, discount_percentage: 0 }],
    p_payments: [{ account_id: coreCash.id, amount: 30 }],
    p_debt_customer_id: debtCustomer.id,
    p_pos_terminal: "PX13-TERM",
    p_notes: "PX13 search sale",
    p_idempotency_key: randomUUID(),
    p_created_by: posId
  });

  const saleInvoice = await maybeSingleOrThrow<{ id: string; invoice_number: string }>(
    supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("created_by", posId)
      .eq("pos_terminal_code", "PX13-TERM")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "PX13 sale invoice missing"
  );

  const adminNotifications = [
    {
      user_id: adminId,
      type: "low_stock",
      title: "PX13 low stock #1",
      body: "First low stock alert",
      reference_type: "product",
      reference_id: lowStockProduct.id
    },
    {
      user_id: adminId,
      type: "low_stock",
      title: "PX13 low stock #2",
      body: "Duplicate low stock alert for same product",
      reference_type: "product",
      reference_id: lowStockProduct.id
    },
    {
      user_id: adminId,
      type: "maintenance_ready",
      title: "PX13 maintenance ready",
      body: "Maintenance job is ready",
      reference_type: "maintenance_job",
      reference_id: maintenanceJob.id
    },
    {
      user_id: posId,
      type: "maintenance_ready",
      title: "PX13 POS notification",
      body: "Scoped POS notification",
      reference_type: "maintenance_job",
      reference_id: maintenanceJob.id
    }
  ];

  const { error: notificationsError } = await supabase.from("notifications").insert(adminNotifications);
  if (notificationsError) {
    throw notificationsError;
  }

  const adminViewer = {
    role: "admin" as const,
    userId: adminId,
    permissions: [ALL_PERMISSIONS_TOKEN]
  };
  const posViewer = {
    role: "pos_staff" as const,
    userId: posId,
    permissions: [...POS_BASE_PERMISSIONS]
  };

  const searchQueries = [
    "PX13",
    "Low Stock",
    "PX13-TERM",
    "Debt Customer",
    "MAINT",
    "PX13",
    "sale",
    "ready",
    "PX13",
    "Customer",
    "PX13",
    "TERM",
    "Debt",
    "Maintenance",
    "PX13",
    "PX13",
    "Stock",
    "Debt",
    "MAINT",
    "PX13"
  ];

  const searchTimings: number[] = [];
  for (const query of searchQueries) {
    const startedAt = performance.now();
    await searchGlobal(supabase, adminViewer, {
      q: query,
      limit: 12
    });
    searchTimings.push(performance.now() - startedAt);
  }

  const reportTimings: number[] = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const startedAt = performance.now();
    await getReportsPageBaseline(supabase, {
      from_date: currentDate,
      to_date: currentDate
    });
    reportTimings.push(performance.now() - startedAt);
  }

  const searchBaseline = await getGlobalSearchPageBaseline(supabase, adminViewer, {
    q: "PX13",
    limit: "12"
  });
  const posInvoiceSearch = await searchGlobal(supabase, posViewer, {
    q: "PX13-TERM",
    entity: "invoice",
    limit: 10
  });
  const alertsSummary = await getAlertsSummary(supabase, {
    role: "admin",
    userId: adminId
  });

  assert(searchBaseline.errorMessage === null, "Search baseline should not return a validation error.");
  assert(searchBaseline.totalCount >= 4, "Grouped search should return at least four scoped hits.");
  assert(
    searchBaseline.groups.some((group) => group.entity === "product"),
    "Grouped search should include products."
  );
  assert(
    searchBaseline.groups.some((group) => group.entity === "invoice"),
    "Grouped search should include invoices."
  );
  assert(
    searchBaseline.groups.some((group) => group.entity === "debt_customer"),
    "Grouped search should include debt customers."
  );
  assert(
    searchBaseline.groups.some((group) => group.entity === "maintenance_job"),
    "Grouped search should include maintenance jobs."
  );
  assert(
    JSON.stringify(Object.keys(searchBaseline.items[0] ?? {}).sort()) ===
      JSON.stringify(["entity", "id", "label", "secondary"]),
    "Search items must remain limited to safe keys only."
  );
  assert(posInvoiceSearch.length === 1, "POS invoice search should remain scoped to own invoices.");
  assert(posInvoiceSearch[0]?.label === saleInvoice.invoice_number, "POS search returned an unexpected invoice.");

  assert(alertsSummary !== null, "Admin alert summary should be available.");
  assert(alertsSummary.low_stock === 1, "Alert summary should dedupe low stock at cluster level.");
  assert(alertsSummary.overdue_debts === 1, "Alert summary overdue debts mismatch.");
  assert(alertsSummary.reconciliation_drift === 1, "Alert summary reconciliation drift mismatch.");
  assert(alertsSummary.maintenance_ready === 1, "Alert summary maintenance ready mismatch.");
  assert(alertsSummary.unread_notifications === 4, "Alert summary unread notifications mismatch.");

  const searchP95 = percentile(searchTimings, 0.95);
  const reportP95 = percentile(reportTimings, 0.95);

  assert(searchP95 <= 400, `Search p95 exceeded target: ${searchP95.toFixed(2)}ms`);
  assert(reportP95 <= 2000, `Report p95 exceeded target: ${reportP95.toFixed(2)}ms`);

  const results = {
    probes: {
      search: {
        total_count: searchBaseline.totalCount,
        grouped_entities: searchBaseline.groups.map((group) => group.entity),
        first_item_keys: Object.keys(searchBaseline.items[0] ?? {}).sort(),
        pos_scoped_invoice: saleInvoice.invoice_number
      },
      alerts: alertsSummary,
      performance: {
        search_p95_ms: Number(searchP95.toFixed(2)),
        reports_p95_ms: Number(reportP95.toFixed(2))
      }
    }
  };

  console.log(JSON.stringify(results, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
