import { NextResponse } from "next/server";
import { POST } from "@/app/api/sales/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

const productId = "11111111-1111-1111-8111-111111111111";
const accountId = "22222222-2222-2222-8222-222222222222";
const customerId = "44444444-4444-4444-8444-444444444444";
const idempotencyKey = "33333333-3333-3333-8333-333333333333";

type ExistingInvoiceRow = {
  id: string;
  invoice_number: string;
  total_amount: number;
} | null;

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/sales", {
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
  invoice?: ExistingInvoiceRow;
}) {
  const rpc = vi.fn().mockResolvedValue({
    data:
      options?.rpcData ?? {
        invoice_id: "invoice-1",
        invoice_number: "INV-0001",
        total: 12,
        change: 0
      },
    error: options?.rpcError ?? null
  });

  const invoice = options?.invoice ?? null;

  return {
    authorized: true,
    role: "pos_staff",
    userId: "user-1",
    permissions: ["sales.create"],
    bundleKeys: [],
    maxDiscountPercentage: null,
    discountRequiresApproval: false,
    supabase: {
      rpc,
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: invoice,
                    error: null
                  })
                };
              }
            };
          }
        };
      }
    }
  };
}

describe("POST /api/sales", () => {
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

    const response = await POST(
      createRequest({
        items: [{ product_id: productId, quantity: 1 }],
        payments: [{ account_id: accountId, amount: 10 }],
        idempotency_key: idempotencyKey
      })
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 when validation fails", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue(buildAuthorization() as never);

    const response = await POST(
      createRequest({
        items: [],
        payments: [],
        idempotency_key: "not-a-uuid"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_API_VALIDATION_FAILED");
  });

  it("passes the canonical payload to create_sale()", async () => {
    const authorization = buildAuthorization();
    vi.mocked(authorizeRequest).mockResolvedValue(authorization as never);

    const response = await POST(
      createRequest({
        items: [
          {
            product_id: productId,
            quantity: 2,
            discount_percentage: 5,
            unit_price: 9999
          }
        ],
        payments: [{ account_id: accountId, amount: 12 }],
        customer_id: customerId,
        pos_terminal_code: "POS-01",
        notes: "cash sale",
        idempotency_key: idempotencyKey
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(authorization.supabase.rpc).toHaveBeenCalledWith("create_sale", {
      p_items: [
        {
          product_id: productId,
          quantity: 2,
          discount_percentage: 5
        }
      ],
      p_payments: [{ account_id: accountId, amount: 12 }],
      p_debt_customer_id: customerId,
      p_pos_terminal: "POS-01",
      p_notes: "cash sale",
      p_idempotency_key: idempotencyKey,
      p_created_by: "user-1"
    });
  });

  it("returns replay metadata when the idempotency key already exists", async () => {
    const authorization = buildAuthorization({
      rpcError: { message: "ERR_IDEMPOTENCY" },
      invoice: {
        id: "invoice-1",
        invoice_number: "INV-0001",
        total_amount: 12
      }
    });

    vi.mocked(authorizeRequest)
      .mockResolvedValueOnce(authorization as never)
      .mockResolvedValueOnce(authorization as never);

    const response = await POST(
      createRequest({
        items: [{ product_id: productId, quantity: 1 }],
        payments: [{ account_id: accountId, amount: 12 }],
        idempotency_key: idempotencyKey
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("ERR_IDEMPOTENCY");
    expect(payload.error.details.existing_result.invoice_number).toBe("INV-0001");
  });

  it("maps discount approval failures from the RPC layer", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue(
      buildAuthorization({
        rpcError: { message: "ERR_DISCOUNT_APPROVAL_REQUIRED" }
      }) as never
    );

    const response = await POST(
      createRequest({
        items: [{ product_id: productId, quantity: 1, discount_percentage: 12 }],
        payments: [{ account_id: accountId, amount: 88 }],
        idempotency_key: idempotencyKey
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("ERR_DISCOUNT_APPROVAL_REQUIRED");
  });
});
