import { expect, test, type Page } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

test.describe.configure({ timeout: 120_000 });

type Px16Seed = {
  admin: FixtureUser;
  pos: FixtureUser;
};

let seed: Px16Seed;

async function openNavigation(page: Page) {
  const toggle = page.getByRole("button", { name: "فتح القائمة" });

  if (await toggle.isVisible()) {
    await toggle.click();
  }
}

test.describe.serial("PX-16 navigation + IA", () => {
  test.beforeAll(async () => {
    const supabase = createServiceRoleClient();
    seed = {
      admin: await createFixtureUser(supabase, "admin", "px16-admin"),
      pos: await createFixtureUser(supabase, "pos_staff", "px16-pos")
    };
  });

  test("phone POS sees role-scoped navigation without admin-only entries", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await login(page, seed.pos.email, seed.pos.password);
    await expectNoHorizontalOverflow(page);

    await openNavigation(page);
    const nav = page.getByLabel("التنقل داخل مساحات التشغيل");

    await expect(nav.getByRole("link", { name: /نقطة البيع/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الفواتير/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الديون/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الإشعارات/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /التقارير/i })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: /الإعدادات/i })).toHaveCount(0);

    await page.goto("/debts", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("main").getByRole("heading", { name: "الديون", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "العملاء والقيود" })).toBeVisible();
    await expect(
      page.getByLabel("أقسام شاشة الديون").getByRole("button", { name: "التسديد" })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("tablet admin can use topbar search and notification IA without losing context", async ({
    page
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, seed.admin.email, seed.admin.password, "/notifications");
    await expectNoHorizontalOverflow(page);

    await expect(
      page.locator("main").getByRole("heading", { name: "الإشعارات", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "صندوق الإشعارات" })).toBeVisible();
    await expect(page.getByRole("button", { name: "الملخصات والتنبيهات" })).toBeVisible();
    await expect(page.getByRole("button", { name: "البحث الشامل" })).toBeVisible();

    await page.getByRole("button", { name: "البحث الشامل" }).click();
    await expect(
      page.getByPlaceholder("اسم منتج، رقم فاتورة، عميل أو رقم صيانة")
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("laptop admin gets admin navigation and decomposed workspace sections", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await login(page, seed.admin.email, seed.admin.password, "/invoices");
    const nav = page.getByLabel("التنقل داخل مساحات التشغيل");

    await expect(nav.getByRole("link", { name: /نقطة البيع/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /المنتجات/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الفواتير/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الجرد/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /التقارير/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الإعدادات/i })).toBeVisible();
    await expect(page.locator("main").getByRole("heading", { name: "الفواتير" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "السجل" })).toBeVisible();
    await expect(page.getByRole("button", { name: "الأحدث" })).toBeVisible();
    await expect(page.getByRole("button", { name: "الأعلى قيمة" })).toBeVisible();
    await expect(page.getByRole("button", { name: "الأعلى دينًا" })).toBeVisible();

    await page.goto("/inventory", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    const inventorySections = page.getByLabel("أقسام شاشة الجرد");
    await expect(inventorySections.getByRole("button", { name: "بدء الجرد" })).toBeVisible();
    await expect(inventorySections.getByRole("button", { name: "الجرد المفتوح" })).toBeVisible();
    await expect(inventorySections.getByRole("button", { name: "التسوية" })).toBeVisible();

    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    const settingsSections = page.getByLabel("أقسام شاشة الإعدادات");
    await expect(settingsSections.getByRole("button", { name: "الصلاحيات" })).toBeVisible();
    await expect(settingsSections.getByRole("button", { name: "اللقطة اليومية" })).toBeVisible();
    await expect(settingsSections.getByRole("button", { name: "سلامة الأرصدة" })).toBeVisible();
    await expect(settingsSections.getByRole("button", { name: "السياسات" })).toBeVisible();

    await page.goto("/reports", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    const reportsSections = page.getByLabel("التنقل داخل أقسام التقارير");
    // Default tab is "نظرة عامة" so shared + overview links are visible.
    await expect(reportsSections.getByRole("link", { name: "الفلاتر", exact: true })).toBeVisible();
    await expect(reportsSections.getByRole("link", { name: "المقارنة", exact: true })).toBeVisible();
    await expect(reportsSections.getByRole("link", { name: "لوحة المؤشرات", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "المبيعات والمرتجعات", exact: true }).click();
    await expect(reportsSections.getByRole("link", { name: "المبيعات", exact: true })).toBeVisible();
    await expect(reportsSections.getByRole("link", { name: "المرتجعات", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "الحسابات والعمليات", exact: true }).click();
    await expect(reportsSections.getByRole("link", { name: "الصيانة", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
