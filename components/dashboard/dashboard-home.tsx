"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import type { AlertsSummary } from "@/lib/api/search";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/utils/formatters";

type RecentInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
};

type DashboardHomeProps = {
  alertsSummary: AlertsSummary;
  recentInvoices: RecentInvoice[];
  today: string;
  todaySalesCount: number;
  todaySalesTotal: number;
};

function getAlertHref(key: keyof AlertsSummary) {
  switch (key) {
    case "low_stock":
      return "/inventory";
    case "overdue_debts":
      return "/debts";
    case "reconciliation_drift":
      return "/settings";
    case "maintenance_ready":
      return "/maintenance";
    case "unread_notifications":
      return "/notifications";
  }
}

function getAlertLabel(key: keyof AlertsSummary) {
  switch (key) {
    case "low_stock":
      return "مخزون منخفض";
    case "overdue_debts":
      return "ديون متأخرة";
    case "reconciliation_drift":
      return "انحراف أرصدة";
    case "maintenance_ready":
      return "صيانة جاهزة";
    case "unread_notifications":
      return "إشعارات غير مقروءة";
  }
}

function getAlertHint(key: keyof AlertsSummary) {
  switch (key) {
    case "low_stock":
      return "البنود التي تحتاج متابعة سريعة.";
    case "overdue_debts":
      return "العملاء الذين تجاوزوا تاريخ الاستحقاق.";
    case "reconciliation_drift":
      return "الفروقات غير المحسومة في التسوية.";
    case "maintenance_ready":
      return "الأوامر الجاهزة للتسليم أو التحصيل.";
    case "unread_notifications":
      return "الإشعارات التي ما زالت تنتظر المراجعة.";
  }
}

export function DashboardHome({ alertsSummary, recentInvoices, today, todaySalesCount, todaySalesTotal }: DashboardHomeProps) {
  const alertKeys: Array<keyof AlertsSummary> = [
    "low_stock",
    "overdue_debts",
    "reconciliation_drift",
    "maintenance_ready",
    "unread_notifications"
  ];

  return (
    <section className="workspace-stack operational-page">
      <PageHeader
        eyebrow="لوحة المتابعة"
        title="ملخص يومي سريع"
        description="راجع اليوم، راقب التنبيهات، وافتح آخر الفواتير من شاشة واحدة قبل الانتقال إلى المسار المناسب."
        meta={
          <div className="transaction-page__meta" aria-label="ملخص اليوم">
            <article className="transaction-page__meta-card stat-card">
              <span>تاريخ اليوم</span>
              <strong>{formatDate(today)}</strong>
            </article>
            <article className="transaction-page__meta-card stat-card">
              <span>فواتير اليوم</span>
              <strong>{formatCompactNumber(todaySalesCount)}</strong>
            </article>
            <article className="transaction-page__meta-card transaction-page__meta-card--safe stat-card">
              <span>إيراد اليوم</span>
              <strong>{formatCurrency(todaySalesTotal)}</strong>
            </article>
          </div>
        }
      />

      <SectionCard eyebrow="التنبيهات" title="حركة تحتاج متابعة" description="القراءة السريعة للأولويات التشغيلية اليوم." tone="accent">
        <div className="operational-page__meta-grid" aria-label="بطاقات التنبيهات">
          {alertKeys.map((key) => (
            <Link key={key} href={getAlertHref(key)} className="transaction-page__meta-card stat-card">
              <span className="badge badge--info">{getAlertLabel(key)}</span>
              <strong>{formatCompactNumber(alertsSummary[key])}</strong>
              <span>{getAlertHint(key)}</span>
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="الفواتير" title="آخر 5 فواتير اليوم" description="عرض سريع للحركة الأخيرة قبل فتح شاشة الفواتير التفصيلية.">
        {recentInvoices.length === 0 ? (
          <p className="workspace-footnote">لا توجد فواتير مسجلة لهذا اليوم بعد.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.invoice_number}</strong>
                    </td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>{formatCurrency(invoice.total_amount)}</td>
                    <td>
                      <span className={`status-badge status-badge--${invoice.status} badge badge--info`}>{invoice.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </section>
  );
}
