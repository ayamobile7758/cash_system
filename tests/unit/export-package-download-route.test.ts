import { NextResponse } from "next/server";
import { GET, PATCH } from "@/app/api/export/packages/[packageId]/route";
import { authorizeRequest } from "@/lib/api/common";
import { revokeExportPackage } from "@/lib/api/portability";

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
    revokeExportPackage: vi.fn()
  };
});

function createSupabaseForPackage(row: Record<string, unknown> | null) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: row,
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

describe("export package download route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("downloads a ready package", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: createSupabaseForPackage({
        id: "package-1",
        package_type: "json",
        scope: "products",
        status: "ready",
        filters: {},
        file_name: "aya-products-package-2026-03-11.json",
        row_count: 1,
        content_json: { items: [] },
        content_text: "{\"items\":[]}",
        expires_at: "2099-03-12T00:00:00Z",
        revoked_at: null,
        created_at: "2026-03-11T00:00:00Z",
        created_by: "admin-1"
      })
    } as never);

    const response = await GET(new Request("http://localhost/api/export/packages/package-1"), {
      params: { packageId: "package-1" }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain("aya-products-package-2026-03-11.json");
  });

  it("returns 410 for revoked or expired packages", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: createSupabaseForPackage({
        id: "package-1",
        package_type: "json",
        scope: "products",
        status: "revoked",
        filters: {},
        file_name: "aya-products-package-2026-03-11.json",
        row_count: 1,
        content_json: null,
        content_text: "{}",
        expires_at: "2099-03-12T00:00:00Z",
        revoked_at: "2026-03-11T01:00:00Z",
        created_at: "2026-03-11T00:00:00Z",
        created_by: "admin-1"
      })
    } as never);

    const response = await GET(new Request("http://localhost/api/export/packages/package-1"), {
      params: { packageId: "package-1" }
    });
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.error.code).toBe("ERR_EXPORT_PACKAGE_EXPIRED");
  });

  it("revokes a package through the shared operation", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(revokeExportPackage).mockResolvedValue({
      package_id: "package-1",
      status: "revoked",
      revoked_at: "2026-03-11T02:00:00Z"
    });

    const response = await PATCH(new Request("http://localhost/api/export/packages/package-1", { method: "PATCH" }), {
      params: { packageId: "package-1" }
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("revoked");
  });
});
