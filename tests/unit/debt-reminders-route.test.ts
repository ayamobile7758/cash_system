import { NextResponse } from "next/server";
import { POST } from "@/app/api/notifications/debts/run/route";
import { authorizeRequest } from "@/lib/api/common";
import { resolveFirstAdminActorId } from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

vi.mock("@/lib/api/reports", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/reports")>("@/lib/api/reports");
  return {
    ...actual,
    resolveFirstAdminActorId: vi.fn()
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn()
}));

function createRequest(body: Record<string, unknown>, headers?: HeadersInit) {
  return new Request("http://localhost/api/notifications/debts/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify(body)
  });
}

describe("POST /api/notifications/debts/run", () => {
  const previousSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = previousSecret;
  });

  it("returns the authorization response when blocked", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      )
    });

    const response = await POST(createRequest({ mode: "due", as_of_date: "2026-03-11" }) as never);
    if (!response) {
      throw new Error("Expected a response object.");
    }
    expect(response.status).toBe(403);
  });

  it("runs the scheduler through the cron bearer path", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        processed_count: 2,
        created_count: 2,
        suppressed_duplicates: 0
      },
      error: null
    });

    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as never);
    vi.mocked(resolveFirstAdminActorId).mockResolvedValue("admin-1");

    const response = await POST(
      createRequest(
        { mode: "due", as_of_date: "2026-03-11" },
        { authorization: "Bearer secret" }
      ) as never
    );
    if (!response) {
      throw new Error("Expected a response object.");
    }
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.created_count).toBe(2);
    expect(rpc).toHaveBeenCalledWith("run_debt_reminder_scheduler", {
      p_mode: "due",
      p_as_of_date: "2026-03-11",
      p_created_by: "admin-1"
    });
  });
});
