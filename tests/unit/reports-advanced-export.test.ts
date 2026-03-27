// @vitest-environment node

import {
  buildAdvancedReportWorkbookBuffer,
  buildAdvancedReportWorkbookFilename
} from "@/lib/reports/export";
import { readWorkbookRows } from "@/lib/spreadsheet-core";
import type { ReportBaseline, SalesHistoryFilters } from "@/lib/api/reports";

describe("advanced reports workbook export", () => {
  const filters: SalesHistoryFilters = {
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    compareFromDate: "2026-02-01",
    compareToDate: "2026-02-28",
    groupBy: "week",
    dimension: "supplier",
    page: 1,
    pageSize: 20
  };

  const reportBaseline = {
    salesHistory: { data: [], total_count: 0, page: 1, page_size: 20 },
    salesSummary: { total_sales: 140, invoice_count: 2, cancelled_count: 0 },
    debtReport: { total_outstanding: 0, customers: [] },
    accountReport: { accounts: [] },
    inventoryReport: { low_stock_count: 0, products: [] },
    profitReport: {
      snapshot_count: 1,
      snapshot_net_sales: 120,
      snapshot_net_profit: 41,
      expense_total: 12,
      return_total: 20,
      purchase_total: 40,
      topup_amount: 50,
      topup_profit: 5,
      maintenance_delivered_count: 1,
      maintenance_revenue: 18
    },
    returnsReport: { total_returns: 20, return_count: 1, reasons: [], entries: [] },
    accountMovementReport: { total_movements: 0, entries: [], summaries: [] },
    maintenanceReport: { open_count: 0, ready_count: 0, delivered_count: 1, delivered_revenue: 18, jobs: [] },
    snapshots: [],
    advancedReport: {
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
      comparePeriod: {
        sales_total: 100,
        total_returns: 10,
        net_sales: 90,
        expense_total: 8,
        purchase_total: 20,
        topup_profit: 2,
        maintenance_revenue: 10,
        net_profit: 24,
        invoice_count: 1,
        snapshot_count: 1
      },
      trend: [
        {
          bucket: "2026-03-03",
          sales_total: 40,
          expense_total: 6,
          net_profit: 12
        }
      ],
      breakdown: [
        {
          label: "Supplier A",
          amount: 40,
          secondary_amount: 5,
          item_count: 2
        }
      ],
      delta: {
        sales_total: 40,
        net_profit: 17,
        expense_total: 4,
        invoice_count: 1
      }
    }
  } satisfies ReportBaseline;

  it("creates an advanced workbook with compare and breakdown sheets", () => {
    const buffer = buildAdvancedReportWorkbookBuffer({
      filters,
      reportBaseline,
      generatedAt: "2026-03-11T09:00:00.000Z"
    });

    const workbook = readWorkbookRows(buffer);
    expect(Object.keys(workbook)).toEqual(["Summary", "Trend", "Breakdown", "Sales History", "Account Movements", "Snapshots"]);

    const summaryRows = workbook.Summary;
    expect(summaryRows[1]?.[1]).toBe("11/03/2026 12:00");
    expect(summaryRows[7]?.[1]).toBe(140);
    expect(summaryRows[7]?.[2]).toBe(100);
    expect(summaryRows[7]?.[3]).toBe(40);

    const breakdownRows = workbook.Breakdown;
    expect(breakdownRows[1]).toEqual(["Supplier A", 40, 5, 2]);
  });

  it("builds a stable advanced filename", () => {
    expect(buildAdvancedReportWorkbookFilename(filters)).toBe("aya-advanced-reports-2026-03-01_to_2026-03-31.xlsx");
  });
});
