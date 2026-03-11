import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WorkspaceRole } from "@/lib/permissions";
import { getReportBaseline, parseSalesHistoryFilters } from "@/lib/api/reports";

type SearchParamsInput = Record<string, string | string[] | undefined>;

export type WorkspaceUserOption = {
  id: string;
  full_name: string | null;
  role: WorkspaceRole;
};

export type SettingsAccount = {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  module_scope: string;
};

export type SettingsSnapshot = {
  id: string;
  snapshot_date: string;
  net_sales: number;
  net_profit: number;
  invoice_count: number;
  created_at: string;
};

export type PermissionBundleOption = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  base_role: WorkspaceRole;
  permissions: string[];
  max_discount_percentage: number | null;
  discount_requires_approval: boolean;
  is_system: boolean;
};

export type PermissionUserOption = {
  id: string;
  full_name: string | null;
  role: WorkspaceRole;
  active_bundle_keys: string[];
};

export type PermissionAssignmentOption = {
  id: string;
  user_id: string;
  bundle_key: string;
  bundle_label: string;
  notes: string | null;
  assigned_at: string;
  assigned_by_name: string | null;
};

export type PortabilityPackageOption = {
  id: string;
  package_type: "json" | "csv";
  scope: "products" | "reports" | "customers" | "backup";
  status: "ready" | "revoked" | "expired";
  file_name: string;
  row_count: number;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  is_expired: boolean;
};

export type PortabilityImportJobOption = {
  id: string;
  file_name: string;
  source_format: "json" | "csv";
  status: "dry_run_ready" | "dry_run_failed" | "committed";
  rows_total: number;
  rows_valid: number;
  rows_invalid: number;
  rows_committed: number;
  committed_at: string | null;
  created_at: string;
};

export type PortabilityRestoreDrillOption = {
  id: string;
  package_id: string;
  package_file_name: string | null;
  target_env: "isolated-drill";
  status: "started" | "completed" | "failed";
  drift_count: number | null;
  rto_seconds: number | null;
  completed_at: string | null;
  created_at: string;
};

export type InventoryCountItemOption = {
  id: string;
  inventory_count_id: string;
  product_id: string;
  product_name: string;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
  reason: string | null;
};

export type InventoryCountOption = {
  id: string;
  count_date: string;
  count_type: string;
  status: string;
  notes: string | null;
  completed_at?: string | null;
  items: InventoryCountItemOption[];
};

export type InventoryProductOption = {
  id: string;
  name: string;
  category: string;
  stock_quantity: number;
  min_stock_level: number;
  is_active: boolean;
};

export type ReconciliationEntryOption = {
  id: string;
  reconciliation_date: string;
  expected_balance: number;
  actual_balance: number;
  difference: number;
  difference_reason: string | null;
  is_resolved: boolean;
  account_id: string;
  account_name: string;
};

export type DebtCustomerOption = {
  id: string;
  name: string;
  phone: string | null;
  current_balance: number;
  due_date_days?: number | null;
  credit_limit?: number | null;
};

export type DebtEntryOption = {
  id: string;
  debt_customer_id: string;
  entry_type: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  description: string | null;
};

export type AccountOption = {
  id: string;
  name: string;
  type: string;
  module_scope: string;
  fee_percentage: number;
};

export type SupplierOption = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PurchaseProductOption = {
  id: string;
  name: string;
  category: string;
  stock_quantity: number;
  cost_price: number;
  avg_cost_price: number;
  is_active: boolean;
};

export type PurchaseLineOption = {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
};

export type PurchaseOrderOption = {
  id: string;
  purchase_number: string;
  purchase_date: string;
  total_amount: number;
  is_paid: boolean;
  notes: string | null;
  supplier_name: string | null;
  account_name: string | null;
  items: PurchaseLineOption[];
};

export type SupplierPaymentOption = {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  notes: string | null;
  supplier_name: string;
  account_name: string;
};

export type OperationsAccountOption = {
  id: string;
  name: string;
  type: string;
  module_scope: string;
  fee_percentage: number;
  current_balance: number | null;
};

export type TopupProviderOption = {
  id: string;
  name: string;
};

export type TopupOption = {
  id: string;
  topup_number: string;
  topup_date: string;
  amount: number;
  profit_amount: number;
  notes: string | null;
  account_name: string;
  supplier_name: string | null;
  created_by_name: string | null;
};

export type TransferOption = {
  id: string;
  transfer_number: string;
  transfer_date: string;
  amount: number;
  notes: string | null;
  from_account_name: string;
  to_account_name: string;
  created_by_name: string | null;
};

export type TopupReportSummary = {
  entry_count: number;
  total_amount: number;
  total_profit: number;
  top_supplier_name: string | null;
};

