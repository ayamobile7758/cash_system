import { NextResponse } from "next/server";
import { POST as healthBalanceCheck } from "@/app/api/health/balance-check/route";
import { POST as cronBalanceCheck } from "@/app/api/cron/balance-check/route";
import { authorizeRequest } from "@/lib/api/common";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveFirstAdminActorId } from "@/lib/api/reports";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn()
}));

vi.mock("@/lib/api/reports", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/reports")>("@/lib/api/reports");
  return {
    ...actual,
    resolveFirstAdminActorId: vi.fn()
  };
});

describe("balance check routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin authorization for POST /api/health/balance-check", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      )
    });

    const response = await healthBalanceCheck();
    expect(response.status).toBe(403);
  });

  it("runs fn_verify_balance_integrity with p_created_by for admin route", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { success: true, drift_count: 0, drifts: [] },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: { rpc }
    } as never);

    const response = await healthBalanceCheck();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.drift_count).toBe(0);
    expect(rpc).toHaveBeenCalledWith("fn_verify_balance_integrity", {
      p_created_by: "admin-1"
    });
  });

  it("requires the cron bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "secret-secret-1234");

    const response = await cronBalanceCheck(
      new Request("http://localhost/api/cron/balance-check", { method: "POST" }) as never
    );

    expect(response.status).toBe(401);

    vi.unstubAllEnvs();
  });

  it("runs the canonical integrity RPC from cron with an admin actor", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { success: true, drift_count: 1, drifts: [{ account_name: "الصندوق" }] },
      error: null
    });

    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      rpc
    } as never);
    vi.mocked(resolveFirstAdminActorId).mockResolvedValue("admin-1");

    vi.stubEnv("CRON_SECRET", "secret-secret-1234");

    const response = await cronBalanceCheck(
      new Request("http://localhost/api/cron/balance-check", {
        method: "POST",
        headers: { authorization: "Bearer secret-secret-1234" }
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.drift_count).toBe(1);
    expect(rpc).toHaveBeenCalledWith("fn_verify_balance_integrity", {
      p_created_by: "admin-1"
    });

    vi.unstubAllEnvs();
  });
});
