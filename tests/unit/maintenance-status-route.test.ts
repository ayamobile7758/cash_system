import { NextResponse } from "next/server";
import { PATCH } from "@/app/api/maintenance/[jobId]/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/maintenance/job-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("PATCH /api/maintenance/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when validation fails", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "pos_staff",
      userId: "pos-1",
      supabase: { rpc: vi.fn() }
    } as never);

    const response = await PATCH(
      createRequest({
        status: "delivered",
        final_amount: 20
      }),
      { params: { jobId: "job-1" } }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_API_VALIDATION_FAILED");
  });

  it("passes the canonical payload to update_maintenance_job_status()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        job_id: "job-1",
        job_number: "AYA-2026-00100",
        status: "delivered",
        final_amount: 25,
        ledger_entry_id: "entry-1"
      },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "pos_staff",
      userId: "pos-1",
      supabase: { rpc }
    } as never);

    const response = await PATCH(
      createRequest({
        status: "delivered",
        final_amount: 25,
        payment_account_id: "22222222-2222-4222-8222-222222222222",
        notes: "تم الإصلاح"
      }),
      { params: { jobId: "job-1" } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.ledger_entry_id).toBe("entry-1");
    expect(rpc).toHaveBeenCalledWith("update_maintenance_job_status", {
      p_job_id: "job-1",
      p_new_status: "delivered",
      p_final_amount: 25,
      p_payment_account_id: "22222222-2222-4222-8222-222222222222",
      p_notes: "تم الإصلاح",
      p_created_by: "pos-1"
    });
  });

  it("maps invalid status transitions from the RPC layer", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "ERR_MAINTENANCE_INVALID_STATUS" }
        })
      }
    } as never);

    const response = await PATCH(
      createRequest({
        status: "ready",
        notes: "خطوة غير صالحة"
      }),
      { params: { jobId: "job-1" } }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_MAINTENANCE_INVALID_STATUS");
  });
});
