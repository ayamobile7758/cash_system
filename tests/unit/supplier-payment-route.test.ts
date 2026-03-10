import { NextResponse } from "next/server";
import { POST } from "@/app/api/payments/supplier/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/payments/supplier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/payments/supplier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when validation fails", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: { rpc: vi.fn() }
    } as never);

    const response = await POST(
      createRequest({
        supplier_id: "bad-id",
        account_id: "another-bad-id",
        amount: -1,
        idempotency_key: "bad-key"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_API_VALIDATION_FAILED");
  });

  it("passes the canonical payload to create_supplier_payment()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        payment_id: "payment-1",
        payment_number: "AYA-2026-00080",
        remaining_balance: 25
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
        supplier_id: "11111111-1111-1111-8111-111111111111",
        account_id: "22222222-2222-2222-8222-222222222222",
        amount: 20,
        notes: "دفعة أولى",
        idempotency_key: "33333333-3333-3333-8333-333333333333"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.payment_number).toBe("AYA-2026-00080");
    expect(rpc).toHaveBeenCalledWith("create_supplier_payment", {
      p_supplier_id: "11111111-1111-1111-8111-111111111111",
      p_account_id: "22222222-2222-2222-8222-222222222222",
      p_amount: 20,
      p_notes: "دفعة أولى",
      p_idempotency_key: "33333333-3333-3333-8333-333333333333",
      p_created_by: "admin-1"
    });
  });

  it("maps overpay failures from the RPC layer", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "ERR_SUPPLIER_OVERPAY" }
        })
      }
    } as never);

    const response = await POST(
      createRequest({
        supplier_id: "11111111-1111-1111-8111-111111111111",
        account_id: "22222222-2222-2222-8222-222222222222",
        amount: 200,
        idempotency_key: "33333333-3333-3333-8333-333333333333"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_SUPPLIER_OVERPAY");
  });
});
