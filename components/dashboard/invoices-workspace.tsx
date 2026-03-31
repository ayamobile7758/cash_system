"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, FileText, Plus, Search } from "lucide-react";
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

type InvoiceSortMode = "newest" | "highest" | "due";

export function InvoicesWorkspace({ role, invoices }: InvoicesWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<InvoiceSortMode>("newest");

  const visibleInvoices = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const filtered = !normalized
      ? invoices
      : invoices.filter((invoice) => {
          const haystack =
            `${invoice.invoice_number} ${invoice.customer_name ?? ""} ${invoice.pos_terminal_code ?? ""}`.toLowerCase();
          return haystack.includes(normalized);
        });

    return [...filtered].sort((left, right) => {
      if (sortMode === "highest") {
        return right.total_amount - left.total_amount;
      }

      if (sortMode === "due") {
        if (right.debt_amount !== left.debt_amount) {
          return right.debt_amount - left.debt_amount;
        }
      }

      return (
        new Date(right.invoice_date).getTime() - new Date(left.invoice_date).getTime()
      );
    });
  }, [invoices, searchTerm, sortMode]);

  return (
    <section className="workspace-stack transaction-page invoice-page">
      <PageHeader
        title="الفواتير"
        meta={
          <>
            <span className="status-pill badge badge--neutral">
              {formatCompactNumber(visibleInvoices.length)} فاتورة
            </span>
            <span className="status-pill badge badge--neutral">
              {role === "admin" ? "عرض إداري" : "عرض نقطة البيع"}
            </span>
          </>
        }
        actions={
          <Link href="/pos" className="primary-button">
            <Plus size={16} />
            فاتورة جديدة
          </Link>
        }
      />

      <SectionCard
        title="السجل"
        className="transaction-card invoice-page__card"
        actions={
          <div className="invoice-page__sort">
            <span className="product-pill">
              <ArrowUpDown size={14} />
              ترتيب
            </span>
            <button
              type="button"
              className={sortMode === "newest" ? "chip-button is-selected" : "chip-button"}
              onClick={() => setSortMode("newest")}
            >
              الأحدث
            </button>
            <button
              type="button"
              className={sortMode === "highest" ? "chip-button is-selected" : "chip-button"}
              onClick={() => setSortMode("highest")}
            >
              الأعلى قيمة
            </button>
            <button
              type="button"
              className={sortMode === "due" ? "chip-button is-selected" : "chip-button"}
              onClick={() => setSortMode("due")}
            >
              الأعلى دينًا
            </button>
          </div>
        }
      >
        <div className="workspace-toolbar transaction-toolbar invoice-page__toolbar">
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

        {visibleInvoices.length === 0 ? (
          <div className="empty-panel transaction-empty-panel invoice-page__empty">
            <FileText size={20} />
            <h3>{searchTerm.trim() ? "لا توجد فواتير مطابقة" : "لا توجد فواتير متاحة"}</h3>
            {searchTerm.trim() ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSearchTerm("")}
              >
                مسح البحث
              </button>
            ) : (
              <Link href="/pos" className="secondary-button">
                فاتورة جديدة
              </Link>
            )}
          </div>
        ) : (
          <div className="invoice-page__list">
            {visibleInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="invoice-page__row"
                aria-label={`فتح الفاتورة ${invoice.invoice_number}`}
              >
                <div className="invoice-page__main">
                  <div className="invoice-page__identity">
                    <strong className="invoice-page__number">
                      <bdi dir="ltr">{invoice.invoice_number}</bdi>
                    </strong>
                    <div className="invoice-page__meta">
                      <span>{formatDate(invoice.invoice_date)}</span>
                      <span>{invoice.customer_name ?? "بيع مباشر"}</span>
                      <span>{invoice.pos_terminal_code ?? "بدون جهاز"}</span>
                    </div>
                  </div>
                </div>

                <div className="invoice-page__financial">
                  <strong className="invoice-page__amount">
                    {formatCurrency(invoice.total_amount)}
                  </strong>
                  {invoice.debt_amount > 0 ? (
                    <span className="status-pill badge badge--warning">
                      متبقي {formatCurrency(invoice.debt_amount)}
                    </span>
                  ) : invoice.invoice_discount_amount > 0 ? (
                    <span className="status-pill badge badge--neutral">
                      خصم {formatCurrency(invoice.invoice_discount_amount)}
                    </span>
                  ) : null}
                </div>

                <div className="invoice-page__status">
                  <span className={`status-badge status-badge--${invoice.status}`}>
                    {getInvoiceStatusLabel(invoice.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </section>
  );
}
