import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode } from "@/lib/api/common";
import { buildReceiptUrl, getReceiptLinkErrorMeta } from "@/lib/api/communication";
import type { StandardEnvelope } from "@/lib/pos/types";
import { issueReceiptLinkSchema, revokeReceiptLinkSchema } from "@/lib/validations/communication";

type IssueReceiptLinkResponse = {
  token_id: string;
  receipt_url: string;
  expires_at: string;
  is_reissued: boolean;
};

type RevokeReceiptLinkResponse = {
  token_id: string;
  invoice_id: string;
  revoked: boolean;
};

function parseBodyError() {
  const meta = getReceiptLinkErrorMeta("ERR_API_VALIDATION_FAILED");
  return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
    body: ["تعذر قراءة JSON من الطلب."]
  });
}

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
      return parseBodyError();
    }

    const parsedBody = issueReceiptLinkSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getReceiptLinkErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("issue_receipt_link", {
      p_invoice_id: payload.invoice_id,
      p_channel: payload.channel,
      p_expires_in_hours: payload.expires_in_hours,
      p_force_reissue: payload.force_reissue,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getReceiptLinkErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    const origin = new URL(request.url).origin;

    return NextResponse.json<StandardEnvelope<IssueReceiptLinkResponse>>(
      {
        success: true,
        data: {
          token_id: data.token_id,
          receipt_url: buildReceiptUrl(origin, data.token),
          expires_at: data.expires_at,
          is_reissued: data.is_reissued
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getReceiptLinkErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return parseBodyError();
    }

    const parsedBody = revokeReceiptLinkSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getReceiptLinkErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("revoke_receipt_link", {
      p_token_id: payload.token_id ?? null,
      p_invoice_id: payload.invoice_id ?? null,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getReceiptLinkErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<RevokeReceiptLinkResponse>>(
      {
        success: true,
        data: {
          token_id: data.token_id,
          invoice_id: data.invoice_id,
          revoked: data.revoked
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getReceiptLinkErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
