"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, FileText, Plus, Search, SlidersHorizontal, X } from "lucide-react";
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

type InvoiceSortMode = "newest" | "highest" | "due";
type InvoiceStatusFilter = "all" | "active" | "returned" | "cancelled";
type InvoiceDateRange = "all" | "7d" | "30d" | "90d" | "custom";

function getInvoiceStatusLabel(status: string) {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

function isReturnedStatus(status: string) {
  return status === "returned" || status === "partially_returned";
}

function parseInvoiceDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function resolveRelativeDateStart(range: Exclude<InvoiceDateRange, "custom" | "all">) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  today.setDate(today.getDate() - (days - 1));
  return today;
}

export function InvoicesWorkspace({ role, invoices }: InvoicesWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<InvoiceSortMode>("newest");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>("all");
  const [dateRange, setDateRange] = useState<InvoiceDateRange>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [isAmountFilterEnabled, setIsAmountFilterEnabled] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const minAmountValue = minAmount.trim() === "" ? null : Number(minAmount);
  const maxAmountValue = maxAmount.trim() === "" ? null : Number(maxAmount);
  const hasAmountFilter = isAmountFilterEnabled && (minAmountValue !== null || maxAmountValue !== null);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (dateRange !== "all" ? 1 : 0) +
    (hasAmountFilter ? 1 : 0);

  const visibleInvoices = useMemo(() => {
    const filtered = invoices.filter((invoice) => {
      if (normalizedSearchTerm) {
        const haystack =
          `${invoice.invoice_number} ${invoice.customer_name ?? ""} ${invoice.pos_terminal_code ?? ""}`.toLowerCase();
        if (!haystack.includes(normalizedSearchTerm)) {
          return false;
        }
      }

      if (statusFilter === "active" && invoice.status !== "active") {
        return false;
      }

      if (statusFilter === "returned" && !isReturnedStatus(invoice.status)) {
        return false;
      }

      if (statusFilter === "cancelled" && invoice.status !== "cancelled") {
        return false;
      }

      const invoiceDate = parseInvoiceDate(invoice.invoice_date);
      invoiceDate.setHours(0, 0, 0, 0);

      if (dateRange === "custom") {
        if (customDateFrom) {
          const fromDate = parseInvoiceDate(customDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (invoiceDate < fromDate) {
            return false;
          }
        }

        if (customDateTo) {
          const toDate = parseInvoiceDate(customDateTo);
          toDate.setHours(0, 0, 0, 0);
          if (invoiceDate > toDate) {
            return false;
          }
        }
      } else if (dateRange !== "all") {
        const fromDate = resolveRelativeDateStart(dateRange);
        if (invoiceDate < fromDate) {
          return false;
        }
      }

      if (hasAmountFilter) {
        if (minAmountValue !== null && invoice.total_amount < minAmountValue) {
          return false;
        }

        if (maxAmountValue !== null && invoice.total_amount > maxAmountValue) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === "highest") {
        return right.total_amount - left.total_amount;
      }

      if (sortMode === "due" && right.debt_amount !== left.debt_amount) {
        return right.debt_amount - left.debt_amount;
      }

      return new Date(right.invoice_date).getTime() - new Date(left.invoice_date).getTime();
    });
  }, [
    customDateFrom,
    customDateTo,
    dateRange,
    hasAmountFilter,
    invoices,
    maxAmountValue,
    minAmountValue,
    normalizedSearchTerm,
    sortMode,
    statusFilter
  ]);

  function clearAllFilters() {
    setStatusFilter("all");
    setDateRange("all");
    setCustomDateFrom("");
    setCustomDateTo("");
    setIsAmountFilterEnabled(false);
    setMinAmount("");
    setMaxAmount("");
  }

  return (
    <section className="workspace-stack transaction-page invoice-page invoices-page">
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
        <div className="invoices-page__filters">
          <button
            type="button"
            className="secondary-button invoices-page__filters-toggle"
            aria-expanded={isFiltersOpen}
            aria-controls="invoices-filters-panel"
            onClick={() => setIsFiltersOpen((current) => !current)}
          >
            <span className="invoices-page__filters-toggle-label">
              <SlidersHorizontal size={16} />
              فلاتر السجل
            </span>
            <span className="invoices-page__filters-toggle-copy">
              {activeFilterCount > 0 ? `${activeFilterCount} مفعلة` : "مغلقة افتراضيًا"}
            </span>
          </button>

          <div id="invoices-filters-panel" className="invoices-page__filters-panel" hidden={!isFiltersOpen}>
            <div className="invoices-page__filter-group" role="group" aria-label="فلتر الحالة">
              <span className="invoices-page__filter-label">الحالة</span>
              <div className="chip-row invoices-page__filter-chips">
                {[
                  { key: "all", label: "الكل" },
                  { key: "active", label: "نشطة" },
                  { key: "returned", label: "مرتجعة" },
                  { key: "cancelled", label: "ملغاة" }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={statusFilter === option.key ? "chip-button is-selected" : "chip-button"}
                    aria-pressed={statusFilter === option.key}
                    onClick={() => setStatusFilter(option.key as InvoiceStatusFilter)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="invoices-page__filter-group" role="group" aria-label="فلتر التاريخ">
              <span className="invoices-page__filter-label">التاريخ</span>
              <div className="chip-row invoices-page__filter-chips">
                {[
                  { key: "all", label: "الكل" },
                  { key: "7d", label: "7 أيام" },
                  { key: "30d", label: "30 يومًا" },
                  { key: "90d", label: "90 يومًا" },
                  { key: "custom", label: "مخصص" }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={dateRange === option.key ? "chip-button is-selected" : "chip-button"}
                    aria-pressed={dateRange === option.key}
                    onClick={() => setDateRange(option.key as InvoiceDateRange)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {dateRange === "custom" ? (
                <div className="invoices-page__date-range">
                  <label className="stack-field">
                    <span>من</span>
                    <input type="date" value={customDateFrom} onChange={(event) => setCustomDateFrom(event.target.value)} />
                  </label>
                  <label className="stack-field">
                    <span>إلى</span>
                    <input type="date" value={customDateTo} onChange={(event) => setCustomDateTo(event.target.value)} />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="invoices-page__filter-group" role="group" aria-label="فلتر القيمة">
              <label className="stack-checkbox invoices-page__amount-toggle">
                <input
                  className="field-input"
                  type="checkbox"
                  checked={isAmountFilterEnabled}
                  onChange={(event) => {
                    const nextValue = event.target.checked;
                    setIsAmountFilterEnabled(nextValue);
                    if (!nextValue) {
                      setMinAmount("");
                      setMaxAmount("");
                    }
                  }}
                />
                <span>تفعيل فلتر القيمة</span>
              </label>

              {isAmountFilterEnabled ? (
                <div className="invoices-page__amount-grid">
                  <label className="stack-field">
                    <span>الحد الأدنى</span>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={minAmount}
                      onChange={(event) => setMinAmount(event.target.value)}
                      placeholder="0.000"
                    />
                  </label>
                  <label className="stack-field">
                    <span>الحد الأعلى</span>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={maxAmount}
                      onChange={(event) => setMaxAmount(event.target.value)}
                      placeholder="0.000"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          {activeFilterCount > 0 ? (
            <div className="invoices-page__active-filters" aria-label="الفلاتر النشطة">
              {statusFilter !== "all" ? (
                <button type="button" className="chip-button is-selected invoices-page__active-filter" onClick={() => setStatusFilter("all")}>
                  الحالة: {statusFilter === "active" ? "نشطة" : statusFilter === "returned" ? "مرتجعة" : "ملغاة"}
                  <X size={14} />
                </button>
              ) : null}

              {dateRange !== "all" ? (
                <button
                  type="button"
                  className="chip-button is-selected invoices-page__active-filter"
                  onClick={() => {
                    setDateRange("all");
                    setCustomDateFrom("");
                    setCustomDateTo("");
                  }}
                >
                  {dateRange === "custom"
                    ? `التاريخ: ${customDateFrom || "..." } → ${customDateTo || "..." }`
                    : `التاريخ: ${dateRange}`}
                  <X size={14} />
                </button>
              ) : null}

              {hasAmountFilter ? (
                <button
                  type="button"
                  className="chip-button is-selected invoices-page__active-filter"
                  onClick={() => {
                    setIsAmountFilterEnabled(false);
                    setMinAmount("");
                    setMaxAmount("");
                  }}
                >
                  المبلغ: {minAmountValue !== null ? formatCurrency(minAmountValue) : "..." } - {maxAmountValue !== null ? formatCurrency(maxAmountValue) : "..."}
                  <X size={14} />
                </button>
              ) : null}

              <button type="button" className="secondary-button invoices-page__clear-filters" onClick={clearAllFilters}>
                مسح كل الفلاتر
              </button>
            </div>
          ) : null}
        </div>

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
              <button type="button" className="secondary-button" onClick={() => setSearchTerm("")}>
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
                  <strong className="invoice-page__amount">{formatCurrency(invoice.total_amount)}</strong>
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
