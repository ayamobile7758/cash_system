import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode, getApiErrorMeta } from "@/lib/api/common";
import { getCreatePurchaseErrorMeta } from "@/lib/api/purchases";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createPurchaseSchema } from "@/lib/validations/purchases";

type PurchaseResponseData = {
  purchase_order_id: string;
  purchase_number: string;
  total: number;
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

    const parsedBody = createPurchaseSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("create_purchase", {
      p_supplier_id: payload.supplier_id ?? null,
      p_items: payload.items,
      p_is_paid: payload.is_paid,
      p_payment_account_id: payload.payment_account_id ?? null,
      p_notes: payload.notes ?? null,
      p_idempotency_key: payload.idempotency_key,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getCreatePurchaseErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<PurchaseResponseData>>(
      {
        success: true,
        data: {
          purchase_order_id: data.purchase_order_id,
          purchase_number: data.purchase_number,
          total: data.total
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
