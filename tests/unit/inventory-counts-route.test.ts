import { POST } from "@/app/api/inventory/counts/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/inventory/counts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/inventory/counts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when selected scope has no products", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: { rpc: vi.fn() }
    } as never);

    const response = await POST(
      createRequest({
        count_type: "daily",
        scope: "selected",
        product_ids: []
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_API_VALIDATION_FAILED");
  });

  it("passes the canonical payload to start_inventory_count()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        count_id: "count-1",
        count_type: "daily",
        item_count: 2,
        status: "in_progress"
      },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: { rpc }
    } as never);

    const response = await POST(
      createRequest({
        count_type: "daily",
        scope: "selected",
        product_ids: [
          "22222222-2222-2222-8222-222222222222",
          "33333333-3333-3333-8333-333333333333"
        ],
        notes: "جرد نهاية اليوم"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.count_id).toBe("count-1");
    expect(rpc).toHaveBeenCalledWith("start_inventory_count", {
      p_count_type: "daily",
      p_product_ids: [
        "22222222-2222-2222-8222-222222222222",
        "33333333-3333-3333-8333-333333333333"
      ],
      p_notes: "جرد نهاية اليوم",
      p_created_by: "admin-1"
    });
  });
});
