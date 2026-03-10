import { NextResponse } from "next/server";
import { POST } from "@/app/api/suppliers/route";
import { PATCH } from "@/app/api/suppliers/[supplierId]/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createPostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function createPatchRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/suppliers/11111111-1111-1111-8111-111111111111", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function buildSupabase(options?: {
  duplicate?: boolean;
  createdSupplier?: Record<string, unknown>;
  updatedSupplier?: Record<string, unknown>;
}) {
  const duplicate = options?.duplicate ?? false;
  const createdSupplier =
    options?.createdSupplier ?? {
      id: "supplier-1",
      name: "شركة الأمل",
      phone: "0790000000",
      address: "عمان",
      current_balance: 0,
      is_active: true
    };
  const updatedSupplier =
    options?.updatedSupplier ?? {
      id: "supplier-1",
      name: "شركة الأمل",
      phone: "0790000000",
      address: "إربد",
      current_balance: 25,
      is_active: true
    };

  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: createdSupplier,
        error: null
      })
    })
  });

  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: updatedSupplier,
          error: null
        })
      })
    })
  });

  return {
    insert,
    update,
    from(table: string) {
      if (table !== "suppliers") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: duplicate ? { id: "existing-1" } : null,
                  error: null
                })
              })
            }),
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: duplicate ? { id: "existing-1" } : null,
                error: null
              })
            })
          })
        }),
        insert,
        update
      };
    }
  };
}

describe("supplier routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a supplier through the admin API", async () => {
    const supabase = buildSupabase();

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase
    } as never);

    const response = await POST(
      createPostRequest({
        name: "شركة الأمل",
        phone: "0790000000",
        address: "عمان",
        is_active: true
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.name).toBe("شركة الأمل");
    expect(supabase.insert).toHaveBeenCalledWith({
      name: "شركة الأمل",
      phone: "0790000000",
      address: "عمان",
      is_active: true
    });
  });

  it("rejects duplicate supplier names", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: buildSupabase({ duplicate: true })
    } as never);

    const response = await POST(
      createPostRequest({
        name: "شركة الأمل",
        is_active: true
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_API_VALIDATION_FAILED");
  });

  it("updates a supplier through the admin API", async () => {
    const supabase = buildSupabase();

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase
    } as never);

    const response = await PATCH(
      createPatchRequest({
        name: "شركة الأمل",
        phone: "0790000000",
        address: "إربد",
        is_active: true
      }),
      {
        params: {
          supplierId: "11111111-1111-1111-8111-111111111111"
        }
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.address).toBe("إربد");
    expect(supabase.update).toHaveBeenCalledWith({
      name: "شركة الأمل",
      phone: "0790000000",
      address: "إربد",
      is_active: true
    });
  });

  it("returns the authorization response when the user is blocked", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      )
    });

    const response = await POST(createPostRequest({ name: "شركة الأمل", is_active: true }));

    expect(response.status).toBe(403);
  });
});
