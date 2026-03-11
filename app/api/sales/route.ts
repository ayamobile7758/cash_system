import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse as commonErrorResponse } from "@/lib/api/common";
import { extractErrorCode, getCreateSaleErrorMeta } from "@/lib/api/sales";
import type { SaleResponseData, StandardEnvelope } from "@/lib/pos/types";
import { createSaleSchema } from "@/lib/validations/sales";

type ExistingInvoiceRow = {
  id: string;
  invoice_number: string;
  total_amount: number;
};

async function findExistingInvoiceByIdempotencyKey(idempotencyKey: string) {
  const authorization = await authorizeRequest(["admin", "pos_staff"], {
    requiredPermissions: ["sales.create"]
  });
  if (!authorization.authorized) {
    return null;
  }

  const supabase = authorization.supabase;
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle<ExistingInvoiceRow>();

  if (error || !data) {
    return null;
  }

  return {
    invoice_id: data.id,
    invoice_number: data.invoice_number,
    total: data.total_amount,
    change: null
  } satisfies SaleResponseData;
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"], {
      requiredPermissions: ["sales.create"]
    });
    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getCreateSaleErrorMeta("ERR_API_VALIDATION_FAILED");
      return commonErrorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = createSaleSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getCreateSaleErrorMeta("ERR_API_VALIDATION_FAILED");
      return commonErrorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("create_sale", {
      p_items: payload.items,
      p_payments: payload.payments,
      p_debt_customer_id: payload.customer_id ?? null,
      p_pos_terminal: payload.pos_terminal_code ?? null,
      p_notes: payload.notes ?? null,
      p_idempotency_key: payload.idempotency_key,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getCreateSaleErrorMeta(code);

      if (code === "ERR_IDEMPOTENCY") {
        const existingSale = await findExistingInvoiceByIdempotencyKey(payload.idempotency_key);
        return commonErrorResponse(
          code,
          meta.message,
          meta.status,
          existingSale ? { existing_result: existingSale } : undefined
        );
      }

      return commonErrorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<SaleResponseData>>(
      {
        success: true,
        data: {
          invoice_id: data.invoice_id,
          invoice_number: data.invoice_number,
          total: data.total,
          change: data.change
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getCreateSaleErrorMeta("ERR_API_INTERNAL");
    return commonErrorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
