import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, getApiErrorMeta, handleRouteError } from "@/lib/api/common";
import type { PosProduct } from "@/lib/pos/types";
import type { StandardEnvelope } from "@/lib/pos/types";
import { updateProductSchema } from "@/lib/validations/products";

type ProductResponseData = PosProduct;
type AuthorizedSupabaseClient = Extract<Awaited<ReturnType<typeof authorizeRequest>>, { authorized: true }>["supabase"];

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

async function productSkuExists(
  supabase: AuthorizedSupabaseClient,
  sku: string,
  productId: string
) {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("sku", sku)
    .neq("id", productId)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await authorizeRequest(["admin"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsed = updateProductSchema.safeParse({
      ...(typeof body === "object" && body !== null ? body : {}),
      product_id: id
    });

    if (!parsed.success) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsed.error.flatten().fieldErrors
      });
    }

    const productId = id;
    const { data: existing, error: existingError } = await authorization.supabase
      .from("products")
      .select(
        "id, name, category, sku, description, sale_price, stock_quantity, min_stock_level, track_stock, is_quick_add, is_active, created_at, updated_at, created_by"
      )
      .eq("id", productId)
      .maybeSingle<ProductResponseData>();

    if (existingError) {
      throw existingError;
    }

    if (!existing) {
      return errorResponse("ERR_PRODUCT_NOT_FOUND", "المنتج غير موجود.", 404);
    }

    const payload = parsed.data;
    const sku = payload.sku !== undefined ? normalizeNullableText(payload.sku) : undefined;

    if (sku && (await productSkuExists(authorization.supabase, sku, productId))) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: {
          sku: ["رمز المنتج مستخدم مسبقًا."]
        }
      });
    }

    const updatePayload = {
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.category !== undefined ? { category: payload.category } : {}),
      ...(payload.sku !== undefined ? { sku } : {}),
      ...(payload.description !== undefined ? { description: normalizeNullableText(payload.description) } : {}),
      ...(payload.sale_price !== undefined ? { sale_price: payload.sale_price } : {}),
      ...(payload.cost_price !== undefined ? { cost_price: payload.cost_price ?? null } : {}),
      ...(payload.stock_quantity !== undefined ? { stock_quantity: payload.stock_quantity } : {}),
      ...(payload.min_stock_level !== undefined ? { min_stock_level: payload.min_stock_level } : {}),
      ...(payload.track_stock !== undefined ? { track_stock: payload.track_stock } : {}),
      ...(payload.is_quick_add !== undefined ? { is_quick_add: payload.is_quick_add } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {})
    };

    const { data, error } = await authorization.supabase
      .from("products")
      .update(updatePayload)
      .eq("id", productId)
      .select(
        "id, name, category, sku, description, sale_price, stock_quantity, min_stock_level, track_stock, is_quick_add, is_active, created_at, updated_at, created_by"
      )
      .single<ProductResponseData>();

    if (error || !data) {
      if (error?.code === "23505") {
        const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
        return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
          field_errors: {
            sku: ["رمز المنتج مستخدم مسبقًا."]
          }
        });
      }

      throw error ?? new Error("تعذر تحديث المنتج.");
    }

    return NextResponse.json<StandardEnvelope<ProductResponseData>>(
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
