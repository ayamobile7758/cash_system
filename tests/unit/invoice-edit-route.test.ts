import { NextResponse } from "next/server";
import { POST } from "@/app/api/invoices/edit/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

const invoiceId = "11111111-1111-1111-8111-111111111111";
const productId = "22222222-2222-2222-8222-222222222222";
const accountId = "33333333-3333-3333-8333-333333333333";
const customerId = "44444444-4444-4444-8444-444444444444";
const idempotencyKey = "55555555-5555-5555-8555-555555555555";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/invoices/edit", {
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
    role: "admin",
    userId: "admin-1",
    permissions: ["invoices.edit"],
    bundleKeys: [],
    maxDiscountPercentage: null,
    discountRequiresApproval: false,
    supabase: {
      rpc: vi.fn().mockResolvedValue({
        data:
          options?.rpcData ?? {
            invoice_id: invoiceId,
            invoice_number: "AYA-2026-00080",
            total: 15
          },
        error: options?.rpcError ?? null
      })
    }
  };
}

describe("POST /api/invoices/edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes a sanitized edit payload to edit_invoice", async () => {
    const authorization = buildAuthorization();
    vi.mocked(authorizeRequest).mockResolvedValue(authorization as never);

    const response = await POST(
      createRequest({
        invoice_id: invoiceId,
        items: [
          {
            product_id: productId,
            quantity: 1,
            discount_percentage: 5,
            unit_price: 9999
          }
        ],
        payments: [{ account_id: accountId, amount: 15 }],
        customer_id: customerId,
        edit_reason: "تعديل",
        idempotency_key: idempotencyKey
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(authorization.supabase.rpc).toHaveBeenCalledWith("edit_invoice", {
      p_invoice_id: invoiceId,
      p_items: [
        {
          product_id: productId,
          quantity: 1,
          discount_percentage: 5
        }
      ],
      p_payments: [{ account_id: accountId, amount: 15 }],
      p_debt_customer_id: customerId,
      p_edit_reason: "تعديل",
      p_idempotency_key: idempotencyKey,
      p_created_by: "admin-1"
    });
  });

  it("returns role forbidden when the current user is not admin", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      )
    });

    const response = await POST(
      createRequest({
        invoice_id: invoiceId,
        items: [{ product_id: productId, quantity: 1 }],
        payments: [{ account_id: accountId, amount: 10 }],
        edit_reason: "تعديل",
        idempotency_key: idempotencyKey
      })
    );

    expect(response.status).toBe(403);
  });
});
