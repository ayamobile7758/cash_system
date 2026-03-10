import { NextResponse } from "next/server";
import { POST } from "@/app/api/purchases/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/purchases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/purchases", () => {
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

  it("passes the canonical payload to create_purchase()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        purchase_order_id: "purchase-1",
        purchase_number: "AYA-2026-00070",
        total: 45
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
        items: [
          {
            product_id: "22222222-2222-2222-8222-222222222222",
            quantity: 5,
            unit_cost: 9
          }
        ],
        is_paid: true,
        payment_account_id: "33333333-3333-3333-8333-333333333333",
        notes: "شراء تجريبي",
        idempotency_key: "44444444-4444-4444-8444-444444444444"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.purchase_number).toBe("AYA-2026-00070");
    expect(rpc).toHaveBeenCalledWith("create_purchase", {
      p_supplier_id: "11111111-1111-1111-8111-111111111111",
      p_items: [
        {
          product_id: "22222222-2222-2222-8222-222222222222",
          quantity: 5,
          unit_cost: 9
        }
      ],
      p_is_paid: true,
      p_payment_account_id: "33333333-3333-3333-8333-333333333333",
      p_notes: "شراء تجريبي",
      p_idempotency_key: "44444444-4444-4444-8444-444444444444",
      p_created_by: "admin-1"
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
        supplier_id: "11111111-1111-1111-8111-111111111111",
        items: [
          {
            product_id: "22222222-2222-2222-8222-222222222222",
            quantity: 5,
            unit_cost: 9
          }
        ],
        is_paid: true,
        payment_account_id: "33333333-3333-3333-8333-333333333333",
        idempotency_key: "44444444-4444-4444-8444-444444444444"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("ERR_IDEMPOTENCY");
  });
});
