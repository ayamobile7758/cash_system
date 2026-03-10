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
    email: nowEmail("px07t02-admin"),
    password: "LocalPass123!",
    fullName: "PX07T02 Admin",
    role: "admin"
  });

  const posId = await createUser(supabase, {
    email: nowEmail("px07t02-pos"),
    password: "LocalPass123!",
    fullName: "PX07T02 POS",
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

  const visaAccount = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("id, name, current_balance")
      .eq("type", "visa")
      .eq("module_scope", "core"),
    "Core visa account not found"
  );

  const { data: insertedSuppliers, error: supplierInsertError } = await supabase
    .from("suppliers")
    .insert([
      {
        name: `PX07 Topup Provider ${Date.now()}`,
        phone: "0792222222",
        address: "Amman"
      }
    ])
    .select("id, name");

  if (supplierInsertError || !insertedSuppliers || insertedSuppliers.length !== 1) {
    throw new Error(`Failed to insert topup provider fixture: ${supplierInsertError?.message ?? "unknown error"}`);
  }

  const provider = insertedSuppliers[0];
  const results = {
    fixtures: {
      admin_id: adminId,
      pos_id: posId,
      provider_id: provider.id,
      cash_account_id: cashAccount.id,
      visa_account_id: visaAccount.id
    },
    probes: {}
  };

  const cashBeforeTopup = toNumber(cashAccount.current_balance);
  const topupKey = randomUUID();
  const topup = await runRpc(supabase, "create_topup", {
    p_account_id: cashAccount.id,
    p_amount: 100,
    p_profit_amount: 3,
    p_supplier_id: provider.id,
    p_notes: "PX07 T02 topup",
    p_idempotency_key: topupKey,
    p_created_by: posId
  });

  const topupAccountAfter = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("id", cashAccount.id),
    "Cash account after topup not found"
  );

  const { data: topupLedgers, error: topupLedgerError } = await supabase
    .from("ledger_entries")
    .select("entry_type, amount")
    .eq("reference_type", "topup")
    .eq("reference_id", topup.topup_id);

  if (topupLedgerError || !topupLedgers) {
    throw new Error(`Failed to load topup ledgers: ${topupLedgerError?.message ?? "unknown error"}`);
  }

  const incomeEntry = topupLedgers.find((entry) => entry.entry_type === "income");
  const expenseEntry = topupLedgers.find((entry) => entry.entry_type === "expense");

  assert(topupLedgers.length === 2, "Topup should create exactly 2 ledger entries.");
  assert(toNumber(incomeEntry?.amount) === 100, "Topup income ledger amount mismatch.");
  assert(toNumber(expenseEntry?.amount) === 97, "Topup expense ledger amount mismatch.");
  assert(
    toNumber(topupAccountAfter.current_balance) === cashBeforeTopup + 3,
    "Topup should increase account balance by the profit amount only."
  );

  results.probes.topup = {
    topup_number: topup.topup_number,
    amount: 100,
    profit_amount: 3,
    cash_balance_before: cashBeforeTopup,
    cash_balance_after: toNumber(topupAccountAfter.current_balance),
    ledger_income_amount: toNumber(incomeEntry?.amount),
    ledger_expense_amount: toNumber(expenseEntry?.amount)
  };

  await expectRpcError(
    supabase,
    "create_topup",
    {
      p_account_id: cashAccount.id,
      p_amount: 100,
      p_profit_amount: 3,
      p_supplier_id: provider.id,
      p_notes: "PX07 T02 duplicate topup",
      p_idempotency_key: topupKey,
      p_created_by: posId
    },
    "ERR_IDEMPOTENCY"
  );

  const transferKey = randomUUID();
  const visaBeforeTransfer = toNumber(visaAccount.current_balance);
  const transfer = await runRpc(supabase, "create_transfer", {
    p_from_account_id: cashAccount.id,
    p_to_account_id: visaAccount.id,
    p_amount: 2,
    p_notes: "PX07 T02 internal transfer",
    p_idempotency_key: transferKey,
    p_created_by: adminId
  });

  const cashAfterTransfer = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("id", cashAccount.id),
    "Cash account after transfer not found"
  );

  const visaAfterTransfer = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("id", visaAccount.id),
    "Visa account after transfer not found"
  );

  const { data: transferLedgers, error: transferLedgerError } = await supabase
    .from("ledger_entries")
    .select("adjustment_direction, amount")
    .eq("reference_type", "transfer")
    .eq("reference_id", transfer.transfer_id);

  if (transferLedgerError || !transferLedgers) {
    throw new Error(`Failed to load transfer ledgers: ${transferLedgerError?.message ?? "unknown error"}`);
  }

  const decreaseEntry = transferLedgers.find((entry) => entry.adjustment_direction === "decrease");
  const increaseEntry = transferLedgers.find((entry) => entry.adjustment_direction === "increase");

  assert(transferLedgers.length === 2, "Transfer should create exactly 2 ledger entries.");
  assert(toNumber(decreaseEntry?.amount) === 2, "Transfer decrease entry mismatch.");
  assert(toNumber(increaseEntry?.amount) === 2, "Transfer increase entry mismatch.");
  assert(
    toNumber(cashAfterTransfer.current_balance) === toNumber(topupAccountAfter.current_balance) - 2,
    "Transfer should decrease the source account."
  );
  assert(
    toNumber(visaAfterTransfer.current_balance) === visaBeforeTransfer + 2,
    "Transfer should increase the destination account."
  );

  results.probes.transfer = {
    transfer_number: transfer.transfer_number,
    amount: 2,
    cash_balance_after: toNumber(cashAfterTransfer.current_balance),
    visa_balance_before: visaBeforeTransfer,
    visa_balance_after: toNumber(visaAfterTransfer.current_balance),
    ledger_decrease_amount: toNumber(decreaseEntry?.amount),
    ledger_increase_amount: toNumber(increaseEntry?.amount)
  };

  await expectRpcError(
    supabase,
    "create_transfer",
    {
      p_from_account_id: cashAccount.id,
      p_to_account_id: cashAccount.id,
      p_amount: 1,
      p_notes: "PX07 T02 same account",
      p_idempotency_key: randomUUID(),
      p_created_by: adminId
    },
    "ERR_TRANSFER_SAME_ACCOUNT"
  );

  await expectRpcError(
    supabase,
    "create_transfer",
    {
      p_from_account_id: cashAccount.id,
      p_to_account_id: visaAccount.id,
      p_amount: 999,
      p_notes: "PX07 T02 insufficient balance",
      p_idempotency_key: randomUUID(),
      p_created_by: adminId
    },
    "ERR_INSUFFICIENT_BALANCE"
  );

  await expectRpcError(
    supabase,
    "create_transfer",
    {
      p_from_account_id: cashAccount.id,
      p_to_account_id: visaAccount.id,
      p_amount: 1,
      p_notes: "PX07 T02 unauthorized transfer",
      p_idempotency_key: randomUUID(),
      p_created_by: posId
    },
    "ERR_UNAUTHORIZED"
  );

  results.probes.expected_failures = {
    duplicate_topup: "ERR_IDEMPOTENCY",
    transfer_same_account: "ERR_TRANSFER_SAME_ACCOUNT",
    transfer_insufficient_balance: "ERR_INSUFFICIENT_BALANCE",
    transfer_unauthorized: "ERR_UNAUTHORIZED"
  };

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
