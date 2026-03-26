import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, getApiErrorMeta, handleRouteError, parseAndValidate } from "@/lib/api/common";
import { getExpenseCategoryErrorMeta } from "@/lib/api/expenses";
import type { StandardEnvelope } from "@/lib/pos/types";
import { updateExpenseCategorySchema } from "@/lib/validations/expenses";

type ExpenseCategoryResponseData = {
  id: string;
  name: string;
  type: "fixed" | "variable";
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type ExistingCategoryRow = ExpenseCategoryResponseData;

type AuthorizationSupabase = Extract<
  Awaited<ReturnType<typeof authorizeRequest>>,
  { authorized: true }
>["supabase"];

async function categoryNameExists(
  supabase: AuthorizationSupabase,
  name: string,
  excludeId: string
) {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("name", name)
    .neq("id", excludeId)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function PATCH(
  request: Request,
  context: { params: { categoryId: string } }
) {
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

    const payloadWithRouteId = {
      ...(typeof body === "object" && body !== null ? body : {}),
      category_id: context.params.categoryId
    };

    const parsed = updateExpenseCategorySchema.safeParse(payloadWithRouteId);
    if (!parsed.success) {
      const meta = getExpenseCategoryErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsed.error.flatten().fieldErrors
      });
    }

    const categoryId = context.params.categoryId;
    const { data: existing, error: existingError } = await authorization.supabase
      .from("expense_categories")
      .select("id, name, type, description, is_active, sort_order")
      .eq("id", categoryId)
      .maybeSingle<ExistingCategoryRow>();

    if (existingError) {
      throw existingError;
    }

    if (!existing) {
      throw new Error("ERR_EXPENSE_CATEGORY_NOT_FOUND");
    }

    const payload = parsed.data;
    if (payload.name && (await categoryNameExists(authorization.supabase, payload.name, categoryId))) {
      const meta = getExpenseCategoryErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: {
          name: ["اسم فئة المصروف مستخدم مسبقًا."]
        }
      });
    }

    if (payload.type && payload.type !== existing.type) {
      const { count, error: referencesError } = await authorization.supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("category_id", categoryId);

      if (referencesError) {
        throw referencesError;
      }

      if ((count ?? 0) > 0) {
        throw new Error("ERR_EXPENSE_CATEGORY_HAS_REFERENCES");
      }
    }

    const updatePayload = {
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.type ? { type: payload.type } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description?.trim() || null }
        : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
      ...(payload.sort_order !== undefined ? { sort_order: payload.sort_order } : {})
    };

    const { data, error } = await authorization.supabase
      .from("expense_categories")
      .update(updatePayload)
      .eq("id", categoryId)
      .select("id, name, type, description, is_active, sort_order")
      .single<ExpenseCategoryResponseData>();

    if (error || !data) {
      throw error ?? new Error("تعذر تحديث فئة المصروف.");
    }

    await authorization.supabase.from("audit_logs").insert({
      id: crypto.randomUUID(),
      user_id: authorization.userId,
      action_type: "update_expense_category",
      table_name: "expense_categories",
      record_id: data.id,
      description: `تحديث فئة مصروف ${data.name}`,
      old_values: existing,
      new_values: data
    });

    return NextResponse.json<StandardEnvelope<ExpenseCategoryResponseData>>(
      {
        success: true,
        data
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, getExpenseCategoryErrorMeta);
  }
}
