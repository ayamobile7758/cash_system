import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode } from "@/lib/api/common";
import { getUpdateMaintenanceErrorMeta } from "@/lib/api/maintenance";
import type { StandardEnvelope } from "@/lib/pos/types";
import { updateMaintenanceStatusSchema } from "@/lib/validations/maintenance";

type MaintenanceStatusResponse = {
  job_id: string;
  job_number: string;
  status: string;
  final_amount: number;
  ledger_entry_id: string | null;
};

type RouteContext = {
  params: {
    jobId: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"], {
      requiredPermissions: ["maintenance.status.update"]
    });
    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getUpdateMaintenanceErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = updateMaintenanceStatusSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getUpdateMaintenanceErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("update_maintenance_job_status", {
      p_job_id: params.jobId,
      p_new_status: payload.status,
      p_final_amount: payload.final_amount ?? null,
      p_payment_account_id: payload.payment_account_id ?? null,
      p_notes: payload.notes ?? null,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getUpdateMaintenanceErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<MaintenanceStatusResponse>>(
      {
        success: true,
        data: {
          job_id: data.job_id,
          job_number: data.job_number,
          status: data.status,
          final_amount: data.final_amount,
          ledger_entry_id: data.ledger_entry_id ?? null
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getUpdateMaintenanceErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
