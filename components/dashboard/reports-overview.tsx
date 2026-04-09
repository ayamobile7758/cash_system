"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReportsAdvancedCharts } from "@/components/dashboard/reports-advanced-charts";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import type { WorkspaceUserOption } from "@/lib/api/dashboard";
import type { ReportBaseline, SalesHistoryFilters } from "@/lib/api/reports";
import { formatCompactNumber, formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";

type ReportsOverviewProps = {
  filters: SalesHistoryFilters;
  users: WorkspaceUserOption[];
  terminals: string[];
  reportBaseline: ReportBaseline;
};

type ReportTab = "overview" | "sales-returns" | "accounts-operations";
type ExpandedFiltersState = Record<ReportTab, boolean>;
type ReportSectionLink = { href: string; label: string; tab: ReportTab | "shared" };

const STATUS_LABELS: Record<string, string> = {
  active: "نشطة",
  partially_returned: "مرتجع جزئي",
  returned: "مرتجعة",
  cancelled: "ملغاة",
  new: "جديدة",
  in_progress: "قيد الصيانة",
  ready: "جاهزة",
  delivered: "مسلّمة"
};

const REPORT_SECTIONS: ReportSectionLink[] = [
  { href: "#reports-filters", label: "الفلاتر", tab: "shared" },
  { href: "#reports-compare", label: "المقارنة", tab: "overview" },
  { href: "#reports-baseline", label: "لوحة المؤشرات", tab: "overview" },
  { href: "#reports-sales", label: "المبيعات", tab: "sales-returns" },
  { href: "#reports-returns", label: "المرتجعات", tab: "sales-returns" },
  { href: "#reports-movements", label: "الحسابات", tab: "accounts-operations" },
  { href: "#reports-maintenance", label: "الصيانة", tab: "accounts-operations" }
];

const REPORT_TABS = [
  { key: "overview", label: "نظرة عامة" },
  { key: "sales-returns", label: "المبيعات والمرتجعات" },
  { key: "accounts-operations", label: "الحسابات والعمليات" }
] as const satisfies ReadonlyArray<{ key: ReportTab; label: string }>;

const INITIAL_FILTERS_STATE: ExpandedFiltersState = {
  overview: true,
  "sales-returns": false,
  "accounts-operations": false
};

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function getDimensionLabel(dimension: SalesHistoryFilters["dimension"]) {
  switch (dimension) {
    case "entry_type":
      return "نوع القيد";
    case "expense_category":
      return "فئة المصروف";
    case "supplier":
      return "المورد / المزود";
    case "maintenance_status":
      return "حالة الصيانة";
    case "account":
    default:
      return "الحساب";
  }
}

function getGroupByLabel(groupBy: SalesHistoryFilters["groupBy"]) {
  switch (groupBy) {
    case "week":
      return "أسبوعي";
    case "month":
      return "شهري";
    case "day":
    default:
      return "يومي";
  }
}

function normalizeReportTab(tab: string | null): ReportTab {
  if (tab === "sales-returns" || tab === "accounts-operations") {
    return tab;
  }

  return "overview";
}

function buildExportHref(filters: SalesHistoryFilters) {
  const params = new URLSearchParams();
  params.set("from_date", filters.fromDate);
  params.set("to_date", filters.toDate);
  params.set("group_by", filters.groupBy ?? "day");
  params.set("dimension", filters.dimension ?? "account");

  if (filters.compareFromDate && filters.compareToDate) {
    params.set("compare_from_date", filters.compareFromDate);
    params.set("compare_to_date", filters.compareToDate);
  }

  if (filters.createdBy) {
    params.set("created_by", filters.createdBy);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.posTerminalCode) {
    params.set("pos_terminal_code", filters.posTerminalCode);
  }

  return `/api/reports/advanced/export?${params.toString()}`;
}

function buildFilterSummary(filters: SalesHistoryFilters, users: WorkspaceUserOption[]) {
  const chips = [`الفترة: ${formatDate(filters.fromDate)} → ${formatDate(filters.toDate)}`];

  if (filters.compareFromDate && filters.compareToDate) {
    chips.push(`المقارنة: ${formatDate(filters.compareFromDate)} → ${formatDate(filters.compareToDate)}`);
  } else {
    chips.push("المقارنة: بدون فترة مقارنة");
  }

  if (filters.status) {
    chips.push(`الحالة: ${getStatusLabel(filters.status)}`);
  }

  if (filters.createdBy) {
    const selectedUser = users.find((user) => user.id === filters.createdBy);
    chips.push(`المستخدم: ${selectedUser?.full_name ?? filters.createdBy}`);
  }

  if (filters.posTerminalCode) {
    chips.push(`الجهاز: ${filters.posTerminalCode}`);
  }

  chips.push(`التجميع: ${getGroupByLabel(filters.groupBy)}`);
  chips.push(`التحليل: ${getDimensionLabel(filters.dimension)}`);
  return chips;
}

export function ReportsOverview({ filters, users, terminals, reportBaseline }: ReportsOverviewProps) {
  const searchParams = useSearchParams();
  const reportTabParam = searchParams.get("report_tab");
  const exportHref = buildExportHref(filters);
  const filterSummary = buildFilterSummary(filters, users);
  const { advancedReport } = reportBaseline;
  const [activeTab, setActiveTab] = useState<ReportTab>(() => normalizeReportTab(reportTabParam));
  const [expandedFilters, setExpandedFilters] = useState<ExpandedFiltersState>(INITIAL_FILTERS_STATE);
  const tabRefs = useRef<Record<ReportTab, HTMLButtonElement | null>>({
    overview: null,
    "sales-returns": null,
    "accounts-operations": null
  });

  useEffect(() => {
    setActiveTab(normalizeReportTab(reportTabParam));
  }, [reportTabParam]);

  function toggleFilter(tab: ReportTab) {
    setExpandedFilters((current) => ({ ...current, [tab]: !current[tab] }));
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentTab: ReportTab) {
    const currentIndex = REPORT_TABS.findIndex((tab) => tab.key === currentTab);
    if (currentIndex === -1) {
      return;
    }

    const focusTab = (index: number) => {
      const nextTab = REPORT_TABS[index]?.key;
      if (nextTab) {
        tabRefs.current[nextTab]?.focus();
      }
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusTab((currentIndex + 1) % REPORT_TABS.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusTab((currentIndex - 1 + REPORT_TABS.length) % REPORT_TABS.length);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(REPORT_TABS.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        setActiveTab(currentTab);
        break;
      default:
        break;
    }
  }

  function handleSectionClick(tab: ReportSectionLink["tab"]) {
    if (tab !== "shared") {
      setActiveTab(tab);
    }
  }

  function renderFilterSummaryRow() {
    return (
      <div className="operational-inline-summary reports-page__scope">
        {filterSummary.map((chip) => (
          <span key={chip} className="status-pill badge badge--neutral">
            {chip}
          </span>
        ))}
      </div>
    );
  }

  function renderEmptyList(message: string) {
    return (
      <div className="empty-panel">
        <p>{message}</p>
      </div>
    );
  }

  return (
    <section className="workspace-stack analytical-page reports-page">
      <PageHeader
        title="التقارير"
        meta={
          <>
            <span className="status-pill badge badge--neutral">
              {filters.fromDate} - {filters.toDate}
            </span>
            <span className="status-pill badge badge--neutral">
              {formatCompactNumber(reportBaseline.salesHistory.total_count)} فاتورة
            </span>
            <span className="status-pill badge badge--neutral">
              فرق الربح {formatCurrency(advancedReport.delta.net_profit)}
            </span>
          </>
        }
        actions={
          <div className="action-row">
            <a href={exportHref} className="primary-button">
              تصدير Excel
            </a>
            <Link href="/reports" className="secondary-button">
              إعادة ضبط
            </Link>
          </div>
        }
      />

      <div className="reports-page__tabs" role="tablist" aria-label="تبويبات شاشة التقارير">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            ref={(node) => {
              tabRefs.current[tab.key] = node;
            }}
            type="button"
            id={`reports-tab-${tab.key}`}
            role="tab"
            tabIndex={activeTab === tab.key ? 0 : -1}
            aria-selected={activeTab === tab.key}
            aria-controls={`reports-panel-${tab.key}`}
            className={`reports-page__tab ${activeTab === tab.key ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <nav className="analytical-section-nav reports-page__sections" aria-label="التنقل داخل أقسام التقارير">
        {REPORT_SECTIONS.map((section) => (
          <a key={section.href} href={section.href} className="chip" onClick={() => handleSectionClick(section.tab)}>
            {section.label}
          </a>
        ))}
      </nav>

      <SectionCard
        id="reports-filters"
        title="نطاق التقرير"
        tone="accent"
        className="analytical-card analytical-card--filters reports-page__filters reports-page__filter-block"
        actions={
          <div className="action-row">
            <button
              type="button"
              className="secondary-button reports-page__filter-collapse"
              aria-expanded={expandedFilters[activeTab]}
              aria-controls="reports-filters-content"
              onClick={() => toggleFilter(activeTab)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              <span className="reports-page__filter-collapse-copy">
                {expandedFilters[activeTab] ? "إخفاء الفلاتر" : "تعديل الفلاتر"}
              </span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`reports-page__filter-icon ${expandedFilters[activeTab] ? "is-rotated" : ""}`}
              />
            </button>
            <Link href="/reports" className="secondary-button">
              إعادة ضبط
            </Link>
          </div>
        }
      >
        {renderFilterSummaryRow()}

        <div
          id="reports-filters-content"
          className="reports-page__filter-content"
          hidden={!expandedFilters[activeTab]}
          aria-hidden={!expandedFilters[activeTab]}
        >
          <form
            className="filters-grid"
            method="GET"
            onSubmit={() => setExpandedFilters((current) => ({ ...current, [activeTab]: false }))}
          >
            <input type="hidden" name="report_tab" value={activeTab} />
            <label className="stack-field">
              <span>من تاريخ</span>
              <input type="date" name="from_date" defaultValue={filters.fromDate} />
            </label>
            <label className="stack-field">
              <span>إلى تاريخ</span>
              <input type="date" name="to_date" defaultValue={filters.toDate} />
            </label>
            <label className="stack-field">
              <span>من تاريخ المقارنة</span>
              <input type="date" name="compare_from_date" defaultValue={filters.compareFromDate ?? ""} />
            </label>
            <label className="stack-field">
              <span>إلى تاريخ المقارنة</span>
              <input type="date" name="compare_to_date" defaultValue={filters.compareToDate ?? ""} />
            </label>
            <label className="stack-field">
              <span>المستخدم</span>
              <select name="created_by" defaultValue={filters.createdBy ?? ""}>
                <option value="">الكل</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name ?? user.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack-field">
              <span>الحالة</span>
              <select name="status" defaultValue={filters.status ?? ""}>
                <option value="">الكل</option>
                <option value="active">نشطة</option>
                <option value="partially_returned">مرتجع جزئي</option>
                <option value="returned">مرتجعة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </label>
            <label className="stack-field">
              <span>الجهاز</span>
              <select name="pos_terminal_code" defaultValue={filters.posTerminalCode ?? ""}>
                <option value="">الكل</option>
                {terminals.map((terminal) => (
                  <option key={terminal} value={terminal}>
                    {terminal}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack-field">
              <span>التجميع</span>
              <select name="group_by" defaultValue={filters.groupBy ?? "day"}>
                <option value="day">يومي</option>
                <option value="week">أسبوعي</option>
                <option value="month">شهري</option>
              </select>
            </label>
            <label className="stack-field">
              <span>بعد التحليل</span>
              <select name="dimension" defaultValue={filters.dimension ?? "account"}>
                <option value="account">الحساب</option>
                <option value="entry_type">نوع القيد</option>
                <option value="expense_category">فئة المصروف</option>
                <option value="supplier">المورد / المزود</option>
                <option value="maintenance_status">حالة الصيانة</option>
              </select>
            </label>
            <div className="action-row action-row--end">
              <button type="submit" className="primary-button">
                تطبيق الفلاتر
              </button>
            </div>
          </form>
        </div>
      </SectionCard>

      <section
        id="reports-panel-overview"
        role="tabpanel"
        aria-labelledby="reports-tab-overview"
        className="workspace-stack reports-page__tab-panel"
        hidden={activeTab !== "overview"}
      >
        <SectionCard id="reports-compare" title="ملخص المقارنة" className="analytical-card">
          <div className="analytical-kpi-grid reports-page__compare-grid">
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">الفترة الحالية</span>
              <strong className="analytical-kpi-value">{formatCurrency(advancedReport.currentPeriod.sales_total)}</strong>
              <span className="analytical-kpi-hint">
                صافي الربح: {formatCurrency(advancedReport.currentPeriod.net_profit)}
              </span>
            </article>
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">فترة المقارنة</span>
              <strong className="analytical-kpi-value">
                {formatCurrency(advancedReport.comparePeriod?.sales_total ?? 0)}
              </strong>
              <span className="analytical-kpi-hint">
                صافي الربح: {formatCurrency(advancedReport.comparePeriod?.net_profit ?? 0)}
              </span>
            </article>
            <article className="analytical-kpi-card analytical-kpi-card--accent">
              <span className="analytical-kpi-label">فرق المبيعات</span>
              <strong className="analytical-kpi-value">{formatCurrency(advancedReport.delta.sales_total)}</strong>
              <span className="analytical-kpi-hint">الفارق بين الفترتين بعد نفس الفلاتر</span>
            </article>
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">فرق الربح</span>
              <strong className="analytical-kpi-value">{formatCurrency(advancedReport.delta.net_profit)}</strong>
              <span className="analytical-kpi-hint">فارق صافي الربح بعد المصروفات والمرتجعات</span>
            </article>
          </div>
        </SectionCard>

        <SectionCard title="اتجاه الأداء" className="analytical-card">
          <ReportsAdvancedCharts trend={advancedReport.trend} breakdown={advancedReport.breakdown} />
        </SectionCard>

        <SectionCard id="reports-baseline" title="مؤشرات سريعة" className="analytical-card">
          <div className="analytical-kpi-grid reports-page__baseline-grid">
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">المبيعات</span>
              <strong className="analytical-kpi-value">{formatCurrency(reportBaseline.salesSummary.total_sales)}</strong>
              <span className="analytical-kpi-hint">
                {formatCompactNumber(reportBaseline.salesSummary.invoice_count)} فاتورة نشطة
              </span>
            </article>
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">الديون</span>
              <strong className="analytical-kpi-value">
                {formatCurrency(reportBaseline.debtReport.total_outstanding)}
              </strong>
              <span className="analytical-kpi-hint">
                {formatCompactNumber(reportBaseline.debtReport.customers.length)} عميلًا بديون حالية
              </span>
            </article>
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">المخزون المنخفض</span>
              <strong className="analytical-kpi-value">
                {formatCompactNumber(reportBaseline.inventoryReport.low_stock_count)}
              </strong>
              <span className="analytical-kpi-hint">منتجات عند حد التنبيه أو أقل</span>
            </article>
            <article className="analytical-kpi-card analytical-kpi-card--accent">
              <span className="analytical-kpi-label">ربح اللقطات</span>
              <strong className="analytical-kpi-value">
                {formatCurrency(reportBaseline.profitReport.snapshot_net_profit)}
              </strong>
              <span className="analytical-kpi-hint">
                من {formatCompactNumber(reportBaseline.profitReport.snapshot_count)} لقطة يومية
              </span>
            </article>
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">إيراد الصيانة</span>
              <strong className="analytical-kpi-value">
                {formatCurrency(reportBaseline.profitReport.maintenance_revenue)}
              </strong>
              <span className="analytical-kpi-hint">
                {formatCompactNumber(reportBaseline.profitReport.maintenance_delivered_count)} أمرًا مسلّمًا
              </span>
            </article>
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">الشحن والمرتجعات</span>
              <strong className="analytical-kpi-value">
                {formatCurrency(reportBaseline.profitReport.topup_profit)}
              </strong>
              <span className="analytical-kpi-hint">
                مرتجعات: {formatCurrency(reportBaseline.profitReport.return_total)}
              </span>
            </article>
          </div>
        </SectionCard>
      </section>

      <section
        id="reports-panel-sales-returns"
        role="tabpanel"
        aria-labelledby="reports-tab-sales-returns"
        className="workspace-stack reports-page__tab-panel"
        hidden={activeTab !== "sales-returns"}
      >
        <SectionCard title="تفصيل المقارنة" className="analytical-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>البند</th>
                  <th>القيمة الأساسية</th>
                  <th>القيمة الثانوية</th>
                  <th>عدد العناصر</th>
                </tr>
              </thead>
              <tbody>
                {advancedReport.breakdown.length > 0 ? (
                  advancedReport.breakdown.map((entry) => (
                    <tr key={entry.label}>
                      <td>{entry.label}</td>
                      <td>{formatCurrency(entry.amount)}</td>
                      <td>{formatCurrency(entry.secondary_amount)}</td>
                      <td>{formatCompactNumber(entry.item_count)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      لا توجد بيانات كافية للمقارنة ضمن الفلاتر الحالية. جرّب توسيع الفترة أو تغيير طريقة التجميع.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <section className="analytical-shell analytical-shell--split">
          <SectionCard id="reports-sales" title="الفواتير" className="analytical-card">
            <div className="action-row action-row--end">
              <Link href="/invoices" className="secondary-button">
                فتح الفواتير
              </Link>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم الفاتورة</th>
                    <th>التاريخ</th>
                    <th>الموظف</th>
                    <th>الجهاز</th>
                    <th>الحالة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {reportBaseline.salesHistory.data.length > 0 ? (
                    reportBaseline.salesHistory.data.map((invoice) => (
                      <tr key={invoice.invoice_id}>
                        <td>{invoice.invoice_number}</td>
                        <td>{formatDate(invoice.invoice_date)}</td>
                        <td>{invoice.created_by_name ?? "غير معروف"}</td>
                        <td>{invoice.pos_terminal_code ?? "غير محدد"}</td>
                        <td>
                          <span className={`status-badge status-badge--${invoice.status}`}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td>{formatCurrency(invoice.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        لا توجد فواتير مطابقة لهذه الفلاتر. جرّب تغيير التاريخ أو إزالة بعض القيود.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="آخر اللقطات" tone="subtle" className="analytical-card">
            <div className="stack-list">
              {reportBaseline.snapshots.length > 0 ? (
                reportBaseline.snapshots.map((snapshot) => (
                  <article key={snapshot.id} className="list-card">
                    <div className="list-card__header">
                      <strong>{formatDate(snapshot.snapshot_date)}</strong>
                      <span>{formatCompactNumber(snapshot.invoice_count)} فاتورة</span>
                    </div>
                    <p>صافي المبيعات: {formatCurrency(snapshot.net_sales)}</p>
                    <p>صافي الربح: {formatCurrency(snapshot.net_profit)}</p>
                    <p className="workspace-footnote">أُنشئت: {formatDateTime(snapshot.created_at)}</p>
                  </article>
                ))
              ) : (
                renderEmptyList("لا توجد لقطات محفوظة بعد. أنشئ لقطة يومية لتظهر نتائجها هنا.")
              )}
            </div>
          </SectionCard>
        </section>

        <SectionCard id="reports-returns" title="المرتجعات" className="analytical-card">
          <div className="analytical-shell analytical-shell--split">
            <div className="stack-list">
              {reportBaseline.returnsReport.reasons.length > 0 ? (
                reportBaseline.returnsReport.reasons.map((reason) => (
                  <article key={reason.reason} className="list-card">
                    <div className="list-card__header">
                      <strong>{reason.reason}</strong>
                      <span>{formatCompactNumber(reason.count)} مرة</span>
                    </div>
                    <p>إجمالي المرتجعات: {formatCurrency(reason.total_amount)}</p>
                  </article>
                ))
              ) : (
                renderEmptyList("لا توجد مرتجعات ضمن الفترة الحالية. ستظهر الأسباب والعمليات هنا عند تسجيل أول مرتجع.")
              )}
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم المرتجع</th>
                    <th>التاريخ</th>
                    <th>الفاتورة الأصلية</th>
                    <th>النوع</th>
                    <th>السبب</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {reportBaseline.returnsReport.entries.length > 0 ? (
                    reportBaseline.returnsReport.entries.map((entry) => (
                      <tr key={entry.return_id}>
                        <td>{entry.return_number}</td>
                        <td>{formatDate(entry.return_date)}</td>
                        <td>{entry.invoice_number ?? "غير معروف"}</td>
                        <td>{entry.return_type}</td>
                        <td>{entry.reason}</td>
                        <td>{formatCurrency(entry.total_amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        لا توجد عمليات مرتجع مطابقة لهذه الفترة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      </section>

      <section
        id="reports-panel-accounts-operations"
        role="tabpanel"
        aria-labelledby="reports-tab-accounts-operations"
        className="workspace-stack reports-page__tab-panel"
        hidden={activeTab !== "accounts-operations"}
      >
        <section className="analytical-shell analytical-shell--triplet">
          <SectionCard eyebrow="الحسابات" title="الحسابات المالية" tone="subtle" className="analytical-card">
            <div className="stack-list">
              {reportBaseline.accountReport.accounts.length > 0 ? (
                reportBaseline.accountReport.accounts.map((account) => (
                  <article key={account.id} className="list-card">
                    <div className="list-card__header">
                      <strong>{account.name}</strong>
                      <span>{account.type}</span>
                    </div>
                    <p>الرصيد: {formatCurrency(account.current_balance)}</p>
                    <p className="workspace-footnote">النطاق: {account.module_scope}</p>
                  </article>
                ))
              ) : (
                renderEmptyList("لا توجد حسابات مالية معروضة ضمن هذه الفترة.")
              )}
            </div>
          </SectionCard>

          <SectionCard title="الديون الحالية" tone="subtle" className="analytical-card">
            <div className="stack-list">
              {reportBaseline.debtReport.customers.length > 0 ? (
                reportBaseline.debtReport.customers.map((customer) => (
                  <article key={customer.id} className="list-card">
                    <div className="list-card__header">
                      <strong>{customer.name}</strong>
                      <span>{customer.phone ?? "بدون هاتف"}</span>
                    </div>
                    <p>الرصيد الحالي: {formatCurrency(customer.current_balance)}</p>
                    <p className="workspace-footnote">
                      الحد: {formatCurrency(customer.credit_limit)} | أجل السداد:{" "}
                      {customer.due_date_days != null ? `${customer.due_date_days} يومًا` : "غير محدد"}
                    </p>
                  </article>
                ))
              ) : (
                renderEmptyList("لا توجد ديون حالية مسجلة ضمن الفترة المعروضة.")
              )}
            </div>
          </SectionCard>

          <SectionCard title="المخزون المنخفض" tone="subtle" className="analytical-card">
            <div className="stack-list">
              {reportBaseline.inventoryReport.products.length > 0 ? (
                reportBaseline.inventoryReport.products.map((product) => (
                  <article key={product.id} className="list-card">
                    <div className="list-card__header">
                      <strong>{product.name}</strong>
                      <span>
                        {formatCompactNumber(product.stock_quantity)} / {formatCompactNumber(product.min_stock_level)}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                renderEmptyList("لا توجد عناصر منخفضة المخزون ضمن المؤشرات الحالية.")
              )}
            </div>
          </SectionCard>
        </section>

        <SectionCard id="reports-movements" title="حركة الحسابات" className="analytical-card">
          <div className="analytical-shell analytical-shell--split">
            <div className="stack-list">
              {reportBaseline.accountMovementReport.summaries.length > 0 ? (
                reportBaseline.accountMovementReport.summaries.map((summary) => (
                  <article key={summary.account_id} className="list-card">
                    <div className="list-card__header">
                      <strong>{summary.account_name}</strong>
                      <span>{formatCompactNumber(summary.movement_count)} حركة</span>
                    </div>
                    <p>الوارد: {formatCurrency(summary.income_total)}</p>
                    <p>الصادر: {formatCurrency(summary.expense_total)}</p>
                    <p className="workspace-footnote">
                      زيادة: {formatCurrency(summary.adjustment_increase_total)} | خصم:{" "}
                      {formatCurrency(summary.adjustment_decrease_total)} | الرصيد الحالي:{" "}
                      {formatCurrency(summary.current_balance)}
                    </p>
                  </article>
                ))
              ) : (
                renderEmptyList("لا توجد حركات حسابات ضمن الفترة الحالية.")
              )}
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الحساب</th>
                    <th>النوع</th>
                    <th>المرجع</th>
                    <th>القيمة</th>
                    <th>الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  {reportBaseline.accountMovementReport.entries.length > 0 ? (
                    reportBaseline.accountMovementReport.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.entry_date)}</td>
                        <td>{entry.account_name}</td>
                        <td>
                          {entry.adjustment_direction
                            ? `${entry.entry_type}:${entry.adjustment_direction}`
                            : entry.entry_type}
                        </td>
                        <td>{entry.reference_type ?? "بدون مرجع"}</td>
                        <td>{formatCurrency(entry.amount)}</td>
                        <td>{entry.description}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        لا توجد قيود حركة مطابقة لهذه الفترة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="reports-maintenance" title="الصيانة" className="analytical-card">
          <div className="analytical-kpi-grid">
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">الإيراد المسلّم</span>
              <strong className="analytical-kpi-value">
                {formatCurrency(reportBaseline.maintenanceReport.delivered_revenue)}
              </strong>
              <span className="analytical-kpi-hint">إجمالي ما تم تسليمه ضمن الفترة الحالية</span>
            </article>
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">الأوامر المفتوحة</span>
              <strong className="analytical-kpi-value">
                {formatCompactNumber(reportBaseline.maintenanceReport.open_count)}
              </strong>
              <span className="analytical-kpi-hint">طلبات لم تُغلق بعد</span>
            </article>
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">جاهز للتسليم</span>
              <strong className="analytical-kpi-value">
                {formatCompactNumber(reportBaseline.maintenanceReport.ready_count)}
              </strong>
              <span className="analytical-kpi-hint">طلبات جاهزة حاليًا</span>
            </article>
            <article className="analytical-kpi-card">
              <span className="analytical-kpi-label">المسلّم</span>
              <strong className="analytical-kpi-value">
                {formatCompactNumber(reportBaseline.maintenanceReport.delivered_count)}
              </strong>
              <span className="analytical-kpi-hint">أوامر أُغلقت ضمن الفترة الحالية</span>
            </article>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  <th>الجهاز</th>
                  <th>الحالة</th>
                  <th>المبلغ النهائي</th>
                </tr>
              </thead>
              <tbody>
                {reportBaseline.maintenanceReport.jobs.length > 0 ? (
                  reportBaseline.maintenanceReport.jobs.map((job) => (
                    <tr key={job.job_id}>
                      <td>{job.job_number}</td>
                      <td>{formatDate(job.job_date)}</td>
                      <td>{job.customer_name}</td>
                      <td>{job.device_type}</td>
                      <td>
                        <span className={`status-badge status-badge--${job.status}`}>{getStatusLabel(job.status)}</span>
                      </td>
                      <td>{job.final_amount != null ? formatCurrency(job.final_amount) : "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      لا توجد أوامر صيانة داخل الفترة الحالية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </section>
    </section>
  );
}