export type MaintenanceAccountOption = {
  id: string;
  name: string;
  type: string;
  module_scope: string;
  current_balance: number | null;
};

export type MaintenanceJobOption = {
  id: string;
  job_number: string;
  job_date: string;
  customer_name: string;
  customer_phone: string | null;
  device_type: string;
  issue_description: string;
  estimated_cost: number | null;
  final_amount: number | null;
  status: string;
  notes: string | null;
  delivered_at: string | null;
  payment_account_id: string | null;
  payment_account_name: string | null;
};

export type MaintenanceSummary = {
  open_count: number;
  ready_count: number;
  delivered_count: number;
  delivered_revenue: number;
};

export type InvoiceItemOption = {
  id: string;
  invoice_id: string;
  product_name_at_time: string;
  quantity: number;
  returned_quantity: number;
  unit_price: number;
  discount_percentage: number;
  total_price: number;
};

export type InvoiceOption = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  status: string;
  pos_terminal_code: string | null;
  debt_amount: number;
  items: InvoiceItemOption[];
};

type InventoryCountRow = {
  id: string;
  count_date: string;
  count_type: string;
  status: string;
  notes: string | null;
  completed_at?: string | null;
};

type InventoryCountItemRow = {
  id: string;
  inventory_count_id: string;
  product_id: string;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
  reason: string | null;
};

type ProductNameRow = {
  id: string;
  name: string;
};

type InventoryProductRow = InventoryProductOption;

type ReconciliationEntryRow = {
  id: string;
  reconciliation_date: string;
  expected_balance: number;
  actual_balance: number;
  difference: number;
  difference_reason: string | null;
  is_resolved: boolean;
  account_id: string;
  accounts: {
    name: string;
  } | null;
};

type InvoiceRow = Omit<InvoiceOption, "items">;

type PurchaseOrderRow = {
  id: string;
  purchase_number: string;
  purchase_date: string;
  total_amount: number;
  is_paid: boolean;
  notes: string | null;
  supplier_id: string | null;
  payment_account_id: string | null;
};

type PurchaseItemRow = {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
};

type SupplierPaymentRow = {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  notes: string | null;
  supplier_id: string;
  account_id: string;
};

type AccountWithBalanceRow = {
  id: string;
  name: string;
  type: string;
  module_scope: string;
  fee_percentage: number;
  current_balance: number;
};

type PosAccountRow = {
  id: string;
  name: string;
  type: string;
  module_scope: string;
  fee_percentage: number;
};

type ProviderRow = {
  id: string;
  name: string;
};

type TopupRow = {
  id: string;
  topup_number: string;
  topup_date: string;
  amount: number;
  profit_amount: number;
  notes: string | null;
  account_id: string;
  supplier_id: string | null;
  created_by: string;
};

type TransferRow = {
  id: string;
  transfer_number: string;
  transfer_date: string;
  amount: number;
  notes: string | null;
  from_account_id: string;
  to_account_id: string;
  created_by: string;
};

type MaintenanceAccountRow = MaintenanceAccountOption;

type MaintenanceJobRow = {
  id: string;
  job_number: string;
  job_date: string;
  customer_name: string;
  customer_phone: string | null;
  device_type: string;
  issue_description: string;
  estimated_cost: number | null;
  final_amount: number | null;
  status: string;
  notes: string | null;
  delivered_at: string | null;
  payment_account_id: string | null;
  accounts: {
    name: string;
  } | null;
};

function appendSearchParam(target: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    for (const item of value) {
      target.append(key, item);
    }
    return;
  }

  if (value) {
    target.set(key, value);
  }
}

export function toUrlSearchParams(searchParams: SearchParamsInput) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    appendSearchParam(params, key, value);
  }

  return params;
}

async function readMaybeCached<T>(cachedQuery: () => Promise<T>, fallbackQuery: () => Promise<T>) {
  try {
    return await cachedQuery();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      return fallbackQuery();
    }

    throw error;
  }
}

