import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, getApiErrorMeta } from "@/lib/api/common";
import { getExpenseCategoryErrorMeta } from "@/lib/api/expenses";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createExpenseCategorySchema } from "@/lib/validations/expenses";

type ExpenseCategoryResponseData = {
  id: string;
  name: string;
  type: "fixed" | "variable";
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type ExpenseCategoryRow = ExpenseCategoryResponseData;

async function categoryNameExists(
  supabase: AuthorizationSupabase,
  name: string
) {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("name", name)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

type AuthorizationSupabase = Extract<
  Awaited<ReturnType<typeof authorizeRequest>>,
  { authorized: true }
>["supabase"];

export async function GET() {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"], {
      requiredPermissions: ["expenses.read"]
    });
    if (!authorization.authorized) {
      return authorization.response;
    }

    let query = authorization.supabase
      .from("expense_categories")
      .select("id, name, type, description, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (authorization.role !== "admin") {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.returns<ExpenseCategoryRow[]>();
    if (error) {
      const meta = getApiErrorMeta("ERR_API_INTERNAL");
      return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
        reason: error.message
      });
    }

    return NextResponse.json<StandardEnvelope<{ items: ExpenseCategoryResponseData[] }>>(
      {
        success: true,
        data: {
          items: data ?? []
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
      const meta = getExpenseCategoryErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = createExpenseCategorySchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getExpenseCategoryErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    if (await categoryNameExists(authorization.supabase, payload.name)) {
      const meta = getExpenseCategoryErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: {
          name: ["اسم فئة المصروف مستخدم مسبقًا."]
        }
      });
    }

    const { data, error } = await authorization.supabase
      .from("expense_categories")
      .insert({
        name: payload.name,
        type: payload.type,
        description: payload.description?.trim() || null,
        is_active: payload.is_active,
        sort_order: payload.sort_order
      })
      .select("id, name, type, description, is_active, sort_order")
      .single<ExpenseCategoryResponseData>();

    if (error || !data) {
      const meta = getApiErrorMeta("ERR_API_INTERNAL");
      return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
        reason: error?.message ?? "تعذر إنشاء فئة المصروف."
      });
    }

    const auditId = crypto.randomUUID();
    await authorization.supabase.from("audit_logs").insert({
      id: auditId,
      user_id: authorization.userId,
      action_type: "create_expense_category",
      table_name: "expense_categories",
      record_id: data.id,
      description: `إنشاء فئة مصروف ${data.name}`,
      new_values: {
        name: data.name,
        type: data.type,
        is_active: data.is_active
      }
    });

    return NextResponse.json<StandardEnvelope<ExpenseCategoryResponseData>>(
      {
        success: true,
        data
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
