import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getInventoryPageBaseline, getMaintenancePageBaseline } from "@/lib/api/dashboard";
import { hasPermission, resolvePermissionContext } from "@/lib/permissions";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function extractStatusJson(rawOutput: string) {
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

  return JSON.parse(extractStatusJson(raw)) as {
    API_URL: string;
    ANON_KEY: string;
    SERVICE_ROLE_KEY: string;
  };
}

function nowEmail(prefix: string) {
  return `${prefix}-${Date.now()}@local.test`;
}

async function createUser(
  supabase: any,
  options: {
    email: string;
    password: string;
    fullName: string;
    role: "admin" | "pos_staff";
  }
) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true,
    user_metadata: {
      full_name: options.fullName,
      role: options.role
    }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${options.email}: ${error?.message ?? "unknown error"}`);
  }

  return data.user.id;
}

async function maybeSingleOrThrow<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string
) {
  const { data, error } = await query;

  if (error || !data) {
    throw new Error(`${label}: ${error?.message ?? "record not found"}`);
  }

  return data;
}

async function runRpc<T>(supabase: any, fnName: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fnName, params);

  if (error) {
    throw new Error(`${fnName}: ${error.message}`);
  }

  return data as T;
}

async function expectRpcError(
  supabase: any,
  fnName: string,
  params: Record<string, unknown>,
  expectedCode: string
) {
  const { error } = await supabase.rpc(fnName, params);

  if (!error) {
    throw new Error(`${fnName}: expected ${expectedCode} but RPC succeeded`);
  }

  assert(error.message.includes(expectedCode), `${fnName}: expected ${expectedCode}, got ${error.message}`);
}

async function createAuthenticatedClient(env: ReturnType<typeof getLocalSupabaseEnv>, email: string, password: string) {
  const client = createClient(env.API_URL, env.ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(`Failed to sign in ${email}: ${error.message}`);
  }

  return client;
}

async function main() {
  const env = getLocalSupabaseEnv();
  const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const password = "LocalPass123!";

  const adminId = await createUser(service, {
    email: nowEmail("px10-admin"),
    password,
    fullName: "PX10 Admin",
    role: "admin"
  });

  const basePosEmail = nowEmail("px10-pos-base");
  const inventoryPosEmail = nowEmail("px10-pos-inventory");
  const maintenancePosEmail = nowEmail("px10-pos-maintenance");
  const guardedPosEmail = nowEmail("px10-pos-guarded");
  const supervisorPosEmail = nowEmail("px10-pos-supervisor");

  const basePosId = await createUser(service, {
    email: basePosEmail,
    password,
    fullName: "PX10 POS Base",
    role: "pos_staff"
  });
  const inventoryPosId = await createUser(service, {
    email: inventoryPosEmail,
    password,
    fullName: "PX10 POS Inventory",
    role: "pos_staff"
  });
  const maintenancePosId = await createUser(service, {
    email: maintenancePosEmail,
    password,
    fullName: "PX10 POS Maintenance",
    role: "pos_staff"
  });
  const guardedPosId = await createUser(service, {
    email: guardedPosEmail,
    password,
    fullName: "PX10 POS Guarded",
    role: "pos_staff"
  });
  const supervisorPosId = await createUser(service, {
    email: supervisorPosEmail,
    password,
    fullName: "PX10 POS Supervisor",
    role: "pos_staff"
  });

  const cashAccount = await maybeSingleOrThrow(
    service
      .from("accounts")
      .select("id, current_balance")
      .eq("type", "cash")
      .eq("module_scope", "core")
      .maybeSingle(),
    "Core cash account not found"
  ) as { id: string; current_balance: number };

  const product = await maybeSingleOrThrow(
    service
      .from("products")
      .insert({
        name: `PX10 Product ${Date.now()}`,
        category: "accessory",
        sale_price: 100,
        cost_price: 60,
        avg_cost_price: 60,
        stock_quantity: 20,
        min_stock_level: 2,
        track_stock: true,
        is_quick_add: false,
        created_by: adminId
      })
      .select("id, name")
      .maybeSingle(),
    "Failed to create PX10 product fixture"
  ) as { id: string; name: string };

  const baseContext = await resolvePermissionContext(service as never, basePosId, "pos_staff");
  assert(!hasPermission(baseContext.permissions, "expenses.create"), "POS base context must not include expenses.create.");
  assert(!hasPermission(baseContext.permissions, "inventory.read"), "POS base context must not include inventory.read.");

  const expenseAssignment = await runRpc<{
    assignment_id: string;
    bundle_key: string;
    base_role: string;
    is_active: boolean;
  }>(service, "assign_permission_bundle", {
    p_user_id: basePosId,
    p_bundle_key: "expenses_clerk",
    p_notes: "PX10 proof assignment",
    p_created_by: adminId
  });

  assert(expenseAssignment.bundle_key === "expenses_clerk", "Expense bundle assignment should succeed.");

  const expenseContext = await resolvePermissionContext(service as never, basePosId, "pos_staff");
  assert(hasPermission(expenseContext.permissions, "expenses.create"), "Expense bundle should grant expenses.create.");
  assert(expenseContext.bundleKeys.includes("expenses_clerk"), "Expense bundle key should be present.");

  const revokedExpenseAssignment = await runRpc<{
    assignment_id: string;
    bundle_key: string;
    is_active: boolean;
  }>(service, "revoke_permission_bundle", {
    p_user_id: basePosId,
    p_bundle_key: "expenses_clerk",
    p_notes: "PX10 proof revoke",
    p_created_by: adminId
  });

  assert(revokedExpenseAssignment.is_active === false, "Expense bundle revoke should succeed.");

  const revokedExpenseContext = await resolvePermissionContext(service as never, basePosId, "pos_staff");
  assert(
    !hasPermission(revokedExpenseContext.permissions, "expenses.create"),
    "Revoked expense bundle should remove expenses.create."
  );

  await runRpc(service, "assign_permission_bundle", {
    p_user_id: inventoryPosId,
    p_bundle_key: "inventory_clerk",
    p_notes: "PX10 inventory bundle",
    p_created_by: adminId
  });
  await runRpc(service, "assign_permission_bundle", {
    p_user_id: maintenancePosId,
    p_bundle_key: "maintenance_clerk",
    p_notes: "PX10 maintenance bundle",
    p_created_by: adminId
  });
  await runRpc(service, "assign_permission_bundle", {
    p_user_id: guardedPosId,
    p_bundle_key: "sales_discount_guarded",
    p_notes: "PX10 guarded sales bundle",
    p_created_by: adminId
  });
  await runRpc(service, "assign_permission_bundle", {
    p_user_id: supervisorPosId,
    p_bundle_key: "sales_supervisor",
    p_notes: "PX10 supervisor sales bundle",
    p_created_by: adminId
  });

  await expectRpcError(service, "assign_permission_bundle", {
    p_user_id: adminId,
    p_bundle_key: "inventory_clerk",
    p_created_by: adminId
  }, "ERR_ROLE_ASSIGNMENT_INVALID");

  const inventoryContext = await resolvePermissionContext(service as never, inventoryPosId, "pos_staff");
  assert(hasPermission(inventoryContext.permissions, "inventory.read"), "Inventory bundle should grant inventory.read.");
  assert(
    hasPermission(inventoryContext.permissions, "inventory.count.complete"),
    "Inventory bundle should grant inventory.count.complete."
  );

  const maintenanceContext = await resolvePermissionContext(service as never, maintenancePosId, "pos_staff");
  assert(
    hasPermission(maintenanceContext.permissions, "maintenance.status.update"),
    "Maintenance bundle should grant maintenance.status.update."
  );

  const inventoryBaseline = await getInventoryPageBaseline(service as never, {
    role: "pos_staff"
  });
  assert(inventoryBaseline.accounts.length === 0, "POS inventory baseline must not expose account balances.");
  assert(
    inventoryBaseline.recentReconciliations.length === 0,
    "POS inventory baseline must not expose reconciliation history."
  );

  const maintenanceBaseline = await getMaintenancePageBaseline(service as never, {
    role: "pos_staff",
    userId: maintenancePosId
  });
  assert(
    maintenanceBaseline.maintenanceAccounts.every((account) => account.current_balance === null),
    "POS maintenance baseline must mask maintenance account balances."
  );

  const inventoryPosClient = await createAuthenticatedClient(env, inventoryPosEmail, password);
  const bundleSelect = await inventoryPosClient.from("permission_bundles").select("id").limit(1);
  assert(
    Boolean(bundleSelect.error) || (bundleSelect.data ?? []).length === 0,
    "Authenticated POS must not read permission_bundles directly."
  );

  const assignmentSelect = await inventoryPosClient.from("role_assignments").select("id").limit(1);
  assert(
    Boolean(assignmentSelect.error) || (assignmentSelect.data ?? []).length === 0,
    "Authenticated POS must not read role_assignments directly."
  );

  const assignmentInsert = await inventoryPosClient.from("role_assignments").insert({
    user_id: inventoryPosId,
    bundle_id: randomUUID(),
    assigned_by: inventoryPosId
  });
  assert(Boolean(assignmentInsert.error), "Authenticated POS must not insert into role_assignments directly.");

  await expectRpcError(service, "create_sale", {
    p_items: [{ product_id: product.id, quantity: 1, discount_percentage: 12 }],
    p_payments: [{ account_id: cashAccount.id, amount: 88 }],
    p_pos_terminal: "PX10-POS-BASE",
    p_idempotency_key: randomUUID(),
    p_created_by: basePosId
  }, "ERR_DISCOUNT_EXCEEDED");

  await expectRpcError(service, "create_sale", {
    p_items: [{ product_id: product.id, quantity: 1, discount_percentage: 12 }],
    p_payments: [{ account_id: cashAccount.id, amount: 88 }],
    p_pos_terminal: "PX10-POS-GUARDED",
    p_idempotency_key: randomUUID(),
    p_created_by: guardedPosId
  }, "ERR_DISCOUNT_APPROVAL_REQUIRED");

  const supervisorSale = await runRpc<{
    invoice_id: string;
    invoice_number: string;
    total: number;
    change: number;
  }>(service, "create_sale", {
    p_items: [{ product_id: product.id, quantity: 1, discount_percentage: 12 }],
    p_payments: [{ account_id: cashAccount.id, amount: 88 }],
    p_discount_by: supervisorPosId,
    p_pos_terminal: "PX10-POS-SUPERVISOR",
    p_idempotency_key: randomUUID(),
    p_created_by: supervisorPosId
  });

  assert(supervisorSale.total === 88, "Supervisor discount sale total should respect the discounted amount.");

  const overrideAudit = await maybeSingleOrThrow(
    service
      .from("audit_logs")
      .select("action_type, new_values")
      .eq("record_id", supervisorSale.invoice_id)
      .eq("action_type", "discount_override_bundle")
      .order("action_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "Discount override audit log not found"
  ) as {
    action_type: string;
    new_values: {
      baseline_cap: number;
      bundle_cap: number;
      max_applied_discount_percentage: number;
    };
  };

  assert(overrideAudit.action_type === "discount_override_bundle", "Discount override audit type mismatch.");
  assert(Number(overrideAudit.new_values.bundle_cap) === 15, "Discount override bundle cap should be 15.");
  assert(Number(overrideAudit.new_values.baseline_cap) === 10, "Discount baseline cap should be 10.");
  assert(
    Number(overrideAudit.new_values.max_applied_discount_percentage) === 12,
    "Audit should store the applied discount percentage."
  );

  const supervisorNotification = await maybeSingleOrThrow(
    service
      .from("notifications")
      .select("type, reference_id")
      .eq("type", "large_discount")
      .eq("reference_id", supervisorSale.invoice_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "Large discount notification not found"
  ) as {
    type: string;
    reference_id: string;
  };

  assert(
    supervisorNotification.reference_id === supervisorSale.invoice_id,
    "Large discount notification should reference the supervisor sale invoice."
  );

  console.log(JSON.stringify({
    role_assignments: {
      assign_expenses_bundle: expenseAssignment.is_active,
      revoke_expenses_bundle: revokedExpenseAssignment.is_active === false,
      invalid_admin_assignment_rejected: true
    },
    pos_permission_tables: {
      select_blocked: Boolean(bundleSelect.error) || (bundleSelect.data ?? []).length === 0,
      insert_blocked: Boolean(assignmentInsert.error)
    },
    inventory_bundle: {
      read: hasPermission(inventoryContext.permissions, "inventory.read"),
      count_complete: hasPermission(inventoryContext.permissions, "inventory.count.complete"),
      masked_accounts: inventoryBaseline.accounts.length === 0,
      hidden_reconciliations: inventoryBaseline.recentReconciliations.length === 0
    },
    maintenance_bundle: {
      status_update: hasPermission(maintenanceContext.permissions, "maintenance.status.update"),
      balances_masked: maintenanceBaseline.maintenanceAccounts.every((account) => account.current_balance === null)
    },
    discount_governance: {
      base_pos_discount: "ERR_DISCOUNT_EXCEEDED",
      guarded_bundle_discount: "ERR_DISCOUNT_APPROVAL_REQUIRED",
      supervisor_bundle_sale_total: supervisorSale.total,
      override_audit_action: overrideAudit.action_type,
      large_discount_notification: supervisorNotification.type
    }
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
