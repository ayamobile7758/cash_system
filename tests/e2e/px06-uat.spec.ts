import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";
import {
  createFixtureUser,
  createServiceRoleClient,
  login,
  percentile,
  type FixtureUser
} from "./helpers/local-runtime";

type ProductSeed = {
  id: string;
  name: string;
  sale_price: number;
  stock_quantity: number;
};

type SeedState = {
  admin: FixtureUser;
  posA: FixtureUser;
  posB: FixtureUser;
  terminalPrefix: string;
  cashAccountId: string;
  singleStockProduct: ProductSeed;
  lockProductA: ProductSeed;
  lockProductB: ProductSeed;
  forgedPriceProduct: ProductSeed;
  performanceProducts: ProductSeed[];
  searchPrefixes: string[];
};

const POS_SEARCH_PLACEHOLDER = "ابحث بالاسم أو رمز المنتج...";

let seed: SeedState;

function buildSalePayload(
  items: Array<{ product_id: string; quantity: number; discount_percentage?: number; unit_price?: number }>,
  accountId: string,
  posTerminalCode: string,
  notes: string
) {
  const total = items.reduce((sum, item) => {
    const product = [
      seed.singleStockProduct,
      seed.lockProductA,
      seed.lockProductB,
      seed.forgedPriceProduct,
      ...seed.performanceProducts
    ].find((candidate) => candidate.id === item.product_id);

    if (!product) {
      throw new Error(`Unknown seeded product ${item.product_id}`);
    }

    return sum + product.sale_price * item.quantity * (1 - (item.discount_percentage ?? 0) / 100);
  }, 0);

  return {
    items,
    payments: [
      {
        account_id: accountId,
        amount: Number(total.toFixed(3))
      }
    ],
    pos_terminal_code: posTerminalCode,
    notes,
    idempotency_key: randomUUID()
  };
}

async function seedProducts() {
  const supabase = createServiceRoleClient();
  const admin = await createFixtureUser(supabase, "admin", "px06-admin");
  const posA = await createFixtureUser(supabase, "pos_staff", "px06-pos-a");
  const posB = await createFixtureUser(supabase, "pos_staff", "px06-pos-b");
  const runId = randomUUID().slice(0, 8).toUpperCase();
  const terminalPrefix = `P6${runId.slice(0, 6)}`;
  const singleStockName = `PX06 ${runId} Single Stock Headset`;
  const lockProductAName = `PX06 ${runId} Lock Product A`;
  const lockProductBName = `PX06 ${runId} Lock Product B`;
  const forgedPriceName = `PX06 ${runId} Forged Price Product`;
  const performanceNames = Array.from({ length: 5 }, (_, index) => `PX06 ${runId} Perf Product ${index + 1}`);
  const searchPrefixes = Array.from(
    { length: 20 },
    (_, index) => `${runId} search ${String(index + 1).padStart(2, "0")}`
  );

  const { data: cashAccount, error: cashAccountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("type", "cash")
    .eq("module_scope", "core")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(1)
    .single<{ id: string }>();

  if (cashAccountError || !cashAccount) {
    throw cashAccountError ?? new Error("Core cash account not found.");
  }

  const baseProducts = [
    {
      name: singleStockName,
      category: "accessory",
      sale_price: 75,
      cost_price: 35,
      avg_cost_price: 35,
      stock_quantity: 1,
      min_stock_level: 1,
      track_stock: true,
      is_active: true,
      is_quick_add: true,
      created_by: admin.id
    },
    {
      name: lockProductAName,
      category: "accessory",
      sale_price: 30,
      cost_price: 12,
      avg_cost_price: 12,
      stock_quantity: 12,
      min_stock_level: 1,
      track_stock: true,
      is_active: true,
      is_quick_add: true,
      created_by: admin.id
    },
    {
      name: lockProductBName,
      category: "accessory",
      sale_price: 50,
      cost_price: 20,
      avg_cost_price: 20,
      stock_quantity: 12,
      min_stock_level: 1,
      track_stock: true,
      is_active: true,
      is_quick_add: true,
      created_by: admin.id
    },
    {
      name: forgedPriceName,
      category: "accessory",
      sale_price: 45,
      cost_price: 18,
      avg_cost_price: 18,
      stock_quantity: 40,
      min_stock_level: 1,
      track_stock: true,
      is_active: true,
      is_quick_add: true,
      created_by: admin.id
    },
    ...performanceNames.map((name, index) => ({
      name,
      category: "accessory",
      sale_price: 20 + index * 5,
      cost_price: 8 + index * 2,
      avg_cost_price: 8 + index * 2,
      stock_quantity: 250,
      min_stock_level: 5,
      track_stock: true,
      is_active: true,
      is_quick_add: false,
      created_by: admin.id
    }))
  ];

  const searchProducts = searchPrefixes.flatMap((prefix, prefixIndex) =>
    Array.from({ length: 25 }, (_, productIndex) => ({
      name: `PX06 ${prefix.toUpperCase()} Product ${String(productIndex + 1).padStart(3, "0")}`,
      category: "accessory",
      sale_price: 10 + prefixIndex,
      cost_price: 4 + prefixIndex,
      avg_cost_price: 4 + prefixIndex,
      stock_quantity: 20,
      min_stock_level: 1,
      track_stock: true,
      is_active: true,
      is_quick_add: false,
      created_by: admin.id
    }))
  );

  const { data: insertedProducts, error: insertProductsError } = await supabase
    .from("products")
    .insert([...baseProducts, ...searchProducts])
    .select("id, name, sale_price, stock_quantity");

  if (insertProductsError || !insertedProducts) {
    throw insertProductsError ?? new Error("Failed to seed UAT products.");
  }

  const byName = new Map(insertedProducts.map((product) => [product.name, product as ProductSeed]));

  return {
    admin,
    posA,
    posB,
    terminalPrefix,
    cashAccountId: cashAccount.id,
    singleStockProduct: byName.get(singleStockName)!,
    lockProductA: byName.get(lockProductAName)!,
    lockProductB: byName.get(lockProductBName)!,
    forgedPriceProduct: byName.get(forgedPriceName)!,
    performanceProducts: performanceNames.map((name) => byName.get(name)!).filter(Boolean),
    searchPrefixes
  } satisfies SeedState;
}

async function postJson(api: APIRequestContext, url: string, data: unknown) {
  const started = performance.now();
  const response = await api.post(url, { data });
  const elapsedMs = performance.now() - started;
  const payload = await response.json();

  return {
    response,
    payload,
    elapsedMs
  };
}

async function createLoggedInPage(browser: Browser, user: FixtureUser, targetPath = "/pos") {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, user.email, user.password, targetPath);
  return { context, page };
}

