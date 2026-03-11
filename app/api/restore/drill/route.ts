import { NextResponse } from "next/server";
import { authorizeRequest, errorResponse } from "@/lib/api/common";
import {
  getRestoreDrillErrorMeta,
  runRestoreDrill
} from "@/lib/api/portability";
import { resolveFirstAdminActorId } from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { StandardEnvelope } from "@/lib/pos/types";
import { restoreDrillSchema } from "@/lib/validations/portability";

type RestoreResponse = {
  drill_id: string;
  status: "completed";
  drift_count: number;
  rto_seconds: number;
};

async function authorizeRestoreDrill(request: Request) {
  const bearer = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";

  if (expected && bearer === expected) {
    const supabase = getSupabaseAdminClient();
    const userId = await resolveFirstAdminActorId(supabase);

    return {
      authorized: true as const,
      supabase,
      userId
    };
  }

  const authorization = await authorizeRequest(["admin"]);
  if (!authorization.authorized) {
    return authorization;
  }

  return {
    authorized: true as const,
    supabase: authorization.supabase,
    userId: authorization.userId
  };
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeRestoreDrill(request);
    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getRestoreDrillErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذرت قراءة JSON من الطلب."]
      });
    }

    const parsed = restoreDrillSchema.safeParse(body);
    if (!parsed.success) {
      const meta = getRestoreDrillErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsed.error.flatten().fieldErrors
      });
    }

    const result = await runRestoreDrill(authorization.supabase, authorization.userId, parsed.data);

    return NextResponse.json<StandardEnvelope<RestoreResponse>>(
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
    const meta = getRestoreDrillErrorMeta(code);
    return errorResponse(code, meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
