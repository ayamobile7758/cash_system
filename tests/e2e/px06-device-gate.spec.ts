import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
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

let seed: DeviceSeed;

async function seedDeviceFixtures() {
  const supabase = createServiceRoleClient();
  const admin = await createFixtureUser(supabase, "admin", "px06-device-admin");
  const pos = await createFixtureUser(supabase, "pos_staff", "px06-device-pos");
  const uniquePhone = `079${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 900 + 100)}`;

  const { data: insertedProduct, error: productError } = await supabase
    .from("products")
    .insert({
      name: "PX06 Device Flow Product",
      category: "accessory",
      sale_price: 55,
      cost_price: 20,
      avg_cost_price: 20,
      stock_quantity: 40,
      min_stock_level: 1,
      track_stock: true,
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
      name: "PX06 Device Debt Customer",
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

        await expect(posPage.getByRole("button", { name: "تأكيد البيع" })).toBeVisible();
        await expectNoHorizontalOverflow(posPage);

        if (viewport.label !== "laptop") {
          await posPage.setViewportSize({ width: viewport.height, height: viewport.width });
          await posPage.waitForLoadState("networkidle");
          await expect(posPage.getByRole("button", { name: "تأكيد البيع" })).toBeVisible();
          await expectNoHorizontalOverflow(posPage);
          await posPage.setViewportSize({ width: viewport.width, height: viewport.height });
          await posPage.waitForLoadState("networkidle");
        }

        await posPage.getByRole("button", { name: new RegExp(seed.productName) }).first().click();
        await expect(posPage.getByRole("complementary").getByText(seed.productName)).toBeVisible();
        await posPage.getByRole("button", { name: "تأكيد البيع" }).click();
        await expect(posPage.getByText("Last Sale")).toBeVisible();

        await posPage.goto("/invoices", { waitUntil: "domcontentloaded" });
        await posPage.waitForLoadState("networkidle");
        await expect(posPage.getByRole("button", { name: "تأكيد المرتجع" })).toBeVisible();
        await expectNoHorizontalOverflow(posPage);
        await posPage.getByLabel("كمية الإرجاع").first().fill("1");
        await posPage.getByLabel("سبب الإرجاع").fill(`PX06 device return ${viewport.label}`);
        await posPage.getByRole("button", { name: "تأكيد المرتجع" }).click();
        await expect(posPage.locator(".result-card").filter({ hasText: "الإجمالي:" }).first()).toBeVisible();

        await posPage.goto("/debts", { waitUntil: "domcontentloaded" });
        await posPage.waitForLoadState("networkidle");
        await expect(posPage.getByRole("button", { name: "تأكيد التسديد" })).toBeVisible();
        await expectNoHorizontalOverflow(posPage);
        await posPage.getByPlaceholder("ابحث باسم العميل أو الهاتف").fill(seed.debtCustomerName);
        await posPage.locator("button.list-card--interactive").first().click();
        await posPage.getByLabel("المبلغ").last().fill("5");
        await posPage.getByRole("button", { name: "تأكيد التسديد" }).click();
        await expect(posPage.locator(".result-card").filter({ hasText: "الرصيد المتبقي:" }).first()).toBeVisible();
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
        await expect(adminPage.getByRole("button", { name: "تطبيق الفلاتر" })).toBeVisible();
        await expectNoHorizontalOverflow(adminPage);

        await adminPage.goto("/settings", { waitUntil: "domcontentloaded" });
        await adminPage.waitForLoadState("networkidle");
        await expect(adminPage.getByRole("button", { name: "إعادة الفحص" })).toBeVisible();
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

    const manifestResponse = await page.context().request.get("/manifest.webmanifest");
    const manifest = await manifestResponse.json();
    expect(manifestResponse.ok()).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons).toHaveLength(2);

    const installButton = page.getByRole("button", { name: "تثبيت Aya Mobile" });
    await expect(installButton).toBeVisible();

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
    await installButton.click();
    await expect(page.getByText("تم تثبيت التطبيق أو تم قبول التثبيت من قبل المستخدم.")).toBeVisible();

    const prompted = await page.evaluate(() => {
      // @ts-expect-error test-only probe
      return window.__px06InstallProbe?.prompted ?? false;
    });

    expect(prompted).toBe(true);
    console.log("[PX06-T03] UAT-35 installability=PASS display=standalone prompt=accepted");
  });
});