async function queryActiveWorkspaceUsers(
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["admin", "pos_staff"])
    .eq("is_active", true)
    .order("full_name", { ascending: true })
    .returns<WorkspaceUserOption[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

const getCachedActiveWorkspaceUsers = unstable_cache(
  async () => queryActiveWorkspaceUsers(getSupabaseAdminClient()),
  ["px13-active-workspace-users"],
  { revalidate: 120 }
);

export async function listActiveWorkspaceUsers(
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  return queryActiveWorkspaceUsers(supabase);
}

async function queryPosTerminalCodes(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  fromDate: string,
  toDate: string
) {
  const { data, error } = await supabase
    .from("invoices")
    .select("pos_terminal_code")
    .gte("invoice_date", fromDate)
    .lte("invoice_date", toDate)
    .not("pos_terminal_code", "is", null);

  if (error) {
    throw error;
  }

  return [...new Set((data ?? []).map((row) => row.pos_terminal_code).filter(Boolean))] as string[];
}

const getCachedPosTerminalCodes = unstable_cache(
  async (fromDate: string, toDate: string) =>
    queryPosTerminalCodes(getSupabaseAdminClient(), fromDate, toDate),
  ["px13-pos-terminal-codes"],
  { revalidate: 120 }
);

export async function listPosTerminalCodes(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  fromDate: string,
  toDate: string
) {
  return queryPosTerminalCodes(supabase, fromDate, toDate);
}

export async function getReportsPageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  searchParams: SearchParamsInput
) {
  const filters = parseSalesHistoryFilters(toUrlSearchParams(searchParams));
  const [reportBaseline, users, terminals] = await Promise.all([
    getReportBaseline(supabase, filters, { role: "admin", userId: "" }),
    readMaybeCached(
      () => getCachedActiveWorkspaceUsers(),
      () => queryActiveWorkspaceUsers(supabase)
    ),
    readMaybeCached(
      () => getCachedPosTerminalCodes(filters.fromDate, filters.toDate),
      () => queryPosTerminalCodes(supabase, filters.fromDate, filters.toDate)
    )
  ]);

  return {
    filters,
    users,
    terminals,
    reportBaseline
  };
}

export async function getSettingsPageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const [
    accountsResult,
    snapshotsResult,
    countsResult,
    permissionBundlesResult,
    permissionUsersResult,
    roleAssignmentsResult
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, current_balance, module_scope")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .returns<SettingsAccount[]>(),
    supabase
      .from("daily_snapshots")
      .select("id, snapshot_date, net_sales, net_profit, invoice_count, created_at")
      .order("snapshot_date", { ascending: false })
      .limit(5)
      .returns<SettingsSnapshot[]>(),
    supabase
      .from("inventory_counts")
      .select("id, count_date, count_type, status, notes")
      .eq("status", "in_progress")
      .order("count_date", { ascending: false })
      .limit(5)
      .returns<InventoryCountRow[]>(),
    supabase
      .from("permission_bundles")
      .select(
        "id, key, label, description, base_role, permissions, max_discount_percentage, discount_requires_approval, is_system"
      )
      .eq("is_active", true)
      .order("base_role", { ascending: true })
      .order("label", { ascending: true })
      .returns<PermissionBundleOption[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("is_active", true)
      .in("role", ["admin", "pos_staff"])
      .order("full_name", { ascending: true })
      .returns<WorkspaceUserOption[]>(),
    supabase
      .from("role_assignments")
      .select(
        "id, user_id, notes, assigned_at, profiles!role_assignments_assigned_by_fkey(full_name), permission_bundles(key, label)"
      )
      .eq("is_active", true)
      .is("revoked_at", null)
      .order("assigned_at", { ascending: false })
      .returns<
        Array<{
          id: string;
          user_id: string;
          notes: string | null;
          assigned_at: string;
          profiles: { full_name: string | null } | null;
          permission_bundles: { key: string; label: string } | null;
        }>
      >()
  ]);

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  if (snapshotsResult.error) {
    throw snapshotsResult.error;
  }

  if (countsResult.error) {
    throw countsResult.error;
  }

  if (permissionBundlesResult.error) {
    throw permissionBundlesResult.error;
  }

  if (permissionUsersResult.error) {
    throw permissionUsersResult.error;
  }

  if (roleAssignmentsResult.error) {
    throw roleAssignmentsResult.error;
  }

  const activeBundleKeysByUser = new Map<string, string[]>();
  for (const assignment of roleAssignmentsResult.data ?? []) {
    const bundleKey = assignment.permission_bundles?.key;
    if (!bundleKey) {
      continue;
    }

    const list = activeBundleKeysByUser.get(assignment.user_id) ?? [];
    list.push(bundleKey);
    activeBundleKeysByUser.set(assignment.user_id, list);
  }

  const countIds = (countsResult.data ?? []).map((count) => count.id);
  if (countIds.length === 0) {
    return {
      accounts: accountsResult.data ?? [],
      snapshots: snapshotsResult.data ?? [],
      inventoryCounts: [] as InventoryCountOption[],
      permissionBundles: permissionBundlesResult.data ?? [],
      permissionUsers: (permissionUsersResult.data ?? []).map((user) => ({
        ...user,
        active_bundle_keys: activeBundleKeysByUser.get(user.id) ?? []
      })),
      activeAssignments: (roleAssignmentsResult.data ?? []).flatMap((assignment) =>
        assignment.permission_bundles
          ? [
              {
                id: assignment.id,
                user_id: assignment.user_id,
                bundle_key: assignment.permission_bundles.key,
                bundle_label: assignment.permission_bundles.label,
                notes: assignment.notes,
                assigned_at: assignment.assigned_at,
                assigned_by_name: assignment.profiles?.full_name ?? null
              } satisfies PermissionAssignmentOption
            ]
          : []
      )
    };
  }

  const itemsResult = await supabase
    .from("inventory_count_items")
    .select("id, inventory_count_id, product_id, system_quantity, actual_quantity, difference, reason")
    .in("inventory_count_id", countIds)
    .order("product_id", { ascending: true })
    .returns<InventoryCountItemRow[]>();

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  const productIds = [...new Set((itemsResult.data ?? []).map((item) => item.product_id))];
  const productsResult =
    productIds.length === 0
      ? { data: [] as ProductNameRow[], error: null }
      : await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds)
          .returns<ProductNameRow[]>();

  if (productsResult.error) {
    throw productsResult.error;
  }

  const productNames = new Map((productsResult.data ?? []).map((product) => [product.id, product.name]));
  const itemsByCount = new Map<string, InventoryCountItemOption[]>();

  for (const item of itemsResult.data ?? []) {
    const list = itemsByCount.get(item.inventory_count_id) ?? [];
    list.push({
      ...item,
      product_name: productNames.get(item.product_id) ?? "منتج غير معروف"
    });
    itemsByCount.set(item.inventory_count_id, list);
  }

  return {
    accounts: accountsResult.data ?? [],
    snapshots: snapshotsResult.data ?? [],
    permissionBundles: permissionBundlesResult.data ?? [],
    permissionUsers: (permissionUsersResult.data ?? []).map((user) => ({
      ...user,
      active_bundle_keys: activeBundleKeysByUser.get(user.id) ?? []
    })),
    activeAssignments: (roleAssignmentsResult.data ?? []).flatMap((assignment) =>
      assignment.permission_bundles
        ? [
            {
              id: assignment.id,
              user_id: assignment.user_id,
              bundle_key: assignment.permission_bundles.key,
              bundle_label: assignment.permission_bundles.label,
              notes: assignment.notes,
              assigned_at: assignment.assigned_at,
              assigned_by_name: assignment.profiles?.full_name ?? null
            } satisfies PermissionAssignmentOption
          ]
        : []
    ),
    inventoryCounts: (countsResult.data ?? []).map((count) => ({
      ...count,
      items: itemsByCount.get(count.id) ?? []
    }))
  };
}

