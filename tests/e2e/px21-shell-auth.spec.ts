import { expect, test, type Page } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

test.describe.configure({ timeout: 120_000 });

let admin: FixtureUser;
let pos: FixtureUser;

async function openDrawer(page: Page) {
  const toggle = page.getByRole("button", { name: "فتح القائمة" });

  if (await toggle.isVisible()) {
    await toggle.click();
  }
}

test.describe.serial("PX-21 shell + auth entry", () => {
  test.beforeAll(async () => {
    const supabase = createServiceRoleClient();
    admin = await createFixtureUser(supabase, "admin", "px21-admin");
    pos = await createFixtureUser(supabase, "pos_staff", "px21-pos");
  });

  test("homepage and login stay product-facing without technical leakage", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveTitle(/الصفحة الرئيسية/);
    await expect(page.getByRole("heading", { name: "تسجيل الدخول إلى مساحة العمل" })).toBeVisible();
    await expect(page.getByRole("button", { name: "الدخول إلى بيئة التشغيل" })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/PX-|SOP-|baseline/i);
    await expectNoHorizontalOverflow(page);
  });

  test("mobile POS gets an RTL drawer that opens from the right with scoped navigation", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await login(page, pos.email, pos.password);
    await expectNoHorizontalOverflow(page);

    await openDrawer(page);
    const drawer = page.locator(".dashboard-sidebar");
    await expect(drawer).toBeVisible();

    const nav = page.getByLabel("التنقل داخل مساحات التشغيل");
    await expect(nav.getByText("التشغيل اليومي")).toBeVisible();
    await expect(nav.getByText("المتابعة والإدارة")).toHaveCount(0);
    await expect(nav.getByRole("link", { name: /نقطة البيع/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /الإشعارات/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /التقارير/i })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: /الإعدادات/i })).toHaveCount(0);
  });

  test("desktop admin gets the refreshed shell, grouped navigation, and page context", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await login(page, admin.email, admin.password, "/reports");

    await expect(page.getByRole("heading", { name: "قراءة أوضح للأداء والمقارنات" })).toBeVisible();
    await expect(page.locator(".page-header .eyebrow").getByText("مساحات التشغيل", { exact: true })).toBeVisible();
    await expect(page.locator(".dashboard-nav-group__title").getByText("المتابعة والإدارة", { exact: true })).toBeVisible();
    await expect(page.locator(".page-header").first().locator(".page-header__meta").first()).toContainText("إداري");
    await expect(page.locator(".dashboard-quick-search")).toBeVisible();
    await expect(page.getByLabel("مسار الصفحة")).toContainText("التقارير");
    await expectNoHorizontalOverflow(page);
  });
});
