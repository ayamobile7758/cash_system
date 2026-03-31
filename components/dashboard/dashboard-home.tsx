"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Bell,
  CheckCircle2,
  PackageSearch,
  ShoppingCart
} from "lucide-react";
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
  low_stock: "راجع الجرد",
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

function getAlertChipLabel(key: keyof AlertsSummary) {
  switch (key) {
    case "low_stock":
      return "مخزون منخفض";
    case "overdue_debts":
      return "ديون متأخرة";
    case "reconciliation_drift":
      return "فروقات التسوية";
    case "maintenance_ready":
      return "جاهز للتسليم";
    case "unread_notifications":
      return "إشعارات";
  }
}

function getAlertIcon(key: keyof AlertsSummary) {
  switch (key) {
    case "low_stock":
      return PackageSearch;
    case "maintenance_ready":
      return CheckCircle2;
    case "unread_notifications":
      return Bell;
    case "overdue_debts":
    case "reconciliation_drift":
      return AlertTriangle;
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
  const invoicePreview = recentInvoices.slice(0, 5);
  const hasRecentInvoices = invoicePreview.length > 0;
  const alertItems = ALERT_KEYS.map((key) => ({
    key,
    count: alertsSummary[key],
    href: getAlertHref(key),
    tone: getAlertTone(key),
    label: getAlertLabel(key),
    chipLabel: getAlertChipLabel(key),
    actionLabel: getAlertActionLabel(key),
    Icon: getAlertIcon(key)
  })).filter((item) => item.count > 0);
  const activeAlertsCount = alertItems.length;
  const activeAlertsTone =
    alertsSummary.overdue_debts > 0 ? "danger" : activeAlertsCount > 0 ? "warning" : "success";
  const readyForActionCount = alertsSummary.maintenance_ready;
  const kpiCards = [
    {
      key: "sales-count",
      label: "فواتير اليوم",
      value: formatCompactNumber(todaySalesCount),
      tone: "primary",
      Icon: ShoppingCart
    },
    {
      key: "sales-total",
      label: "إيراد اليوم",
      value: formatCurrency(todaySalesTotal),
      tone: "primary",
      Icon: Banknote
    },
    {
      key: "active-alerts",
      label: "تنبيهات نشطة",
      value: formatCompactNumber(activeAlertsCount),
      tone: activeAlertsTone,
      Icon: AlertTriangle
    },
    {
      key: "ready-actions",
      label: "جاهز للتنفيذ",
      value: formatCompactNumber(readyForActionCount),
      tone: readyForActionCount > 0 ? "success" : "primary",
      Icon: CheckCircle2
    }
  ] as const;

  return (
    <section className="workspace-stack operational-page dashboard-home">
      <PageHeader
        title="ملخص التشغيل اليومي"
        meta={
          <span className="status-pill status-pill--neutral dashboard-home__date-pill">
            {formatDate(today)}
          </span>
        }
        actions={
          <Link href="/pos" className="primary-button">
            ابدأ البيع
          </Link>
        }
      />

      <section className="dashboard-home__kpi-grid" aria-label="مؤشرات اليوم">
        {kpiCards.map(({ key, label, value, tone, Icon }) => (
          <article
            key={key}
            className={`dashboard-home__kpi-card dashboard-home__kpi-card--${tone}`}
          >
            <span className="dashboard-home__kpi-icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <strong className="dashboard-home__kpi-value">{value}</strong>
            <span className="dashboard-home__kpi-label">{label}</span>
          </article>
        ))}
      </section>

      <SectionCard
        title="تنبيهات تحتاج متابعة"
        actions={
          <Link href="/notifications" className="secondary-button">
            مركز التنبيهات
          </Link>
        }
      >
        {alertItems.length > 0 ? (
          <div className="dashboard-home__alerts" aria-label="التنبيهات النشطة">
            {alertItems.map(({ key, count, href, tone, label, chipLabel, actionLabel, Icon }) => (
              <Link
                key={key}
                href={href}
                className={`dashboard-home__alert-chip dashboard-home__alert-chip--${tone}`}
                aria-label={`${label}: ${formatCompactNumber(count)}. ${actionLabel}`}
              >
                <span className="dashboard-home__alert-chip-main">
                  <span className="dashboard-home__alert-chip-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span className="dashboard-home__alert-chip-count">
                    {formatCompactNumber(count)}
                  </span>
                  <span className="dashboard-home__alert-chip-label">{chipLabel}</span>
                </span>
                <ArrowLeft size={14} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="dashboard-home__section-empty">
            لا توجد تنبيهات مفتوحة الآن.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="آخر الفواتير"
        actions={
          <Link href="/invoices" className="secondary-button">
            عرض الكل
          </Link>
        }
      >
        {hasRecentInvoices ? (
          <div className="dashboard-home__invoice-list" role="list" aria-label="آخر الفواتير">
            <div className="dashboard-home__invoice-list-head" aria-hidden="true">
              <span>الفاتورة</span>
              <span>التاريخ</span>
              <span>الإجمالي</span>
              <span>الحالة</span>
            </div>

            {invoicePreview.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="dashboard-home__invoice-row"
                aria-label={`${invoice.invoice_number} بتاريخ ${formatDate(invoice.invoice_date)} بقيمة ${formatCurrency(invoice.total_amount)}`}
              >
                <span className="dashboard-home__invoice-number">
                  <bdi dir="ltr">{invoice.invoice_number}</bdi>
                </span>
                <span className="dashboard-home__invoice-date">
                  {formatDate(invoice.invoice_date)}
                </span>
                <strong className="dashboard-home__invoice-amount">
                  {formatCurrency(invoice.total_amount)}
                </strong>
                <span
                  className={`status-badge badge badge--${getInvoiceStatusTone(invoice.status)} dashboard-home__invoice-status`}
                >
                  {getInvoiceStatusLabel(invoice.status)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="dashboard-home__section-empty">
            لا توجد فواتير مسجلة لهذا اليوم بعد.
          </div>
        )}
      </SectionCard>
    </section>
  );
}
