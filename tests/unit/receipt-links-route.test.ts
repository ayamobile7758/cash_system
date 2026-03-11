import { NextResponse } from "next/server";
import { PATCH, POST } from "@/app/api/receipts/link/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createPostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/receipts/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function createPatchRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/receipts/link", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("receipt link routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authorization response when blocked on issue", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      )
    });

    const response = await POST(createPostRequest({}));
    expect(response.status).toBe(403);
  });

  it("issues a receipt link and returns the absolute URL", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        token_id: "token-1",
        token: "abc123",
        expires_at: "2026-03-20T00:00:00Z",
        is_reissued: false
      },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "pos_staff",
      userId: "pos-1",
      supabase: { rpc }
    } as never);

    const response = await POST(
      createPostRequest({
        invoice_id: "11111111-1111-4111-8111-111111111111",
        channel: "share",
        expires_in_hours: 24,
        force_reissue: false
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.receipt_url).toBe("http://localhost/r/abc123");
    expect(rpc).toHaveBeenCalledWith("issue_receipt_link", {
      p_invoice_id: "11111111-1111-4111-8111-111111111111",
      p_channel: "share",
      p_expires_in_hours: 24,
      p_force_reissue: false,
      p_created_by: "pos-1"
    });
  });

  it("maps revoke errors from the RPC layer", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "ERR_RECEIPT_LINK_INVALID" }
        })
      }
    } as never);

    const response = await PATCH(
      createPatchRequest({
        token_id: "11111111-1111-4111-8111-111111111111"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("ERR_RECEIPT_LINK_INVALID");
  });
});
