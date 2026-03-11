import { NextResponse } from "next/server";
import { DELETE, POST } from "@/app/api/roles/assign/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(method: "POST" | "DELETE", body: Record<string, unknown>) {
  return new Request("http://localhost/api/roles/assign", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function buildAuthorization(rpc: ReturnType<typeof vi.fn>) {
  return {
    authorized: true,
    role: "admin",
    userId: "admin-1",
    permissions: ["*"],
    bundleKeys: [],
    maxDiscountPercentage: null,
    discountRequiresApproval: false,
    supabase: { rpc }
  };
}

describe("/api/roles/assign", () => {
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

    const response = await POST(createRequest("POST", { user_id: "bad", bundle_key: "inventory_clerk" }));
    expect(response.status).toBe(403);
  });

  it("passes the canonical payload to assign_permission_bundle()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        assignment_id: "assignment-1",
        bundle_key: "inventory_clerk",
        base_role: "pos_staff",
        is_active: true
      },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue(buildAuthorization(rpc) as never);

    const response = await POST(
      createRequest("POST", {
        user_id: "11111111-1111-1111-8111-111111111111",
        bundle_key: "inventory_clerk",
        notes: "Assign inventory bundle"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.bundle_key).toBe("inventory_clerk");
    expect(rpc).toHaveBeenCalledWith("assign_permission_bundle", {
      p_user_id: "11111111-1111-1111-8111-111111111111",
      p_bundle_key: "inventory_clerk",
      p_notes: "Assign inventory bundle",
      p_created_by: "admin-1"
    });
  });

  it("passes the canonical payload to revoke_permission_bundle()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        assignment_id: "assignment-1",
        bundle_key: "inventory_clerk",
        base_role: "pos_staff",
        is_active: false
      },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue(buildAuthorization(rpc) as never);

    const response = await DELETE(
      createRequest("DELETE", {
        user_id: "11111111-1111-1111-8111-111111111111",
        bundle_key: "inventory_clerk",
        notes: "Revoke inventory bundle"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.is_active).toBe(false);
    expect(rpc).toHaveBeenCalledWith("revoke_permission_bundle", {
      p_user_id: "11111111-1111-1111-8111-111111111111",
      p_bundle_key: "inventory_clerk",
      p_notes: "Revoke inventory bundle",
      p_created_by: "admin-1"
    });
  });
});
