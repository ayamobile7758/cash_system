import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse } from "@/lib/api/common";
import {
  createExportPackage,
  getExportPackageErrorMeta
} from "@/lib/api/portability";
import type { StandardEnvelope } from "@/lib/pos/types";
import { createExportPackageSchema } from "@/lib/validations/portability";

type ExportPackageResponse = {
  package_id: string;
  download_url: string;
  expires_at: string;
};

export async function POST(request: Request) {
  try {
    const authorization = await authorizeRequest(["admin"]);
    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getExportPackageErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذرت قراءة JSON من الطلب."]
      });
    }

    const parsed = createExportPackageSchema.safeParse(body);
    if (!parsed.success) {
      const meta = getExportPackageErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsed.error.flatten().fieldErrors
      });
    }

    const result = await createExportPackage(authorization.supabase, authorization.userId, parsed.data);

    return NextResponse.json<StandardEnvelope<ExportPackageResponse>>(
      {
        success: true,
        data: result
      },
      { status: 200 }
    );
  } catch (error) {
    const code = (error as Error).message.startsWith("ERR_")
      ? (error as Error).message
      : "ERR_API_INTERNAL";
    const meta = getExportPackageErrorMeta(code);
    return errorResponse(code, meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
