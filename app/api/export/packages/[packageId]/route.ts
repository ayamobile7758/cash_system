import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse, handleRouteError } from "@/lib/api/common";
import {
  getExportPackageErrorMeta,
  revokeExportPackage,
  type ExportPackageRecord
} from "@/lib/api/portability";
import type { StandardEnvelope } from "@/lib/pos/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ExportPackageDownloadRow = ExportPackageRecord;
type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

type RevokeExportPackageResponse = {
  package_id: string;
  status: "revoked";
  revoked_at: string;
};

function toMimeType(packageType: "json" | "csv") {
  return packageType === "json"
    ? "application/json; charset=utf-8"
    : "text/csv; charset=utf-8";
}

async function getPackageRecord(supabase: SupabaseAdminClient, packageId: string) {
  const { data, error } = await supabase
    .from("export_packages")
    .select(
      "id, package_type, scope, status, filters, file_name, row_count, content_json, content_text, expires_at, revoked_at, created_at, created_by"
    )
    .eq("id", packageId)
    .maybeSingle<ExportPackageDownloadRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ packageId: string }> }
) {
  try {
    const authorization = await authorizeRequest(["admin"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    const { packageId } = await context.params;
    const packageRecord = await getPackageRecord(authorization.supabase, packageId);
    if (!packageRecord) {
      const meta = getExportPackageErrorMeta("ERR_EXPORT_PACKAGE_EXPIRED");
      return errorResponse("ERR_EXPORT_PACKAGE_EXPIRED", meta.message, meta.status);
    }

    const expired = new Date(packageRecord.expires_at).getTime() <= Date.now();
    if (packageRecord.revoked_at || packageRecord.status === "revoked" || expired) {
      if (expired && packageRecord.status !== "expired") {
        await authorization.supabase
          .from("export_packages")
          .update({ status: "expired" })
          .eq("id", packageRecord.id);
      }

      const meta = getExportPackageErrorMeta("ERR_EXPORT_PACKAGE_EXPIRED");
      return errorResponse("ERR_EXPORT_PACKAGE_EXPIRED", meta.message, meta.status);
    }

    return new NextResponse(packageRecord.content_text, {
      status: 200,
      headers: {
        "Content-Type": toMimeType(packageRecord.package_type),
        "Content-Disposition": `attachment; filename="${packageRecord.file_name}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return handleRouteError(error, getExportPackageErrorMeta);
  }
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ packageId: string }> }
) {
  try {
    const authorization = await authorizeRequest(["admin"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    const { packageId } = await context.params;

    const result = await revokeExportPackage(
      authorization.supabase,
      authorization.userId,
      packageId
    );

    return NextResponse.json<StandardEnvelope<RevokeExportPackageResponse>>(
      {
        success: true,
        data: result
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, getExportPackageErrorMeta);
  }
}
