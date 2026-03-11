import { NextResponse } from "next/server";
import { hasPermission, resolvePermissionContext, type WorkspaceRole } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StandardEnvelope } from "@/lib/pos/types";

const API_ERROR_MAP = {
  ERR_API_SESSION_INVALID: {
    status: 401,
    message: "الجلسة غير صالحة. يرجى تسجيل الدخول مجددًا."
  },
  ERR_API_ROLE_FORBIDDEN: {
    status: 403,
    message: "ليس لديك صلاحية لهذه العملية."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات الطلب غير صالحة."
  },
  ERR_API_INTERNAL: {
    status: 500,
    message: "حدث خطأ غير متوقع. حاول مجددًا."
  }
} as const;

type ApiErrorCode = keyof typeof API_ERROR_MAP;
type WorkspaceProfile = {
  role: WorkspaceRole;
  is_active: boolean;
};

type AuthenticatedUser = {
  id: string;
};

type ServerAuthClient = {
  getUser?: () => Promise<{
    data: { user: AuthenticatedUser | null };
    error: Error | null;
  }>;
  getSession?: () => Promise<{
    data: { session: { user: AuthenticatedUser } | null };
    error: Error | null;
  }>;
};

export type AuthorizationResult =
  | {
      authorized: true;
      supabase: ReturnType<typeof getSupabaseAdminClient>;
      userId: string;
      role: WorkspaceRole;
      permissions: string[];
      bundleKeys: string[];
      maxDiscountPercentage: number | null;
      discountRequiresApproval: boolean;
    }
  | {
      authorized: false;
      response: NextResponse<StandardEnvelope>;
    };

export function errorResponse<T = unknown>(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json<StandardEnvelope<T>>(
    {
      success: false,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details })
      }
    },
    { status }
  );
}

export function extractErrorCode(message: string) {
  const match = message.match(/ERR_[A-Z_]+/);
  return match?.[0] ?? "ERR_API_INTERNAL";
}

export function getApiErrorMeta(code: string) {
  if (code in API_ERROR_MAP) {
    return API_ERROR_MAP[code as ApiErrorCode];
  }

  return API_ERROR_MAP.ERR_API_INTERNAL;
}

export async function getAuthenticatedUser(serverClient: ReturnType<typeof createSupabaseServerClient>) {
  const authClient = serverClient.auth as ServerAuthClient;

  if (typeof authClient.getUser === "function") {
    const {
      data: { user },
      error
    } = await authClient.getUser();

    return {
      user,
      error
    };
  }

  if (typeof authClient.getSession === "function") {
    const {
      data: { session },
      error
    } = await authClient.getSession();

    return {
      user: session?.user ?? null,
      error
    };
  }

  return {
    user: null,
    error: new Error("ERR_API_SESSION_INVALID")
  };
}

export async function authorizeRequest(
  allowedRoles: WorkspaceRole[],
  options?: {
    requiredPermissions?: string[];
  }
): Promise<AuthorizationResult> {
  const serverClient = createSupabaseServerClient();
  const { user, error: userError } = await getAuthenticatedUser(serverClient);

  if (userError || !user) {
    const meta = getApiErrorMeta("ERR_API_SESSION_INVALID");
    return {
      authorized: false,
      response: errorResponse("ERR_API_SESSION_INVALID", meta.message, meta.status)
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle<WorkspaceProfile>();

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !allowedRoles.includes(profile.role)
  ) {
    const meta = getApiErrorMeta("ERR_API_ROLE_FORBIDDEN");
    return {
      authorized: false,
      response: errorResponse("ERR_API_ROLE_FORBIDDEN", meta.message, meta.status)
    };
  }

  const permissionContext = await resolvePermissionContext(supabase, user.id, profile.role);

  if (
    options?.requiredPermissions &&
    options.requiredPermissions.some((permission) => !hasPermission(permissionContext.permissions, permission))
  ) {
    const meta = getApiErrorMeta("ERR_API_ROLE_FORBIDDEN");
    return {
      authorized: false,
      response: errorResponse("ERR_API_ROLE_FORBIDDEN", meta.message, meta.status)
    };
  }

  return {
    authorized: true,
    supabase,
    userId: user.id,
    role: profile.role,
    permissions: permissionContext.permissions,
    bundleKeys: permissionContext.bundleKeys,
    maxDiscountPercentage: permissionContext.maxDiscountPercentage,
    discountRequiresApproval: permissionContext.discountRequiresApproval
  };
}
