import { NextResponse } from "next/server";
import { POST } from "@/app/api/debts/manual/route";
import { authorizeRequest } from "@/lib/api/common";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn()
}));

const customerId = "11111111-1111-1111-8111-111111111111";
const idempotencyKey = "22222222-2222-2222-8222-222222222222";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/debts/manual", {
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
    permissions: ["debts.manual.create"],
    bundleKeys: [],
    maxDiscountPercentage: null,
    discountRequiresApproval: false,
    supabase: {
      rpc: vi.fn().mockResolvedValue({
        data:
          options?.rpcData ?? {
            debt_entry_id: "debt-entry-1"
          },
        error: options?.rpcError ?? null
      })
    }
  };
}

function buildLookupClient(existingId: string | null) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: existingId ? { id: existingId } : null,
                  error: null
                })
              };
            }
          };
        }
      };
    }
  };
}

describe("POST /api/debts/manual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the current user is not admin", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      )
    });

    const response = await POST(
      createRequest({
        debt_customer_id: customerId,
        amount: 10,
        description: "دين يدوي",
        idempotency_key: idempotencyKey
      })
    );

    expect(response.status).toBe(403);
  });

  it("passes p_created_by to create_debt_manual", async () => {
    const authorization = buildAuthorization();
    vi.mocked(authorizeRequest).mockResolvedValue(authorization as never);
    vi.mocked(getSupabaseAdminClient).mockReturnValue(buildLookupClient(null) as never);

    const response = await POST(
      createRequest({
        debt_customer_id: customerId,
        amount: 25,
        description: "دين يدوي",
        idempotency_key: idempotencyKey
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(authorization.supabase.rpc).toHaveBeenCalledWith("create_debt_manual", {
      p_debt_customer_id: customerId,
      p_amount: 25,
      p_description: "دين يدوي",
      p_idempotency_key: idempotencyKey,
      p_created_by: "admin-1"
    });
  });

  it("returns existing_result when idempotency is hit", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue(
      buildAuthorization({
        rpcError: { message: "ERR_IDEMPOTENCY" }
      }) as never
    );
    vi.mocked(getSupabaseAdminClient).mockReturnValue(buildLookupClient("existing-entry") as never);

    const response = await POST(
      createRequest({
        debt_customer_id: customerId,
        amount: 25,
        description: "دين يدوي",
        idempotency_key: idempotencyKey
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("ERR_IDEMPOTENCY");
    expect(payload.error.details.existing_result.debt_entry_id).toBe("existing-entry");
  });
});
