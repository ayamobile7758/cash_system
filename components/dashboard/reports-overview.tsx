import Link from "next/link";
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

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function buildExportHref(filters: SalesHistoryFilters) {
  const params = new URLSearchParams();
  params.set("from_date", filters.fromDate);
  params.set("to_date", filters.toDate);
  params.set("page", String(filters.page));
  params.set("page_size", String(filters.pageSize));

  if (filters.createdBy) {
    params.set("created_by", filters.createdBy);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.posTerminalCode) {
    params.set("pos_terminal_code", filters.posTerminalCode);
  }

  return `/api/reports/export?${params.toString()}`;
}

export function ReportsOverview({ filters, users, terminals, reportBaseline }: ReportsOverviewProps) {
  const exportHref = buildExportHref(filters);

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-07-T05</p>
          <h1>التقارير المحسنة والتصدير</h1>
          <p className="workspace-lead">
            نفس baseline تعرض تقارير الإدارة التفصيلية وتغذي ملف Excel القابل للتصدير، مع فلترة موحدة
            للتاريخ والمستخدم والجهاز والحالة.
          </p>
        </div>

        <div className="action-row">
          <a href={exportHref} className="primary-button">
            تصدير Excel
          </a>
          <Link href="/settings" className="secondary-button">
            فتح الإعدادات
          </Link>
        </div>
      </div>

      <section className="workspace-panel">
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

          <div className="action-row action-row--end">
            <button type="submit" className="primary-button">
              تطبيق الفلاتر
            </button>
            <Link href="/reports" className="secondary-button">
              إعادة ضبط
            </Link>
          </div>
        </form>
      </section>

      <section className="summary-grid">
        <article className="workspace-panel">
          <p className="eyebrow">Sales Summary</p>
          <h2>{formatCurrency(reportBaseline.salesSummary.total_sales)}</h2>
          <p className="workspace-footnote">
            {formatCompactNumber(reportBaseline.salesSummary.invoice_count)} فاتورة نشطة
          </p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Debt Exposure</p>
          <h2>{formatCurrency(reportBaseline.debtReport.total_outstanding)}</h2>
          <p className="workspace-footnote">
            {formatCompactNumber(reportBaseline.debtReport.customers.length)} عميلًا بديون حالية
          </p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Low Stock</p>
          <h2>{formatCompactNumber(reportBaseline.inventoryReport.low_stock_count)}</h2>
          <p className="workspace-footnote">منتجات عند حد التنبيه أو أقل</p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Cancelled</p>
          <h2>{formatCompactNumber(reportBaseline.salesSummary.cancelled_count)}</h2>
          <p className="workspace-footnote">إجمالي الفواتير الملغاة ضمن الفترة الحالية</p>
        </article>
      </section>

      <section className="summary-grid">
        <article className="workspace-panel">
          <p className="eyebrow">Snapshot Profit</p>
          <h2>{formatCurrency(reportBaseline.profitReport.snapshot_net_profit)}</h2>
          <p className="workspace-footnote">
            من {formatCompactNumber(reportBaseline.profitReport.snapshot_count)} لقطة يومية داخل الفترة
          </p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">TopUp Profit</p>
          <h2>{formatCurrency(reportBaseline.profitReport.topup_profit)}</h2>
          <p className="workspace-footnote">
            إجمالي الشحن: {formatCurrency(reportBaseline.profitReport.topup_amount)}
          </p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Maintenance Revenue</p>
          <h2>{formatCurrency(reportBaseline.profitReport.maintenance_revenue)}</h2>
          <p className="workspace-footnote">
            {formatCompactNumber(reportBaseline.profitReport.maintenance_delivered_count)} أمرًا مسلّمًا
          </p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Purchases / Returns</p>
          <h2>{formatCurrency(reportBaseline.profitReport.purchase_total)}</h2>
          <p className="workspace-footnote">
            المرتجعات: {formatCurrency(reportBaseline.profitReport.return_total)}
          </p>
        </article>
      </section>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Sales History</p>
              <h2>هيستوري المبيعات</h2>
            </div>
            <Link href="/invoices" className="secondary-button">
              فتح الفواتير
            </Link>
          </div>

          <p className="workspace-footnote">
            العدد الكلي بعد الفلاتر: {formatCompactNumber(reportBaseline.salesHistory.total_count)}
          </p>

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
                      لا توجد فواتير مطابقة لهذه الفلاتر.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="workspace-panel">
          <p className="eyebrow">Snapshots</p>
          <h2>آخر اللقطات اليومية</h2>
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
                <p>لا توجد لقطات محفوظة بعد.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="detail-grid detail-grid--thirds">
        <section className="workspace-panel">
          <p className="eyebrow">Accounts</p>
          <h2>الحسابات المالية</h2>
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
        </section>

        <section className="workspace-panel">
          <p className="eyebrow">Debt Customers</p>
          <h2>الديون الحالية</h2>
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
        </section>

        <section className="workspace-panel">
          <p className="eyebrow">Inventory Watch</p>
          <h2>المخزون المنخفض</h2>
          <div className="stack-list">
            {reportBaseline.inventoryReport.products.map((product) => (
              <article key={product.id} className="list-card">
                <div className="list-card__header">
                  <strong>{product.name}</strong>
                  <span>
                    {formatCompactNumber(product.stock_quantity)} / {formatCompactNumber(product.min_stock_level)}
                  </span>
                </div>
                <p className="workspace-footnote">يعرض الكمية الحالية مقابل حد التنبيه.</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="detail-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Returns Analysis</p>
              <h2>تقرير المرتجعات والأسباب</h2>
            </div>
            <p className="workspace-footnote">
              {formatCompactNumber(reportBaseline.returnsReport.return_count)} عملية |{" "}
              {formatCurrency(reportBaseline.returnsReport.total_returns)}
            </p>
          </div>

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
                <p>لا توجد مرتجعات ضمن الفترة الحالية.</p>
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
                      لا توجد بيانات مرتجعات لعرضها.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Account Movements</p>
              <h2>حركات الحسابات</h2>
            </div>
            <p className="workspace-footnote">
              {formatCompactNumber(reportBaseline.accountMovementReport.total_movements)} حركة داخل الفترة
            </p>
          </div>

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
        </section>
      </div>

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Maintenance Performance</p>
            <h2>ملخص الصيانة</h2>
          </div>
          <p className="workspace-footnote">
            المسلم: {formatCompactNumber(reportBaseline.maintenanceReport.delivered_count)} | الجاهز:{" "}
            {formatCompactNumber(reportBaseline.maintenanceReport.ready_count)} | المفتوح:{" "}
            {formatCompactNumber(reportBaseline.maintenanceReport.open_count)}
          </p>
        </div>

        <div className="summary-grid">
          <article className="workspace-panel">
            <p className="eyebrow">Delivered Revenue</p>
            <h2>{formatCurrency(reportBaseline.maintenanceReport.delivered_revenue)}</h2>
            <p className="workspace-footnote">إجمالي ما تم تسليمه ضمن الفترة الحالية</p>
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
      </section>
    </section>
  );
}
