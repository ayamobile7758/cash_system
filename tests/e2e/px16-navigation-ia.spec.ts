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

  test("phone POS sees a clean drawer with role-scoped navigation", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await login(page, seed.pos.email, seed.pos.password);
    await expectNoHorizontalOverflow(page);

    await openNavigation(page);
    const nav = page.getByLabel("التنقل داخل مساحات التشغيل");

    await expect(nav.getByText("التشغيل اليومي")).toBeVisible();
    await expect(nav.getByRole("link", { name: /نقطة البيع/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الفواتير/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الديون/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الإشعارات/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /التقارير/i })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: /الإعدادات/i })).toHaveCount(0);

    await page.goto("/debts", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "الديون", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "العملاء والقيود" })).toBeVisible();
    await expect(page.getByRole("button", { name: "التسديد" })).toBeVisible();
    await expect(page.getByText("ملف العميل")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("tablet admin can use topbar search and notification IA without losing context", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, seed.admin.email, seed.admin.password, "/notifications");
    await expectNoHorizontalOverflow(page);

    await expect(page.getByRole("heading", { name: "الإشعارات", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "صندوق الإشعارات" })).toBeVisible();
    await expect(page.getByRole("button", { name: "الملخصات والتنبيهات" })).toBeVisible();
    await expect(page.getByRole("button", { name: "البحث الشامل" })).toBeVisible();

    await page.getByRole("button", { name: "البحث الشامل" }).click();
    await expect(page.getByRole("heading", { name: "نتائج البحث الحالية" })).toBeVisible();
    await expect(page.getByPlaceholder("اسم منتج، رقم فاتورة، عميل أو رقم صيانة")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("laptop admin gets grouped navigation, breadcrumbs, and decomposed workspaces", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await login(page, seed.admin.email, seed.admin.password, "/invoices");
    const nav = page.getByLabel("التنقل داخل مساحات التشغيل");

    await expect(nav.getByText("التشغيل اليومي")).toBeVisible();
    await expect(nav.getByText("المخزون والخدمات")).toBeVisible();
    await expect(nav.getByText("المتابعة والإدارة")).toBeVisible();
    await expect(page.getByLabel("مسار الصفحة")).toContainText("الفواتير");
    await expect(page.getByRole("button", { name: "الملخص والإيصال" })).toBeVisible();
    await expect(page.getByRole("button", { name: "المرتجع" })).toBeVisible();
    await expect(page.getByRole("button", { name: "الإجراء الإداري" })).toBeVisible();

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
    await expect(page.getByRole("link", { name: "الفلاتر", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "المقارنة", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "المرتجعات", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "الصيانة", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
