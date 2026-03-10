import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode, getApiErrorMeta } from "@/lib/api/common";
import { getCreateSupplierPaymentErrorMeta } from "@/lib/api/purchases";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createSupplierPaymentSchema } from "@/lib/validations/purchases";

type SupplierPaymentResponseData = {
  payment_id: string;
  payment_number: string;
  remaining_balance: number;
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
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = createSupplierPaymentSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("create_supplier_payment", {
      p_supplier_id: payload.supplier_id,
      p_account_id: payload.account_id,
      p_amount: payload.amount,
      p_notes: payload.notes ?? null,
      p_idempotency_key: payload.idempotency_key,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getCreateSupplierPaymentErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<SupplierPaymentResponseData>>(
      {
        success: true,
        data: {
          payment_id: data.payment_id,
          payment_number: data.payment_number,
          remaining_balance: data.remaining_balance
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getApiErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
