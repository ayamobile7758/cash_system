import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

type DeviceSeed = {
  admin: FixtureUser;
  pos: FixtureUser;
  productId: string;
  productName: string;
  debtCustomerId: string;
  debtCustomerName: string;
};

const deviceViewports = [
  { label: "phone", width: 360, height: 800 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "laptop", width: 1280, height: 900 }
] as const;

const REVIEW_PAYMENT_BUTTON = "مراجعة الدفع";
const PAYMENT_OPTIONS_BUTTON = "خيارات دفع أخرى";
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
const INSTALL_BUTTON = "تثبيت Aya Mobile";

let seed: DeviceSeed;

async function seedDeviceFixtures() {
  const supabase = createServiceRoleClient();
  const admin = await createFixtureUser(supabase, "admin", "px06-device-admin");
  const pos = await createFixtureUser(supabase, "pos_staff", "px06-device-pos");
  const uniquePhone = `079${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 900 + 100)}`;
  const productName = `PX06 Device Flow Product ${randomUUID().slice(0, 6)}`;
  const debtCustomerName = `PX06 Device Debt Customer ${randomUUID().slice(0, 6)}`;

  const { data: insertedProduct, error: productError } = await supabase
    .from("products")
    .insert({
      name: productName,
      category: "accessory",
      sale_price: 55,
      cost_price: 20,
      avg_cost_price: 20,
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
    throw productError ?? new Error("Failed to create PX06 device product.");
  }

  const { data: debtCustomer, error: debtCustomerError } = await supabase
    .from("debt_customers")
    .insert({
      name: debtCustomerName,
      phone: uniquePhone,
      address: "PX06 Device Street",
      current_balance: 0,
      due_date_days: 30,
      credit_limit: 500,
      created_by: admin.id
    })
    .select("id, name")
    .single<{ id: string; name: string }>();

  if (debtCustomerError || !debtCustomer) {
    throw debtCustomerError ?? new Error("Failed to create PX06 debt customer.");
  }

  return {
    admin,
    pos,
    productId: insertedProduct.id,
    productName: insertedProduct.name,
    debtCustomerId: debtCustomer.id,
    debtCustomerName: debtCustomer.name
  } satisfies DeviceSeed;
}

async function ensureOpenDebtForDeviceFlow(adminId: string, debtCustomerId: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("create_debt_manual", {
    p_debt_customer_id: debtCustomerId,
    p_amount: 25,
    p_description: "PX06 device gate open debt",
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
  await expect(page.locator(".result-card").filter({ hasText: "الرصيد المتبقي:" }).first()).toBeVisible();
}

test.describe.serial("PX-06-T03 device gate", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeAll(async () => {
    seed = await seedDeviceFixtures();
  });

  for (const viewport of deviceViewports) {
    test(`UAT-33 + UAT-34 on ${viewport.label}`, async ({ browser }) => {
      await ensureOpenDebtForDeviceFlow(seed.admin.id, seed.debtCustomerId);

      const posContext = await browser.newContext();
      const posPage = await posContext.newPage();

      try {
        await posPage.setViewportSize({ width: viewport.width, height: viewport.height });
        await login(posPage, seed.pos.email, seed.pos.password, "/pos");

        await expect(posPage.locator(".pos-cart-sheet")).toBeVisible();
        await expectNoHorizontalOverflow(posPage);

        if (viewport.label !== "laptop") {
          await posPage.setViewportSize({ width: viewport.height, height: viewport.width });
          await posPage.waitForLoadState("networkidle");
          await expect(posPage.locator(".pos-cart-sheet")).toBeVisible();
          await expectNoHorizontalOverflow(posPage);
          await posPage.setViewportSize({ width: viewport.width, height: viewport.height });
          await posPage.waitForLoadState("networkidle");
        }

        await posPage.getByRole("searchbox").first().fill(seed.productName);
        await posPage.waitForTimeout(400);
        const productButton = posPage
          .getByRole("button", { name: new RegExp(seed.productName) })
          .first();
        await expect(productButton).toBeVisible({ timeout: 15_000 });
        await productButton.click();
        await expect(
          posPage.getByRole("complementary").getByText(seed.productName).first()
        ).toBeVisible();
        await posPage
          .getByRole("button", {
            name: viewport.label === "phone" ? REVIEW_PAYMENT_BUTTON : PAYMENT_OPTIONS_BUTTON,
            exact: true
          })
          .evaluate((element: HTMLButtonElement) => element.click());
        await expect(
          posPage.getByRole("heading", { name: PAYMENT_METHOD_TITLE, exact: true })
        ).toBeVisible();
        await posPage.getByLabel(RECEIVED_AMOUNT_LABEL).fill("100");
        const confirmSaleButton = posPage
          .locator(".pos-cart-surface")
          .getByRole("button", { name: COMPLETE_SALE_BUTTON, exact: true });
        await expect(confirmSaleButton).toBeEnabled();
        await confirmSaleButton.click();
        await expect(posPage.getByText(SALE_SUCCESS_MESSAGE)).toBeVisible();
        await expect(posPage.getByRole("button", { name: PRINT_RECEIPT_BUTTON, exact: true })).toBeVisible();

        await posPage.goto("/invoices", { waitUntil: "domcontentloaded" });
        await posPage.waitForLoadState("networkidle");
        await posPage.getByRole("link", { name: OPEN_INVOICE_LINK }).first().click();
        await posPage.waitForLoadState("networkidle");
        await posPage.getByRole("button", { name: RETURN_BUTTON, exact: true }).click();
        await expect(posPage.getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true })).toBeVisible();
        await expectNoHorizontalOverflow(posPage);
        await posPage.getByLabel(RETURN_QUANTITY_LABEL).first().fill("1");
        await posPage.getByLabel(RETURN_REASON_LABEL).fill(`PX06 device return ${viewport.label}`);
        await posPage.getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true }).click();
        await posPage
          .getByRole("dialog")
          .getByRole("button", { name: EXECUTE_RETURN_BUTTON, exact: true })
          .click();
        await expect(posPage.locator(".result-card").filter({ hasText: "الإجمالي:" }).first()).toBeVisible();

        await settleSeededDebt(posPage, seed.debtCustomerName);
        console.log(`[PX06-T03] UAT-33/34 viewport=${viewport.label} sale+return+debt=PASS`);
      } finally {
        await posContext.close();
      }

      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();

      try {
        await adminPage.setViewportSize({ width: viewport.width, height: viewport.height });
        await login(adminPage, seed.admin.email, seed.admin.password, "/pos");

        await adminPage.goto("/reports", { waitUntil: "domcontentloaded" });
        await adminPage.waitForLoadState("networkidle");
        await expect(adminPage.getByRole("button", { name: FILTER_REPORTS_BUTTON, exact: true })).toBeVisible();
        await expectNoHorizontalOverflow(adminPage);

        await adminPage.goto("/settings", { waitUntil: "domcontentloaded" });
        await adminPage.waitForLoadState("networkidle");
        await adminPage
          .locator(".settings-page__sections")
          .getByRole("button", { name: BALANCE_INTEGRITY_SECTION, exact: true })
          .click();
        await expect(adminPage.getByRole("button", { name: RECHECK_SETTINGS_BUTTON, exact: true })).toBeVisible();
        await expectNoHorizontalOverflow(adminPage);

        const balanceCheckResponse = await adminPage.context().request.post("/api/health/balance-check");
        expect(balanceCheckResponse.status(), await balanceCheckResponse.text()).toBe(200);
      } finally {
        await adminContext.close();
      }
    });
  }

  test("UAT-35 installability metadata and prompt baseline stay valid", async ({ page }) => {
    const homeResponse = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(homeResponse?.headers()["x-aya-device-policy"]).toBe("enforced");
    await page.waitForLoadState("networkidle");

    const manifestResponse = await page.context().request.get("/manifest.webmanifest");
    const manifest = await manifestResponse.json();
    expect(manifestResponse.ok()).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons).toHaveLength(2);

    const installButton = page.getByRole("button", { name: INSTALL_BUTTON, exact: true });
    await expect(installButton).toBeVisible();
    await expect(page.locator(".install-status")).toBeVisible();
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const promptState = {
        prompted: false
      };

      // @ts-expect-error test-only probe
      window.__px06InstallProbe = promptState;

      const promptEvent = new Event("beforeinstallprompt");
      Object.assign(promptEvent, {
        prompt: () => {
          promptState.prompted = true;
          return Promise.resolve();
        },
        userChoice: Promise.resolve({
          outcome: "accepted",
          platform: "web"
        }),
        preventDefault: () => {}
      });

      window.dispatchEvent(promptEvent);
    });

    await expect(installButton).toBeEnabled();
    await installButton.dispatchEvent("click");
    await expect(page.locator(".install-status")).toHaveAttribute("data-install-state", "accepted");

    const prompted = await page.evaluate(() => {
      // @ts-expect-error test-only probe
      return window.__px06InstallProbe?.prompted ?? false;
    });

    expect(prompted).toBe(true);
    console.log("[PX06-T03] UAT-35 installability=PASS display=standalone prompt=accepted");
  });
});