test.describe.serial("PX-06-T02 UAT release gate", () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeAll(async () => {
    seed = await seedProducts();
  });

  test("UAT-21 and UAT-21b: concurrency holds and no deadlock survives", async ({ browser }) => {
    const supabase = createServiceRoleClient();
    const sessionA = await createLoggedInPage(browser, seed.posA);
    const sessionB = await createLoggedInPage(browser, seed.posB);

    try {
      const concurrentPayloadA = buildSalePayload(
        [{ product_id: seed.singleStockProduct.id, quantity: 1 }],
        seed.cashAccountId,
        `${seed.terminalPrefix}-21`,
        "PX06 UAT-21 device A"
      );
      const concurrentPayloadB = buildSalePayload(
        [{ product_id: seed.singleStockProduct.id, quantity: 1 }],
        seed.cashAccountId,
        `${seed.terminalPrefix}-21`,
        "PX06 UAT-21 device B"
      );

      const [resultA, resultB] = await Promise.all([
        postJson(sessionA.page.context().request, "/api/sales", concurrentPayloadA),
        postJson(sessionB.page.context().request, "/api/sales", concurrentPayloadB)
      ]);

      const successCount = [resultA, resultB].filter((result) => result.response.status() === 200).length;
      const stockErrorCount = [resultA, resultB].filter(
        (result) => result.payload?.error?.code === "ERR_STOCK_INSUFFICIENT"
      ).length;

      expect(successCount).toBe(1);
      expect(stockErrorCount).toBe(1);

      const { count: uat21InvoiceCount, error: uat21CountError } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("pos_terminal_code", `${seed.terminalPrefix}-21`);

      if (uat21CountError) {
        throw uat21CountError;
      }

      expect(uat21InvoiceCount).toBe(1);
      console.log(
        `[PX06-T02] UAT-21 statuses=${resultA.response.status()}/${resultB.response.status()} stock_error=ERR_STOCK_INSUFFICIENT invoices=${uat21InvoiceCount}`
      );

      const deadlockPayloadA = buildSalePayload(
        [
          { product_id: seed.lockProductA.id, quantity: 1 },
          { product_id: seed.lockProductB.id, quantity: 1 }
        ],
        seed.cashAccountId,
        `${seed.terminalPrefix}-21b`,
        "PX06 UAT-21b device A"
      );
      const deadlockPayloadB = buildSalePayload(
        [
          { product_id: seed.lockProductB.id, quantity: 1 },
          { product_id: seed.lockProductA.id, quantity: 1 }
        ],
        seed.cashAccountId,
        `${seed.terminalPrefix}-21b`,
        "PX06 UAT-21b device B"
      );

      const started = Date.now();
      const [deadlockA, deadlockB] = await Promise.race([
        Promise.all([
          postJson(sessionA.page.context().request, "/api/sales", deadlockPayloadA),
          postJson(sessionB.page.context().request, "/api/sales", deadlockPayloadB)
        ]),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("UAT-21b timed out waiting for concurrent requests.")), 10_000);
        })
      ]);
      const totalElapsed = Date.now() - started;
      const permittedCodes = new Set([
        "ERR_CONCURRENT_STOCK_UPDATE",
        "ERR_STOCK_INSUFFICIENT",
        undefined
      ]);
      expect(permittedCodes.has(deadlockA.payload?.error?.code)).toBe(true);
      expect(permittedCodes.has(deadlockB.payload?.error?.code)).toBe(true);
      expect(deadlockA.response.ok() || deadlockA.response.status() === 409).toBe(true);
      expect(deadlockB.response.ok() || deadlockB.response.status() === 409).toBe(true);
      expect(totalElapsed).toBeLessThan(10_000);

      const { count: uat21bInvoiceCount, error: uat21bCountError } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("pos_terminal_code", `${seed.terminalPrefix}-21b`);

      if (uat21bCountError) {
        throw uat21bCountError;
      }

      expect(uat21bInvoiceCount).toBeGreaterThanOrEqual(1);
      expect(uat21bInvoiceCount).toBeLessThanOrEqual(2);
      console.log(
        `[PX06-T02] UAT-21b statuses=${deadlockA.response.status()}/${deadlockB.response.status()} elapsed=${totalElapsed}ms invoices=${uat21bInvoiceCount}`
      );
    } finally {
      await sessionA.context.close();
      await sessionB.context.close();
    }
  });

  test("UAT-28, UAT-29, and UAT-30: browser writes stay blocked and pricing stays server-authoritative", async ({
    browser,
    request
  }) => {
    const supabase = createServiceRoleClient();
    const posSession = await createLoggedInPage(browser, seed.posA);

    try {
      const directInsertBefore = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("pos_terminal_code", `${seed.terminalPrefix}-28`);

      if (directInsertBefore.error) {
        throw directInsertBefore.error;
      }

      const directInsertResponse = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/invoices`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        data: {
          invoice_number: `${seed.terminalPrefix}-28-${Date.now()}`,
          subtotal: 10,
          discount_amount: 0,
          total_amount: 10,
          debt_amount: 0,
          pos_terminal_code: `${seed.terminalPrefix}-28`,
          notes: "PX06 UAT-28 direct browser insert",
          created_by: seed.posA.id
        }
      });
      const directInsertPayload = await directInsertResponse.json();

      expect(directInsertResponse.ok()).toBeFalsy();
      expect(JSON.stringify(directInsertPayload)).toMatch(/permission denied|row-level security/i);

      const directInsertAfter = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("pos_terminal_code", `${seed.terminalPrefix}-28`);

      if (directInsertAfter.error) {
        throw directInsertAfter.error;
      }

      expect(directInsertAfter.count).toBe(directInsertBefore.count);

      const forgedPricePayload = buildSalePayload(
        [
          {
            product_id: seed.forgedPriceProduct.id,
            quantity: 1,
            unit_price: 1
          }
        ],
        seed.cashAccountId,
        `${seed.terminalPrefix}-29`,
        "PX06 UAT-29 forged unit price"
      );
      forgedPricePayload.payments[0].amount = seed.forgedPriceProduct.sale_price;

      const forgedSale = await postJson(posSession.page.context().request, "/api/sales", forgedPricePayload);
      expect(forgedSale.response.status(), JSON.stringify(forgedSale.payload)).toBe(200);

      const forgedInvoiceId = forgedSale.payload?.data?.invoice_id as string | undefined;
      expect(forgedInvoiceId).toBeTruthy();

      const { data: invoiceItem, error: invoiceItemError } = await supabase
        .from("invoice_items")
        .select("unit_price")
        .eq("invoice_id", forgedInvoiceId!)
        .single<{ unit_price: number }>();

      if (invoiceItemError || !invoiceItem) {
        throw invoiceItemError ?? new Error("Missing invoice item for forged price proof.");
      }

      expect(Number(invoiceItem.unit_price)).toBe(seed.forgedPriceProduct.sale_price);

      const forbiddenCancel = await postJson(posSession.page.context().request, "/api/invoices/cancel", {
        invoice_id: forgedInvoiceId,
        cancel_reason: "PX06 UAT-30 forbidden probe"
      });

      expect(forbiddenCancel.response.status()).toBe(403);
      expect(forbiddenCancel.payload?.error?.code).toBe("ERR_API_ROLE_FORBIDDEN");
      console.log(
        `[PX06-T02] UAT-28 status=${directInsertResponse.status()} UAT-29 unit_price=${invoiceItem.unit_price} UAT-30 code=${forbiddenCancel.payload?.error?.code}`
      );
    } finally {
      await posSession.context.close();
    }
  });

  test("UAT-31: create_sale p95 stays within the target", async ({ browser }) => {
    const posSession = await createLoggedInPage(browser, seed.posA);
    const warmItems = seed.performanceProducts.slice(0, 3).map((product) => ({
      product_id: product.id,
      quantity: 1,
      discount_percentage: 0
    }));

    try {
      for (let warmup = 0; warmup < 3; warmup += 1) {
        const warmPayload = buildSalePayload(
          warmItems,
          seed.cashAccountId,
          `${seed.terminalPrefix}-31-warm`,
          `PX06 UAT-31 warmup ${warmup + 1}`
        );
        const warmResult = await postJson(posSession.page.context().request, "/api/sales", warmPayload);
        expect(warmResult.response.status(), JSON.stringify(warmResult.payload)).toBe(200);
      }

      const durations: number[] = [];

      for (let attempt = 0; attempt < 50; attempt += 1) {
        const itemCount = 3 + (attempt % 3);
        const payloadItems = seed.performanceProducts.slice(0, itemCount).map((product) => ({
          product_id: product.id,
          quantity: 1 + (attempt % 2),
          discount_percentage: 0
        }));
        const payload = buildSalePayload(
          payloadItems,
          seed.cashAccountId,
          `${seed.terminalPrefix}-31`,
          `PX06 UAT-31 sale ${attempt + 1}`
        );
        const sale = await postJson(posSession.page.context().request, "/api/sales", payload);
        expect(sale.response.status(), JSON.stringify(sale.payload)).toBe(200);
        durations.push(sale.elapsedMs);
      }

      const p95 = percentile(durations, 0.95);
      expect(p95).toBeLessThanOrEqual(2_000);
      console.log(
        `[PX06-T02] UAT-31 p95=${p95.toFixed(1)}ms max=${Math.max(...durations).toFixed(1)}ms min=${Math.min(...durations).toFixed(1)}ms`
      );
    } finally {
      await posSession.context.close();
    }
  });

  test("UAT-32: server-backed POS search p95 stays within the target with 500 active products", async ({ browser }) => {
    const posSession = await createLoggedInPage(browser, seed.posA);

    try {
      await posSession.page.goto("/pos", { waitUntil: "domcontentloaded" });
      await posSession.page.waitForLoadState("networkidle");

      const searchInput = posSession.page.getByPlaceholder(POS_SEARCH_PLACEHOLDER);
      await expect(searchInput).toBeVisible();
      await expect(posSession.page.locator(".transaction-product-grid .pos-product-card--compact").first()).toBeVisible({
        timeout: 10_000
      });

      const durations: number[] = [];

      for (const prefix of seed.searchPrefixes) {
        const expectedTitle = `PX06 ${prefix.toUpperCase()} Product 001`;
        const duration = await posSession.page.evaluate(
          async ({ placeholder, query, title }) => {
            const input = document.querySelector(`input[placeholder="${placeholder}"]`);
            const grid = document.querySelector(".transaction-product-grid");

            if (!(input instanceof HTMLInputElement) || !(grid instanceof HTMLElement)) {
              throw new Error("POS search input or grid not found.");
            }

            const hasExpectedTitle = () =>
              Array.from(
                document.querySelectorAll(
                  ".transaction-product-grid .pos-product-card--compact .pos-product-card__name"
                )
              ).some((node) => node.textContent?.trim() === title);

            return await new Promise<number>((resolve, reject) => {
              const started = performance.now();
              const observer = new MutationObserver(() => {
                if (hasExpectedTitle()) {
                  window.clearTimeout(timeoutId);
                  observer.disconnect();
                  resolve(performance.now() - started);
                }
              });
              const timeoutId = window.setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timed out waiting for search result ${title}.`));
              }, 4_000);

              observer.observe(grid, {
                subtree: true,
                childList: true,
                characterData: true
              });

              input.focus();
              const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
              descriptor?.set?.call(input, query);
              input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));

              if (hasExpectedTitle()) {
                window.clearTimeout(timeoutId);
                observer.disconnect();
                resolve(performance.now() - started);
              }
            });
          },
          { placeholder: POS_SEARCH_PLACEHOLDER, query: prefix, title: expectedTitle }
        );

        await expect(posSession.page.locator(".transaction-product-grid .pos-product-card--compact")).toHaveCount(25);
        durations.push(duration);
      }

      const p95 = percentile(durations, 0.95);
      expect(p95).toBeLessThanOrEqual(1_500);
      console.log(
        `[PX06-T02] UAT-32 p95=${p95.toFixed(1)}ms max=${Math.max(...durations).toFixed(1)}ms queries=${durations.length}`
      );
    } finally {
      await posSession.context.close();
    }
  });
});
