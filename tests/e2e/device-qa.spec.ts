import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
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

const REVIEW_PAYMENT_BUTTON = "مراجعة الدفع";
const PAYMENT_METHOD_TITLE = "طريقة الدفع";
const RECEIVED_AMOUNT_LABEL = "المبلغ المستلم";
const COMPLETE_SALE_BUTTON = "إتمام البيع";
const SALE_SUCCESS_MESSAGE = "تم إتمام البيع بنجاح";
const PRINT_RECEIPT_BUTTON = "طباعة إيصال";
const OPEN_INVOICE_LINK = /فتح الفاتورة/i;
const RETURN_BUTTON = "المرتجع";
const EXECUTE_RETURN_BUTTON = "تنفيذ المرتجع";
const RETURN_QUANTITY_LABEL = "كمية الإرجاع";
const RETURN_REASON_LABEL = "سبب الإرجاع";
const CUSTOMER_SEARCH_PLACEHOLDER = "ابحث باسم العميل أو الهاتف";
const PAYMENT_SECTION_BUTTON = "التسديد";
const PAYMENT_AMOUNT_LABEL = "المبلغ";
const CONFIRM_DEBT_PAYMENT_BUTTON = "تأكيد التسديد";
const FILTER_REPORTS_BUTTON = "تطبيق الفلاتر";
const BALANCE_INTEGRITY_SECTION = "سلامة الأرصدة";
const RECHECK_SETTINGS_BUTTON = "إعادة الفحص";

const RESULT_CARD_TIMEOUT_MS = 15_000;

test.describe.configure({ timeout: 120_000 });

type DeviceQaSeed = {
  admin: FixtureUser;
  pos: FixtureUser;
  productId: string;
  productName: string;
  debtCustomerId: string;
  debtCustomerName: string;
};

let seed: DeviceQaSeed;

async function seedDeviceQaFixtures() {
  const supabase = createServiceRoleClient();
  const admin = await createFixtureUser(supabase, "admin", "device-qa-admin");
  const pos = await createFixtureUser(supabase, "pos_staff", "device-qa-pos");
  const uniquePhone = `079${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 900 + 100)}`;
  const productName = `PX05 Fast Charger ${randomUUID().slice(0, 6)}`;
  const debtCustomerName = `PX05 Device Debt Customer ${randomUUID().slice(0, 6)}`;

  const { data: insertedProduct, error: productError } = await supabase
    .from("products")
    .insert({
      name: productName,
      category: "accessory",
      sale_price: 45,
      cost_price: 18,
      avg_cost_price: 18,
      stock_quantity: 40,
      min_stock_level: 1,
      track_stock: true,
      is_active: true,
      is_quick_add: true,
      created_by: admin.id
    })
    .select("id, name")
    .single<{ id: string; name: string }>();

  if (productError || !insertedProduct) {
    throw productError ?? new Error("Failed to create device QA product.");
  }

  const { data: debtCustomer, error: debtCustomerError } = await supabase
    .from("debt_customers")
    .insert({
      name: debtCustomerName,
      phone: uniquePhone,
      address: "PX05 Device Street",
      current_balance: 0,
      due_date_days: 30,
      credit_limit: 500,
      created_by: admin.id
    })
    .select("id, name")
    .single<{ id: string; name: string }>();

  if (debtCustomerError || !debtCustomer) {
    throw debtCustomerError ?? new Error("Failed to create device QA debt customer.");
  }

  return {
    admin,
    pos,
    productId: insertedProduct.id,
    productName: insertedProduct.name,
    debtCustomerId: debtCustomer.id,
    debtCustomerName: debtCustomer.name
  } satisfies DeviceQaSeed;
}

async function ensureOpenInventoryCount(adminId: string, productId: string) {
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

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single<{ stock_quantity: number }>();

  if (productError || !product) {
    throw productError ?? new Error("Failed to load the seeded device QA product.");
  }

  const { data: createdCount, error: createCountError } = await supabase
    .from("inventory_counts")
    .insert({
      count_type: "daily",
      notes: "PX05 device QA inventory count",
      created_by: adminId
    })
    .select("id")
    .single<{ id: string }>();

  if (createCountError || !createdCount) {
    throw createCountError ?? new Error("Failed to create inventory count.");
  }

  const { error: createItemError } = await supabase.from("inventory_count_items").insert({
    inventory_count_id: createdCount.id,
    product_id: productId,
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
        product_id: productId,
        actual_quantity: product.stock_quantity,
        reason: "PX05 device QA"
      }
    ]
  };
}

async function createReconciliationAccount(label: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      name: `PX05 QA ${label} ${randomUUID().slice(0, 8)}`,
      type: "cash",
      module_scope: "core",
      fee_percentage: 0,
      opening_balance: 0,
      current_balance: 0,
      display_order: 900
    })
    .select("id, current_balance")
    .single<{ id: string; current_balance: number }>();

  if (error || !data) {
    throw error ?? new Error(`Failed to create reconciliation account for ${label}.`);
  }

  return data;
}