export async function getPortabilityPageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const [packagesResult, importJobsResult, restoreDrillsResult] = await Promise.all([
    supabase
      .from("export_packages")
      .select("id, package_type, scope, status, file_name, row_count, expires_at, revoked_at, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<
        Array<{
          id: string;
          package_type: "json" | "csv";
          scope: "products" | "reports" | "customers" | "backup";
          status: "ready" | "revoked" | "expired";
          file_name: string;
          row_count: number;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
        }>
      >(),
    supabase
      .from("import_jobs")
      .select("id, file_name, source_format, status, rows_total, rows_valid, rows_invalid, rows_committed, committed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<PortabilityImportJobOption[]>(),
    supabase
      .from("restore_drills")
      .select("id, export_package_id, target_env, status, drift_count, rto_seconds, completed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<
        Array<{
          id: string;
          export_package_id: string;
          target_env: "isolated-drill";
          status: "started" | "completed" | "failed";
          drift_count: number | null;
          rto_seconds: number | null;
          completed_at: string | null;
          created_at: string;
        }>
      >()
  ]);

  if (packagesResult.error) {
    throw packagesResult.error;
  }

  if (importJobsResult.error) {
    throw importJobsResult.error;
  }

  if (restoreDrillsResult.error) {
    throw restoreDrillsResult.error;
  }

  const packageFileNameById = new Map((packagesResult.data ?? []).map((item) => [item.id, item.file_name]));

  return {
    packages: (packagesResult.data ?? []).map((item) => ({
      ...item,
      is_expired: new Date(item.expires_at).getTime() <= Date.now()
    })) as PortabilityPackageOption[],
    importJobs: importJobsResult.data ?? [],
    restoreDrills: (restoreDrillsResult.data ?? []).map((item) => ({
      id: item.id,
      package_id: item.export_package_id,
      package_file_name: packageFileNameById.get(item.export_package_id) ?? null,
      target_env: item.target_env,
      status: item.status,
      drift_count: item.drift_count,
      rto_seconds: item.rto_seconds,
      completed_at: item.completed_at,
      created_at: item.created_at
    })) as PortabilityRestoreDrillOption[]
  };
}

export async function getInventoryPageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  options: {
    role: WorkspaceRole;
  }
) {
  const isAdmin = options.role === "admin";

  const [productsResult, accountsResult, countsResult, reconciliationsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category, stock_quantity, min_stock_level, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .returns<InventoryProductRow[]>(),
    isAdmin
      ? supabase
          .from("accounts")
          .select("id, name, type, current_balance, module_scope")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .returns<SettingsAccount[]>()
      : Promise.resolve({ data: [] as SettingsAccount[], error: null }),
    supabase
      .from("inventory_counts")
      .select("id, count_date, count_type, status, notes, completed_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<InventoryCountRow[]>(),
    isAdmin
      ? supabase
          .from("reconciliation_entries")
          .select(
            "id, reconciliation_date, expected_balance, actual_balance, difference, difference_reason, is_resolved, account_id, accounts(name)"
          )
          .order("created_at", { ascending: false })
          .limit(10)
          .returns<ReconciliationEntryRow[]>()
      : Promise.resolve({ data: [] as ReconciliationEntryRow[], error: null })
  ]);

  if (productsResult.error) {
    throw productsResult.error;
  }

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  if (countsResult.error) {
    throw countsResult.error;
  }

  if (reconciliationsResult.error) {
    throw reconciliationsResult.error;
  }

  const countIds = (countsResult.data ?? []).map((count) => count.id);
  const itemsResult =
    countIds.length === 0
      ? { data: [] as InventoryCountItemRow[], error: null }
      : await supabase
          .from("inventory_count_items")
          .select("id, inventory_count_id, product_id, system_quantity, actual_quantity, difference, reason")
          .in("inventory_count_id", countIds)
          .order("product_id", { ascending: true })
          .returns<InventoryCountItemRow[]>();

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  const productIds = [...new Set((itemsResult.data ?? []).map((item) => item.product_id))];
  const productNames = new Map((productsResult.data ?? []).map((product) => [product.id, product.name]));

  if (productIds.length > 0 && productNames.size === 0) {
    const namesResult = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds)
      .returns<ProductNameRow[]>();

    if (namesResult.error) {
      throw namesResult.error;
    }

    for (const product of namesResult.data ?? []) {
      productNames.set(product.id, product.name);
    }
  }

  const itemsByCount = new Map<string, InventoryCountItemOption[]>();

  for (const item of itemsResult.data ?? []) {
    const list = itemsByCount.get(item.inventory_count_id) ?? [];
    list.push({
      ...item,
      product_name: productNames.get(item.product_id) ?? "منتج غير معروف"
    });
    itemsByCount.set(item.inventory_count_id, list);
  }

  const counts = (countsResult.data ?? []).map((count) => ({
    ...count,
    items: itemsByCount.get(count.id) ?? []
  }));

  return {
    products: productsResult.data ?? [],
    accounts: accountsResult.data ?? [],
    inProgressCounts: counts.filter((count) => count.status === "in_progress"),
    recentCompletedCounts: counts.filter((count) => count.status === "completed"),
    recentReconciliations: (reconciliationsResult.data ?? []).map((entry) => ({
      id: entry.id,
      reconciliation_date: entry.reconciliation_date,
      expected_balance: entry.expected_balance,
      actual_balance: entry.actual_balance,
      difference: entry.difference,
      difference_reason: entry.difference_reason,
      is_resolved: entry.is_resolved,
      account_id: entry.account_id,
      account_name: entry.accounts?.name ?? "حساب غير معروف"
    }))
  };
}

