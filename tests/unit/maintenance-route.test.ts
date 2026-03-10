import { NextResponse } from "next/server";
import { POST } from "@/app/api/maintenance/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/maintenance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/maintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authorization response when blocked", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      )
    });

    const response = await POST(createRequest({}));
    expect(response.status).toBe(403);
  });

  it("passes the canonical payload to create_maintenance_job()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        job_id: "job-1",
        job_number: "AYA-2026-00100",
        status: "new"
      },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "pos_staff",
      userId: "pos-1",
      supabase: { rpc }
    } as never);

    const response = await POST(
      createRequest({
        customer_name: "محمد",
        customer_phone: "0790000000",
        device_type: "Samsung S24",
        issue_description: "تبديل شاشة",
        estimated_cost: 35,
        notes: "فحص أولي",
        idempotency_key: "11111111-1111-4111-8111-111111111111"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.job_number).toBe("AYA-2026-00100");
    expect(rpc).toHaveBeenCalledWith("create_maintenance_job", {
      p_customer_name: "محمد",
      p_customer_phone: "0790000000",
      p_device_type: "Samsung S24",
      p_issue_description: "تبديل شاشة",
      p_estimated_cost: 35,
      p_notes: "فحص أولي",
      p_idempotency_key: "11111111-1111-4111-8111-111111111111",
      p_created_by: "pos-1"
    });
  });

  it("maps idempotency failures from the RPC layer", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "ERR_IDEMPOTENCY" }
        })
      }
    } as never);

    const response = await POST(
      createRequest({
        customer_name: "محمد",
        device_type: "Samsung S24",
        issue_description: "تبديل شاشة",
        idempotency_key: "11111111-1111-4111-8111-111111111111"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("ERR_IDEMPOTENCY");
  });
});
