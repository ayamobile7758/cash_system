import { test as setup } from "@playwright/test";

/**
 * Pre-visit key pages so Next.js dev server compiles them before
 * actual tests run. Without this, the first test hitting each page
 * pays the full compile cost, often causing timeouts in CI.
 */
const PAGES_TO_WARM = ["/", "/login", "/pos", "/reports", "/notifications", "/debts", "/invoices", "/settings"];

setup("warm up next dev pages", async ({ page }) => {
  for (const path of PAGES_TO_WARM) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
    } catch {
      // Ignore errors — some pages redirect when not authenticated.
      // The goal is just to trigger compilation.
    }
  }
});
