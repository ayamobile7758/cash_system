import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode, getApiErrorMeta } from "@/lib/api/common";
import { getCreateInventoryCountErrorMeta } from "@/lib/api/inventory";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createInventoryCountSchema } from "@/lib/validations/inventory";

type CreateInventoryCountResponseData = {
  count_id: string;
  count_type: string;
  item_count: number;
  status: string;
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

    const parsedBody = createInventoryCountSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("start_inventory_count", {
      p_count_type: payload.count_type,
      p_product_ids: payload.scope === "selected" ? payload.product_ids ?? [] : null,
      p_notes: payload.notes ?? null,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getCreateInventoryCountErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<CreateInventoryCountResponseData>>(
      {
        success: true,
        data: {
          count_id: data.count_id,
          count_type: data.count_type,
          item_count: data.item_count,
          status: data.status
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
