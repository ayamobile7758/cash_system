import { NextResponse } from "next/server";
import { POST } from "@/app/api/payments/debt/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

const customerId = "11111111-1111-1111-8111-111111111111";
const accountId = "22222222-2222-2222-8222-222222222222";
const entryId = "33333333-3333-3333-8333-333333333333";
const idempotencyKey = "44444444-4444-4444-8444-444444444444";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/payments/debt", {
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
    permissions: ["debts.pay"],
    bundleKeys: [],
    maxDiscountPercentage: null,
    discountRequiresApproval: false,
    supabase: {
      rpc: vi.fn().mockResolvedValue({
        data:
          options?.rpcData ?? {
            payment_id: "payment-1",
            receipt_number: "AYA-2026-00020",
            remaining_balance: 30,
            allocations: [{ debt_entry_id: entryId, allocated_amount: 10 }]
          },
        error: options?.rpcError ?? null
      })
    }
  };
}

describe("POST /api/payments/debt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the payment payload to create_debt_payment", async () => {
    const authorization = buildAuthorization();
    vi.mocked(authorizeRequest).mockResolvedValue(authorization as never);

    const response = await POST(
      createRequest({
        debt_customer_id: customerId,
        amount: 10,
        account_id: accountId,
        notes: "دفعة أولى",
        debt_entry_id: entryId,
        idempotency_key: idempotencyKey
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(authorization.supabase.rpc).toHaveBeenCalledWith("create_debt_payment", {
      p_debt_customer_id: customerId,
      p_amount: 10,
      p_account_id: accountId,
      p_notes: "دفعة أولى",
      p_idempotency_key: idempotencyKey,
      p_debt_entry_id: entryId,
      p_created_by: "user-1"
    });
  });

  it("maps overpay errors from the RPC layer", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue(
      buildAuthorization({
        rpcError: { message: "ERR_DEBT_OVERPAY" }
      }) as never
    );

    const response = await POST(
      createRequest({
        debt_customer_id: customerId,
        amount: 999,
        account_id: accountId,
        idempotency_key: idempotencyKey
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_DEBT_OVERPAY");
  });
});
