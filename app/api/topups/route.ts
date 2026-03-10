import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode } from "@/lib/api/common";
import { getCreateTopupErrorMeta } from "@/lib/api/operations";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createTopupSchema } from "@/lib/validations/operations";

type TopupResponse = {
  topup_id: string;
  topup_number: string;
  ledger_entry_ids: string[];
};

export async function POST(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getCreateTopupErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = createTopupSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getCreateTopupErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("create_topup", {
      p_account_id: payload.account_id,
      p_amount: payload.amount,
      p_profit_amount: payload.profit_amount,
      p_supplier_id: payload.supplier_id ?? null,
      p_notes: payload.notes ?? null,
      p_idempotency_key: payload.idempotency_key,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getCreateTopupErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<TopupResponse>>(
      {
        success: true,
        data: {
          topup_id: data.topup_id,
          topup_number: data.topup_number,
          ledger_entry_ids: data.ledger_entry_ids
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getCreateTopupErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
