import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode } from "@/lib/api/common";
import { getCreateExpenseErrorMeta } from "@/lib/api/expenses";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createExpenseSchema } from "@/lib/validations/expenses";

type ExpenseResponseData = {
  expense_id: string;
  expense_number: string;
  ledger_entry_id: string;
};

export async function POST(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"], {
      requiredPermissions: ["expenses.create"]
    });
    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getCreateExpenseErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = createExpenseSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getCreateExpenseErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error: rpcError } = await authorization.supabase.rpc("create_expense", {
      p_amount: payload.amount,
      p_account_id: payload.account_id,
      p_category_id: payload.expense_category_id,
      p_description: payload.description,
      p_notes: payload.notes ?? null,
      p_idempotency_key: payload.idempotency_key,
      p_created_by: authorization.userId
    });

    if (rpcError) {
      const code = extractErrorCode(rpcError.message);
      const meta = getCreateExpenseErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<ExpenseResponseData>>(
      {
        success: true,
        data: {
          expense_id: data.expense_id,
          expense_number: data.expense_number,
          ledger_entry_id: data.ledger_entry_id
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getCreateExpenseErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
