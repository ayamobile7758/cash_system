import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const deviceViewports = [
  { label: "phone", width: 360, height: 800 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "laptop", width: 1280, height: 900 }
] as const;

test.describe.configure({ timeout: 90_000 });

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing local Supabase env for device QA tests.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function ensureOpenInventoryCount() {
  const supabase = createServiceRoleClient();

  const { data: existingCount, error: existingCountError } = await supabase
    .from("inventory_counts")
    .select("id")
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existingCountError) {
    throw existingCountError;
  }

  if (existingCount?.id) {
    const { data: existingItems, error: existingItemsError } = await supabase
      .from("inventory_count_items")
      .select("product_id, actual_quantity, reason")
      .eq("inventory_count_id", existingCount.id)
      .order("product_id", { ascending: true });

    if (existingItemsError) {
      throw existingItemsError;
    }

    return {
      inventoryCountId: existingCount.id,
      items: (existingItems ?? []).map((item) => ({
        product_id: item.product_id,
        actual_quantity: item.actual_quantity,
        reason: item.reason ?? undefined
      }))
    };
  }

  const [{ data: adminProfile, error: adminProfileError }, { data: product, error: productError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("is_active", true)
        .limit(1)
        .single<{ id: string }>(),
      supabase
        .from("products")
        .select("id, stock_quantity")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single<{ id: string; stock_quantity: number }>()
    ]);

  if (adminProfileError) {
    throw adminProfileError;
  }

  if (productError) {
    throw productError;
  }

  const { data: createdCount, error: createCountError } = await supabase
    .from("inventory_counts")
    .insert({
      count_type: "daily",
      notes: "PX05 device QA inventory count",
      created_by: adminProfile.id
    })
    .select("id")
    .single<{ id: string }>();

  if (createCountError || !createdCount) {
    throw createCountError ?? new Error("Failed to create inventory count.");
  }

  const { error: createItemError } = await supabase.from("inventory_count_items").insert({
    inventory_count_id: createdCount.id,
    product_id: product.id,
    system_quantity: product.stock_quantity,
    actual_quantity: product.stock_quantity,
    difference: 0,
    reason: "PX05 device QA"
  });

  if (createItemError) {
    throw createItemError;
  }

  return {
    inventoryCountId: createdCount.id,
    items: [
      {
        product_id: product.id,
        actual_quantity: product.stock_quantity,
        reason: "PX05 device QA"
      }
    ]
  };
}

async function getFirstActiveAccount() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, current_balance")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(1)
    .single<{ id: string; current_balance: number }>();

  if (error || !data) {
    throw error ?? new Error("Failed to load an active account.");
  }

  return data;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await expect(page.getByRole("button", { name: "الدخول إلى بيئة التشغيل" })).toBeEnabled();
  await page.getByRole("button", { name: "الدخول إلى بيئة التشغيل" }).click();
  await page.waitForURL("**/pos");
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 2;
  });

  expect(hasOverflow).toBeFalsy();
}

for (const viewport of deviceViewports) {
  test(`pos + invoices + debts flow works on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await login(page, "pos@aya.local", "Pos12345!");

    await expect(page.getByRole("heading", { name: "نقطة البيع الأساسية" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /PX05 Fast Charger/ }).first().click();
    await expect(page.getByRole("complementary").getByText("PX05 Fast Charger")).toBeVisible();
    await expect(page.getByLabel("حساب الدفع")).toBeEnabled();
    await page.getByRole("button", { name: "تأكيد البيع" }).click();
    await expect(page.getByText("السلة فارغة")).toBeVisible();
    await expect(page.getByText("Last Sale")).toBeVisible();

    await page.goto("/invoices", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "الفواتير والمرتجعات والطباعة" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByLabel("كمية الإرجاع").first().fill("1");
    await page.getByLabel("سبب الإرجاع").fill(`PX05 return ${viewport.label}`);
    await page.getByRole("button", { name: "تأكيد المرتجع" }).click();
    await expect(page.locator(".result-card").filter({ hasText: "الإجمالي:" }).first()).toBeVisible();

    await page.goto("/debts", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "الديون والتسديد" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator("button.list-card--interactive").first().click();
    await page.getByLabel("المبلغ").last().fill("5");
    await page.getByRole("button", { name: "تأكيد التسديد" }).click();
    await expect(page.locator(".result-card").filter({ hasText: "الرصيد المتبقي:" }).first()).toBeVisible();
  });

  test(`reports + settings render safely on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await login(page, "admin@aya.local", "Admin123!");

    await page.goto("/reports", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "التقارير والملخصات التشغيلية" })).toBeVisible();
    await expect(page.getByRole("button", { name: "تطبيق الفلاتر" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "الإعدادات التشغيلية والإغلاق اليومي" })).toBeVisible();
    await expect(page.getByRole("button", { name: "إعادة الفحص" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const balanceCheckResponse = await page.context().request.post("/api/health/balance-check");
    expect(balanceCheckResponse.status(), await balanceCheckResponse.text()).toBe(200);

    const activeAccount = await getFirstActiveAccount();
    const reconciliationResponse = await page.context().request.post("/api/reconciliation", {
      data: {
        account_id: activeAccount.id,
        actual_balance: activeAccount.current_balance,
        notes: `PX05 reconcile ${viewport.label}`
      }
    });
    expect(reconciliationResponse.status(), await reconciliationResponse.text()).toBe(200);

    const snapshotResponse = await page.context().request.post("/api/snapshots", {
      data: {
        notes: `PX05 snapshot ${viewport.label}`
      }
    });
    expect(snapshotResponse.status(), await snapshotResponse.text()).toBe(200);
  });
}

test("admin can complete the seeded inventory count from settings", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const inventoryDraft = await ensureOpenInventoryCount();
  await login(page, "admin@aya.local", "Admin123!");
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "الإعدادات التشغيلية والإغلاق اليومي" })).toBeVisible();
  const inventoryResponse = await page.context().request.post("/api/inventory/counts/complete", {
    data: {
      inventory_count_id: inventoryDraft.inventoryCountId,
      items: inventoryDraft.items
    }
  });
  expect(inventoryResponse.status(), await inventoryResponse.text()).toBe(200);
});
