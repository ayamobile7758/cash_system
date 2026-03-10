import { GET } from "@/app/api/reports/export/route";
import { authorizeRequest } from "@/lib/api/common";
import { getReportBaseline } from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildReportWorkbookBuffer } from "@/lib/reports/export";

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
    getReportBaseline: vi.fn()
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn()
}));

vi.mock("@/lib/reports/export", () => ({
  buildReportWorkbookBuffer: vi.fn(),
  buildReportWorkbookFilename: vi.fn(() => "aya-reports-2026-03-01_to_2026-03-10.xlsx")
}));

describe("GET /api/reports/export", () => {
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

    const response = await GET(new Request("http://localhost/api/reports/export"));
    expect(response.status).toBe(401);
  });

  it("returns an xlsx attachment for authorized admins", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);

    vi.mocked(getSupabaseAdminClient).mockReturnValue({} as never);
    vi.mocked(getReportBaseline).mockResolvedValue({
      salesHistory: { data: [], total_count: 0, page: 1, page_size: 20 },
      salesSummary: { total_sales: 0, invoice_count: 0, cancelled_count: 0 },
      debtReport: { total_outstanding: 0, customers: [] },
      accountReport: { accounts: [] },
      inventoryReport: { low_stock_count: 0, products: [] },
      profitReport: {
        snapshot_count: 0,
        snapshot_net_sales: 0,
        snapshot_net_profit: 0,
        return_total: 0,
        purchase_total: 0,
        topup_amount: 0,
        topup_profit: 0,
        maintenance_delivered_count: 0,
        maintenance_revenue: 0
      },
      returnsReport: { total_returns: 0, return_count: 0, reasons: [], entries: [] },
      accountMovementReport: { total_movements: 0, entries: [], summaries: [] },
      maintenanceReport: { open_count: 0, ready_count: 0, delivered_count: 0, delivered_revenue: 0, jobs: [] },
      snapshots: []
    });
    vi.mocked(buildReportWorkbookBuffer).mockReturnValue(Buffer.from("xlsx"));

    const response = await GET(
      new Request("http://localhost/api/reports/export?from_date=2026-03-01&to_date=2026-03-10")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(response.headers.get("content-disposition")).toContain("aya-reports-2026-03-01_to_2026-03-10.xlsx");
    expect(vi.mocked(getReportBaseline)).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        fromDate: "2026-03-01",
        toDate: "2026-03-10"
      }),
      {
        role: "admin",
        userId: "admin-1"
      }
    );
  });
});
