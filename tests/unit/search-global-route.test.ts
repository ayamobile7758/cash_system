import { GET } from "@/app/api/search/global/route";
import { authorizeRequest } from "@/lib/api/common";
import { searchGlobal } from "@/lib/api/search";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

vi.mock("@/lib/api/search", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/search")>("@/lib/api/search");
  return {
    ...actual,
    searchGlobal: vi.fn()
  };
});

describe("GET /api/search/global", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for short queries", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "pos_staff",
      userId: "pos-1",
      supabase: {},
      permissions: ["products.read", "notifications.read"],
      bundleKeys: [],
      maxDiscountPercentage: null,
      discountRequiresApproval: false
    } as never);

    const response = await GET(new Request("http://localhost/api/search/global?q=a"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("ERR_SEARCH_QUERY_TOO_SHORT");
  });

  it("returns search items for authorized users", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {},
      permissions: ["*"],
      bundleKeys: [],
      maxDiscountPercentage: null,
      discountRequiresApproval: false
    } as never);
    vi.mocked(searchGlobal).mockResolvedValue([
      {
        entity: "product",
        id: "prod-1",
        label: "PX13 Charger",
        secondary: "PX13-001 · accessory"
      }
    ]);

    const response = await GET(new Request("http://localhost/api/search/global?q=px13&entity=product&limit=5"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.items).toHaveLength(1);
    expect(payload.data.items[0].entity).toBe("product");
    expect(vi.mocked(searchGlobal)).toHaveBeenCalled();
  });

  it("returns authorization response when blocked", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      ) as never
    });

    const response = await GET(new Request("http://localhost/api/search/global?q=px13"));
    expect(response.status).toBe(403);
  });
});
