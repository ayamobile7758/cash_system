import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode } from "@/lib/api/common";
import {
  buildWhatsAppDeepLink,
  buildWhatsAppMessage,
  getWhatsAppErrorMeta
} from "@/lib/api/communication";
import type { StandardEnvelope } from "@/lib/pos/types";
import { sendWhatsAppMessageSchema } from "@/lib/validations/communication";

type SendWhatsAppResponse = {
  delivery_log_id: string;
  status: "queued";
  wa_url: string;
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
      const meta = getWhatsAppErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = sendWhatsAppMessageSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getWhatsAppErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;

    let waUrl: string;
    try {
      const message = await buildWhatsAppMessage(authorization.supabase, {
        templateKey: payload.template_key,
        referenceType: payload.reference_type,
        referenceId: payload.reference_id,
        payload: payload.payload
      });

      waUrl = buildWhatsAppDeepLink(payload.target_phone, message);
    } catch (error) {
      const code = extractErrorCode((error as Error).message);
      const normalizedCode = code === "ERR_API_INTERNAL" ? "ERR_WHATSAPP_DELIVERY_FAILED" : code;
      const meta = getWhatsAppErrorMeta(normalizedCode);
      return errorResponse(normalizedCode, meta.message, meta.status);
    }

    const { data, error: rpcError } = await authorization.supabase.rpc("create_whatsapp_delivery_log", {
      p_template_key: payload.template_key,
      p_target_phone: payload.target_phone,
      p_reference_type: payload.reference_type,
      p_reference_id: payload.reference_id,
      p_idempotency_key: payload.idempotency_key,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getWhatsAppErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<SendWhatsAppResponse>>(
      {
        success: true,
        data: {
          delivery_log_id: data.delivery_log_id,
          status: data.status,
          wa_url: waUrl
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getWhatsAppErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
