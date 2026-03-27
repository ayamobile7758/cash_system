import { expect, test, type Locator } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

test.describe.configure({ timeout: 120_000 });

const POS_TITLE = "\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064a\u0639";
const OPEN_MENU_LABEL = "\u0641\u062a\u062d \u0627\u0644\u0642\u0627\u0626\u0645\u0629";
const SEARCH_LABEL = "\u0628\u062d\u062b";
const CATEGORY_ALL_LABEL = "\u0627\u0644\u0643\u0644";
const WORKSPACE_NAV_LABEL =
  "\u0627\u0644\u062a\u0646\u0642\u0644 \u062f\u0627\u062e\u0644 \u0645\u0633\u0627\u062d\u0627\u062a \u0627\u0644\u062a\u0634\u063a\u064a\u0644";
const REPORTS_TITLE = "\u0642\u0631\u0627\u0621\u0629 \u0623\u0648\u0636\u062d \u0644\u0644\u0623\u062f\u0627\u0621 \u0648\u0627\u0644\u0645\u0642\u0627\u0631\u0646\u0627\u062a";
const REPORTS_LEAD = "\u0627\u0628\u062f\u0623 \u0628\u0627\u0644\u0641\u0644\u0627\u062a\u0631\u060c \u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629";

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
    await expect(page).toHaveTitle(/\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629/);
    await expect(
      page.getByRole("heading", { name: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644" })
    ).toBeVisible();
    await expect(page.locator(".auth-card")).toBeVisible();

    await login(page, admin.email, admin.password, "/reports");
    await expect(page).toHaveTitle(/\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631/);
    await expect(page.getByRole("heading", { name: REPORTS_TITLE })).toBeVisible();
    await expect(page.getByText(REPORTS_LEAD)).toBeVisible();
    await expect(page.locator(".analytical-page__meta-grid").first()).toBeVisible();
    await expect(page.locator(".data-table").first()).toBeVisible();
    await expect(page.locator(".dashboard-topbar .dashboard-header-title")).toContainText(/./);
  });

  test("UAT-62 keyboard focus and touch targets are accessible on POS and dashboard shell", async ({ page }) => {
    await login(page, pos.email, pos.password, "/pos");
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/pos", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page);

    const menuToggle = page.getByRole("button", { name: OPEN_MENU_LABEL });
    const topbarSearchButton = page.getByRole("button", { name: SEARCH_LABEL });
    const productSearchField = page.locator(".transaction-toolbar__search").first();
    const productSearchInput = page.getByPlaceholder(
      "\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0646\u062a\u062c..."
    );
    const cartSummaryButton = page.locator(".pos-cart-sheet__summary");

    await expectTouchTarget(menuToggle);
    await expectTouchTarget(topbarSearchButton);
    await expectTouchTarget(productSearchField);
    await expectTouchTarget(cartSummaryButton);

    await expect(productSearchInput).toBeFocused();

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
    await expectTouchTarget(posLink);
    await expect(posLink).toHaveAttribute("aria-current", "page");
    await expect(categoryChip).toHaveAttribute("aria-pressed", "true");
    await expectTouchTarget(categoryChip);
  });

  for (const viewport of lightOnlyViewports) {
    test(`UAT-63 light mode and reduced motion remain readable on ${viewport.label}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await login(page, admin.email, admin.password, "/reports");
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/reports", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
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

      await expect(page.getByRole("heading", { name: REPORTS_TITLE })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "\u062a\u0635\u062f\u064a\u0631 Excel \u0627\u0644\u0645\u062a\u0642\u062f\u0645" })
      ).toBeVisible();
    });
  }
});
