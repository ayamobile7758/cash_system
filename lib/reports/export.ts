import type { ReportBaseline, SalesHistoryFilters } from "@/lib/api/reports";
import {
  buildWorkbookBuffer,
  type SpreadsheetCell,
  type SpreadsheetRows,
  type SpreadsheetSheet
} from "../spreadsheet-core";
import { formatDate, formatDateTime } from "@/lib/utils/formatters";

type ReportExportPayload = {
  filters: SalesHistoryFilters;
  reportBaseline: ReportBaseline;
  generatedAt: string;
};

function buildSheet(name: string, rows: SpreadsheetRows): SpreadsheetSheet {
  return { name, rows };
}

function buildObjectSheet<T extends Record<string, SpreadsheetCell>>(
  name: string,
  columns: Array<{ key: string; label: string }>,
  rows: T[]
) {
  return buildSheet(name, [columns.map((column) => column.label), ...rows.map((row) => columns.map((column) => row[column.key]))]);
}

export function buildReportWorkbookFilename(filters: SalesHistoryFilters) {
  return `aya-reports-${filters.fromDate}_to_${filters.toDate}.xlsx`;
}

export function buildReportWorkbookBuffer({
  filters,
  reportBaseline,
  generatedAt
}: ReportExportPayload) {
  const sheets: SpreadsheetSheet[] = [
    buildSheet("Summary", [
      ["تقرير", "القيمة"],
      ["تاريخ التوليد", formatDateTime(generatedAt)],
      ["من تاريخ", formatDate(filters.fromDate)],
      ["إلى تاريخ", formatDate(filters.toDate)],
      ["المستخدم", filters.createdBy ?? "الكل"],
      ["الحالة", filters.status ?? "الكل"],
      ["الجهاز", filters.posTerminalCode ?? "الكل"],
      [],
      ["إجمالي المبيعات", reportBaseline.salesSummary.total_sales],
      ["عدد الفواتير النشطة", reportBaseline.salesSummary.invoice_count],
      ["عدد الفواتير الملغاة", reportBaseline.salesSummary.cancelled_count],
      ["إجمالي الديون الحالية", reportBaseline.debtReport.total_outstanding],
      ["عدد المنتجات منخفضة المخزون", reportBaseline.inventoryReport.low_stock_count],
      ["عدد حركات الحسابات", reportBaseline.accountMovementReport.total_movements],
      ["عدد المرتجعات", reportBaseline.returnsReport.return_count],
      ["إجمالي المصروفات", reportBaseline.profitReport.expense_total],
      ["صافي المبيعات من اللقطات", reportBaseline.profitReport.snapshot_net_sales],
      ["صافي الربح من اللقطات", reportBaseline.profitReport.snapshot_net_profit],
      ["ربح الشحن", reportBaseline.profitReport.topup_profit],
      ["إيراد الصيانة المسلم", reportBaseline.profitReport.maintenance_revenue]
    ]),
    buildSheet("Profit", [
      ["المؤشر", "القيمة"],
      ["عدد اللقطات", reportBaseline.profitReport.snapshot_count],
      ["صافي المبيعات من اللقطات", reportBaseline.profitReport.snapshot_net_sales],
      ["صافي الربح من اللقطات", reportBaseline.profitReport.snapshot_net_profit],
      ["إجمالي المصروفات", reportBaseline.profitReport.expense_total],
      ["إجمالي المرتجعات", reportBaseline.profitReport.return_total],
      ["إجمالي المشتريات", reportBaseline.profitReport.purchase_total],
      ["إجمالي الشحن", reportBaseline.profitReport.topup_amount],
      ["ربح الشحن", reportBaseline.profitReport.topup_profit],
      ["عمليات الصيانة المسلمة", reportBaseline.profitReport.maintenance_delivered_count],
      ["إيراد الصيانة", reportBaseline.profitReport.maintenance_revenue]
    ]),
    buildObjectSheet(
      "Sales History",
      [
        { key: "invoice_number", label: "رقم الفاتورة" },
        { key: "invoice_date", label: "التاريخ" },
        { key: "created_by_name", label: "المستخدم" },
        { key: "pos_terminal_code", label: "الجهاز" },
        { key: "status", label: "الحالة" },
        { key: "total", label: "الإجمالي" }
      ],
      reportBaseline.salesHistory.data.map((entry) => ({
        invoice_number: entry.invoice_number,
        invoice_date: formatDate(entry.invoice_date),
        created_by_name: entry.created_by_name ?? "غير معروف",
        pos_terminal_code: entry.pos_terminal_code ?? "غير محدد",
        status: entry.status,
        total: entry.total
      }))
    ),
    buildObjectSheet(
      "Returns",
      [
        { key: "return_number", label: "رقم المرتجع" },
        { key: "return_date", label: "التاريخ" },
        { key: "return_type", label: "النوع" },
        { key: "invoice_number", label: "الفاتورة الأصلية" },
        { key: "reason", label: "السبب" },
        { key: "total_amount", label: "الإجمالي" },
        { key: "created_by_name", label: "المستخدم" }
      ],
      reportBaseline.returnsReport.entries.map((entry) => ({
        return_number: entry.return_number,
        return_date: formatDate(entry.return_date),
        return_type: entry.return_type,
        invoice_number: entry.invoice_number ?? "غير معروف",
        reason: entry.reason,
        total_amount: entry.total_amount,
        created_by_name: entry.created_by_name ?? "غير معروف"
      }))
    ),
    buildObjectSheet(
      "Return Reasons",
      [
        { key: "reason", label: "السبب" },
        { key: "count", label: "العدد" },
        { key: "total_amount", label: "إجمالي القيمة" }
      ],
      reportBaseline.returnsReport.reasons.map((entry) => ({
        reason: entry.reason,
        count: entry.count,
        total_amount: entry.total_amount
      }))
    ),
    buildObjectSheet(
      "Account Movements",
      [
        { key: "entry_date", label: "التاريخ" },
        { key: "account_name", label: "الحساب" },
        { key: "account_scope", label: "النطاق" },
        { key: "entry_type", label: "نوع القيد" },
        { key: "adjustment_direction", label: "اتجاه التسوية" },
        { key: "reference_type", label: "نوع المرجع" },
        { key: "amount", label: "القيمة" },
        { key: "description", label: "الوصف" },
        { key: "created_by_name", label: "المستخدم" }
      ],
      reportBaseline.accountMovementReport.entries.map((entry) => ({
        entry_date: formatDate(entry.entry_date),
        account_name: entry.account_name,
        account_scope: entry.account_scope,
        entry_type: entry.entry_type,
        adjustment_direction: entry.adjustment_direction ?? "-",
        reference_type: entry.reference_type ?? "-",
        amount: entry.amount,
        description: entry.description,
        created_by_name: entry.created_by_name ?? "غير معروف"
      }))
    ),
    buildObjectSheet(
      "Accounts",
      [
        { key: "account_name", label: "الحساب" },
        { key: "current_balance", label: "الرصيد الحالي" },
        { key: "movement_count", label: "عدد الحركات" },
        { key: "income_total", label: "الوارد" },
        { key: "expense_total", label: "الصادر" },
        { key: "adjustment_increase_total", label: "زيادة التسويات" },
        { key: "adjustment_decrease_total", label: "خصم التسويات" }
      ],
      reportBaseline.accountMovementReport.summaries.map((entry) => ({
        account_name: entry.account_name,
        current_balance: entry.current_balance,
        movement_count: entry.movement_count,
        income_total: entry.income_total,
        expense_total: entry.expense_total,
        adjustment_increase_total: entry.adjustment_increase_total,
        adjustment_decrease_total: entry.adjustment_decrease_total
      }))
    ),
    buildObjectSheet(
      "Debt Customers",
      [
        { key: "name", label: "العميل" },
        { key: "phone", label: "الهاتف" },
        { key: "current_balance", label: "الرصيد الحالي" },
        { key: "credit_limit", label: "الحد" },
        { key: "due_date_days", label: "أجل السداد بالأيام" }
      ],
      reportBaseline.debtReport.customers.map((entry) => ({
        name: entry.name,
        phone: entry.phone ?? "",
        current_balance: entry.current_balance,
        credit_limit: entry.credit_limit,
        due_date_days: entry.due_date_days ?? ""
      }))
    ),
    buildObjectSheet(
      "Inventory",
      [
        { key: "name", label: "المنتج" },
        { key: "stock_quantity", label: "الكمية الحالية" },
        { key: "min_stock_level", label: "حد التنبيه" },
        { key: "is_active", label: "نشط" }
      ],
      reportBaseline.inventoryReport.products.map((entry) => ({
        name: entry.name,
        stock_quantity: entry.stock_quantity,
        min_stock_level: entry.min_stock_level,
        is_active: entry.is_active ? "yes" : "no"
      }))
    ),
    buildObjectSheet(
      "Maintenance",
      [
        { key: "job_number", label: "رقم الطلب" },
        { key: "job_date", label: "التاريخ" },
        { key: "customer_name", label: "العميل" },
        { key: "device_type", label: "الجهاز" },
        { key: "status", label: "الحالة" },
        { key: "final_amount", label: "المبلغ النهائي" },
        { key: "created_by_name", label: "المستخدم" }
      ],
      reportBaseline.maintenanceReport.jobs.map((entry) => ({
        job_number: entry.job_number,
        job_date: formatDate(entry.job_date),
        customer_name: entry.customer_name,
        device_type: entry.device_type,
        status: entry.status,
        final_amount: entry.final_amount ?? "",
        created_by_name: entry.created_by_name ?? "غير معروف"
      }))
    ),
    buildObjectSheet(
      "Snapshots",
      [
        { key: "snapshot_date", label: "تاريخ اللقطة" },
        { key: "net_sales", label: "صافي المبيعات" },
        { key: "net_profit", label: "صافي الربح" },
        { key: "invoice_count", label: "عدد الفواتير" },
        { key: "created_at", label: "وقت الإنشاء" }
      ],
      reportBaseline.snapshots.map((entry) => ({
        snapshot_date: formatDate(entry.snapshot_date),
        net_sales: entry.net_sales,
        net_profit: entry.net_profit,
        invoice_count: entry.invoice_count,
        created_at: formatDateTime(entry.created_at)
      }))
    )
  ];

  return buildWorkbookBuffer(sheets);
}

