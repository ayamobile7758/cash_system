import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type WorkspaceRole = "admin" | "pos_staff";

export const ALL_PERMISSIONS_TOKEN = "*";

export const POS_BASE_PERMISSIONS = [
  "dashboard.home",
  "products.read",
  "pos.use",
  "sales.create",
  "sales.history.read",
  "returns.create",
  "invoices.read",
  "debts.read",
  "debt.pay",
  "notifications.read",
  "receipt.links.manage"
] as const;

export type PermissionKey = (typeof POS_BASE_PERMISSIONS)[number] |
  "expenses.read" |
  "expenses.create" |
  "inventory.read" |
  "inventory.count.start" |
  "inventory.count.complete" |
  "operations.read" |
  "topups.create" |
  "maintenance.read" |
  "maintenance.create" |
  "maintenance.status.update" |
  "sales.discount.override";

export type PermissionBundleSummary = {
  id: string;
  key: string;
  label: string;
  base_role: WorkspaceRole;
  permissions: PermissionKey[];
  max_discount_percentage: number | null;
  discount_requires_approval: boolean;
};

type PermissionBundleRow = {
  id: string;
  key: string;
  label: string;
  base_role: WorkspaceRole;
  permissions: string[] | null;
  max_discount_percentage: number | null;
  discount_requires_approval: boolean;
  is_active: boolean;
};

type RoleAssignmentWithBundleRow = {
  bundle_id: string;
  permission_bundles: PermissionBundleRow | null;
};

export type PermissionContext = {
  permissions: string[];
  bundleKeys: string[];
  bundles: PermissionBundleSummary[];
  maxDiscountPercentage: number | null;
  discountRequiresApproval: boolean;
};

export function getBasePermissions(role: WorkspaceRole) {
  if (role === "admin") {
    return [ALL_PERMISSIONS_TOKEN];
  }

  return [...POS_BASE_PERMISSIONS];
}

export function hasPermission(permissions: string[], requiredPermission: string) {
  return permissions.includes(ALL_PERMISSIONS_TOKEN) || permissions.includes(requiredPermission);
}

export function hasAnyPermission(permissions: string[], requiredPermissions: string[]) {
  return requiredPermissions.some((permission) => hasPermission(permissions, permission));
}

export async function resolvePermissionContext(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  role: WorkspaceRole
): Promise<PermissionContext> {
  const { data, error } = await supabase
    .from("role_assignments")
    .select(
      "bundle_id, permission_bundles(id, key, label, base_role, permissions, max_discount_percentage, discount_requires_approval, is_active)"
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .returns<RoleAssignmentWithBundleRow[]>();

  if (error) {
    throw error;
  }

  const basePermissions = getBasePermissions(role);
  const permissionSet = new Set<string>(basePermissions);
  const bundles: PermissionBundleSummary[] = [];

  for (const assignment of data ?? []) {
    const bundle = assignment.permission_bundles;
    if (!bundle || bundle.is_active !== true || bundle.base_role !== role) {
      continue;
    }

    const normalizedPermissions = (bundle.permissions ?? []).filter(Boolean) as PermissionKey[];
    bundles.push({
      id: bundle.id,
      key: bundle.key,
      label: bundle.label,
      base_role: bundle.base_role,
      permissions: normalizedPermissions,
      max_discount_percentage: bundle.max_discount_percentage,
      discount_requires_approval: bundle.discount_requires_approval
    });

    for (const permission of normalizedPermissions) {
      permissionSet.add(permission);
    }
  }

  const discountBundles = bundles.filter((bundle) => bundle.permissions.includes("sales.discount.override"));

  return {
    permissions: [...permissionSet],
    bundleKeys: bundles.map((bundle) => bundle.key),
    bundles,
    maxDiscountPercentage:
      discountBundles.length > 0
        ? Math.max(...discountBundles.map((bundle) => bundle.max_discount_percentage ?? 0))
        : null,
    discountRequiresApproval: discountBundles.some((bundle) => bundle.discount_requires_approval)
  };
}
