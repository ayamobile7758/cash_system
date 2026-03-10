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

function errorCodeFrom(message) {
  const match = String(message).match(/ERR_[A-Z0-9_]+/);
  return match?.[0] ?? null;
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

async function expectRpcError(supabase, fn, params, expectedCode, label) {
  const { data, error } = await supabase.rpc(fn, params);

  if (!error) {
    throw new Error(`${label}: expected ${expectedCode}, but call succeeded with ${JSON.stringify(data)}`);
  }

  const actualCode = errorCodeFrom(error.message);
  assert(
    actualCode === expectedCode,
    `${label}: expected ${expectedCode}, got ${actualCode ?? error.message}`
  );

  return actualCode;
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
    email: nowEmail("px06-admin"),
    password: "LocalPass123!",
    fullName: "PX06 Admin",
    role: "admin"
  });

  const posId = await createUser(supabase, {
    email: nowEmail("px06-pos"),
    password: "LocalPass123!",
    fullName: "PX06 POS",
    role: "pos_staff"
  });

  const cashAccount = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("id, name, type, current_balance")
      .eq("type", "cash")
      .eq("module_scope", "core"),
    "Core cash account not found"
  );

  const visaAccount = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("id, name, type, current_balance")
      .eq("type", "visa")
      .eq("module_scope", "core"),
    "Core visa account not found"
  );

  const { data: insertedProducts, error: productInsertError } = await supabase
    .from("products")
    .insert([
      {
        name: "PX06 Dry Run Product A",
        category: "accessory",
        sale_price: 100,
        cost_price: 60,
        avg_cost_price: 60,
        stock_quantity: 20,
        min_stock_level: 1,
        track_stock: true,
        is_quick_add: true,
        created_by: adminId
      },
      {
        name: "PX06 Dry Run Product B",
        category: "accessory",
        sale_price: 40,
        cost_price: 20,
        avg_cost_price: 20,
        stock_quantity: 20,
        min_stock_level: 1,
        track_stock: true,
        is_quick_add: true,
        created_by: adminId
      }
    ])
    .select("id, name, sale_price, stock_quantity");

  if (productInsertError || !insertedProducts || insertedProducts.length !== 2) {
    throw new Error(`Failed to insert dry run products: ${productInsertError?.message ?? "unknown error"}`);
  }

  const productA = insertedProducts.find((product) => product.name === "PX06 Dry Run Product A");
  const productB = insertedProducts.find((product) => product.name === "PX06 Dry Run Product B");

  assert(productA && productB, "Failed to resolve inserted dry run products.");

  const { data: insertedCustomers, error: customerInsertError } = await supabase
    .from("debt_customers")
    .insert([
      {
        name: "PX06 Debt Customer",
        phone: `790${String(Date.now()).slice(-7)}`,
        credit_limit: 500,
        due_date_days: 30,
        created_by: adminId
      }
    ])
    .select("id, name, current_balance, due_date_days");

  if (customerInsertError || !insertedCustomers || insertedCustomers.length !== 1) {
    throw new Error(
      `Failed to insert dry run debt customer: ${customerInsertError?.message ?? "unknown error"}`
    );
  }

  const debtCustomer = insertedCustomers[0];
  const results = {
    users: {
      admin_id: adminId,
      pos_id: posId
    },
    fixtures: {
      cash_account_id: cashAccount.id,
      visa_account_id: visaAccount.id,
      product_a_id: productA.id,
      product_b_id: productB.id,
      debt_customer_id: debtCustomer.id
    },
    dry_runs: {},
    negative_probes: {},
    integrity: null
  };

  const invoiceCountBeforeMismatch = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  results.negative_probes.dr01_payment_mismatch = await expectRpcError(
    supabase,
    "create_sale",
    {
      p_items: [
        { product_id: productA.id, quantity: 1 },
        { product_id: productB.id, quantity: 2 }
      ],
      p_payments: [
        { account_id: cashAccount.id, amount: 100 },
        { account_id: visaAccount.id, amount: 70 }
      ],
      p_idempotency_key: randomUUID(),
      p_pos_terminal: "PX06-POS-01",
      p_created_by: posId
    },
    "ERR_PAYMENT_MISMATCH",
    "DR-01 expected failure"
  );

  const invoiceCountAfterMismatch = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  assert(
    invoiceCountBeforeMismatch.count === invoiceCountAfterMismatch.count,
    "DR-01 failure should not create an invoice."
  );

  const dr01 = await runRpc(supabase, "create_sale", {
    p_items: [
      { product_id: productA.id, quantity: 1 },
      { product_id: productB.id, quantity: 2 }
    ],
    p_payments: [
      { account_id: cashAccount.id, amount: 100 },
      { account_id: visaAccount.id, amount: 80 }
    ],
    p_pos_terminal: "PX06-POS-01",
    p_notes: "PX06 DR-01 mixed sale",
    p_idempotency_key: randomUUID(),
    p_created_by: posId
  });

  const dr01Invoice = await maybeSingleOrThrow(
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, debt_amount, status")
      .eq("id", dr01.invoice_id),
    "DR-01 invoice missing"
  );

  const { data: dr01Payments, error: dr01PaymentsError } = await supabase
    .from("payments")
    .select("amount, net_amount, fee_amount, account_id")
    .eq("invoice_id", dr01.invoice_id);

  if (dr01PaymentsError || !dr01Payments) {
    throw new Error(`DR-01 payments query failed: ${dr01PaymentsError?.message ?? "unknown error"}`);
  }

  const dr01PaymentsTotal = dr01Payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  assert(
    dr01PaymentsTotal + toNumber(dr01Invoice.debt_amount) === toNumber(dr01Invoice.total_amount),
    "DR-01 balance equation failed."
  );

  results.dry_runs.dr01 = {
    status: "PASS",
    invoice_id: dr01.invoice_id,
    invoice_number: dr01.invoice_number,
    total_amount: toNumber(dr01Invoice.total_amount),
    payments_total: dr01PaymentsTotal,
    debt_amount: toNumber(dr01Invoice.debt_amount),
    equation_holds: true
  };

  results.negative_probes.dr02_unauthorized = await expectRpcError(
    supabase,
    "create_sale",
    {
      p_items: [{ product_id: productA.id, quantity: 1 }],
      p_payments: [{ account_id: cashAccount.id, amount: 20 }],
      p_debt_customer_id: debtCustomer.id,
      p_idempotency_key: randomUUID(),
      p_pos_terminal: "PX06-POS-01",
      p_created_by: randomUUID()
    },
    "ERR_UNAUTHORIZED",
    "DR-02 expected failure"
  );

  const dr02 = await runRpc(supabase, "create_sale", {
    p_items: [{ product_id: productA.id, quantity: 1 }],
    p_payments: [{ account_id: cashAccount.id, amount: 20 }],
    p_debt_customer_id: debtCustomer.id,
    p_pos_terminal: "PX06-POS-01",
    p_notes: "PX06 DR-02 debt sale",
    p_idempotency_key: randomUUID(),
    p_created_by: posId
  });

  const dr02Invoice = await maybeSingleOrThrow(
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, debt_amount, status, debt_customer_id")
      .eq("id", dr02.invoice_id),
    "DR-02 invoice missing"
  );

  const { data: dr02DebtEntries, error: dr02DebtError } = await supabase
    .from("debt_entries")
    .select("id, amount, remaining_amount, due_date, entry_type")
    .eq("invoice_id", dr02.invoice_id)
    .eq("entry_type", "from_invoice");

  if (dr02DebtError || !dr02DebtEntries || dr02DebtEntries.length !== 1) {
    throw new Error(`DR-02 debt entry query failed: ${dr02DebtError?.message ?? "unexpected count"}`);
  }

  const dr02Customer = await maybeSingleOrThrow(
    supabase
      .from("debt_customers")
      .select("id, current_balance, due_date_days")
      .eq("id", debtCustomer.id),
    "DR-02 customer missing"
  );

  assert(toNumber(dr02Invoice.debt_amount) === 80, "DR-02 debt amount should equal 80.");
  assert(toNumber(dr02DebtEntries[0].remaining_amount) === 80, "DR-02 debt entry remaining amount should equal 80.");
  assert(toNumber(dr02Customer.current_balance) === 80, "DR-02 customer balance should equal 80.");

  results.dry_runs.dr02 = {
    status: "PASS",
    invoice_id: dr02.invoice_id,
    invoice_number: dr02.invoice_number,
    debt_entry_id: dr02DebtEntries[0].id,
    debt_amount: toNumber(dr02Invoice.debt_amount),
    customer_balance: toNumber(dr02Customer.current_balance),
    due_date: dr02DebtEntries[0].due_date
  };

  const { error: updateDueDaysError } = await supabase
    .from("debt_customers")
    .update({ due_date_days: 60 })
    .eq("id", debtCustomer.id);

  if (updateDueDaysError) {
    throw new Error(`Failed to update due_date_days for FIFO setup: ${updateDueDaysError.message}`);
  }

  const dr02b = await runRpc(supabase, "create_sale", {
    p_items: [{ product_id: productB.id, quantity: 2 }],
    p_payments: [{ account_id: cashAccount.id, amount: 20 }],
    p_debt_customer_id: debtCustomer.id,
    p_pos_terminal: "PX06-POS-01",
    p_notes: "PX06 DR-04 FIFO setup sale",
    p_idempotency_key: randomUUID(),
    p_created_by: posId
  });

  const { data: dr02bDebtEntries, error: dr02bDebtError } = await supabase
    .from("debt_entries")
    .select("id, amount, remaining_amount, due_date, entry_type")
    .eq("invoice_id", dr02b.invoice_id)
    .eq("entry_type", "from_invoice");

  if (dr02bDebtError || !dr02bDebtEntries || dr02bDebtEntries.length !== 1) {
    throw new Error(`DR-04 setup debt entry query failed: ${dr02bDebtError?.message ?? "unexpected count"}`);
  }

  const { data: dr01Items, error: dr01ItemsError } = await supabase
    .from("invoice_items")
    .select("id, product_id, quantity, returned_quantity, total_price")
    .eq("invoice_id", dr01.invoice_id);

  if (dr01ItemsError || !dr01Items || dr01Items.length !== 2) {
    throw new Error(`DR-01 invoice items query failed: ${dr01ItemsError?.message ?? "unexpected count"}`);
  }

  const dr01ItemB = dr01Items.find((item) => item.product_id === productB.id);
  assert(dr01ItemB, "DR-03 setup item for product B not found.");

  results.negative_probes.dr03_return_quantity = await expectRpcError(
    supabase,
    "create_return",
    {
      p_invoice_id: dr01.invoice_id,
      p_items: [{ invoice_item_id: dr01ItemB.id, quantity: 3 }],
      p_refund_account_id: cashAccount.id,
      p_return_type: "partial",
      p_reason: "DR-03 invalid quantity",
      p_idempotency_key: randomUUID(),
      p_created_by: posId
    },
    "ERR_RETURN_QUANTITY",
    "DR-03 expected failure"
  );

  const dr03 = await runRpc(supabase, "create_return", {
    p_invoice_id: dr01.invoice_id,
    p_items: [{ invoice_item_id: dr01ItemB.id, quantity: 1 }],
    p_refund_account_id: cashAccount.id,
    p_return_type: "partial",
    p_reason: "PX06 DR-03 partial return",
    p_idempotency_key: randomUUID(),
    p_created_by: posId
  });

  const dr03Invoice = await maybeSingleOrThrow(
    supabase
      .from("invoices")
      .select("id, status")
      .eq("id", dr01.invoice_id),
    "DR-03 invoice missing"
  );

  const dr03Item = await maybeSingleOrThrow(
    supabase
      .from("invoice_items")
      .select("id, quantity, returned_quantity")
      .eq("id", dr01ItemB.id),
    "DR-03 returned invoice item missing"
  );

  const dr03Product = await maybeSingleOrThrow(
    supabase
      .from("products")
      .select("id, stock_quantity")
      .eq("id", productB.id),
    "DR-03 product missing"
  );

  assert(dr03Invoice.status === "partially_returned", "DR-03 invoice status should be partially_returned.");
  assert(toNumber(dr03.refunded_amount) === 40, "DR-03 refunded amount should equal 40.");
  assert(toNumber(dr03.debt_reduction) === 0, "DR-03 debt reduction should equal 0.");
  assert(toNumber(dr03Item.returned_quantity) === 1, "DR-03 returned_quantity should equal 1.");

  results.dry_runs.dr03 = {
    status: "PASS",
    return_id: dr03.return_id,
    return_number: dr03.return_number,
    refunded_amount: toNumber(dr03.refunded_amount),
    debt_reduction: toNumber(dr03.debt_reduction),
    invoice_status: dr03Invoice.status,
    returned_quantity: toNumber(dr03Item.returned_quantity),
    product_b_stock_after_return: toNumber(dr03Product.stock_quantity)
  };

  const dr04 = await runRpc(supabase, "create_debt_payment", {
    p_debt_customer_id: debtCustomer.id,
    p_amount: 90,
    p_account_id: cashAccount.id,
    p_notes: "PX06 DR-04 FIFO payment",
    p_idempotency_key: randomUUID(),
    p_created_by: adminId
  });

  assert(Array.isArray(dr04.allocations), "DR-04 allocations should be an array.");
  assert(dr04.allocations.length === 2, "DR-04 should allocate across two debt entries.");
  assert(dr04.allocations[0].debt_entry_id === dr02DebtEntries[0].id, "DR-04 first allocation should target the oldest debt.");
  assert(toNumber(dr04.allocations[0].allocated_amount) === 80, "DR-04 first allocation should equal 80.");
  assert(toNumber(dr04.allocations[1].allocated_amount) === 10, "DR-04 second allocation should equal 10.");

  results.negative_probes.dr04_overpay = await expectRpcError(
    supabase,
    "create_debt_payment",
    {
      p_debt_customer_id: debtCustomer.id,
      p_amount: 60,
      p_account_id: cashAccount.id,
      p_notes: "DR-04 overpay",
      p_idempotency_key: randomUUID(),
      p_created_by: adminId
    },
    "ERR_DEBT_OVERPAY",
    "DR-04 expected failure"
  );

  const dr04Customer = await maybeSingleOrThrow(
    supabase
      .from("debt_customers")
      .select("id, current_balance")
      .eq("id", debtCustomer.id),
    "DR-04 customer missing"
  );

  results.dry_runs.dr04 = {
    status: "PASS",
    payment_id: dr04.payment_id,
    receipt_number: dr04.receipt_number,
    remaining_balance: toNumber(dr04.remaining_balance),
    allocations: dr04.allocations.map((allocation) => ({
      debt_entry_id: allocation.debt_entry_id,
      allocated_amount: toNumber(allocation.allocated_amount)
    })),
    customer_balance_after_payment: toNumber(dr04Customer.current_balance)
  };

  const dr05Setup = await runRpc(supabase, "create_sale", {
    p_items: [{ product_id: productB.id, quantity: 1 }],
    p_payments: [{ account_id: cashAccount.id, amount: 40 }],
    p_pos_terminal: "PX06-POS-01",
    p_notes: "PX06 DR-05 cancel setup",
    p_idempotency_key: randomUUID(),
    p_created_by: posId
  });

  results.negative_probes.dr05_cancel_has_return = await expectRpcError(
    supabase,
    "cancel_invoice",
    {
      p_invoice_id: dr01.invoice_id,
      p_cancel_reason: "DR-05 invalid cancel after return",
      p_created_by: adminId
    },
    "ERR_CANCEL_HAS_RETURN",
    "DR-05 expected failure"
  );

  const dr05 = await runRpc(supabase, "cancel_invoice", {
    p_invoice_id: dr05Setup.invoice_id,
    p_cancel_reason: "PX06 DR-05 cancel active invoice",
    p_created_by: adminId
  });

  const dr05Invoice = await maybeSingleOrThrow(
    supabase
      .from("invoices")
      .select("id, status")
      .eq("id", dr05Setup.invoice_id),
    "DR-05 invoice missing"
  );

  const dr05Product = await maybeSingleOrThrow(
    supabase
      .from("products")
      .select("id, stock_quantity")
      .eq("id", productB.id),
    "DR-05 product missing"
  );

  assert(dr05Invoice.status === "cancelled", "DR-05 invoice status should be cancelled.");
  assert(toNumber(dr05.reversed_entries_count) === 1, "DR-05 should reverse one payment entry.");

  results.dry_runs.dr05 = {
    status: "PASS",
    invoice_id: dr05Setup.invoice_id,
    invoice_number: dr05.invoice_number,
    reversed_entries_count: toNumber(dr05.reversed_entries_count),
    invoice_status: dr05Invoice.status,
    product_b_stock_after_cancel: toNumber(dr05Product.stock_quantity)
  };

  const integrity = await runRpc(supabase, "fn_verify_balance_integrity", {
    p_created_by: adminId
  });

  assert(Boolean(integrity.success), "Final balance integrity check should succeed.");
  assert(toNumber(integrity.drift_count) === 0, "Final balance integrity drift_count should equal 0.");

  results.integrity = {
    success: Boolean(integrity.success),
    drift_count: toNumber(integrity.drift_count),
    drifts: integrity.drifts ?? []
  };

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