async function ensureOpenDebt(adminId: string, debtCustomerId: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("create_debt_manual", {
    p_debt_customer_id: debtCustomerId,
    p_amount: 25,
    p_description: "PX05 device QA open debt",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  if (error) {
    throw error;
  }
}

async function settleSeededDebt(page: Page, customerName: string) {
  await page.goto("/debts", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expectNoHorizontalOverflow(page);
  await page.getByPlaceholder(CUSTOMER_SEARCH_PLACEHOLDER).fill(customerName);
  await page.locator("button.list-card--interactive").filter({ hasText: customerName }).first().click();
  await page
    .locator(".debts-page__sections")
    .getByRole("button", { name: PAYMENT_SECTION_BUTTON, exact: true })
    .click();
  await page.getByLabel(PAYMENT_AMOUNT_LABEL, { exact: true }).fill("5");
  const confirmDebtPaymentButton = page.getByRole("button", {
    name: CONFIRM_DEBT_PAYMENT_BUTTON,
    exact: true
  });
  await expect(confirmDebtPaymentButton).toBeEnabled();
  await confirmDebtPaymentButton.click();
  await expect(
    page.locator(".result-card").filter({ hasText: "الرصيد المتبقي:" }).first()
  ).toBeVisible({ timeout: RESULT_CARD_TIMEOUT_MS });
}

test.describe.serial("PX-05 device QA regression", () => {
  test.beforeAll(async () => {
    seed = await seedDeviceQaFixtures();
  });

  for (const viewport of deviceViewports) {
    test(`pos + invoices + debts flow works on ${viewport.label}`, async ({ page }) => {
      await ensureOpenDebt(seed.admin.id, seed.debtCustomerId);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, seed.pos.email, seed.pos.password);

      await expect(page.locator(".pos-cart-sheet")).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.getByRole("searchbox").first().fill(seed.productName);
      await page.waitForTimeout(400);
      const productButton = page.getByRole("button", { name: new RegExp(seed.productName) }).first();
      await expect(productButton).toBeVisible({ timeout: 15_000 });
      await productButton.click();
      await expect(page.getByRole("complementary").getByText(seed.productName)).toBeVisible();
      await page
        .getByRole("button", { name: REVIEW_PAYMENT_BUTTON, exact: true })
        .evaluate((element: HTMLButtonElement) => element.click());
      await expect(page.getByText(PAYMENT_METHOD_TITLE, { exact: true })).toBeVisible();
      await page.getByLabel(RECEIVED_AMOUNT_LABEL).fill("100");
      const confirmSaleButton = page
        .locator(".pos-cart-surface")
        .getByRole("button", { name: COMPLETE_SALE_BUTTON, exact: true });
      await expect(confirmSaleButton).toBeEnabled();
      await confirmSaleButton.click();
      await expect(page.getByText(SALE_SUCCESS_MESSAGE)).toBeVisible();
      await expect(page.getByRole("button", { name: PRINT_RECEIPT_BUTTON, exact: true })).toBeVisible();

      await page.goto("/invoices", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page.getByRole("link", { name: OPEN_INVOICE_LINK }).first().click();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: RETURN_BUTTON, exact: true }).click();
      await expect(page.getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.getByLabel(RETURN_QUANTITY_LABEL).first().fill("1");
      await page.getByLabel(RETURN_REASON_LABEL).fill(`PX05 return ${viewport.label}`);
      await page.getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true })
        .click();
      await expect(
        page.locator(".result-card").filter({ hasText: "الإجمالي:" }).first()
      ).toBeVisible({ timeout: RESULT_CARD_TIMEOUT_MS });

      await settleSeededDebt(page, seed.debtCustomerName);
    });

    test(`reports + settings render safely on ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, seed.admin.email, seed.admin.password);

      await page.goto("/reports", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("button", { name: FILTER_REPORTS_BUTTON, exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.goto("/settings", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page
        .locator(".settings-page__sections")
        .getByRole("button", { name: BALANCE_INTEGRITY_SECTION, exact: true })
        .click();
      await expect(page.getByRole("button", { name: RECHECK_SETTINGS_BUTTON, exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const balanceCheckResponse = await page.context().request.post("/api/health/balance-check");
      expect(balanceCheckResponse.status(), await balanceCheckResponse.text()).toBe(200);

      const activeAccount = await createReconciliationAccount(viewport.label);
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
    const inventoryDraft = await ensureOpenInventoryCount(seed.admin.id, seed.productId);
    await login(page, seed.admin.email, seed.admin.password);
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page
      .locator(".settings-page__sections")
      .getByRole("button", { name: BALANCE_INTEGRITY_SECTION, exact: true })
      .click();

    await expect(page.getByRole("button", { name: RECHECK_SETTINGS_BUTTON, exact: true })).toBeVisible();
    const inventoryResponse = await page.context().request.post("/api/inventory/counts/complete", {
      data: {
        inventory_count_id: inventoryDraft.inventoryCountId,
        items: inventoryDraft.items
      }
    });
    expect(inventoryResponse.status(), await inventoryResponse.text()).toBe(200);
  });
});
