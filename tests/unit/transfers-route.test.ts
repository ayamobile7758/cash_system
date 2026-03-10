import { NextResponse } from "next/server";
import { POST } from "@/app/api/transfers/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/transfers", () => {
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

  it("passes the canonical payload to create_transfer()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        transfer_id: "transfer-1",
        transfer_number: "AYA-2026-00081",
        ledger_entry_ids: ["entry-1", "entry-2"]
      },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: { rpc }
    } as never);

    const response = await POST(
      createRequest({
        from_account_id: "11111111-1111-1111-8111-111111111111",
        to_account_id: "22222222-2222-2222-8222-222222222222",
        amount: 50,
        notes: "تحويل تجريبي",
        idempotency_key: "33333333-3333-3333-8333-333333333333"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.transfer_number).toBe("AYA-2026-00081");
    expect(rpc).toHaveBeenCalledWith("create_transfer", {
      p_from_account_id: "11111111-1111-1111-8111-111111111111",
      p_to_account_id: "22222222-2222-2222-8222-222222222222",
      p_amount: 50,
      p_notes: "تحويل تجريبي",
      p_idempotency_key: "33333333-3333-3333-8333-333333333333",
      p_created_by: "admin-1"
    });
  });

  it("maps insufficient balance failures from the RPC layer", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "ERR_INSUFFICIENT_BALANCE" }
        })
      }
    } as never);

    const response = await POST(
      createRequest({
        from_account_id: "11111111-1111-1111-8111-111111111111",
        to_account_id: "22222222-2222-2222-8222-222222222222",
        amount: 50,
        idempotency_key: "33333333-3333-3333-8333-333333333333"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_INSUFFICIENT_BALANCE");
  });
});
