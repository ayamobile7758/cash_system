import { NextResponse } from "next/server";
import {
  authorizeRequest,
  getApiErrorMeta,
  handleRouteError,
  parseQueryAndValidate
} from "@/lib/api/common";
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

    const validation = await parseQueryAndValidate(request, advancedReportQuerySchema, getApiErrorMeta);
    if (!validation.success) {
      return validation.response;
    }

    const url = new URL(request.url);
    const filters = parseSalesHistoryFilters(url.searchParams);
    const supabase = getSupabaseAdminClient();
    const report = await getAdvancedReportData(supabase, filters);

    return NextResponse.json({
      success: true,
      data: toAdvancedReportResponse(report)
    });
  } catch (error) {
    return handleRouteError(error, getApiErrorMeta);
  }
}
