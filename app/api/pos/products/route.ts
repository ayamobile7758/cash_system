import { NextResponse } from "next/server";
import {
  authorizeRequest,
  getApiErrorMeta,
  handleRouteError
} from "@/lib/api/common";
import type { PosProduct, StandardEnvelope } from "@/lib/pos/types";

const PRODUCT_COLUMNS = [
  "id",
  "name",
  "category",
  "sku",
  "description",
  "sale_price",
  "stock_quantity",
  "min_stock_level",
  "track_stock",
  "is_quick_add",
  "is_active",
  "created_at",
  "updated_at",
  "created_by"
].join(", ");

const SEARCH_PRODUCT_COLUMNS = [
  "id",
  "name",
  "category",
  "sku",
  "description",
  "sale_price",
  "stock_quantity",
  "min_stock_level",
  "track_stock",
  "is_quick_add",
  "is_active"
].join(", ");

const PAGE_SIZE = 150;

type ProductsResponseData = {
  items: PosProduct[];
  totalCount: number | null;
  hasMore: boolean;
};

function sanitizeSearchTerm(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
}

function toPositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export async function GET(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"], {
      requiredPermissions: ["products.read", "pos.use"]
    });

    if (!authorization.authorized) {
      return authorization.response;
    }

    const url = new URL(request.url);
    const search = sanitizeSearchTerm(url.searchParams.get("q") ?? "");
    const category = (url.searchParams.get("category") ?? "all").trim();
    const page = toPositiveInteger(url.searchParams.get("page"), 0, 100);

    const shouldSkipCount = search.length > 0;
    const selectOptions = shouldSkipCount ? undefined : { count: "exact" as const };
    const selectColumns = shouldSkipCount ? SEARCH_PRODUCT_COLUMNS : PRODUCT_COLUMNS;

    let query = authorization.supabase
      .from("products")
      .select(selectColumns, selectOptions)
      .eq("is_active", true);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (search.length > 0) {
      const pattern = `%${search}%`;
      const shouldSearchSku =
        !search.includes(" ") && (/[0-9]/.test(search) || search.includes("-") || search.includes("_"));

      query = shouldSearchSku
        ? query.or(`name.ilike.${pattern},sku.ilike.${pattern}`)
        : query.ilike("name", pattern);
    } else {
      query = query.order("is_quick_add", { ascending: false }).order("name", { ascending: true });
    }

    const { data, error, count } = await query.range(
      page * PAGE_SIZE,
      page * PAGE_SIZE + PAGE_SIZE - 1
    );

    if (error) {
      throw error;
    }

    const items = ((data ?? []) as unknown) as PosProduct[];
    const totalCount = shouldSkipCount ? null : typeof count === "number" ? count : items.length;

    return NextResponse.json<StandardEnvelope<ProductsResponseData>>(
      {
        success: true,
        data: {
          items,
          totalCount,
          hasMore: shouldSkipCount
            ? items.length === PAGE_SIZE
            : (page + 1) * PAGE_SIZE < (totalCount ?? items.length)
        }
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, getApiErrorMeta);
  }
}
