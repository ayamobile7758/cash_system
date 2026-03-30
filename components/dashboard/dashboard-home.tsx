"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

const ALERT_KEYS: Array<keyof AlertsSummary> = [
  "overdue_debts",
  "low_stock",
  "reconciliation_drift",
  "maintenance_ready",
  "unread_notifications"
];

const ALERT_TONES: Record<
  keyof AlertsSummary,
  "danger" | "warning" | "success" | "info"
> = {
  overdue_debts: "danger",
  low_stock: "warning",
  reconciliation_drift: "warning",
  maintenance_ready: "success",
  unread_notifications: "info"
};

const ALERT_ACTIONS: Record<keyof AlertsSummary, string> = {
  overdue_debts: "راجع الديون",
  low_stock: "افتح الجرد",
  reconciliation_drift: "راجع التسوية",
  maintenance_ready: "افتح الصيانة",
  unread_notifications: "افتح الإشعارات"
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  active: "نشطة",
  partially_returned: "مرتجع جزئي",
  returned: "مرتجعة",
  cancelled: "ملغاة"
};

const INVOICE_STATUS_TONES: Record<string, "info" | "warning" | "danger" | "success"> = {
  active: "info",
  partially_returned: "warning",
  returned: "danger",
  cancelled: "danger"
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

function getAlertTone(key: keyof AlertsSummary) {
  return ALERT_TONES[key];
}

function getAlertActionLabel(key: keyof AlertsSummary) {
  return ALERT_ACTIONS[key];
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

function getInvoiceStatusLabel(status: string) {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

function getInvoiceStatusTone(status: string) {
  return INVOICE_STATUS_TONES[status] ?? "info";
}

export function DashboardHome({
  alertsSummary,
  recentInvoices,
  today,
  todaySalesCount,
  todaySalesTotal
}: DashboardHomeProps) {
  const totalAlerts = ALERT_KEYS.reduce((sum, key) => sum + alertsSummary[key], 0);
  const hasRecentInvoices = recentInvoices.length > 0;

  return (
    <section className="workspace-stack operational-page">
      <PageHeader
        eyebrow="لوحة المتابعة"
        title="ملخص التشغيل اليومي"
        description={
          totalAlerts > 0
            ? `أمامك ${formatCompactNumber(totalAlerts)} بندًا يحتاج متابعة اليوم. ابدأ من نقطة البيع أو راجع التنبيهات السريعة.`
            : "لا توجد تنبيهات مفتوحة الآن. ابدأ من نقطة البيع أو راجع الفواتير الأخيرة عند الحاجة."
        }
        meta={
          <div className="transaction-page__meta" aria-label="ملخص اليوم">
            <article className="transaction-page__meta-card transaction-page__meta-card--safe stat-card">
              <span>إيراد اليوم</span>
              <strong>{formatCurrency(todaySalesTotal)}</strong>
            </article>
            <article className="transaction-page__meta-card stat-card">
              <span>فواتير اليوم</span>
              <strong>{formatCompactNumber(todaySalesCount)}</strong>
            </article>
            <article className="transaction-page__meta-card stat-card">
              <span>تاريخ اليوم</span>
              <strong>{formatDate(today)}</strong>
            </article>
          </div>
        }
        actions={
          <>
            <Link href="/pos" className="primary-button">
              ابدأ البيع
            </Link>
            <Link href="/notifications" className="secondary-button">
              راجع التنبيهات
            </Link>
          </>
        }
      />

      <SectionCard
        eyebrow="التنبيهات"
        title="أولوية المراجعة"
        description="هذه البنود هي الأكثر تأثيرًا على الشغل اليوم. ابدأ بالأعلى رقمًا وخطورة."
        tone="accent"
        actions={
          <Link href="/notifications" className="secondary-button">
            فتح مركز الإشعارات
          </Link>
        }
      >
        <div className="operational-page__meta-grid" aria-label="أولوية التنبيهات">
          {ALERT_KEYS.map((key) => {
            const tone = getAlertTone(key);

            return (
              <Link
                key={key}
                href={getAlertHref(key)}
                className="transaction-page__meta-card stat-card"
                aria-label={`${getAlertLabel(key)}: ${formatCompactNumber(alertsSummary[key])}`}
                title={getAlertActionLabel(key)}
              >
                <span className={`badge badge--${tone}`}>{getAlertLabel(key)}</span>
                <strong>{formatCompactNumber(alertsSummary[key])}</strong>
                <span>{getAlertHint(key)}</span>
                <span className="workspace-footnote">{getAlertActionLabel(key)}</span>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="الفواتير"
        title="آخر الفواتير"
        description="سجل قصير للمراجعة السريعة قبل المتابعة أو الطباعة أو الاسترجاع."
        actions={
          <Link href="/invoices" className="secondary-button">
            فتح سجل الفواتير
          </Link>
        }
      >
        {hasRecentInvoices ? (
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
                      <Link href={`/invoices/${invoice.id}`} className="secondary-button">
                        <span>{invoice.invoice_number}</span>
                        <ArrowLeft size={14} aria-hidden="true" />
                      </Link>
                    </td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>{formatCurrency(invoice.total_amount)}</td>
                    <td>
                      <span
                        className={`status-badge status-badge--${invoice.status} badge badge--${getInvoiceStatusTone(invoice.status)}`}
                      >
                        {getInvoiceStatusLabel(invoice.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="workspace-footnote">
            لا توجد فواتير مسجلة لهذا اليوم بعد. ابدأ من نقطة البيع لعرض السجل هنا.
          </div>
        )}
      </SectionCard>
    </section>
  );
}
