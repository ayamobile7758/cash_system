import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, getApiErrorMeta } from "@/lib/api/common";
import { getAdvancedReportData, parseSalesHistoryFilters } from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { advancedReportQuerySchema } from "@/lib/validations/reports";

function toAdvancedReportResponse(report: Awaited<ReturnType<typeof getAdvancedReportData>>) {
  return {
    current_period: report.currentPeriod,
    compare_period: report.comparePeriod,
    trend: report.trend,
    breakdown: report.breakdown,
    delta: report.delta
  };
}

export async function GET(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    const url = new URL(request.url);
    const payload = Object.fromEntries(url.searchParams.entries());
    const parsed = advancedReportQuerySchema.safeParse(payload);

    if (!parsed.success) {
      const meta = getApiErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        zod_errors: parsed.error.flatten()
      });
    }

    const filters = parseSalesHistoryFilters(url.searchParams);
    const supabase = getSupabaseAdminClient();
    const report = await getAdvancedReportData(supabase, filters);

    return NextResponse.json({
      success: true,
      data: toAdvancedReportResponse(report)
    });
  } catch (error) {
    const meta = getApiErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
