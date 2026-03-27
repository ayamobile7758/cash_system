import { GET } from "@/app/api/reports/advanced/export/route";
import { authorizeRequest } from "@/lib/api/common";
import { getReportBaseline } from "@/lib/api/reports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildAdvancedReportWorkbookBuffer } from "@/lib/reports/export";

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
  buildAdvancedReportWorkbookBuffer: vi.fn(),
  buildAdvancedReportWorkbookFilename: vi.fn(() => "aya-advanced-reports-2026-03-01_to_2026-03-31.xlsx")
}));

describe("GET /api/reports/advanced/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        expense_total: 0,
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
      snapshots: [],
      advancedReport: {
        currentPeriod: {
          sales_total: 0,
          total_returns: 0,
          net_sales: 0,
          expense_total: 0,
          purchase_total: 0,
          topup_profit: 0,
          maintenance_revenue: 0,
          net_profit: 0,
          invoice_count: 0,
          snapshot_count: 0
        },
        comparePeriod: null,
        trend: [],
        breakdown: [],
        delta: {
          sales_total: 0,
          net_profit: 0,
          expense_total: 0,
          invoice_count: 0
        }
      }
    });
    vi.mocked(buildAdvancedReportWorkbookBuffer).mockResolvedValue(Buffer.from("xlsx"));

    const response = await GET(
      new Request(
        "http://localhost/api/reports/advanced/export?from_date=2026-03-01&to_date=2026-03-31&group_by=day&dimension=account"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(response.headers.get("content-disposition")).toContain("aya-advanced-reports-2026-03-01_to_2026-03-31.xlsx");
    expect(vi.mocked(buildAdvancedReportWorkbookBuffer)).toHaveBeenCalled();
  });

  it("returns 400 when the export exceeds the configured limit", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {}
    } as never);
    vi.mocked(getSupabaseAdminClient).mockReturnValue({} as never);
    vi.mocked(getReportBaseline).mockResolvedValue({
      salesHistory: { data: [], total_count: 5001, page: 1, page_size: 20 },
      salesSummary: { total_sales: 0, invoice_count: 0, cancelled_count: 0 },
      debtReport: { total_outstanding: 0, customers: [] },
      accountReport: { accounts: [] },
      inventoryReport: { low_stock_count: 0, products: [] },
      profitReport: {
        snapshot_count: 0,
        snapshot_net_sales: 0,
        snapshot_net_profit: 0,
        expense_total: 0,
        return_total: 0,
        purchase_total: 0,
        topup_amount: 0,
        topup_profit: 0,
        maintenance_delivered_count: 0,
        maintenance_revenue: 0
      },
      returnsReport: { total_returns: 0, return_count: 0, reasons: [], entries: [] },
      accountMovementReport: { total_movements: 5000, entries: [], summaries: [] },
      maintenanceReport: { open_count: 0, ready_count: 0, delivered_count: 0, delivered_revenue: 0, jobs: [] },
      snapshots: [],
      advancedReport: {
        currentPeriod: {
          sales_total: 0,
          total_returns: 0,
          net_sales: 0,
          expense_total: 0,
          purchase_total: 0,
          topup_profit: 0,
          maintenance_revenue: 0,
          net_profit: 0,
          invoice_count: 0,
          snapshot_count: 0
        },
        comparePeriod: null,
        trend: [],
        breakdown: [],
        delta: {
          sales_total: 0,
          net_profit: 0,
          expense_total: 0,
          invoice_count: 0
        }
      }
    });

    const response = await GET(
      new Request(
        "http://localhost/api/reports/advanced/export?from_date=2026-03-01&to_date=2026-03-31&group_by=day&dimension=account"
      )
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("ERR_EXPORT_TOO_LARGE");
  });
});
