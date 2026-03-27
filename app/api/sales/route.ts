import { NextResponse } from "next/server";
import {
  authorizeRequest,
  errorResponse as commonErrorResponse,
  getApiErrorMeta,
  handleRouteError,
  parseAndValidate
} from "@/lib/api/common";
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

    const validation = await parseAndValidate(request, createSaleSchema, getApiErrorMeta);
    if (!validation.success) {
      return validation.response;
    }

    const payload = validation.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("create_sale", {
      p_items: payload.items,
      p_payments: payload.payments,
      p_debt_customer_id: payload.customer_id ?? null,
      p_pos_terminal: payload.pos_terminal_code ?? null,
      p_notes: payload.notes ?? null,
      p_invoice_discount_percentage: payload.invoice_discount_percentage ?? 0,
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

      throw rpcError;
    }

    if (!data) {
      throw new Error("ERR_API_INTERNAL");
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
    return handleRouteError(error, getCreateSaleErrorMeta);
  }
}
