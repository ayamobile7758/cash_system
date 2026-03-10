import * as XLSX from "xlsx";
import { buildReportWorkbookBuffer, buildReportWorkbookFilename } from "@/lib/reports/export";
import type { ReportBaseline, SalesHistoryFilters } from "@/lib/api/reports";

describe("reports workbook export", () => {
  const filters: SalesHistoryFilters = {
    fromDate: "2026-03-01",
    toDate: "2026-03-10",
    createdBy: "admin-1",
    status: "active",
    posTerminalCode: "POS-01",
    page: 1,
    pageSize: 20
  };

  const reportBaseline: ReportBaseline = {
    salesHistory: {
      data: [
        {
          invoice_id: "inv-1",
          invoice_number: "AYA-2026-00001",
          invoice_date: "2026-03-10",
          created_at: "2026-03-10T10:00:00Z",
          created_by: "admin-1",
          created_by_name: "أحمد",
          pos_terminal_code: "POS-01",
          total: 120,
          status: "active"
        }
      ],
      total_count: 1,
      page: 1,
      page_size: 20
    },
    salesSummary: {
      total_sales: 120,
      invoice_count: 1,
      cancelled_count: 0
    },
    debtReport: {
      total_outstanding: 30,
      customers: [
        {
          id: "customer-1",
          name: "عميل دين",
          phone: "0790000000",
          current_balance: 30,
          credit_limit: 100,
          due_date_days: 30
        }
      ]
    },
    accountReport: {
      accounts: [
        {
          id: "account-1",
          name: "الصندوق",
          current_balance: 50,
          type: "cash",
          module_scope: "core",
          is_active: true
        }
      ]
    },
    inventoryReport: {
      low_stock_count: 1,
      products: [
        {
          id: "product-1",
          name: "منتج",
          stock_quantity: 2,
          min_stock_level: 3,
          is_active: true
        }
      ]
    },
    profitReport: {
      snapshot_count: 1,
      snapshot_net_sales: 120,
      snapshot_net_profit: 45,
      return_total: 20,
      purchase_total: 40,
      topup_amount: 100,
      topup_profit: 3,
      maintenance_delivered_count: 1,
      maintenance_revenue: 18
    },
    returnsReport: {
      total_returns: 20,
      return_count: 1,
      reasons: [
        {
          reason: "مشكلة شاشة",
          count: 1,
          total_amount: 20
        }
      ],
      entries: [
        {
          return_id: "return-1",
          return_number: "AYA-2026-00001",
          return_date: "2026-03-10",
          return_type: "partial",
          invoice_number: "AYA-2026-00001",
          reason: "مشكلة شاشة",
          total_amount: 20,
          created_by_name: "أحمد"
        }
      ]
    },
    accountMovementReport: {
      total_movements: 2,
      entries: [
        {
          id: "ledger-1",
          entry_date: "2026-03-10",
          account_name: "الصندوق",
          account_scope: "core",
          entry_type: "income",
          adjustment_direction: null,
          reference_type: "invoice",
          reference_id: "inv-1",
          description: "بيع",
          amount: 120,
          created_by_name: "أحمد"
        }
      ],
      summaries: [
        {
          account_id: "account-1",
          account_name: "الصندوق",
          current_balance: 50,
          movement_count: 2,
          income_total: 120,
          expense_total: 40,
          adjustment_increase_total: 0,
          adjustment_decrease_total: 0
        }
      ]
    },
    maintenanceReport: {
      open_count: 0,
      ready_count: 0,
      delivered_count: 1,
      delivered_revenue: 18,
      jobs: [
        {
          job_id: "job-1",
          job_number: "AYA-2026-00001",
          job_date: "2026-03-10",
          customer_name: "محمد",
          device_type: "Samsung",
          status: "delivered",
          final_amount: 18,
          created_by_name: "أحمد"
        }
      ]
    },
    snapshots: [
      {
        id: "snapshot-1",
        snapshot_date: "2026-03-10",
        net_sales: 120,
        net_profit: 45,
        invoice_count: 1,
        created_at: "2026-03-10T12:00:00Z"
      }
    ]
  };

  it("creates a workbook with the expected sheets and headline values", () => {
    const buffer = buildReportWorkbookBuffer({
      filters,
      reportBaseline,
      generatedAt: "2026-03-10T15:00:00.000Z"
    });

    const workbook = XLSX.read(buffer, { type: "buffer" });
    expect(workbook.SheetNames).toEqual([
      "Summary",
      "Profit",
      "Sales History",
      "Returns",
      "Return Reasons",
      "Account Movements",
      "Accounts",
      "Debt Customers",
      "Inventory",
      "Maintenance",
      "Snapshots"
    ]);

    const summaryRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(workbook.Sheets.Summary, {
      header: 1
    });
    expect(summaryRows[1]?.[1]).toBe("2026-03-10T15:00:00.000Z");
    expect(summaryRows[8]?.[1]).toBe(120);

    const salesRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(workbook.Sheets["Sales History"], {
      header: 1
    });
    expect(salesRows[1]).toEqual(["AYA-2026-00001", "2026-03-10", "أحمد", "POS-01", "active", 120]);
  });

  it("builds a stable filename from filters", () => {
    expect(buildReportWorkbookFilename(filters)).toBe("aya-reports-2026-03-01_to_2026-03-10.xlsx");
  });
});
