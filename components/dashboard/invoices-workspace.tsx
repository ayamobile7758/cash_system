"use client";

import { useMemo, useState } from "react";
import { Search, ChevronLeft, FileText } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import type { AccountOption, InvoiceOption } from "@/lib/api/dashboard";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/utils/formatters";

type InvoicesWorkspaceProps = {
  role: "admin" | "pos_staff";
  invoices: InvoiceOption[];
  accounts: AccountOption[];
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  active: "نشطة",
  partially_returned: "مرتجع جزئي",
  returned: "مرتجعة",
  cancelled: "ملغاة"
};

function getInvoiceStatusLabel(status: string) {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

export function InvoicesWorkspace({ role, invoices }: InvoicesWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInvoices = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const haystack = `${invoice.invoice_number} ${invoice.customer_name ?? ""} ${invoice.pos_terminal_code ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [invoices, searchTerm]);

  return (
    <section className="workspace-stack transaction-page">
      <PageHeader
        eyebrow="الفواتير"
        title="الفواتير والإيصالات والمرتجعات"
        meta={
          <div className="transaction-page__meta" aria-label="ملخص شاشة الفواتير">
            <article className="transaction-page__meta-card stat-card">
              <span>الفواتير المعروضة</span>
              <strong>{formatCompactNumber(filteredInvoices.length)}</strong>
            </article>
            <article className="transaction-page__meta-card stat-card">
              <span>نطاق العرض</span>
              <strong>{role === "admin" ? "كامل" : "محدود بالمستخدم"}</strong>
            </article>
            <article className="transaction-page__meta-card transaction-page__meta-card--safe stat-card">
              <ChevronLeft size={18} />
              <strong>الفواتير الحديثة</strong>
            </article>
          </div>
        }
      />

      <SectionCard
        eyebrow="سجل الفواتير"
        title="قائمة الفواتير"
        className="transaction-card"
      >
        <div className="workspace-toolbar transaction-toolbar">
          <label className="workspace-search transaction-toolbar__search">
            <Search size={18} />
            <input
              className="field-input"
              type="search"
              placeholder="ابحث برقم الفاتورة أو العميل أو الجهاز"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="empty-panel transaction-empty-panel">
            <FileText size={18} />
            <h3>لا توجد فواتير مطابقة</h3>
            <p>لا توجد فواتير متاحة حاليًا.</p>
          </div>
        ) : (
          <div className="stack-list transaction-list-shell">
            {filteredInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="list-card list-card--interactive"
                aria-label={`فتح الفاتورة ${invoice.invoice_number}`}
              >
                <div className="list-card__header">
                  <strong>{invoice.invoice_number}</strong>
                  <span className={`status-badge status-badge--${invoice.status} badge badge--info`}>
                    {getInvoiceStatusLabel(invoice.status)}
                  </span>
                </div>
                <p>التاريخ: {formatDate(invoice.invoice_date)}</p>
                <p>الإجمالي: {formatCurrency(invoice.total_amount)}</p>
                <p className="workspace-footnote">
                  الجهاز: {invoice.pos_terminal_code ?? "غير محدد"} | العميل: {invoice.customer_name ?? "بيع مباشر"}
                </p>
                {invoice.invoice_discount_amount > 0 ? (
                  <p className="workspace-footnote">
                    خصم فاتورة: {formatCurrency(invoice.invoice_discount_amount)} ({invoice.invoice_discount_percentage}%)
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </section>
  );
}
