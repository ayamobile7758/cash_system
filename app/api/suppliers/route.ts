import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, getApiErrorMeta } from "@/lib/api/common";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createSupplierSchema } from "@/lib/validations/suppliers";

type SupplierResponseData = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  current_balance: number;
  is_active: boolean;
};

async function supplierNameExists(
  supabase: AuthorizationSupabase,
  name: string,
  excludeId?: string
) {
  let query = supabase.from("suppliers").select("id").eq("name", name);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.limit(1).maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

type AuthorizationSupabase = Extract<
  Awaited<ReturnType<typeof authorizeRequest>>,
  { authorized: true }
>["supabase"];

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

    const parsedBody = createSupplierSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    if (await supplierNameExists(authorization.supabase, payload.name)) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: {
          name: ["اسم المورد مستخدم مسبقًا."]
        }
      });
    }

    const { data, error } = await authorization.supabase
      .from("suppliers")
      .insert({
        name: payload.name,
        phone: payload.phone?.trim() || null,
        address: payload.address?.trim() || null,
        is_active: payload.is_active
      })
      .select("id, name, phone, address, current_balance, is_active")
      .single<SupplierResponseData>();

    if (error || !data) {
      const meta = getApiErrorMeta("ERR_API_INTERNAL");
      return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
        reason: error?.message ?? "تعذر إنشاء المورد."
      });
    }

    return NextResponse.json<StandardEnvelope<SupplierResponseData>>(
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
