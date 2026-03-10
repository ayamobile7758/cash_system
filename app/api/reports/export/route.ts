import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, getApiErrorMeta } from "@/lib/api/common";
import { getReportBaseline, parseSalesHistoryFilters } from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildReportWorkbookBuffer, buildReportWorkbookFilename } from "@/lib/reports/export";

export async function GET(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    const url = new URL(request.url);
    const filters = parseSalesHistoryFilters(url.searchParams);
    const supabase = getSupabaseAdminClient();
    const reportBaseline = await getReportBaseline(supabase, filters, {
      role: "admin",
      userId: authorization.userId
    });

    const generatedAt = new Date().toISOString();
    const workbook = buildReportWorkbookBuffer({
      filters,
      reportBaseline,
      generatedAt
    });

    return new NextResponse(workbook, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${buildReportWorkbookFilename(filters)}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const meta = getApiErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
