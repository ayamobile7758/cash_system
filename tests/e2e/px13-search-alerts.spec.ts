import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

const deviceViewports = [
  { label: "phone", width: 360, height: 800 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "laptop", width: 1280, height: 900 }
] as const;

test.describe.configure({ timeout: 120_000 });

type Px13Seed = {
  admin: FixtureUser;
  pos: FixtureUser;
  queryPrefix: string;
  terminalCode: string;
  productName: string;
  debtCustomerName: string;
  maintenanceJobNumber: string;
  invoiceNumber: string;
  adminNotificationTitle: string;
  posNotificationTitle: string;
};

let seed: Px13Seed;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

async function seedPx13Fixtures() {
  const supabase = createServiceRoleClient();
  const admin = await createFixtureUser(supabase, "admin", "px13-alerts-admin");
  const pos = await createFixtureUser(supabase, "pos_staff", "px13-alerts-pos");
  const queryPrefix = `PX13E2E${Date.now().toString().slice(-6)}`;
  const terminalCode = queryPrefix;
  const currentDate = toIsoDate(new Date());
  const yesterday = shiftDays(-1);

  const { data: cashAccount, error: cashAccountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("type", "cash")
    .eq("module_scope", "core")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(1)
    .single<{ id: string }>();

  if (cashAccountError || !cashAccount) {
    throw cashAccountError ?? new Error("PX13 E2E cash account not found.");
  }

  const productName = `${queryPrefix} Low Stock`;
  const { data: lowStockProduct, error: lowStockProductError } = await supabase
    .from("products")
    .insert({
      name: productName,
      category: "accessory",
      sku: `${queryPrefix}-LS`,
      sale_price: 25,
      cost_price: 12,
      avg_cost_price: 12,
      stock_quantity: 1,
      min_stock_level: 2,
      track_stock: true,
      is_quick_add: false,
      created_by: admin.id
    })
    .select("id")
    .single<{ id: string }>();

  if (lowStockProductError || !lowStockProduct) {
    throw lowStockProductError ?? new Error("PX13 E2E low-stock product create failed.");
  }

  const { data: saleProduct, error: saleProductError } = await supabase
    .from("products")
    .insert({
      name: `${queryPrefix} Sale`,
      category: "accessory",
      sku: `${queryPrefix}-SALE`,
      sale_price: 30,
      cost_price: 15,
      avg_cost_price: 15,
      stock_quantity: 10,
      min_stock_level: 1,
      track_stock: true,
      is_quick_add: false,
      created_by: admin.id
    })
    .select("id")
    .single<{ id: string }>();

  if (saleProductError || !saleProduct) {
    throw saleProductError ?? new Error("PX13 E2E sale product create failed.");
  }

  const debtCustomerName = `${queryPrefix} Debt Customer`;
  const { data: debtCustomer, error: debtCustomerError } = await supabase
    .from("debt_customers")
    .insert({
      name: debtCustomerName,
      phone: `0799${Date.now().toString().slice(-6)}`,
      current_balance: 20,
      credit_limit: 100,
      due_date_days: 30,
      created_by: admin.id
    })
    .select("id")
    .single<{ id: string }>();

  if (debtCustomerError || !debtCustomer) {
    throw debtCustomerError ?? new Error("PX13 E2E debt customer create failed.");
  }

  const { error: debtEntryError } = await supabase.from("debt_entries").insert({
    debt_customer_id: debtCustomer.id,
    entry_type: "manual",
    amount: 20,
    due_date: yesterday,
    description: `${queryPrefix} overdue debt`,
    is_paid: false,
    paid_amount: 0,
    remaining_amount: 20,
    idempotency_key: randomUUID(),
    created_by: admin.id
  });

  if (debtEntryError) {
    throw debtEntryError;
  }

  const maintenanceJobNumber = `${queryPrefix}-MAINT`;
  const { data: maintenanceJob, error: maintenanceError } = await supabase
    .from("maintenance_jobs")
    .insert({
      job_number: maintenanceJobNumber,
      job_date: currentDate,
      customer_name: `${queryPrefix} Maintenance Customer`,
      customer_phone: `0788${Date.now().toString().slice(-6)}`,
      device_type: "Android",
      issue_description: `${queryPrefix} ready job`,
      estimated_cost: 15,
      status: "ready",
      notes: `${queryPrefix} maintenance ready`,
      created_by: admin.id
    })
    .select("id")
    .single<{ id: string }>();

  if (maintenanceError || !maintenanceJob) {
    throw maintenanceError ?? new Error("PX13 E2E maintenance job create failed.");
  }

  const { error: reconciliationError } = await supabase.from("reconciliation_entries").insert({
    reconciliation_date: currentDate,
    account_id: cashAccount.id,
    expected_balance: 0,
    actual_balance: 5,
    difference: 5,
    difference_reason: `${queryPrefix} unresolved drift`,
    is_resolved: false,
    created_by: admin.id
  });

  if (reconciliationError) {
    throw reconciliationError;
  }

  const { error: saleError } = await supabase.rpc("create_sale", {
    p_items: [{ product_id: saleProduct.id, quantity: 1, discount_percentage: 0 }],
    p_payments: [{ account_id: cashAccount.id, amount: 30 }],
    p_pos_terminal: terminalCode,
    p_notes: `${queryPrefix} search sale`,
    p_idempotency_key: randomUUID(),
    p_created_by: pos.id
  });

  if (saleError) {
    throw saleError;
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("created_by", pos.id)
    .eq("pos_terminal_code", terminalCode)
    .order("created_at", { ascending: false })
    .limit(1)
    .single<{ invoice_number: string }>();

  if (invoiceError || !invoice) {
    throw invoiceError ?? new Error("PX13 E2E invoice lookup failed.");
  }

  const adminNotificationTitle = `${queryPrefix} low stock #1`;
  const posNotificationTitle = `${queryPrefix} POS notification`;

  const { error: notificationsError } = await supabase.from("notifications").insert([
    {
      user_id: admin.id,
      type: "low_stock",
      title: adminNotificationTitle,
      body: `${queryPrefix} low stock body`,
      reference_type: "product",
      reference_id: lowStockProduct.id
    },
    {
      user_id: admin.id,
      type: "low_stock",
      title: `${queryPrefix} low stock #2`,
      body: `${queryPrefix} low stock duplicate`,
      reference_type: "product",
      reference_id: lowStockProduct.id
    },
    {
      user_id: admin.id,
      type: "maintenance_ready",
      title: `${queryPrefix} maintenance ready`,
      body: `${queryPrefix} maintenance body`,
      reference_type: "maintenance_job",
      reference_id: maintenanceJob.id
    },
    {
      user_id: pos.id,
      type: "maintenance_ready",
      title: posNotificationTitle,
      body: `${queryPrefix} pos body`,
      reference_type: "maintenance_job",
      reference_id: maintenanceJob.id
    }
  ]);

  if (notificationsError) {
    throw notificationsError;
  }

  return {
    admin,
    pos,
    queryPrefix,
    terminalCode,
    productName,
    debtCustomerName,
    maintenanceJobNumber,
    invoiceNumber: invoice.invoice_number,
    adminNotificationTitle,
    posNotificationTitle
  } satisfies Px13Seed;
}

test.describe.serial("PX-13 search + alerts device regression", () => {
  test.beforeAll(async () => {
    seed = await seedPx13Fixtures();
  });

  for (const viewport of deviceViewports) {
    test(`admin alerts center renders safely on ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, seed.admin.email, seed.admin.password, `/notifications?q=${encodeURIComponent(seed.queryPrefix)}&limit=12`);

      await page.waitForLoadState("networkidle");

      await expect(page.getByText("البحث الشامل", { exact: true })).toBeVisible();
      await expect(page.getByText("صندوق الإشعارات", { exact: true })).toBeVisible();
      await expect(page.getByText(seed.productName, { exact: true })).toBeVisible();
      await expect(page.getByText(seed.invoiceNumber, { exact: true })).toBeVisible();
      await expect(page.getByText(seed.debtCustomerName, { exact: true })).toBeVisible();
      await expect(page.getByText(seed.maintenanceJobNumber, { exact: true })).toBeVisible();
      await expect(page.getByText(seed.adminNotificationTitle, { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.goto("/reports", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("button", { name: "تطبيق الفلاتر" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    test(`pos scope remains restricted on ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, seed.pos.email, seed.pos.password, `/notifications?q=${encodeURIComponent(seed.queryPrefix)}&limit=12`);

      await page.waitForLoadState("networkidle");

      await expect(page.getByText("البحث الشامل", { exact: true })).toBeVisible();
      await expect(page.getByText("صندوق الإشعارات", { exact: true })).toBeVisible();
      await expect(page.getByText(seed.posNotificationTitle, { exact: true })).toBeVisible();
      await expect(page.getByText(seed.adminNotificationTitle, { exact: true })).not.toBeVisible();
      await expect(page.getByText(seed.invoiceNumber, { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
