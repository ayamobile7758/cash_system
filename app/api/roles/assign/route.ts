import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode, getApiErrorMeta } from "@/lib/api/common";
import { getPermissionsErrorMeta } from "@/lib/api/permissions";
import type { StandardEnvelope } from "@/lib/pos/types";
import { manageRoleAssignmentSchema } from "@/lib/validations/permissions";

type AssignmentResponse = {
  assignment_id: string;
  bundle_key: string;
  base_role: "admin" | "pos_staff";
  is_active: boolean;
};

async function parseRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
    return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
      body: ["تعذر قراءة JSON من الطلب."]
    });
  }
}

async function handleAssignmentAction(
  request: Request,
  rpcName: "assign_permission_bundle" | "revoke_permission_bundle"
) {
  const authorization = await authorizeRequest(["admin"]);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const body = await parseRequestBody(request);
  if (body instanceof NextResponse) {
    return body;
  }

  const parsedBody = manageRoleAssignmentSchema.safeParse(body);
  if (!parsedBody.success) {
    const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
    return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
      field_errors: parsedBody.error.flatten().fieldErrors
    });
  }

  const payload = parsedBody.data;
  const { data, error: rpcError } = await authorization.supabase.rpc(rpcName, {
    p_user_id: payload.user_id,
    p_bundle_key: payload.bundle_key,
    p_notes: payload.notes ?? null,
    p_created_by: authorization.userId
  });

  if (rpcError) {
    const code = extractErrorCode(rpcError.message);
    const meta = getPermissionsErrorMeta(code);
    return errorResponse(code, meta.message, meta.status);
  }

  return NextResponse.json<StandardEnvelope<AssignmentResponse>>(
    {
      success: true,
      data: {
        assignment_id: data.assignment_id,
        bundle_key: data.bundle_key,
        base_role: data.base_role,
        is_active: data.is_active
      }
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  try {
    return await handleAssignmentAction(request, "assign_permission_bundle");
  } catch (error) {
    const meta = getApiErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}

export async function DELETE(request: Request) {
  try {
    return await handleAssignmentAction(request, "revoke_permission_bundle");
  } catch (error) {
    const meta = getApiErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
