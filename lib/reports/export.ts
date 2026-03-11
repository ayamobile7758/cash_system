import * as XLSX from "xlsx";
import type { ReportBaseline, SalesHistoryFilters } from "@/lib/api/reports";

type ReportExportPayload = {
  filters: SalesHistoryFilters;
  reportBaseline: ReportBaseline;
  generatedAt: string;
};

function setColumnWidths(sheet: XLSX.WorkSheet, rows: Array<Array<string | number | null | undefined>>) {
  const colWidths: Array<{ wch: number }> = [];

  for (const row of rows) {
    row.forEach((value, index) => {
      const nextWidth = String(value ?? "").length + 2;
      colWidths[index] = {
        wch: Math.min(Math.max(colWidths[index]?.wch ?? 10, nextWidth), 32)
      };
    });
  }

  sheet["!cols"] = colWidths;
}

function makeSheet(rows: Array<Array<string | number | null | undefined>>) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  setColumnWidths(sheet, rows);
  return sheet;
}

function addObjectSheet<T extends Record<string, string | number | null | undefined>>(
  workbook: XLSX.WorkBook,
  name: string,
  columns: Array<{ key: string; label: string }>,
  rows: T[]
) {
  const aoa: Array<Array<string | number | null | undefined>> = [columns.map((column) => column.label)];

  for (const row of rows) {
    aoa.push(columns.map((column) => row[column.key]));
  }

  XLSX.utils.book_append_sheet(workbook, makeSheet(aoa), name);
}

export function buildReportWorkbookFilename(filters: SalesHistoryFilters) {
  return `aya-reports-${filters.fromDate}_to_${filters.toDate}.xlsx`;
}

export function buildReportWorkbookBuffer({
  filters,
  reportBaseline,
  generatedAt
}: ReportExportPayload) {
  const workbook = XLSX.utils.book_new();

  const summaryRows: Array<Array<string | number | null | undefined>> = [
    ["تقرير", "القيمة"],
    ["تاريخ التوليد", generatedAt],
    ["من تاريخ", filters.fromDate],
    ["إلى تاريخ", filters.toDate],
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
  ];
  XLSX.utils.book_append_sheet(workbook, makeSheet(summaryRows), "Summary");

  const profitRows: Array<Array<string | number | null | undefined>> = [
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
  ];
  XLSX.utils.book_append_sheet(workbook, makeSheet(profitRows), "Profit");

  addObjectSheet(workbook, "Sales History", [
    { key: "invoice_number", label: "رقم الفاتورة" },
    { key: "invoice_date", label: "التاريخ" },
    { key: "created_by_name", label: "المستخدم" },
    { key: "pos_terminal_code", label: "الجهاز" },
    { key: "status", label: "الحالة" },
    { key: "total", label: "الإجمالي" }
  ], reportBaseline.salesHistory.data.map((entry) => ({
    invoice_number: entry.invoice_number,
    invoice_date: entry.invoice_date,
    created_by_name: entry.created_by_name ?? "غير معروف",
    pos_terminal_code: entry.pos_terminal_code ?? "غير محدد",
    status: entry.status,
    total: entry.total
  })));

  addObjectSheet(
    workbook,
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
      return_date: entry.return_date,
      return_type: entry.return_type,
      invoice_number: entry.invoice_number ?? "غير معروف",
      reason: entry.reason,
      total_amount: entry.total_amount,
      created_by_name: entry.created_by_name ?? "غير معروف"
    }))
  );

  addObjectSheet(workbook, "Return Reasons", [
    { key: "reason", label: "السبب" },
    { key: "count", label: "العدد" },
    { key: "total_amount", label: "إجمالي القيمة" }
  ], reportBaseline.returnsReport.reasons.map((entry) => ({
    reason: entry.reason,
    count: entry.count,
    total_amount: entry.total_amount
  })));

  addObjectSheet(
    workbook,
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
      entry_date: entry.entry_date,
      account_name: entry.account_name,
      account_scope: entry.account_scope,
      entry_type: entry.entry_type,
      adjustment_direction: entry.adjustment_direction ?? "-",
      reference_type: entry.reference_type ?? "-",
      amount: entry.amount,
      description: entry.description,
      created_by_name: entry.created_by_name ?? "غير معروف"
    }))
  );

  addObjectSheet(
    workbook,
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
  );

  addObjectSheet(workbook, "Debt Customers", [
    { key: "name", label: "العميل" },
    { key: "phone", label: "الهاتف" },
    { key: "current_balance", label: "الرصيد الحالي" },
    { key: "credit_limit", label: "الحد" },
    { key: "due_date_days", label: "أجل السداد بالأيام" }
  ], reportBaseline.debtReport.customers.map((entry) => ({
    name: entry.name,
    phone: entry.phone ?? "",
    current_balance: entry.current_balance,
    credit_limit: entry.credit_limit,
    due_date_days: entry.due_date_days ?? ""
  })));

  addObjectSheet(workbook, "Inventory", [
    { key: "name", label: "المنتج" },
    { key: "stock_quantity", label: "الكمية الحالية" },
    { key: "min_stock_level", label: "حد التنبيه" },
    { key: "is_active", label: "نشط" }
  ], reportBaseline.inventoryReport.products.map((entry) => ({
    name: entry.name,
    stock_quantity: entry.stock_quantity,
    min_stock_level: entry.min_stock_level,
    is_active: entry.is_active ? "yes" : "no"
  })));

  addObjectSheet(
    workbook,
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
      job_date: entry.job_date,
      customer_name: entry.customer_name,
      device_type: entry.device_type,
      status: entry.status,
      final_amount: entry.final_amount ?? "",
      created_by_name: entry.created_by_name ?? "غير معروف"
    }))
  );

  addObjectSheet(
    workbook,
    "Snapshots",
    [
      { key: "snapshot_date", label: "تاريخ اللقطة" },
      { key: "net_sales", label: "صافي المبيعات" },
      { key: "net_profit", label: "صافي الربح" },
      { key: "invoice_count", label: "عدد الفواتير" },
      { key: "created_at", label: "وقت الإنشاء" }
    ],
    reportBaseline.snapshots.map((entry) => ({
      snapshot_date: entry.snapshot_date,
      net_sales: entry.net_sales,
      net_profit: entry.net_profit,
      invoice_count: entry.invoice_count,
      created_at: entry.created_at
    }))
  );

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer"
  }) as Buffer;
}

