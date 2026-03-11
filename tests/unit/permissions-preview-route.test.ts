import { NextResponse } from "next/server";
import { POST } from "@/app/api/permissions/preview/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/permissions/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/permissions/preview", () => {
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

    const response = await POST(createRequest({ bundle_key: "inventory_clerk" }));
    expect(response.status).toBe(403);
  });

  it("returns the bundle preview for an active bundle", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        key: "inventory_clerk",
        base_role: "pos_staff",
        permissions: ["inventory.read", "inventory.count.start"],
        max_discount_percentage: null,
        discount_requires_approval: false
      },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      permissions: ["*"],
      bundleKeys: [],
      maxDiscountPercentage: null,
      discountRequiresApproval: false,
      supabase: {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return { maybeSingle };
                    }
                  };
                }
              };
            }
          };
        }
      }
    } as never);

    const response = await POST(createRequest({ bundle_key: "inventory_clerk" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.bundle_key).toBe("inventory_clerk");
    expect(payload.data.permissions).toEqual(["inventory.read", "inventory.count.start"]);
  });
});
