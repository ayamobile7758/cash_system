import { NextResponse } from "next/server";
import {
  authorizeRequest,
  errorResponse,
  getApiErrorMeta,
  handleRouteError,
  parseQueryAndValidate
} from "@/lib/api/common";
import { getReportBaseline, parseSalesHistoryFilters } from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildAdvancedReportWorkbookBuffer,
  buildAdvancedReportWorkbookFilename
} from "@/lib/reports/export";
import { advancedReportQuerySchema } from "@/lib/validations/reports";

function exceedsExportLimit(reportBaseline: Awaited<ReturnType<typeof getReportBaseline>>) {
  const totalRows =
    reportBaseline.salesHistory.total_count +
    reportBaseline.accountMovementReport.total_movements +
    reportBaseline.advancedReport.trend.length +
    reportBaseline.advancedReport.breakdown.length;

  return totalRows > 10_000;
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
    const reportBaseline = await getReportBaseline(supabase, filters, {
      role: "admin",
      userId: authorization.userId
    });

    if (exceedsExportLimit(reportBaseline)) {
      return errorResponse(
        "ERR_EXPORT_TOO_LARGE",
        "التصدير يتجاوز 10,000 سجل. قلّص الفترة أو الفلاتر أولًا.",
        400
      );
    }

    const generatedAt = new Date().toISOString();
    const workbook = buildAdvancedReportWorkbookBuffer({
      filters,
      reportBaseline,
      generatedAt
    });

    return new NextResponse(workbook, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${buildAdvancedReportWorkbookFilename(filters)}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return handleRouteError(error, getApiErrorMeta);
  }
}
