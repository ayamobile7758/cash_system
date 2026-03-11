import { GET } from "@/app/api/alerts/summary/route";
import { authorizeRequest } from "@/lib/api/common";
import { getAlertsSummary } from "@/lib/api/search";

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
    getAlertsSummary: vi.fn()
  };
});

describe("GET /api/alerts/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns admin alert summary", async () => {
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
    vi.mocked(getAlertsSummary).mockResolvedValue({
      low_stock: 1,
      overdue_debts: 2,
      reconciliation_drift: 0,
      maintenance_ready: 1,
      unread_notifications: 4
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.low_stock).toBe(1);
    expect(payload.data.unread_notifications).toBe(4);
  });

  it("returns authorization response when blocked", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      ) as never
    });

    const response = await GET();
    expect(response.status).toBe(403);
  });
});
