import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest, errorResponse, extractErrorCode } from "@/lib/api/common";
import { getDebtReminderErrorMeta } from "@/lib/api/communication";
import { resolveFirstAdminActorId } from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { StandardEnvelope } from "@/lib/pos/types";
import { runDebtReminderSchema } from "@/lib/validations/communication";

type RunDebtReminderResponse = {
  processed_count: number;
  created_count: number;
  suppressed_duplicates: number;
};

async function resolveRouteActor(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";

  if (expected && authHeader === expected) {
    const supabase = getSupabaseAdminClient();
    const userId = await resolveFirstAdminActorId(supabase);

    return {
      supabase,
      userId
    };
  }

  const authorization = await authorizeRequest(["admin"]);
  if (!authorization.authorized) {
    return {
      response: authorization.response
    };
  }

  return {
    supabase: authorization.supabase,
    userId: authorization.userId
  };
}

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveRouteActor(request);
    if ("response" in actor) {
      return actor.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const meta = getDebtReminderErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        body: ["تعذر قراءة JSON من الطلب."]
      });
    }

    const parsedBody = runDebtReminderSchema.safeParse(body);
    if (!parsedBody.success) {
      const meta = getDebtReminderErrorMeta("ERR_API_VALIDATION_FAILED");
      return errorResponse("ERR_API_VALIDATION_FAILED", meta.message, meta.status, {
        field_errors: parsedBody.error.flatten().fieldErrors
      });
    }

    const payload = parsedBody.data;
    const { data, error } = await actor.supabase.rpc("run_debt_reminder_scheduler", {
      p_mode: payload.mode,
      p_as_of_date: payload.as_of_date,
      p_created_by: actor.userId
    });

    if (error) {
      const code = extractErrorCode(error.message);
      const meta = getDebtReminderErrorMeta(code);
      return errorResponse(code, meta.message, meta.status);
    }

    return NextResponse.json<StandardEnvelope<RunDebtReminderResponse>>(
      {
        success: true,
        data: {
          processed_count: data.processed_count,
          created_count: data.created_count,
          suppressed_duplicates: data.suppressed_duplicates
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const meta = getDebtReminderErrorMeta("ERR_API_INTERNAL");
    return errorResponse("ERR_API_INTERNAL", meta.message, meta.status, {
      reason: (error as Error).message
    });
  }
}