export function buildAdvancedReportWorkbookFilename(filters: SalesHistoryFilters) {
  return `aya-advanced-reports-${filters.fromDate}_to_${filters.toDate}.xlsx`;
}

export function buildAdvancedReportWorkbookBuffer({
  filters,
  reportBaseline,
  generatedAt
}: ReportExportPayload) {
  const workbook = XLSX.utils.book_new();
  const { advancedReport } = reportBaseline;

  const summaryRows: Array<Array<string | number | null | undefined>> = [
    ["التقرير", "الحالي", "المقارنة", "الفرق"],
    ["تاريخ التوليد", generatedAt, "", ""],
    ["من تاريخ", filters.fromDate, filters.compareFromDate ?? "-", ""],
    ["إلى تاريخ", filters.toDate, filters.compareToDate ?? "-", ""],
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
      roundExportMetric(
        advancedReport.currentPeriod.total_returns - (advancedReport.comparePeriod?.total_returns ?? 0)
      )
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
      roundExportMetric(
        advancedReport.currentPeriod.topup_profit - (advancedReport.comparePeriod?.topup_profit ?? 0)
      )
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
      roundExportMetric(
        advancedReport.currentPeriod.snapshot_count - (advancedReport.comparePeriod?.snapshot_count ?? 0)
      )
    ]
  ];
  XLSX.utils.book_append_sheet(workbook, makeSheet(summaryRows), "Summary");

  addObjectSheet(
    workbook,
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
  );

  addObjectSheet(
    workbook,
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
  );

  addObjectSheet(
    workbook,
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
      invoice_date: entry.invoice_date,
      created_by_name: entry.created_by_name ?? "غير معروف",
      pos_terminal_code: entry.pos_terminal_code ?? "غير محدد",
      status: entry.status,
      total: entry.total
    }))
  );

  addObjectSheet(
    workbook,
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
      entry_date: entry.entry_date,
      account_name: entry.account_name,
      entry_type: entry.adjustment_direction ? `${entry.entry_type}:${entry.adjustment_direction}` : entry.entry_type,
      reference_type: entry.reference_type ?? "-",
      amount: entry.amount,
      description: entry.description
    }))
  );

  addObjectSheet(
    workbook,
    "Snapshots",
    [
      { key: "snapshot_date", label: "تاريخ اللقطة" },
      { key: "net_sales", label: "صافي المبيعات" },
      { key: "net_profit", label: "صافي الربح" },
      { key: "invoice_count", label: "عدد الفواتير" },
      { key: "created_at", label: "وقت الإنشاء" }
    ],
    reportBaseline.snapshots.map((entry) => ({
      snapshot_date: entry.snapshot_date,
      net_sales: entry.net_sales,
      net_profit: entry.net_profit,
      invoice_count: entry.invoice_count,
      created_at: entry.created_at
    }))
  );

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer"
  }) as Buffer;
}

function roundExportMetric(value: number) {
  return Number(value.toFixed(3));
}
