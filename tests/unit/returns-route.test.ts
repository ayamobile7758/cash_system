import { NextResponse } from "next/server";
import { POST } from "@/app/api/returns/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

const invoiceId = "11111111-1111-1111-8111-111111111111";
const invoiceItemId = "22222222-2222-2222-8222-222222222222";
const refundAccountId = "33333333-3333-3333-8333-333333333333";
const idempotencyKey = "44444444-4444-4444-8444-444444444444";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/returns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function buildAuthorization(options?: {
  rpcData?: Record<string, unknown> | null;
  rpcError?: { message: string } | null;
}) {
  return {
    authorized: true,
    role: "pos_staff",
    userId: "user-1",
    permissions: ["sales.create"],
    bundleKeys: [],
    maxDiscountPercentage: null,
    discountRequiresApproval: false,
    supabase: {
      rpc: vi.fn().mockResolvedValue({
        data:
          options?.rpcData ?? {
            return_id: "return-1",
            return_number: "RET-0001",
            refunded_amount: 10,
            return_type: "partial",
            total_amount: 10,
            debt_reduction: 0
          },
        error: options?.rpcError ?? null
      })
    }
  };
}

describe("POST /api/returns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the session is missing", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_UNAUTHORIZED", message: "unauthorized" } },
        { status: 401 }
      )
    });

    const response = await POST(
      createRequest({
        invoice_id: invoiceId,
        items: [{ invoice_item_id: invoiceItemId, quantity: 1 }],
        refund_account_id: refundAccountId,
        return_type: "partial",
        reason: "damaged",
        idempotency_key: idempotencyKey
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when validation fails", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue(buildAuthorization() as never);

    const response = await POST(
      createRequest({
        invoice_id: "invalid",
        items: [],
        return_type: "partial",
        reason: "",
        idempotency_key: "bad-key"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_API_VALIDATION_FAILED");
  });

  it("passes the request body to create_return and returns success", async () => {
    const authorization = buildAuthorization();
    vi.mocked(authorizeRequest).mockResolvedValue(authorization as never);

    const response = await POST(
      createRequest({
        invoice_id: invoiceId,
        items: [{ invoice_item_id: invoiceItemId, quantity: 1 }],
        refund_account_id: refundAccountId,
        return_type: "partial",
        reason: "damaged",
        idempotency_key: idempotencyKey
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(authorization.supabase.rpc).toHaveBeenCalledWith("create_return", {
      p_invoice_id: invoiceId,
      p_items: [{ invoice_item_id: invoiceItemId, quantity: 1 }],
      p_refund_account_id: refundAccountId,
      p_return_type: "partial",
      p_reason: "damaged",
      p_idempotency_key: idempotencyKey,
      p_created_by: "user-1"
    });
  });
});