export async function getDebtsPageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  viewer: { role: WorkspaceRole; userId: string }
) {
  const debtCustomersQuery =
    viewer.role === "admin"
      ? supabase
          .from("debt_customers")
          .select("id, name, phone, current_balance, due_date_days, credit_limit")
          .eq("is_active", true)
          .order("current_balance", { ascending: false })
      : supabase
          .from("v_pos_debt_customers")
          .select("id, name, phone, current_balance, due_date_days")
          .eq("is_active", true)
          .order("current_balance", { ascending: false });

  const accountsQuery =
    viewer.role === "admin"
      ? supabase
          .from("accounts")
          .select("id, name, type, module_scope, fee_percentage")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
      : supabase
          .from("v_pos_accounts")
          .select("id, name, type, module_scope, fee_percentage")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

  const [customersResult, entriesResult, accountsResult] = await Promise.all([
    debtCustomersQuery.returns<DebtCustomerOption[]>(),
    supabase
      .from("debt_entries")
      .select("id, debt_customer_id, entry_type, amount, paid_amount, remaining_amount, due_date, description")
      .eq("is_paid", false)
      .order("due_date", { ascending: true })
      .returns<DebtEntryOption[]>(),
    accountsQuery.returns<AccountOption[]>()
  ]);

  if (customersResult.error) {
    throw customersResult.error;
  }

  if (entriesResult.error) {
    throw entriesResult.error;
  }

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  return {
    customers: customersResult.data ?? [],
    entries: entriesResult.data ?? [],
    accounts: accountsResult.data ?? []
  };
}

