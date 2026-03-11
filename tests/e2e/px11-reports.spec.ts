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

let admin: FixtureUser;
let seededDate = "";

async function seedPx11Fixtures() {
  const supabase = createServiceRoleClient();
  admin = await createFixtureUser(supabase, "admin", "px11-reports-admin");
  seededDate = new Date().toISOString().slice(0, 10);

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("type", "cash")
    .eq("module_scope", "core")
    .single<{ id: string }>();
  if (accountError || !account) {
    throw accountError ?? new Error("Core cash account not found.");
  }

  const { data: category, error: categoryError } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single<{ id: string }>();
  if (categoryError || !category) {
    throw categoryError ?? new Error("Expense category not found.");
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      name: `PX11 E2E Product ${Date.now()}`,
      category: "accessory",
      sale_price: 90,
      cost_price: 55,
      avg_cost_price: 55,
      stock_quantity: 20,
      min_stock_level: 1,
      track_stock: true,
      is_quick_add: false,
      created_by: admin.id
    })
    .select("id")
    .single<{ id: string }>();
  if (productError || !product) {
    throw productError ?? new Error("PX11 E2E product create failed.");
  }

  const { error: saleError } = await supabase.rpc("create_sale", {
    p_items: [{ product_id: product.id, quantity: 1 }],
    p_payments: [{ account_id: account.id, amount: 90 }],
    p_pos_terminal: "PX11-E2E",
    p_notes: "PX11 E2E sale",
    p_idempotency_key: randomUUID(),
    p_created_by: admin.id
  });
  if (saleError) {
    throw saleError;
  }

  const { error: expenseError } = await supabase.rpc("create_expense", {
    p_amount: 10,
    p_account_id: account.id,
    p_category_id: category.id,
    p_description: "PX11 E2E expense",
    p_notes: "PX11 E2E expense",
    p_idempotency_key: randomUUID(),
    p_created_by: admin.id
  });
  if (expenseError) {
    throw expenseError;
  }

  const { error: snapshotError } = await supabase.rpc("create_daily_snapshot", {
    p_snapshot_date: seededDate,
    p_notes: "PX11 E2E snapshot",
    p_created_by: admin.id
  });
  if (snapshotError) {
    throw snapshotError;
  }
}

test.describe.serial("PX-11 advanced reports", () => {
  test.beforeAll(async () => {
    await seedPx11Fixtures();
  });

  for (const viewport of deviceViewports) {
    test(`advanced reports render safely on ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, admin.email, admin.password, "/reports");

      await page.goto(`/reports?from_date=${seededDate}&to_date=${seededDate}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { name: "التقارير المتقدمة والتحليلات المقارنة" })).toBeVisible();
      await expect(page.getByRole("button", { name: "تطبيق الفلاتر" })).toBeVisible();
      await expect(page.getByText("ملخص الفترة الحالية مقابل فترة المقارنة")).toBeVisible();
      await expect(page.getByText("اتجاه المبيعات وصافي الربح")).toBeVisible();
      await expect(page.getByText("تفكيك البعد الحالي")).toBeVisible();

      await page.getByLabel("من تاريخ المقارنة").fill(seededDate);
      await page.getByLabel("إلى تاريخ المقارنة").fill(seededDate);
      await page.getByLabel("التجميع").selectOption("week");
      await page.getByLabel("بعد التحليل").selectOption("account");
      await page.getByRole("button", { name: "تطبيق الفلاتر" }).click();
      await page.waitForLoadState("networkidle");

      const exportLink = page.getByRole("link", { name: "تصدير Excel المتقدم" });
      await expect(exportLink).toHaveAttribute("href", /\/api\/reports\/advanced\/export/);
      await expectNoHorizontalOverflow(page);
    });
  }
});
