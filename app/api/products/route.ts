import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, getApiErrorMeta, handleRouteError, parseAndValidate } from "@/lib/api/common";
import type { PosProduct } from "@/lib/pos/types";
import { createProductSchema } from "@/lib/validations/products";
import type { StandardEnvelope } from "@/lib/pos/types";

type ProductResponseData = PosProduct;
type AuthorizedSupabaseClient = Extract<Awaited<ReturnType<typeof authorizeRequest>>, { authorized: true }>["supabase"];

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

async function productSkuExists(supabase: AuthorizedSupabaseClient, sku: string) {
  const { data, error } = await supabase.from("products").select("id").eq("sku", sku).limit(1).maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    const validation = await parseAndValidate(request, createProductSchema, getApiErrorMeta);
    if (!validation.success) {
      return validation.response;
    }

    const payload = validation.data;
    const sku = normalizeNullableText(payload.sku);

    if (sku && (await productSkuExists(authorization.supabase, sku))) {
      return errorResponse(
        "ERR_API_VALIDATION_FAILED",
        getApiErrorMeta("ERR_API_VALIDATION_FAILED").message,
        getApiErrorMeta("ERR_API_VALIDATION_FAILED").status,
        {
          field_errors: {
            sku: ["رمز المنتج مستخدم مسبقًا."]
          }
        }
      );
    }

    const { data, error } = await authorization.supabase
      .from("products")
      .insert({
        name: payload.name.trim(),
        category: payload.category,
        sku,
        description: normalizeNullableText(payload.description),
        sale_price: payload.sale_price,
        cost_price: payload.cost_price ?? null,
        stock_quantity: payload.stock_quantity,
        min_stock_level: payload.min_stock_level,
        track_stock: payload.track_stock,
        is_quick_add: payload.is_quick_add,
        is_active: payload.is_active,
        created_by: authorization.userId
      })
      .select(
        "id, name, category, sku, description, sale_price, stock_quantity, min_stock_level, track_stock, is_quick_add, is_active, created_at, updated_at, created_by"
      )
      .single<ProductResponseData>();

    if (error || !data) {
      if (error?.code === "23505") {
        return errorResponse(
          "ERR_API_VALIDATION_FAILED",
          getApiErrorMeta("ERR_API_VALIDATION_FAILED").message,
          getApiErrorMeta("ERR_API_VALIDATION_FAILED").status,
          {
            field_errors: {
              sku: ["رمز المنتج مستخدم مسبقًا."]
            }
          }
        );
      }

      throw error ?? new Error("تعذر إنشاء المنتج.");
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
