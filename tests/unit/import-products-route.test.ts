import { NextResponse } from "next/server";
import { POST } from "@/app/api/import/products/route";
import { authorizeRequest } from "@/lib/api/common";
import {
  commitProductImportJob,
  runProductImportDryRun
} from "@/lib/api/portability";

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
    runProductImportDryRun: vi.fn(),
    commitProductImportJob: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/import/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/import/products", () => {
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

  it("executes a dry-run import", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(runProductImportDryRun).mockResolvedValue({
      job_id: "job-1",
      mode: "dry_run",
      rows_total: 3,
      rows_valid: 2,
      rows_invalid: 1,
      validation_errors: [{ row_number: 2, field: "name", message: "duplicate" }]
    });

    const response = await POST(
      createRequest({
        mode: "dry_run",
        source_format: "csv",
        source_content: "name,category\nCable,accessory",
        file_name: "products.csv"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.mode).toBe("dry_run");
    expect(payload.data.rows_invalid).toBe(1);
  });

  it("rejects commit when no valid dry-run exists", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(commitProductImportJob).mockRejectedValue(new Error("ERR_IMPORT_DRY_RUN_REQUIRED"));

    const response = await POST(
      createRequest({
        mode: "commit",
        dry_run_job_id: "11111111-1111-4111-8111-111111111111"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("ERR_IMPORT_DRY_RUN_REQUIRED");
  });

  it("commits a ready import job", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(commitProductImportJob).mockResolvedValue({
      job_id: "job-1",
      mode: "commit",
      rows_total: 2,
      rows_valid: 2,
      rows_invalid: 0,
      rows_committed: 2
    });

    const response = await POST(
      createRequest({
        mode: "commit",
        dry_run_job_id: "11111111-1111-4111-8111-111111111111"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.rows_committed).toBe(2);
  });
});
