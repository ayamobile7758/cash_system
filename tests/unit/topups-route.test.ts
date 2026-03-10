import { NextResponse } from "next/server";
import { POST } from "@/app/api/topups/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/topups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/topups", () => {
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

  it("passes the canonical payload to create_topup()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        topup_id: "topup-1",
        topup_number: "AYA-2026-00080",
        ledger_entry_ids: ["entry-1", "entry-2"]
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
        account_id: "11111111-1111-1111-8111-111111111111",
        amount: 100,
        profit_amount: 3,
        supplier_id: "22222222-2222-2222-8222-222222222222",
        notes: "شحن تجريبي",
        idempotency_key: "33333333-3333-3333-8333-333333333333"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.topup_number).toBe("AYA-2026-00080");
    expect(rpc).toHaveBeenCalledWith("create_topup", {
      p_account_id: "11111111-1111-1111-8111-111111111111",
      p_amount: 100,
      p_profit_amount: 3,
      p_supplier_id: "22222222-2222-2222-8222-222222222222",
      p_notes: "شحن تجريبي",
      p_idempotency_key: "33333333-3333-3333-8333-333333333333",
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
        account_id: "11111111-1111-1111-8111-111111111111",
        amount: 100,
        profit_amount: 3,
        idempotency_key: "33333333-3333-3333-8333-333333333333"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("ERR_IDEMPOTENCY");
  });
});