export async function getInvoicesPageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  viewer: { role: WorkspaceRole; userId: string }
) {
  let invoicesQuery = supabase
    .from("invoices")
    .select(
      "id, invoice_number, invoice_date, created_at, customer_name, customer_phone, total_amount, status, pos_terminal_code, debt_amount, created_by"
    )
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  if (viewer.role === "pos_staff") {
    invoicesQuery = invoicesQuery.eq("created_by", viewer.userId);
  }

  const [invoicesResult, accountsResult] = await Promise.all([
    invoicesQuery.returns<(InvoiceRow & { created_by: string })[]>(),
    supabase
      .from("accounts")
      .select("id, name, type, module_scope, fee_percentage")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .returns<AccountOption[]>()
  ]);

  if (invoicesResult.error) {
    throw invoicesResult.error;
  }

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  const invoices = invoicesResult.data ?? [];
  const invoiceIds = invoices.map((invoice) => invoice.id);

  const itemsResult =
    invoiceIds.length === 0
      ? { data: [] as InvoiceItemOption[], error: null }
      : await supabase
          .from("invoice_items")
          .select("id, invoice_id, product_name_at_time, quantity, returned_quantity, unit_price, discount_percentage, total_price")
          .in("invoice_id", invoiceIds)
          .order("invoice_id", { ascending: false })
          .returns<InvoiceItemOption[]>();

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  const itemsByInvoice = new Map<string, InvoiceItemOption[]>();
  for (const item of itemsResult.data ?? []) {
    const list = itemsByInvoice.get(item.invoice_id) ?? [];
    list.push(item);
    itemsByInvoice.set(item.invoice_id, list);
  }

  return {
    invoices: invoices.map(({ created_by: _createdBy, ...invoice }) => ({
      ...invoice,
      items: itemsByInvoice.get(invoice.id) ?? []
    })),
    accounts: accountsResult.data ?? []
  };
}

export async function getSuppliersPageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const [suppliersResult, productsResult, accountsResult, purchaseOrdersResult, supplierPaymentsResult] =
    await Promise.all([
      supabase
        .from("admin_suppliers")
        .select("id, name, phone, address, current_balance, is_active, created_at, updated_at")
        .order("current_balance", { ascending: false })
        .order("name", { ascending: true })
        .returns<SupplierOption[]>(),
      supabase
        .from("products")
        .select("id, name, category, stock_quantity, cost_price, avg_cost_price, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .returns<PurchaseProductOption[]>(),
      supabase
        .from("accounts")
        .select("id, name, type, module_scope, fee_percentage")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .returns<AccountOption[]>(),
      supabase
        .from("purchase_orders")
        .select("id, purchase_number, purchase_date, total_amount, is_paid, notes, supplier_id, payment_account_id")
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<PurchaseOrderRow[]>(),
      supabase
        .from("supplier_payments")
        .select("id, payment_number, payment_date, amount, notes, supplier_id, account_id")
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<SupplierPaymentRow[]>()
    ]);

  if (suppliersResult.error) {
    throw suppliersResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  if (purchaseOrdersResult.error) {
    throw purchaseOrdersResult.error;
  }

  if (supplierPaymentsResult.error) {
    throw supplierPaymentsResult.error;
  }

  const purchases = purchaseOrdersResult.data ?? [];
  const purchaseIds = purchases.map((purchase) => purchase.id);
  const purchaseItemsResult =
    purchaseIds.length === 0
      ? { data: [] as PurchaseItemRow[], error: null }
      : await supabase
          .from("purchase_items")
          .select("id, purchase_id, product_id, quantity, unit_cost, total_cost")
          .in("purchase_id", purchaseIds)
          .order("purchase_id", { ascending: false })
          .returns<PurchaseItemRow[]>();

  if (purchaseItemsResult.error) {
    throw purchaseItemsResult.error;
  }

  const supplierMap = new Map((suppliersResult.data ?? []).map((supplier) => [supplier.id, supplier]));
  const accountMap = new Map((accountsResult.data ?? []).map((account) => [account.id, account]));
  const productIds = [...new Set((purchaseItemsResult.data ?? []).map((item) => item.product_id))];
  const purchaseProductsResult =
    productIds.length === 0
      ? { data: [] as ProductNameRow[], error: null }
      : await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds)
          .returns<ProductNameRow[]>();

  if (purchaseProductsResult.error) {
    throw purchaseProductsResult.error;
  }

  const productMap = new Map((purchaseProductsResult.data ?? []).map((product) => [product.id, product.name]));
  const itemsByPurchase = new Map<string, PurchaseLineOption[]>();

  for (const item of purchaseItemsResult.data ?? []) {
    const list = itemsByPurchase.get(item.purchase_id) ?? [];
    list.push({
      ...item,
      product_name: productMap.get(item.product_id) ?? "منتج غير معروف"
    });
    itemsByPurchase.set(item.purchase_id, list);
  }

  return {
    suppliers: suppliersResult.data ?? [],
    products: productsResult.data ?? [],
    accounts: accountsResult.data ?? [],
    purchaseOrders: purchases.map((purchase) => ({
      id: purchase.id,
      purchase_number: purchase.purchase_number,
      purchase_date: purchase.purchase_date,
      total_amount: purchase.total_amount,
      is_paid: purchase.is_paid,
      notes: purchase.notes,
      supplier_name: purchase.supplier_id ? supplierMap.get(purchase.supplier_id)?.name ?? null : null,
      account_name: purchase.payment_account_id
        ? accountMap.get(purchase.payment_account_id)?.name ?? null
        : null,
      items: itemsByPurchase.get(purchase.id) ?? []
    })),
    supplierPayments: (supplierPaymentsResult.data ?? []).map((payment) => ({
      id: payment.id,
      payment_number: payment.payment_number,
      payment_date: payment.payment_date,
      amount: payment.amount,
      notes: payment.notes,
      supplier_name: supplierMap.get(payment.supplier_id)?.name ?? "مورد غير معروف",
      account_name: accountMap.get(payment.account_id)?.name ?? "حساب غير معروف"
    }))
  };
}

