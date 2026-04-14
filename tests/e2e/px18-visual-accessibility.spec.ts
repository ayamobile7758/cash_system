import { expect, test, type Locator } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

test.describe.configure({ timeout: 120_000 });

const POS_TITLE = "نقطة البيع";
const OPEN_MENU_LABEL = "فتح القائمة";
const SEARCH_LABEL = "بحث";
const CATEGORY_ALL_LABEL = "الكل";
const WORKSPACE_NAV_LABEL = "التنقل داخل مساحات التشغيل";
const REPORTS_TITLE = "التقارير";
const PRODUCT_SEARCH_PLACEHOLDER = "ابحث بالاسم أو رمز المنتج...";

const lightOnlyViewports = [
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
    await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
    await expect(page.locator(".auth-card")).toBeVisible();

    await login(page, admin.email, admin.password, "/reports");

    await expect(page).toHaveTitle(/التقارير/);
    await expect(page.locator(".dashboard-topbar .dashboard-header-title")).toContainText(REPORTS_TITLE);
    await expect(page.locator(".analytical-kpi-grid").first()).toBeVisible();
    await expect(page.locator(".data-table").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "تصدير Excel" })).toBeVisible();
  });

  test("UAT-62 keyboard focus and touch targets are accessible on POS and dashboard shell", async ({
    page
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await login(page, pos.email, pos.password, "/pos");
    await expectNoHorizontalOverflow(page);

    const menuToggle = page.getByRole("button", { name: OPEN_MENU_LABEL });
    const topbarSearchButton = page.getByRole("button", { name: SEARCH_LABEL });
    const productSearchField = page.locator(".transaction-toolbar__search").first();
    const productSearchInput = page.getByPlaceholder(PRODUCT_SEARCH_PLACEHOLDER);
    const cartSummaryButton = page.locator(".pos-cart-sheet__summary");

    await expect(page.locator(".dashboard-topbar .dashboard-header-title")).toContainText(POS_TITLE);
    await expectTouchTarget(menuToggle);
    await expectTouchTarget(productSearchField);
    await expectTouchTarget(cartSummaryButton);
    await expect(productSearchInput).toBeFocused();

    await page.keyboard.press("Tab");

    await menuToggle.focus();
    await expectVisibleFocus(menuToggle);

    await topbarSearchButton.focus();
    await expectVisibleFocus(topbarSearchButton);

    const categoryChip = page.getByRole("button", { name: CATEGORY_ALL_LABEL }).first();
    await categoryChip.focus();
    await expectVisibleFocus(categoryChip);

    await menuToggle.click();
    const nav = page.getByRole("navigation", { name: WORKSPACE_NAV_LABEL });
    const posLink = nav.getByRole("link", { name: new RegExp(POS_TITLE, "i") }).first();
    await expect(posLink).toHaveAttribute("aria-current", "page");
    await expect(categoryChip).toHaveAttribute("aria-pressed", "true");
    await expectTouchTarget(categoryChip);
  });

  for (const viewport of lightOnlyViewports) {
    test(`UAT-63 light mode and reduced motion remain readable on ${viewport.label}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, admin.email, admin.password, "/reports");
      await expectNoHorizontalOverflow(page);

      const visualState = await page.evaluate(() => {
        const bodyStyles = window.getComputedStyle(document.body);
        const htmlStyles = window.getComputedStyle(document.documentElement);
        const topbarStyles = window.getComputedStyle(document.querySelector(".dashboard-topbar") as Element);
        const panelStyles = window.getComputedStyle(document.querySelector(".workspace-panel, .section-card") as Element);

        return {
          bodyBackground: bodyStyles.backgroundColor,
          bodyBackgroundImage: bodyStyles.backgroundImage,
          bodyColor: bodyStyles.color,
          topbarBackground: topbarStyles.backgroundColor,
          topbarBackgroundImage: topbarStyles.backgroundImage,
          panelBackground: panelStyles.backgroundColor,
          panelBackgroundImage: panelStyles.backgroundImage,
          reducedMotionMatches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          lightSchemeMatches: window.matchMedia("(prefers-color-scheme: light)").matches,
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
      expect(visualState.lightSchemeMatches).toBeTruthy();
      expect(visualState.scrollBehavior).toBe("auto");

      await expect(page.locator(".dashboard-topbar .dashboard-header-title")).toContainText(REPORTS_TITLE);
      await expect(page.getByRole("link", { name: "تصدير Excel" })).toBeVisible();
    });
  }
});
