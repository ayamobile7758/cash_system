import { NextResponse } from "next/server";
import { authorizeRequest, handleRouteError, parseAndValidate } from "@/lib/api/common";
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

type MaintenanceRouteParams = {
  jobId: string;
};

type RouteContext = {
  params: Promise<MaintenanceRouteParams>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"], {
      requiredPermissions: ["maintenance.status.update"]
    });
    if (!authorization.authorized) {
      return authorization.response;
    }

    const validation = await parseAndValidate(request, updateMaintenanceStatusSchema, getUpdateMaintenanceErrorMeta);
    if (!validation.success) {
      return validation.response;
    }

    const { jobId } = await params;

    const payload = validation.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("update_maintenance_job_status", {
      p_job_id: jobId,
      p_new_status: payload.status,
      p_final_amount: payload.final_amount ?? null,
      p_payment_account_id: payload.payment_account_id ?? null,
      p_notes: payload.notes ?? null,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      throw rpcError;
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
    return handleRouteError(error, getUpdateMaintenanceErrorMeta);
  }
}
