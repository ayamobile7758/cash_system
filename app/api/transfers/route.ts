import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode } from "@/lib/api/common";
import { getCreateTransferErrorMeta } from "@/lib/api/operations";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createTransferSchema } from "@/lib/validations/operations";

type TransferResponse = {
  transfer_id: string;
  transfer_number: string;
  ledger_entry_ids: string[];
};

export async function POST(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getCreateTransferErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = createTransferSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getCreateTransferErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("create_transfer", {
      p_from_account_id: payload.from_account_id,
      p_to_account_id: payload.to_account_id,
      p_amount: payload.amount,
      p_notes: payload.notes ?? null,
      p_idempotency_key: payload.idempotency_key,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getCreateTransferErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<TransferResponse>>(
      {
        success: true,
        data: {
          transfer_id: data.transfer_id,
          transfer_number: data.transfer_number,
          ledger_entry_ids: data.ledger_entry_ids
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getCreateTransferErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