export function buildAdvancedReportWorkbookFilename(filters: SalesHistoryFilters) {
  return `aya-advanced-reports-${filters.fromDate}_to_${filters.toDate}.xlsx`;
}

export function buildAdvancedReportWorkbookBuffer({
  filters,
  reportBaseline,
  generatedAt
}: ReportExportPayload) {
  const { advancedReport } = reportBaseline;

  return buildWorkbookBuffer([
    buildSheet("Summary", [
      ["التقرير", "الحالي", "المقارنة", "الفرق"],
      ["تاريخ التوليد", formatDateTime(generatedAt), "", ""],
      ["من تاريخ", formatDate(filters.fromDate), filters.compareFromDate ? formatDate(filters.compareFromDate) : "-", ""],
      ["إلى تاريخ", formatDate(filters.toDate), filters.compareToDate ? formatDate(filters.compareToDate) : "-", ""],
      ["التجميع", filters.groupBy ?? "day", "", ""],
      ["البعد", filters.dimension ?? "account", "", ""],
      [],
      [
        "إجمالي المبيعات",
        advancedReport.currentPeriod.sales_total,
        advancedReport.comparePeriod?.sales_total ?? "",
        advancedReport.delta.sales_total
      ],
      [
        "إجمالي المرتجعات",
        advancedReport.currentPeriod.total_returns,
        advancedReport.comparePeriod?.total_returns ?? "",
        roundExportMetric(advancedReport.currentPeriod.total_returns - (advancedReport.comparePeriod?.total_returns ?? 0))
      ],
      [
        "صافي المبيعات",
        advancedReport.currentPeriod.net_sales,
        advancedReport.comparePeriod?.net_sales ?? "",
        roundExportMetric(advancedReport.currentPeriod.net_sales - (advancedReport.comparePeriod?.net_sales ?? 0))
      ],
      [
        "إجمالي المصروفات",
        advancedReport.currentPeriod.expense_total,
        advancedReport.comparePeriod?.expense_total ?? "",
        advancedReport.delta.expense_total
      ],
      [
        "إجمالي المشتريات",
        advancedReport.currentPeriod.purchase_total,
        advancedReport.comparePeriod?.purchase_total ?? "",
        roundExportMetric(
          advancedReport.currentPeriod.purchase_total - (advancedReport.comparePeriod?.purchase_total ?? 0)
        )
      ],
      [
        "ربح الشحن",
        advancedReport.currentPeriod.topup_profit,
        advancedReport.comparePeriod?.topup_profit ?? "",
        roundExportMetric(advancedReport.currentPeriod.topup_profit - (advancedReport.comparePeriod?.topup_profit ?? 0))
      ],
      [
        "إيراد الصيانة",
        advancedReport.currentPeriod.maintenance_revenue,
        advancedReport.comparePeriod?.maintenance_revenue ?? "",
        roundExportMetric(
          advancedReport.currentPeriod.maintenance_revenue - (advancedReport.comparePeriod?.maintenance_revenue ?? 0)
        )
      ],
      [
        "صافي الربح",
        advancedReport.currentPeriod.net_profit,
        advancedReport.comparePeriod?.net_profit ?? "",
        advancedReport.delta.net_profit
      ],
      [
        "عدد الفواتير",
        advancedReport.currentPeriod.invoice_count,
        advancedReport.comparePeriod?.invoice_count ?? "",
        advancedReport.delta.invoice_count
      ],
      [
        "عدد اللقطات",
        advancedReport.currentPeriod.snapshot_count,
        advancedReport.comparePeriod?.snapshot_count ?? "",
        roundExportMetric(advancedReport.currentPeriod.snapshot_count - (advancedReport.comparePeriod?.snapshot_count ?? 0))
      ]
    ]),
    buildObjectSheet(
      "Trend",
      [
        { key: "bucket", label: "الفترة" },
        { key: "sales_total", label: "إجمالي المبيعات" },
        { key: "expense_total", label: "إجمالي المصروفات" },
        { key: "net_profit", label: "صافي الربح" }
      ],
      advancedReport.trend.map((entry) => ({
        bucket: entry.bucket,
        sales_total: entry.sales_total,
        expense_total: entry.expense_total,
        net_profit: entry.net_profit
      }))
    ),
    buildObjectSheet(
      "Breakdown",
      [
        { key: "label", label: "البند" },
        { key: "amount", label: "القيمة الأساسية" },
        { key: "secondary_amount", label: "القيمة الثانوية" },
        { key: "item_count", label: "عدد العناصر" }
      ],
      advancedReport.breakdown.map((entry) => ({
        label: entry.label,
        amount: entry.amount,
        secondary_amount: entry.secondary_amount,
        item_count: entry.item_count
      }))
    ),
    buildObjectSheet(
      "Sales History",
      [
        { key: "invoice_number", label: "رقم الفاتورة" },
        { key: "invoice_date", label: "التاريخ" },
        { key: "created_by_name", label: "المستخدم" },
        { key: "pos_terminal_code", label: "الجهاز" },
        { key: "status", label: "الحالة" },
        { key: "total", label: "الإجمالي" }
      ],
      reportBaseline.salesHistory.data.map((entry) => ({
        invoice_number: entry.invoice_number,
        invoice_date: formatDate(entry.invoice_date),
        created_by_name: entry.created_by_name ?? "غير معروف",
        pos_terminal_code: entry.pos_terminal_code ?? "غير محدد",
        status: entry.status,
        total: entry.total
      }))
    ),
    buildObjectSheet(
      "Account Movements",
      [
        { key: "entry_date", label: "التاريخ" },
        { key: "account_name", label: "الحساب" },
        { key: "entry_type", label: "نوع القيد" },
        { key: "reference_type", label: "المرجع" },
        { key: "amount", label: "القيمة" },
        { key: "description", label: "الوصف" }
      ],
      reportBaseline.accountMovementReport.entries.map((entry) => ({
        entry_date: formatDate(entry.entry_date),
        account_name: entry.account_name,
        entry_type: entry.adjustment_direction ? `${entry.entry_type}:${entry.adjustment_direction}` : entry.entry_type,
        reference_type: entry.reference_type ?? "-",
        amount: entry.amount,
        description: entry.description
      }))
    ),
    buildObjectSheet(
      "Snapshots",
      [
        { key: "snapshot_date", label: "تاريخ اللقطة" },
        { key: "net_sales", label: "صافي المبيعات" },
        { key: "net_profit", label: "صافي الربح" },
        { key: "invoice_count", label: "عدد الفواتير" },
        { key: "created_at", label: "وقت الإنشاء" }
      ],
      reportBaseline.snapshots.map((entry) => ({
        snapshot_date: formatDate(entry.snapshot_date),
        net_sales: entry.net_sales,
        net_profit: entry.net_profit,
        invoice_count: entry.invoice_count,
        created_at: formatDateTime(entry.created_at)
      }))
    )
  ]);
}

function roundExportMetric(value: number) {
  return Number(value.toFixed(3));
}
