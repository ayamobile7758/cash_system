import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, getApiErrorMeta, handleRouteError, parseAndValidate } from "@/lib/api/common";
import type { StandardEnvelope } from "@/lib/pos/types";
import { updateSupplierSchema } from "@/lib/validations/suppliers";

type SupplierResponseData = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  current_balance: number;
  is_active: boolean;
};

type AuthorizationSupabase = Extract<
  Awaited<ReturnType<typeof authorizeRequest>>,
  { authorized: true }
>["supabase"];

async function supplierNameExists(
  supabase: AuthorizationSupabase,
  name: string,
  excludeId: string
) {
  const { data, error } = await supabase
    .from("suppliers")
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
  context: { params: { supplierId: string } }
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
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const payloadWithRouteId = {
      ...(typeof body === "object" && body !== null ? body : {}),
      supplier_id: context.params.supplierId
    };

    const parsed = updateSupplierSchema.safeParse(payloadWithRouteId);
    if (!parsed.success) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsed.error.flatten().fieldErrors
      });
    }

    const payload = parsed.data;
    if (await supplierNameExists(authorization.supabase, payload.name, context.params.supplierId)) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: {
          name: ["اسم المورد مستخدم مسبقًا."]
        }
      });
    }

    const { data, error } = await authorization.supabase
      .from("suppliers")
      .update({
        name: payload.name,
        phone: payload.phone?.trim() || null,
        address: payload.address?.trim() || null,
        is_active: payload.is_active
      })
      .eq("id", context.params.supplierId)
      .select("id, name, phone, address, current_balance, is_active")
      .single<SupplierResponseData>();

    if (error || !data) {
      throw error ?? new Error("تعذر تحديث المورد.");
    }

    return NextResponse.json<StandardEnvelope<SupplierResponseData>>(
      {
        success: true,
        data
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, getApiErrorMeta);
  }
}
