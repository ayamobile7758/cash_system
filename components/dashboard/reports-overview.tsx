import Link from "next/link";
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

const REPORT_SECTIONS = [
  { href: "#reports-filters", label: "الفلاتر" },
  { href: "#reports-compare", label: "المقارنة" },
  { href: "#reports-baseline", label: "لوحة المؤشرات" },
  { href: "#reports-sales", label: "المبيعات" },
  { href: "#reports-returns", label: "المرتجعات" },
  { href: "#reports-movements", label: "الحسابات" },
  { href: "#reports-maintenance", label: "الصيانة" }
] as const;

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
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

export function ReportsOverview({ filters, users, terminals, reportBaseline }: ReportsOverviewProps) {
  const exportHref = buildExportHref(filters);
  const { advancedReport } = reportBaseline;

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

      <nav className="analytical-section-nav reports-page__sections" aria-label="التنقل داخل أقسام التقارير">
        {REPORT_SECTIONS.map((section) => (
          <a key={section.href} href={section.href} className="chip">
            {section.label}
          </a>
        ))}
      </nav>

      <SectionCard
        id="reports-filters"
        title="نطاق التقرير"
        tone="accent"
        className="analytical-card analytical-card--filters reports-page__filters"
        actions={
          <Link href="/reports" className="secondary-button">
            إعادة ضبط
          </Link>
        }
      >
        <div className="operational-inline-summary reports-page__scope">
          <span className="status-pill badge badge--neutral">
            الحالي: {filters.fromDate} → {filters.toDate}
          </span>
          {filters.compareFromDate && filters.compareToDate
            ? (
              <span className="status-pill badge badge--neutral">
                المقارنة: {filters.compareFromDate} → {filters.compareToDate}
              </span>
            )
            : (
              <span className="status-pill badge badge--neutral">بدون فترة مقارنة</span>
            )}
        </div>

        <form className="filters-grid" method="GET">
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
            <Link href="/reports" className="secondary-button">
              إعادة ضبط
            </Link>
          </div>
        </form>
      </SectionCard>

      <section id="reports-compare" className="workspace-stack">
        <SectionCard
          title="ملخص المقارنة"
          className="analytical-card"
        >
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

        <SectionCard
          title="اتجاه الأداء"
          className="analytical-card"
        >
          <p className="analytical-card__section-label">تفكيك البعد الحالي</p>
          <ReportsAdvancedCharts trend={advancedReport.trend} breakdown={advancedReport.breakdown} />
        </SectionCard>

        <SectionCard
          title="تفصيل المقارنة"
          className="analytical-card"
        >
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
      </section>

      <section id="reports-baseline" className="workspace-stack">
        <SectionCard
          title="مؤشرات سريعة"
          className="analytical-card"
        >
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

      <section id="reports-sales" className="analytical-shell analytical-shell--split">
        <SectionCard
          title="الفواتير"
          className="analytical-card"
        >
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
                        <span className={`status-badge status-badge--${invoice.status}`}>{getStatusLabel(invoice.status)}</span>
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

        <SectionCard
          title="آخر اللقطات"
          tone="subtle"
          className="analytical-card"
        >
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
              <div className="empty-panel">
                <p>لا توجد لقطات محفوظة بعد. أنشئ لقطة يومية لتظهر نتائجها هنا.</p>
              </div>
            )}
          </div>
        </SectionCard>
      </section>

      <section id="reports-movements" className="analytical-shell analytical-shell--triplet">
        <SectionCard eyebrow="الحسابات" title="الحسابات المالية" tone="subtle" className="analytical-card">
          <div className="stack-list">
            {reportBaseline.accountReport.accounts.map((account) => (
              <article key={account.id} className="list-card">
                <div className="list-card__header">
                  <strong>{account.name}</strong>
                  <span>{account.type}</span>
                </div>
                <p>الرصيد: {formatCurrency(account.current_balance)}</p>
                <p className="workspace-footnote">النطاق: {account.module_scope}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="الديون الحالية" tone="subtle" className="analytical-card">
          <div className="stack-list">
            {reportBaseline.debtReport.customers.map((customer) => (
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
            ))}
          </div>
        </SectionCard>

        <SectionCard title="المخزون المنخفض" tone="subtle" className="analytical-card">
          <div className="stack-list">
            {reportBaseline.inventoryReport.products.map((product) => (
              <article key={product.id} className="list-card">
                <div className="list-card__header">
                  <strong>{product.name}</strong>
                  <span>
                    {formatCompactNumber(product.stock_quantity)} / {formatCompactNumber(product.min_stock_level)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        id="reports-returns"
        title="المرتجعات"
        className="analytical-card"
      >
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
              <div className="empty-panel">
                <p>لا توجد مرتجعات ضمن الفترة الحالية. ستظهر الأسباب والعمليات هنا عند تسجيل أول مرتجع.</p>
              </div>
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

      <SectionCard
        title="حركة الحسابات"
        className="analytical-card"
      >
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
              <div className="empty-panel">
                <p>لا توجد حركات حسابات ضمن الفترة الحالية.</p>
              </div>
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
                      <td>{entry.adjustment_direction ? `${entry.entry_type}:${entry.adjustment_direction}` : entry.entry_type}</td>
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

      <SectionCard
        id="reports-maintenance"
        title="الصيانة"
        className="analytical-card"
      >
        <div className="analytical-kpi-grid">
          <article className="analytical-kpi-card">
            <span className="analytical-kpi-label">الإيراد المسلّم</span>
            <strong className="analytical-kpi-value">
              {formatCurrency(reportBaseline.maintenanceReport.delivered_revenue)}
            </strong>
            <span className="analytical-kpi-hint">إجمالي ما تم تسليمه ضمن الفترة الحالية</span>
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
  );
}
