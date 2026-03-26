import { expect, test, type Locator } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

test.describe.configure({ timeout: 120_000 });

const darkModeViewports = [
  { label: "phone", width: 360, height: 800 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "laptop", width: 1280, height: 900 }
] as const;

let admin: FixtureUser;
let pos: FixtureUser;

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

async function expectVisibleFocus(locator: Locator) {
  const focusStyles = await locator.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      outlineStyle: styles.outlineStyle,
      outlineWidth: styles.outlineWidth,
      boxShadow: styles.boxShadow
    };
  });

  const hasOutline = focusStyles.outlineStyle !== "none" && focusStyles.outlineWidth !== "0px";
  const hasShadow = focusStyles.boxShadow !== "none";

  expect(hasOutline || hasShadow).toBeTruthy();
}

test.describe.serial("PX-18 visual system + accessibility", () => {
  test.beforeAll(async () => {
    const supabase = createServiceRoleClient();
    admin = await createFixtureUser(supabase, "admin", "px18-admin");
    pos = await createFixtureUser(supabase, "pos_staff", "px18-pos");
  });

  test("UAT-61 page metadata and visual hierarchy are clear on core surfaces", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/الصفحة الرئيسية/);
    await expect(page.getByRole("heading", { name: "تسجيل الدخول إلى مساحة العمل" })).toBeVisible();
    await expect(page.locator(".login-panel--accent")).toBeVisible();

    await login(page, admin.email, admin.password, "/reports");
    await expect(page).toHaveTitle(/التقارير/);
    await expect(page.getByRole("heading", { name: "قراءة أوضح للأداء والمقارنات" })).toBeVisible();
    await expect(page.getByText("ابدأ بالفلاتر، راجع المؤشرات الأساسية")).toBeVisible();
    await expect(page.locator(".analytical-page__meta-grid").first()).toBeVisible();
    await expect(page.locator(".data-table").first()).toBeVisible();
    await expect(page.locator(".dashboard-breadcrumbs")).toBeVisible();
  });

  test("UAT-62 keyboard focus and touch targets are accessible on POS and dashboard shell", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await login(page, pos.email, pos.password, "/pos");
    await expectNoHorizontalOverflow(page);

    const menuToggle = page.getByRole("button", { name: "فتح القائمة" });
    const topbarSearchField = page.locator("form.dashboard-quick-search .workspace-search");
    const topbarSearchInput = page.getByPlaceholder("ابحث سريعًا عن فاتورة أو منتج أو عميل");
    const topbarSearchButton = page.getByRole("button", { name: "البحث الشامل" });
    const productSearchField = page.locator(".transaction-toolbar__search").first();
    const productSearchInput = page.getByPlaceholder("ابحث باسم المنتج أو SKU");
    const confirmSaleButton = page.getByRole("button", { name: "تأكيد البيع" });

    await expectTouchTarget(menuToggle);
    await expectTouchTarget(topbarSearchField);
    await expectTouchTarget(productSearchField);
    await expectTouchTarget(confirmSaleButton);

    await expect(productSearchInput).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(page.getByLabel("مسار الصفحة").getByRole("link", { name: "نقطة البيع" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("link", { name: "الرئيسية" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(topbarSearchButton).toBeFocused();
    await expectVisibleFocus(topbarSearchButton);

    await page.keyboard.press("Shift+Tab");
    await expect(topbarSearchInput).toBeFocused();
    await expectVisibleFocus(topbarSearchInput);

    await page.keyboard.press("Shift+Tab");
    await expect(menuToggle).toBeFocused();
    await expectVisibleFocus(menuToggle);

    await menuToggle.click();
    const nav = page.getByLabel("التنقل داخل مساحات التشغيل");
    const posLink = nav.getByRole("link", { name: /نقطة البيع/i }).first();
    await expectTouchTarget(posLink);
    await expect(posLink).toHaveAttribute("aria-current", "page");

    const categoryChip = page.getByRole("button", { name: "الكل" }).first();
    await expect(categoryChip).toHaveAttribute("aria-pressed", "true");
    await expectTouchTarget(categoryChip);
  });

  for (const viewport of darkModeViewports) {
    test(`UAT-63 dark mode and reduced motion remain readable on ${viewport.label}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, admin.email, admin.password, "/reports");
      await expectNoHorizontalOverflow(page);

      const visualState = await page.evaluate(() => {
        const bodyStyles = window.getComputedStyle(document.body);
        const htmlStyles = window.getComputedStyle(document.documentElement);
        const topbarStyles = window.getComputedStyle(document.querySelector(".dashboard-topbar") as Element);
        const panelStyles = window.getComputedStyle(document.querySelector(".workspace-panel") as Element);

        return {
          bodyBackground: bodyStyles.backgroundColor,
          bodyBackgroundImage: bodyStyles.backgroundImage,
          bodyColor: bodyStyles.color,
          topbarBackground: topbarStyles.backgroundColor,
          topbarBackgroundImage: topbarStyles.backgroundImage,
          panelBackground: panelStyles.backgroundColor,
          panelBackgroundImage: panelStyles.backgroundImage,
          reducedMotionMatches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          scrollBehavior: htmlStyles.scrollBehavior
        };
      });

      expect(
        visualState.bodyBackground !== "rgba(0, 0, 0, 0)" || visualState.bodyBackgroundImage !== "none"
      ).toBeTruthy();
      expect(
        visualState.topbarBackground !== "rgba(0, 0, 0, 0)" || visualState.topbarBackgroundImage !== "none"
      ).toBeTruthy();
      expect(
        visualState.panelBackground !== "rgba(0, 0, 0, 0)" || visualState.panelBackgroundImage !== "none"
      ).toBeTruthy();
      expect(visualState.bodyColor).not.toBe("rgb(0, 0, 0)");
      expect(visualState.reducedMotionMatches).toBeTruthy();
      expect(visualState.scrollBehavior).toBe("auto");

      await expect(page.getByRole("heading", { name: "قراءة أوضح للأداء والمقارنات" })).toBeVisible();
      await expect(page.getByRole("link", { name: "تصدير Excel المتقدم" })).toBeVisible();
    });
  }
});
