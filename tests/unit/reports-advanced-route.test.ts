import { GET } from "@/app/api/reports/advanced/route";
import { authorizeRequest } from "@/lib/api/common";
import { getAdvancedReportData } from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

vi.mock("@/lib/api/reports", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/reports")>("@/lib/api/reports");
  return {
    ...actual,
    getAdvancedReportData: vi.fn()
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn()
}));

describe("GET /api/reports/advanced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the session is missing", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { success: false, error: { code: "ERR_API_SESSION_INVALID", message: "invalid" } },
        { status: 401 }
      ) as never
    });

    const response = await GET(new Request("http://localhost/api/reports/advanced"));
    expect(response.status).toBe(401);
  });

  it("returns advanced report data for admins", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(getSupabaseAdminClient).mockReturnValue({} as never);
    vi.mocked(getAdvancedReportData).mockResolvedValue({
      currentPeriod: {
        sales_total: 140,
        total_returns: 20,
        net_sales: 120,
        expense_total: 12,
        purchase_total: 40,
        topup_profit: 5,
        maintenance_revenue: 18,
        net_profit: 41,
        invoice_count: 2,
        snapshot_count: 1
      },
      comparePeriod: null,
      trend: [
        {
          bucket: "2026-03-10",
          sales_total: 140,
          expense_total: 12,
          net_profit: 41
        }
      ],
      breakdown: [],
      delta: {
        sales_total: 140,
        net_profit: 41,
        expense_total: 12,
        invoice_count: 2
      }
    });

    const response = await GET(
      new Request(
        "http://localhost/api/reports/advanced?from_date=2026-03-01&to_date=2026-03-31&group_by=day&dimension=account"
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.current_period.sales_total).toBe(140);
    expect(vi.mocked(getAdvancedReportData)).toHaveBeenCalled();
  });
});
