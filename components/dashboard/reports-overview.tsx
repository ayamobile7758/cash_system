import Link from "next/link";
import type { WorkspaceUserOption } from "@/lib/api/dashboard";
import type { SalesHistoryFilters } from "@/lib/api/reports";
import { formatCompactNumber, formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";

type ReportsOverviewProps = {
  filters: SalesHistoryFilters;
  users: WorkspaceUserOption[];
  terminals: string[];
  reportBaseline: {
    salesHistory: {
      data: Array<{
        invoice_id: string;
        invoice_number: string;
        invoice_date: string;
        created_at: string;
        created_by_name: string | null;
        pos_terminal_code: string | null;
        total: number;
        status: string;
      }>;
      total_count: number;
      page: number;
      page_size: number;
    };
    salesSummary: {
      total_sales: number;
      invoice_count: number;
      cancelled_count: number;
    };
    debtReport: {
      total_outstanding: number;
      customers: Array<{
        id: string;
        name: string;
        phone: string | null;
        current_balance: number;
        credit_limit: number;
        due_date_days: number | null;
      }>;
    };
    accountReport: {
      accounts: Array<{
        id: string;
        name: string;
        current_balance: number;
        type: string;
        module_scope: string;
        is_active: boolean;
      }>;
    };
    inventoryReport: {
      low_stock_count: number;
      products: Array<{
        id: string;
        name: string;
        stock_quantity: number;
        min_stock_level: number;
        is_active: boolean;
      }>;
    };
    snapshots: Array<{
      id: string;
      snapshot_date: string;
      net_sales: number;
      net_profit: number;
      invoice_count: number;
      created_at: string;
    }>;
  };
};

export function ReportsOverview({ filters, users, terminals, reportBaseline }: ReportsOverviewProps) {
  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-05-T01</p>
          <h1>التقارير والملخصات التشغيلية</h1>
          <p className="workspace-lead">
            هذه الصفحة تجمع ملخص اليوم، هيستوري المبيعات، أحدث اللقطات، الديون، الحسابات، والمخزون
            المنخفض من نفس baseline المالي.
          </p>
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
                        <span className={`status-badge status-badge--${invoice.status}`}>{invoice.status}</span>
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
                <p className="workspace-footnote">الحد: {formatCurrency(customer.credit_limit)}</p>
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
                <p className="workspace-footnote">حد التنبيه الحالي موضح يمينًا.</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
