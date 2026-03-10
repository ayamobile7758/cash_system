import { POST } from "@/app/api/inventory/counts/complete/route";
import { authorizeRequest } from "@/lib/api/common";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/inventory/counts/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/inventory/counts/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when validation fails", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: { rpc: vi.fn() }
    } as never);

    const response = await POST(
      createRequest({
        inventory_count_id: "bad-id",
        items: []
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_API_VALIDATION_FAILED");
  });

  it("passes the canonical payload to complete_inventory_count()", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        count_id: "count-1",
        adjusted_products: 2,
        total_difference: 5
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
        inventory_count_id: "11111111-1111-1111-8111-111111111111",
        items: [
          {
            inventory_count_item_id: "22222222-2222-2222-8222-222222222222",
            actual_quantity: 8,
            reason: "فرق جرد"
          }
        ]
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.count_id).toBe("count-1");
    expect(rpc).toHaveBeenCalledWith("complete_inventory_count", {
      p_inventory_count_id: "11111111-1111-1111-8111-111111111111",
      p_items: [
        {
          inventory_count_item_id: "22222222-2222-2222-8222-222222222222",
          actual_quantity: 8,
          reason: "فرق جرد"
        }
      ],
      p_created_by: "admin-1"
    });
  });
});