export async function getOperationsPageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  options: {
    role: WorkspaceRole;
    userId: string;
  }
) {
  const isAdmin = options.role === "admin";

  const accountsPromise = isAdmin
    ? supabase
        .from("accounts")
        .select("id, name, type, module_scope, fee_percentage, current_balance")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .returns<AccountWithBalanceRow[]>()
    : supabase
        .from("v_pos_accounts")
        .select("id, name, type, module_scope, fee_percentage")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .returns<PosAccountRow[]>();

  let recentTopupsQuery = supabase
    .from("topups")
    .select("id, topup_number, topup_date, amount, profit_amount, notes, account_id, supplier_id, created_by")
    .order("topup_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  let reportTopupsQuery = supabase
    .from("topups")
    .select("id, amount, profit_amount, supplier_id, created_by")
    .gte(
      "topup_date",
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10)
    );

  if (!isAdmin) {
    recentTopupsQuery = recentTopupsQuery.eq("created_by", options.userId);
    reportTopupsQuery = reportTopupsQuery.eq("created_by", options.userId);
  }

  const [accountsResult, providersResult, recentTopupsResult, reportTopupsResult, transfersResult, usersResult] =
    await Promise.all([
      accountsPromise,
      supabase
        .from("suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .returns<ProviderRow[]>(),
      recentTopupsQuery.returns<TopupRow[]>(),
      reportTopupsQuery.returns<Array<Pick<TopupRow, "id" | "amount" | "profit_amount" | "supplier_id" | "created_by">>>(),
      isAdmin
        ? supabase
            .from("transfers")
            .select("id, transfer_number, transfer_date, amount, notes, from_account_id, to_account_id, created_by")
            .eq("transfer_type", "internal")
            .order("transfer_date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(12)
            .returns<TransferRow[]>()
        : Promise.resolve({ data: [] as TransferRow[], error: null }),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .returns<Array<{ id: string; full_name: string | null }>>()
    ]);

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  if (providersResult.error) {
    throw providersResult.error;
  }

  if (recentTopupsResult.error) {
    throw recentTopupsResult.error;
  }

  if (reportTopupsResult.error) {
    throw reportTopupsResult.error;
  }

  if (transfersResult.error) {
    throw transfersResult.error;
  }

  if (usersResult.error) {
    throw usersResult.error;
  }

  const accounts = (accountsResult.data ?? []).map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    module_scope: account.module_scope,
    fee_percentage: account.fee_percentage,
    current_balance: "current_balance" in account ? account.current_balance : null
  })) satisfies OperationsAccountOption[];

  const accountNameMap = new Map(accounts.map((account) => [account.id, account.name]));
  const supplierNameMap = new Map((providersResult.data ?? []).map((supplier) => [supplier.id, supplier.name]));
  const userNameMap = new Map((usersResult.data ?? []).map((user) => [user.id, user.full_name]));

  const recentTopups = (recentTopupsResult.data ?? []).map((topup) => ({
    id: topup.id,
    topup_number: topup.topup_number,
    topup_date: topup.topup_date,
    amount: topup.amount,
    profit_amount: topup.profit_amount,
    notes: topup.notes,
    account_name: accountNameMap.get(topup.account_id) ?? "حساب غير معروف",
    supplier_name: topup.supplier_id ? supplierNameMap.get(topup.supplier_id) ?? "مزود غير معروف" : null,
    created_by_name: userNameMap.get(topup.created_by) ?? null
  })) satisfies TopupOption[];

  const recentTransfers = (transfersResult.data ?? []).map((transfer) => ({
    id: transfer.id,
    transfer_number: transfer.transfer_number,
    transfer_date: transfer.transfer_date,
    amount: transfer.amount,
    notes: transfer.notes,
    from_account_name: accountNameMap.get(transfer.from_account_id) ?? "حساب غير معروف",
    to_account_name: accountNameMap.get(transfer.to_account_id) ?? "حساب غير معروف",
    created_by_name: userNameMap.get(transfer.created_by) ?? null
  })) satisfies TransferOption[];

  let topSupplierName: string | null = null;
  let topSupplierProfit = -1;
  const profitBySupplier = new Map<string, number>();

  for (const topup of reportTopupsResult.data ?? []) {
    if (!topup.supplier_id) {
      continue;
    }

    const nextProfit = (profitBySupplier.get(topup.supplier_id) ?? 0) + topup.profit_amount;
    profitBySupplier.set(topup.supplier_id, nextProfit);

    if (nextProfit > topSupplierProfit) {
      topSupplierProfit = nextProfit;
      topSupplierName = supplierNameMap.get(topup.supplier_id) ?? "مزود غير معروف";
    }
  }

  const topupSummary = {
    entry_count: (reportTopupsResult.data ?? []).length,
    total_amount: (reportTopupsResult.data ?? []).reduce((sum, topup) => sum + topup.amount, 0),
    total_profit: (reportTopupsResult.data ?? []).reduce((sum, topup) => sum + topup.profit_amount, 0),
    top_supplier_name: topSupplierName
  } satisfies TopupReportSummary;

  return {
    role: options.role,
    accounts,
    providers: providersResult.data ?? [],
    recentTopups,
    recentTransfers,
    topupSummary
  };
}

