import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse } from "@/lib/api/common";
import {
  commitProductImportJob,
  getImportProductsErrorMeta,
  runProductImportDryRun
} from "@/lib/api/portability";
import type { StandardEnvelope } from "@/lib/pos/types";
import { importProductsSchema } from "@/lib/validations/portability";

type ImportProductsResponse = {
  job_id: string;
  mode: "dry_run" | "commit";
  rows_total: number;
  rows_valid: number;
  rows_invalid: number;
  rows_committed?: number;
  validation_errors?: Array<{ row_number: number; field: string; message: string }>;
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
      const meta = getImportProductsErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذرت قراءة JSON من الطلب."]
      });
    }

    const parsed = importProductsSchema.safeParse(body);
    if (!parsed.success) {
      const meta = getImportProductsErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsed.error.flatten().fieldErrors
      });
    }

    const result =
      parsed.data.mode === "dry_run"
        ? await runProductImportDryRun(authorization.supabase, authorization.userId, parsed.data)
        : await commitProductImportJob(
            authorization.supabase,
            authorization.userId,
            parsed.data.dry_run_job_id
          );

    return NextResponse.json<StandardEnvelope<ImportProductsResponse>>(
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
    const meta = getImportProductsErrorMeta(code);
    return errorResponse(code, meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
