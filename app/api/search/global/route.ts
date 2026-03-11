import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, getApiErrorMeta } from "@/lib/api/common";
import { searchGlobal } from "@/lib/api/search";
import { globalSearchQuerySchema } from "@/lib/validations/search";

const SEARCH_QUERY_TOO_SHORT = {
  status: 400,
  message: "الاستعلام قصير جدًا. أدخل حرفين على الأقل."
} as const;

export async function GET(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    const url = new URL(request.url);
    const payload = {
      q: url.searchParams.get("q") ?? "",
      entity: url.searchParams.get("entity") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined
    };

    const parsed = globalSearchQuerySchema.safeParse(payload);
    if (!parsed.success) {
      const hasShortQuery = parsed.error.issues.some(
        (issue) => issue.path[0] === "q" && issue.message.includes("حرفين")
      );

      if (hasShortQuery) {
        return errorResponse(
          "ERR_SEARCH_QUERY_TOO_SHORT",
          SEARCH_QUERY_TOO_SHORT.message,
          SEARCH_QUERY_TOO_SHORT.status,
          { zod_errors: parsed.error.flatten() }
        );
      }

      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        zod_errors: parsed.error.flatten()
      });
    }

    const items = await searchGlobal(
      authorization.supabase,
      {
        role: authorization.role,
        userId: authorization.userId,
        permissions: authorization.permissions
      },
      parsed.data
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          items
        }
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    const meta = getApiErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
