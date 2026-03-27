import { NextResponse } from "next/server";
import { GET, POST } from "@/app/api/expense-categories/route";
import { PATCH } from "@/app/api/expense-categories/[categoryId]/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/expense-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("expense categories routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters active categories for POS on GET", async () => {
    const order = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const returns = vi.fn().mockResolvedValue({
      data: [
        {
          id: "cat-1",
          name: "Fuel",
          type: "variable",
          description: null,
          is_active: true,
          sort_order: 1
        }
      ],
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "pos_staff",
      userId: "pos-1",
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order,
            eq,
            returns
          }))
        }))
      }
    } as never);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("is_active", true);
    expect(payload.data.items).toHaveLength(1);
  });

  it("creates a category for admins", async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "cat-1",
            name: "Fuel",
            type: "variable",
            description: "Ops",
            is_active: true,
            sort_order: 1
          },
          error: null
        })
      })
    });

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {
        from: vi.fn((table: string) => {
          if (table === "expense_categories") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle
                  }))
                }))
              })),
              insert
            };
          }

          if (table === "audit_logs") {
            return {
              insert: auditInsert
            };
          }

          throw new Error(`Unexpected table ${table}`);
        })
      }
    } as never);

    const response = await POST(
      createRequest({
        name: "Fuel",
        type: "variable",
        description: "Ops",
        is_active: true,
        sort_order: 1
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.name).toBe("Fuel");
    expect(insert).toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalled();
  });

  it("blocks changing the type of referenced categories", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: "cat-1",
          name: "Fuel",
          type: "variable",
          description: null,
          is_active: true,
          sort_order: 1
        },
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {
        from: vi.fn((table: string) => {
          if (table === "expense_categories") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle,
                  neq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle
                    }))
                  }))
                }))
              }))
            };
          }

          if (table === "expenses") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  count: 2,
                  error: null
                })
              }))
            };
          }

          throw new Error(`Unexpected table ${table}`);
        })
      }
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/expense-categories/cat-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fixed"
        })
      }),
      {
        params: Promise.resolve({
          categoryId: "cat-1"
        })
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("ERR_EXPENSE_CATEGORY_HAS_REFERENCES");
  });

  it("returns the authorization response when blocked on POST", async () => {
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
});