export async function getMaintenancePageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  options: {
    role: WorkspaceRole;
    userId: string;
  }
) {
  const isAdmin = options.role === "admin";

  const [accountsResult, jobsResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, module_scope, current_balance")
      .eq("is_active", true)
      .eq("module_scope", "maintenance")
      .order("display_order", { ascending: true })
      .returns<MaintenanceAccountRow[]>(),
    supabase
      .from("maintenance_jobs")
      .select(
        "id, job_number, job_date, customer_name, customer_phone, device_type, issue_description, estimated_cost, final_amount, status, notes, delivered_at, payment_account_id, accounts(name)"
      )
      .order("job_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<MaintenanceJobRow[]>()
  ]);

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  if (jobsResult.error) {
    throw jobsResult.error;
  }

  const jobs = (jobsResult.data ?? []).map((job) => ({
    id: job.id,
    job_number: job.job_number,
    job_date: job.job_date,
    customer_name: job.customer_name,
    customer_phone: job.customer_phone,
    device_type: job.device_type,
    issue_description: job.issue_description,
    estimated_cost: job.estimated_cost,
    final_amount: job.final_amount,
    status: job.status,
    notes: job.notes,
    delivered_at: job.delivered_at,
    payment_account_id: job.payment_account_id,
    payment_account_name: job.accounts?.name ?? null
  })) satisfies MaintenanceJobOption[];

  const summary = jobs.reduce<MaintenanceSummary>(
    (current, job) => {
      if (job.status !== "delivered" && job.status !== "cancelled") {
        current.open_count += 1;
      }

      if (job.status === "ready") {
        current.ready_count += 1;
      }

      if (job.status === "delivered") {
        current.delivered_count += 1;
        current.delivered_revenue += job.final_amount ?? 0;
      }

      return current;
    },
    {
      open_count: 0,
      ready_count: 0,
      delivered_count: 0,
      delivered_revenue: 0
    }
  );

  return {
    role: options.role,
    maintenanceAccounts: (accountsResult.data ?? []).map((account) => ({
      ...account,
      current_balance: isAdmin ? account.current_balance : null
    })),
    jobs,
    summary
  };
}
