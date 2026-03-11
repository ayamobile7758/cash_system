import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode } from "@/lib/api/common";
import { getCreateMaintenanceErrorMeta } from "@/lib/api/maintenance";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createMaintenanceJobSchema } from "@/lib/validations/maintenance";

type MaintenanceCreateResponse = {
  job_id: string;
  job_number: string;
  status: string;
};

export async function POST(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"], {
      requiredPermissions: ["maintenance.create"]
    });
    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getCreateMaintenanceErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = createMaintenanceJobSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getCreateMaintenanceErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("create_maintenance_job", {
      p_customer_name: payload.customer_name,
      p_customer_phone: payload.customer_phone ?? null,
      p_device_type: payload.device_type,
      p_issue_description: payload.issue_description,
      p_estimated_cost: payload.estimated_cost ?? null,
      p_notes: payload.notes ?? null,
      p_idempotency_key: payload.idempotency_key,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getCreateMaintenanceErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<MaintenanceCreateResponse>>(
      {
        success: true,
        data: {
          job_id: data.job_id,
          job_number: data.job_number,
          status: data.status
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getCreateMaintenanceErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
