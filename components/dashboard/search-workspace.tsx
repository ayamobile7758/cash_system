"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import type { GlobalSearchBaseline, GlobalSearchItem } from "@/lib/api/search";
import type { SearchEntity } from "@/lib/validations/search";

type SearchWorkspaceProps = {
  baseline: GlobalSearchBaseline;
};

const ENTITY_LABELS: Record<SearchEntity, string> = {
  product: "المنتجات",
  invoice: "الفواتير",
  debt_customer: "الديون",
  maintenance_job: "الصيانة"
};

function getEntityHref(item: GlobalSearchItem) {
  switch (item.entity) {
    case "product":
      return `/products?product_id=${encodeURIComponent(item.id)}`;
    case "invoice":
      return `/invoices?invoice_id=${encodeURIComponent(item.id)}`;
    case "debt_customer":
      return `/debts?customer_id=${encodeURIComponent(item.id)}`;
    case "maintenance_job":
      return `/maintenance?job_id=${encodeURIComponent(item.id)}`;
  }
}

function buildSearchHref(filters: GlobalSearchBaseline["filters"], entity: SearchEntity | "all") {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (entity !== "all") {
    params.set("entity", entity);
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

export function SearchWorkspace({ baseline }: SearchWorkspaceProps) {
  const { filters, groups, totalCount, allowedEntities, errorMessage } = baseline;
  const activeEntity = filters.entity ?? "all";
  const entityChips: Array<SearchEntity | "all"> = allowedEntities.length > 0 ? ["all", ...allowedEntities] : [];
  const hasQuery = filters.q.length > 0;

  return (
    <section className="workspace-stack operational-page">
      <PageHeader
        title="نتائج البحث"
        meta={
          <div className="transaction-page__meta" aria-label="ملخص البحث">
            <article className="transaction-page__meta-card stat-card">
              <span>المصطلح الحالي</span>
              <strong>{hasQuery ? filters.q : "غير محدد"}</strong>
            </article>
            <article className="transaction-page__meta-card stat-card">
              <span>النتائج</span>
              <strong>{totalCount}</strong>
            </article>
            <article className="transaction-page__meta-card transaction-page__meta-card--safe stat-card">
              <span>المصادر المتاحة</span>
              <strong>{allowedEntities.length}</strong>
            </article>
          </div>
        }
      />

      {errorMessage ? (
        <StatusBanner variant="danger" title="تعذر تفسير طلب البحث" message={errorMessage} />
      ) : null}

      <SectionCard eyebrow="التصفية" title="حدد نوع النتائج" tone="accent">
        <div className="chip-row" aria-label="تصفية نتائج البحث">
          {entityChips.map((entity) => (
            <Link
              key={entity}
              href={buildSearchHref(filters, entity)}
              className={entity === activeEntity ? "status-pill badge status-pill--brand" : "status-pill status-pill--neutral badge"}
              aria-pressed={entity === activeEntity}
            >
              {entity === "all" ? "الكل" : ENTITY_LABELS[entity]}
            </Link>
          ))}
        </div>
      </SectionCard>

      {!hasQuery ? (
        <SectionCard
          eyebrow="البحث"
          title="أدخل عبارة البحث"
          tone="subtle"
        />
      ) : groups.length === 0 ? (
        <SectionCard
          eyebrow="لا توجد نتائج"
          title="لم نعثر على نتائج مطابقة"
          tone="subtle"
        />
      ) : (
        <div className="transaction-stack">
          {groups.map((group) => (
            <SectionCard
              key={group.entity}
              eyebrow={group.title}
              title={`${group.title} (${group.items.length})`}
              className="transaction-card"
            >
              <div className="transaction-stack">
                {group.items.map((item) => (
                  <Link key={`${item.entity}-${item.id}`} href={getEntityHref(item)} className="transaction-page__meta-card stat-card">
                    <span>{item.label}</span>
                    <strong>{item.secondary}</strong>
                  </Link>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </section>
  );
}
