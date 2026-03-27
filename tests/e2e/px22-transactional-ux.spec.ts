import { expect, test } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  expectNoHorizontalOverflow,
  login,
  type FixtureUser
} from "./helpers/local-runtime";

test.describe.configure({ timeout: 120_000 });

type Px22Seed = {
  admin: FixtureUser;
  pos: FixtureUser;
};

const POS_QUICK_TITLE =
  "\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064a\u0639 \u0627\u0644\u0633\u0631\u064a\u0639\u0629";
const PRODUCT_PLACEHOLDER = "\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0646\u062a\u062c...";
const CURRENT_CART_TITLE = "\u0627\u0644\u0633\u0644\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629";
const INVOICES_TITLE =
  "\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a \u0648\u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a";
const INVOICE_LIST_TITLE =
  "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631";
const INVOICE_DETAIL_TITLE =
  "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629";
const INVOICE_SUMMARY_TAB =
  "\u0627\u0644\u0645\u0644\u062e\u0635 \u0648\u0627\u0644\u0625\u064a\u0635\u0627\u0644";
const INVOICE_RETURN_TAB = "\u0627\u0644\u0645\u0631\u062a\u062c\u0639";
const INVOICE_ADMIN_TAB =
  "\u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0625\u062f\u0627\u0631\u064a";
const DEBTS_TITLE =
  "\u0627\u0644\u062f\u064a\u0648\u0646 \u0648\u0627\u0644\u062a\u0633\u062f\u064a\u062f";

let seed: Px22Seed;

test.describe.serial("PX-22 transactional UX", () => {
  test.beforeAll(async () => {
    const supabase = createServiceRoleClient();
    seed = {
      admin: await createFixtureUser(supabase, "admin", "px22-admin"),
      pos: await createFixtureUser(supabase, "pos_staff", "px22-pos")
    };
  });

  test("phone POS gets product-first browsing with a collapsible cart sheet", async ({ page }) => {
    await login(page, seed.pos.email, seed.pos.password);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/pos", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: POS_QUICK_TITLE })).toBeVisible();
    await expect(page.getByPlaceholder(PRODUCT_PLACEHOLDER)).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "\u0627\u0644\u0643\u0644"
      })
    ).toBeVisible();
    await expect(page.locator(".pos-cart-sheet__summary")).toBeVisible();

    await page.locator(".pos-cart-sheet__summary").click();
    await expect(page.getByRole("heading", { name: CURRENT_CART_TITLE })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /\u0627\u062f\u0641\u0639/i })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("desktop admin gets invoice actions grouped by section without clutter", async ({ page }) => {
    await login(page, seed.admin.email, seed.admin.password, "/invoices");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/invoices", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: INVOICES_TITLE })).toBeVisible();
    await expect(page.getByRole("heading", { name: INVOICE_LIST_TITLE })).toBeVisible();
    await expect(page.getByRole("link", { name: /\u0641\u062a\u062d \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629/i }).first()).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/invoices\/.+/),
      page.getByRole("link", { name: /\u0641\u062a\u062d \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629/i }).first().click()
    ]);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(INVOICE_DETAIL_TITLE, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: INVOICE_SUMMARY_TAB })).toBeVisible();
    await expect(page.getByRole("button", { name: INVOICE_RETURN_TAB })).toBeVisible();
    await expect(page.getByRole("button", { name: INVOICE_ADMIN_TAB })).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0625\u064a\u0635\u0627\u0644"
      })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("tablet admin keeps debt workspaces readable without horizontal overflow", async ({ page }) => {
    await login(page, seed.admin.email, seed.admin.password, "/debts");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/debts", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: DEBTS_TITLE })).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0642\u064a\u0648\u062f"
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "\u062f\u064a\u0646 \u064a\u062f\u0648\u064a" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "\u0627\u0644\u062a\u0633\u062f\u064a\u062f" })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
