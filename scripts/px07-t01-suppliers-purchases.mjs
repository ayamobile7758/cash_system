import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractStatusJson(rawOutput) {
  const start = rawOutput.indexOf("{");
  const end = rawOutput.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Failed to parse `supabase status -o json` output.");
  }

  return rawOutput.slice(start, end + 1);
}

function getLocalSupabaseEnv() {
  const raw = execSync("npx supabase status -o json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  return JSON.parse(extractStatusJson(raw));
}

function nowEmail(prefix) {
  return `${prefix}-${Date.now()}@local.test`;
}

function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return Number(value ?? 0);
}

function errorCodeFrom(message) {
  const match = String(message).match(/ERR_[A-Z0-9_]+/);
  return match?.[0] ?? null;
}

async function createUser(supabase, { email, password, fullName, role }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role
    }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${email}: ${error?.message ?? "unknown error"}`);
  }

  return data.user.id;
}

async function maybeSingleOrThrow(query, label) {
  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    throw new Error(`${label}: ${error?.message ?? "record not found"}`);
  }

  return data;
}

async function runRpc(supabase, fn, params) {
  const { data, error } = await supabase.rpc(fn, params);

  if (error) {
    throw new Error(`${fn}: ${error.message}`);
  }

  return data;
}

async function expectRpcError(supabase, fn, params, expectedCode) {
  const { data, error } = await supabase.rpc(fn, params);

  if (!error) {
    throw new Error(`Expected ${expectedCode}, but call succeeded with ${JSON.stringify(data)}`);
  }

  const actual = errorCodeFrom(error.message);
  assert(actual === expectedCode, `Expected ${expectedCode}, received ${actual ?? error.message}`);
}

async function main() {
  const env = getLocalSupabaseEnv();
  const supabase = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const adminId = await createUser(supabase, {
    email: nowEmail("px07-admin"),
    password: "LocalPass123!",
    fullName: "PX07 Admin",
    role: "admin"
  });

  const posId = await createUser(supabase, {
    email: nowEmail("px07-pos"),
    password: "LocalPass123!",
    fullName: "PX07 POS",
    role: "pos_staff"
  });

  const cashAccount = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("id, name, current_balance")
      .eq("type", "cash")
      .eq("module_scope", "core"),
    "Core cash account not found"
  );

  const { data: insertedSuppliers, error: supplierInsertError } = await supabase
    .from("suppliers")
    .insert([
      {
        name: `PX07 Supplier ${Date.now()}`,
        phone: "0791111111",
        address: "Amman"
      }
    ])
    .select("id, name, current_balance");

  if (supplierInsertError || !insertedSuppliers || insertedSuppliers.length !== 1) {
    throw new Error(`Failed to insert supplier fixture: ${supplierInsertError?.message ?? "unknown error"}`);
  }

  const supplier = insertedSuppliers[0];

  const { data: insertedProducts, error: productInsertError } = await supabase
    .from("products")
    .insert([
      {
        name: `PX07 Purchase Product ${Date.now()}`,
        category: "accessory",
        sale_price: 20,
        cost_price: 5,
        avg_cost_price: 5,
        stock_quantity: 10,
        min_stock_level: 1,
        track_stock: true,
        is_quick_add: false,
        created_by: adminId
      }
    ])
    .select("id, name, stock_quantity, cost_price, avg_cost_price");

  if (productInsertError || !insertedProducts || insertedProducts.length !== 1) {
    throw new Error(`Failed to insert product fixture: ${productInsertError?.message ?? "unknown error"}`);
  }

  const product = insertedProducts[0];
  const results = {
    fixtures: {
      admin_id: adminId,
      pos_id: posId,
      supplier_id: supplier.id,
      product_id: product.id,
      cash_account_id: cashAccount.id
    },
    probes: {}
  };

  const cashBefore = toNumber(cashAccount.current_balance);

  const cashPurchase = await runRpc(supabase, "create_purchase", {
    p_supplier_id: supplier.id,
    p_items: [{ product_id: product.id, quantity: 5, unit_cost: 9 }],
    p_is_paid: true,
    p_payment_account_id: cashAccount.id,
    p_notes: "PX07 cash purchase",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  const productAfterCash = await maybeSingleOrThrow(
    supabase
      .from("products")
      .select("stock_quantity, cost_price, avg_cost_price")
      .eq("id", product.id),
    "Product after cash purchase not found"
  );

  const cashAfterPurchase = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("id", cashAccount.id),
    "Cash account after purchase not found"
  );

  const cashLedgerEntry = await maybeSingleOrThrow(
    supabase
      .from("ledger_entries")
      .select("id, amount, reference_type")
      .eq("reference_type", "purchase")
      .eq("reference_id", cashPurchase.purchase_order_id),
    "Cash purchase ledger entry not found"
  );

  assert(toNumber(cashPurchase.total) === 45, "Cash purchase total mismatch.");
  assert(toNumber(productAfterCash.stock_quantity) === 15, "Cash purchase stock update failed.");
  assert(toNumber(productAfterCash.cost_price) === 9, "Cash purchase last cost update failed.");
  assert(toNumber(productAfterCash.avg_cost_price) === 6.333, "Cash purchase avg cost update failed.");
  assert(toNumber(cashAfterPurchase.current_balance) === cashBefore - 45, "Cash account balance not reduced.");
  assert(toNumber(cashLedgerEntry.amount) === 45, "Cash purchase ledger amount mismatch.");

  results.probes.cash_purchase = {
    purchase_number: cashPurchase.purchase_number,
    total: toNumber(cashPurchase.total),
    product_stock_after: toNumber(productAfterCash.stock_quantity),
    cost_price_after: toNumber(productAfterCash.cost_price),
    avg_cost_price_after: toNumber(productAfterCash.avg_cost_price),
    cash_balance_before: cashBefore,
    cash_balance_after: toNumber(cashAfterPurchase.current_balance)
  };

  const creditPurchase = await runRpc(supabase, "create_purchase", {
    p_supplier_id: supplier.id,
    p_items: [{ product_id: product.id, quantity: 2, unit_cost: 12 }],
    p_is_paid: false,
    p_payment_account_id: null,
    p_notes: "PX07 credit purchase",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  const supplierAfterCredit = await maybeSingleOrThrow(
    supabase
      .from("suppliers")
      .select("current_balance")
      .eq("id", supplier.id),
    "Supplier after credit purchase not found"
  );

  const creditLedgerEntries = await supabase
    .from("ledger_entries")
    .select("id")
    .eq("reference_type", "purchase")
    .eq("reference_id", creditPurchase.purchase_order_id);

  if (creditLedgerEntries.error) {
    throw new Error(`Failed to inspect credit purchase ledger: ${creditLedgerEntries.error.message}`);
  }

  assert(toNumber(creditPurchase.total) === 24, "Credit purchase total mismatch.");
  assert(toNumber(supplierAfterCredit.current_balance) === 24, "Supplier balance not increased for credit purchase.");
  assert((creditLedgerEntries.data ?? []).length === 0, "Credit purchase should not create a purchase ledger entry.");

  results.probes.credit_purchase = {
    purchase_number: creditPurchase.purchase_number,
    total: toNumber(creditPurchase.total),
    supplier_balance_after: toNumber(supplierAfterCredit.current_balance),
    purchase_ledger_entries: (creditLedgerEntries.data ?? []).length
  };

  const supplierPayment = await runRpc(supabase, "create_supplier_payment", {
    p_supplier_id: supplier.id,
    p_account_id: cashAccount.id,
    p_amount: 10,
    p_notes: "PX07 supplier payment",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  const supplierAfterPayment = await maybeSingleOrThrow(
    supabase
      .from("suppliers")
      .select("current_balance")
      .eq("id", supplier.id),
    "Supplier after payment not found"
  );

  const cashAfterPayment = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("id", cashAccount.id),
    "Cash account after supplier payment not found"
  );

  const supplierPaymentLedger = await maybeSingleOrThrow(
    supabase
      .from("ledger_entries")
      .select("id, amount, reference_type")
      .eq("reference_type", "supplier_payment")
      .eq("reference_id", supplierPayment.payment_id),
    "Supplier payment ledger entry not found"
  );

  assert(toNumber(supplierAfterPayment.current_balance) === 14, "Supplier payment did not reduce balance.");
  assert(
    toNumber(cashAfterPayment.current_balance) === toNumber(cashAfterPurchase.current_balance) - 10,
    "Supplier payment did not reduce account balance."
  );
  assert(toNumber(supplierPaymentLedger.amount) === 10, "Supplier payment ledger amount mismatch.");

  results.probes.supplier_payment = {
    payment_number: supplierPayment.payment_number,
    remaining_balance: toNumber(supplierPayment.remaining_balance),
    supplier_balance_after: toNumber(supplierAfterPayment.current_balance),
    cash_balance_after: toNumber(cashAfterPayment.current_balance)
  };

  await expectRpcError(
    supabase,
    "create_purchase",
    {
      p_supplier_id: supplier.id,
      p_items: [{ product_id: product.id, quantity: 1, unit_cost: 5 }],
      p_is_paid: true,
      p_payment_account_id: cashAccount.id,
      p_notes: "PX07 unauthorized purchase",
      p_idempotency_key: randomUUID(),
      p_created_by: posId
    },
    "ERR_UNAUTHORIZED"
  );

  await expectRpcError(
    supabase,
    "create_supplier_payment",
    {
      p_supplier_id: supplier.id,
      p_account_id: cashAccount.id,
      p_amount: 999,
      p_notes: "PX07 overpay",
      p_idempotency_key: randomUUID(),
      p_created_by: adminId
    },
    "ERR_SUPPLIER_OVERPAY"
  );

  results.probes.expected_failures = {
    unauthorized_purchase: "ERR_UNAUTHORIZED",
    supplier_overpay: "ERR_SUPPLIER_OVERPAY"
  };

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
