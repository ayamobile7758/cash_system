import { cache } from "react";
import { resolvePermissionContext, type WorkspaceRole } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WorkspaceAccessResult =
  | {
      state: "ok";
      userId: string;
      role: WorkspaceRole;
      fullName: string | null;
      permissions: string[];
      bundleKeys: string[];
      maxDiscountPercentage: number | null;
      discountRequiresApproval: boolean;
    }
  | { state: "unauthenticated" }
  | { state: "forbidden" };

type ProfileAccessRow = {
  full_name: string | null;
  role: WorkspaceRole;
  is_active: boolean;
};

export const getWorkspaceAccess = cache(async function getWorkspaceAccess(): Promise<WorkspaceAccessResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { state: "unauthenticated" };
  }

  const adminClient = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle<ProfileAccessRow>();

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !["admin", "pos_staff"].includes(profile.role)
  ) {
    return { state: "forbidden" };
  }

  const permissionContext = await resolvePermissionContext(adminClient, user.id, profile.role);

  return {
    state: "ok",
    userId: user.id,
    role: profile.role,
    fullName: profile.full_name,
    permissions: permissionContext.permissions,
    bundleKeys: permissionContext.bundleKeys,
    maxDiscountPercentage: permissionContext.maxDiscountPercentage,
    discountRequiresApproval: permissionContext.discountRequiresApproval
  };
});
