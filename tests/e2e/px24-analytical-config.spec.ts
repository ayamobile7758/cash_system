import { expect, test } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

test.describe.configure({ timeout: 120_000 });

let admin: FixtureUser;

test.describe.serial("PX-24 analytical and configuration surfaces", () => {
  test.beforeAll(async () => {
    const supabase = createServiceRoleClient();
    admin = await createFixtureUser(supabase, "admin", "px24-admin");
  });

  test("phone admin gets a calmer filter-first reports surface", async ({ page }) => {
    await login(page, admin.email, admin.password, "/reports");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/reports", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "التقارير المتقدمة والتحليلات المقارنة" })).toBeVisible();
    await expect(page.getByRole("button", { name: "تطبيق الفلاتر" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "نطاق التقرير" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ملخص الفترة الحالية مقابل فترة المقارنة" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("tablet admin gets grouped settings sections with safer hierarchy", async ({ page }) => {
    await login(page, admin.email, admin.password, "/settings");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "الإعدادات التشغيلية والإغلاق اليومي" })).toBeVisible();
    const sectionNav = page.getByLabel("أقسام شاشة الإعدادات");
    await expect(sectionNav.getByRole("button", { name: "الصلاحيات" })).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "اللقطة اليومية" })).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "السياسات" })).toBeVisible();

    await sectionNav.getByRole("button", { name: "السياسات" }).click();
    await expect(page.getByRole("heading", { name: "قرار الطباعة في MVP" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "قرار المستخدم/الجهاز" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("desktop admin gets calmer portability IA with export import restore and history sections", async ({
    page
  }) => {
    await login(page, admin.email, admin.password, "/portability");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/portability", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "مركز النقل والاستيراد والاستعادة التجريبية" })).toBeVisible();
    const sectionNav = page.getByLabel("أقسام شاشة النقل والنسخ");
    await expect(sectionNav.getByRole("button", { name: "إنشاء الحزم" })).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "فحص الاستيراد" })).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "الاستعادة التجريبية" })).toBeVisible();
    await expect(sectionNav.getByRole("button", { name: "السجل الأخير" })).toBeVisible();

    await sectionNav.getByRole("button", { name: "فحص الاستيراد" }).click();
    await expect(page.getByRole("heading", { name: "افحص الملف أولًا ثم اعتمد الصفوف السليمة" })).toBeVisible();

    await sectionNav.getByRole("button", { name: "الاستعادة التجريبية" }).click();
    await expect(page.getByRole("heading", { name: "استعادة معزولة داخل بيئة الاختبار" })).toBeVisible();

    await sectionNav.getByRole("button", { name: "السجل الأخير" }).click();
    await expect(page.getByRole("heading", { name: "سجل الحزم الجاهزة والملغاة" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "فحوص الاستيراد وتجارب الاستعادة" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
