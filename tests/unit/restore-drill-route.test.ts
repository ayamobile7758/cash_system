import { NextResponse } from "next/server";
import { POST } from "@/app/api/restore/drill/route";
import { authorizeRequest } from "@/lib/api/common";
import { runRestoreDrill } from "@/lib/api/portability";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

vi.mock("@/lib/api/portability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/portability")>("@/lib/api/portability");
  return {
    ...actual,
    runRestoreDrill: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/restore/drill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/restore/drill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("returns the authorization response when blocked", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      )
    });

    const response = await POST(
      createRequest({
        backup_id: "11111111-1111-4111-8111-111111111111",
        target_env: "isolated-drill",
        idempotency_key: "22222222-2222-4222-8222-222222222222"
      })
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid payloads", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);

    const response = await POST(
      createRequest({
        backup_id: "not-a-uuid",
        target_env: "isolated-drill",
        idempotency_key: "22222222-2222-4222-8222-222222222222"
      })
    );

    expect(response.status).toBe(400);
  });

  it("maps restore idempotency failures", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(runRestoreDrill).mockRejectedValue(new Error("ERR_IDEMPOTENCY"));

    const response = await POST(
      createRequest({
        backup_id: "11111111-1111-4111-8111-111111111111",
        target_env: "isolated-drill",
        idempotency_key: "22222222-2222-4222-8222-222222222222"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("ERR_IDEMPOTENCY");
  });

  it("returns the completed restore drill summary", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(runRestoreDrill).mockResolvedValue({
      drill_id: "drill-1",
      status: "completed",
      drift_count: 0,
      rto_seconds: 1
    });

    const response = await POST(
      createRequest({
        backup_id: "11111111-1111-4111-8111-111111111111",
        target_env: "isolated-drill",
        idempotency_key: "22222222-2222-4222-8222-222222222222"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("completed");
    expect(payload.data.drift_count).toBe(0);
  });
});
