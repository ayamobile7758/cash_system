import { expect, test, type Page } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

test.describe.configure({ timeout: 120_000 });

const OPEN_MENU_LABEL = "\u0641\u062a\u062d \u0627\u0644\u0642\u0627\u0626\u0645\u0629";
const BOTTOM_MENU_LABEL = "\u0627\u0644\u0642\u0627\u0626\u0645\u0629";
const WORKSPACE_NAV_LABEL =
  "\u0627\u0644\u062a\u0646\u0642\u0644 \u062f\u0627\u062e\u0644 \u0645\u0633\u0627\u062d\u0627\u062a \u0627\u0644\u062a\u0634\u063a\u064a\u0644";
const LOGIN_TITLE = "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644";
const POS_ENTRY_LINK = /\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064a\u0639 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629/i;
const INSTALL_BUTTON = "\u062a\u062b\u0628\u064a\u062a Aya Mobile";
const INSTALL_COPY = "\u0627\u0644\u0646\u0638\u0627\u0645 \u064a\u0639\u0645\u0644 \u0643\u062a\u0637\u0628\u064a\u0642 \u0648\u064a\u0628";

let admin: FixtureUser;
let pos: FixtureUser;

async function openDrawer(page: Page) {
  const topbarToggle = page.getByRole("button", { name: OPEN_MENU_LABEL });
  if (await topbarToggle.isVisible()) {
    await topbarToggle.click();
    return;
  }

  const bottomBarToggle = page.getByRole("button", { name: BOTTOM_MENU_LABEL });
  if (await bottomBarToggle.isVisible()) {
    await bottomBarToggle.click();
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

    await expect(page).toHaveTitle(/\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629/);
    await expect(page.getByRole("heading", { name: LOGIN_TITLE })).toBeVisible();
    await expect(page.getByRole("link", { name: POS_ENTRY_LINK })).toBeVisible();
    await expect(page.getByRole("button", { name: INSTALL_BUTTON })).toBeVisible();
    await expect(page.getByText(INSTALL_COPY)).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/PX-|SOP-|baseline/i);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveTitle(/\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644/);
    await expect(page.getByRole("heading", { name: LOGIN_TITLE })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644" })
    ).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/PX-|SOP-|baseline/i);
    await expectNoHorizontalOverflow(page);
  });

  test("mobile POS gets bottom navigation and a scoped right-side menu", async ({ page }) => {
    await login(page, pos.email, pos.password);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/pos", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page);

    await expect(page.locator(".dashboard-bottom-bar")).toBeVisible();
    await openDrawer(page);

    const drawer = page.locator(".dashboard-sidebar");
    await expect(drawer).toBeVisible();

    const nav = page.getByRole("navigation", { name: WORKSPACE_NAV_LABEL });
    await expect(nav).toBeVisible();
    await expect(
      nav.getByRole("link", { name: /\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064a\u0639/i })
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: /\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a/i })
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: /\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631/i })
    ).toHaveCount(0);
    await expect(
      nav.getByRole("link", { name: /\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a/i })
    ).toHaveCount(0);
  });

  test("desktop admin gets the refreshed grouped shell with contextual topbar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await login(page, admin.email, admin.password, "/reports");

    await expect(page.locator(".dashboard-layout__sidebar")).toBeVisible();
    await expect(page.locator(".dashboard-nav-group__title").first()).toBeVisible();
    await expect(page.locator(".dashboard-topbar .dashboard-header-title")).toContainText(/./);
    await expect(page.locator(".dashboard-user-chip")).toContainText(/./);
    await expect(
      page.getByRole("button", { name: /\u0628\u062d\u062b/i })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
