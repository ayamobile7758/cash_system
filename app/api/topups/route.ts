import { NextResponse } from "next/server";
import { authorizeRequest, handleRouteError, parseAndValidate } from "@/lib/api/common";
import { getCreateTopupErrorMeta } from "@/lib/api/operations";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createTopupSchema } from "@/lib/validations/operations";

type TopupResponse = {
  topup_id: string;
  topup_number: string;
  invoice_id: string;
  invoice_number: string;
  ledger_entry_ids: string[];
};

export async function POST(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"], {
      requiredPermissions: ["topups.create"]
    });
    if (!authorization.authorized) {
      return authorization.response;
    }

    const validation = await parseAndValidate(request, createTopupSchema, getCreateTopupErrorMeta);
    if (!validation.success) {
      return validation.response;
    }

    const { data, error: rpcError } = await authorization.supabase.rpc("create_topup", {
      p_account_id: validation.data.account_id,
      p_amount: validation.data.amount,
      p_profit_amount: validation.data.profit_amount,
      p_supplier_id: validation.data.supplier_id ?? null,
      p_notes: validation.data.notes ?? null,
      p_idempotency_key: validation.data.idempotency_key,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      throw rpcError;
    }

    return NextResponse.json<StandardEnvelope<TopupResponse>>(
      {
        success: true,
        data: {
          topup_id: data.topup_id,
          topup_number: data.topup_number,
          invoice_id: data.invoice_id,
          invoice_number: data.invoice_number,
          ledger_entry_ids: data.ledger_entry_ids
        }
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, getCreateTopupErrorMeta);
  }
}
