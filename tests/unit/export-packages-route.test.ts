import { NextResponse } from "next/server";
import { POST } from "@/app/api/export/packages/route";
import { authorizeRequest } from "@/lib/api/common";
import { createExportPackage } from "@/lib/api/portability";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

vi.mock("@/lib/api/portability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/portability")>("@/lib/api/portability");
  return {
    ...actual,
    createExportPackage: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/export/packages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/export/packages", () => {
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

  it("creates an export package for admins", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(createExportPackage).mockResolvedValue({
      package_id: "package-1",
      download_url: "/api/export/packages/package-1",
      expires_at: "2026-03-12T00:00:00Z"
    });

    const response = await POST(
      createRequest({
        package_type: "json",
        scope: "products",
        filters: {}
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.package_id).toBe("package-1");
  });

  it("maps bounded export failures", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(createExportPackage).mockRejectedValue(new Error("ERR_EXPORT_TOO_LARGE"));

    const response = await POST(
      createRequest({
        package_type: "json",
        scope: "reports",
        filters: {}
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_EXPORT_TOO_LARGE");
  });
});
