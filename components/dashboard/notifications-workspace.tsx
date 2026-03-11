"use client";

import Link from "next/link";
import { useTransition } from "react";
import { BellRing, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { NotificationFilters, NotificationItem } from "@/lib/api/notifications";
import type { AlertsSummary, GlobalSearchBaseline, GlobalSearchItem } from "@/lib/api/search";
import type { StandardEnvelope } from "@/lib/pos/types";
import { formatCompactNumber, formatDateTime } from "@/lib/utils/formatters";

type NotificationsWorkspaceProps = {
  role: "admin" | "pos_staff";
  alertsSummary: AlertsSummary | null;
  filters: NotificationFilters;
  notifications: NotificationItem[];
  searchBaseline: GlobalSearchBaseline;
  unreadCount: number;
  totalCount: number;
};

type MarkReadResponse = {
  updated_count: number;
};

type SendWhatsAppResponse = {
  delivery_log_id: string;
  status: "queued";
  wa_url: string;
};

function getApiErrorMessage<T>(envelope: StandardEnvelope<T>) {
  return envelope.error?.message ?? "تعذر إتمام العملية.";
}

function getReferenceHref(notification: NotificationItem) {
  switch (notification.reference_type) {
    case "invoice":
      return "/invoices";
    case "debt_customer":
    case "debt_entry":
    case "debt_payment":
      return "/debts";
    case "maintenance_job":
      return "/maintenance";
    case "inventory_count":
      return "/inventory";
    default:
      return null;
  }
}

function getSearchResultHref(item: GlobalSearchItem) {
  switch (item.entity) {
    case "product":
      return "/products";
    case "invoice":
      return "/invoices";
    case "debt_customer":
      return "/debts";
    case "maintenance_job":
      return "/maintenance";
  }
}

function getAlertHref(key: keyof AlertsSummary) {
  switch (key) {
    case "low_stock":
      return "/products";
    case "overdue_debts":
      return "/debts";
    case "reconciliation_drift":
      return "/inventory";
    case "maintenance_ready":
      return "/maintenance";
    case "unread_notifications":
      return "/notifications?status=unread";
  }
}

function getAlertLabel(key: keyof AlertsSummary) {
  switch (key) {
    case "low_stock":
      return "مخزون منخفض";
    case "overdue_debts":
      return "ديون متأخرة";
    case "reconciliation_drift":
      return "فروقات تسوية";
    case "maintenance_ready":
      return "صيانة جاهزة";
    case "unread_notifications":
      return "إشعارات غير مقروءة";
  }
}

export function NotificationsWorkspace({
  role,
  alertsSummary,
  filters,
  notifications,
  searchBaseline,
  unreadCount,
  totalCount
}: NotificationsWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function postRead(body: { notification_ids?: string[]; mark_all?: boolean }) {
    const response = await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const envelope = (await response.json()) as StandardEnvelope<MarkReadResponse>;
    if (!response.ok || !envelope.success || !envelope.data) {
      toast.error(getApiErrorMessage(envelope));
      return;
    }

    toast.success(`تم تحديث ${envelope.data.updated_count} إشعار.`);
    router.refresh();
  }

  function handleMarkSingle(notificationId: string) {
    startTransition(() => {
      void postRead({ notification_ids: [notificationId] });
    });
  }

  function handleMarkAll() {
    startTransition(() => {
      void postRead({ mark_all: true });
    });
  }

  function handleWhatsAppSend(notification: NotificationItem) {
    if (!notification.contact_phone || !notification.whatsapp_template_key || !notification.reference_type || !notification.reference_id) {
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/messages/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_key: notification.whatsapp_template_key,
            target_phone: notification.contact_phone,
            reference_type: notification.reference_type,
            reference_id: notification.reference_id,
            payload: {},
            idempotency_key: crypto.randomUUID()
          })
        });

        const envelope = (await response.json()) as StandardEnvelope<SendWhatsAppResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          toast.error(getApiErrorMessage(envelope));
          return;
        }

        window.open(envelope.data.wa_url, "_blank", "noopener,noreferrer");
        toast.success("تم تجهيز رابط واتساب وتسجيل المحاولة.");
      })();
    });
  }

  const alertKeys = alertsSummary
    ? (["low_stock", "overdue_debts", "reconciliation_drift", "maintenance_ready", "unread_notifications"] as const)
    : [];

  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">PX-13 / Search + Alerts</p>
          <h1>مركز التنبيهات والبحث السريع</h1>
          <p className="workspace-lead">
            يجمع هذا السطح بين inbox الإشعارات الحالية والبحث الشامل bounded حسب الصلاحيات، مع alert summary مجمعة
            للـ Admin فقط حتى تقل الضوضاء من دون فتح أي read path مالي جديد.
          </p>
        </div>

        <div className="action-row">
          <Link href="/notifications" className="secondary-button">
            إعادة ضبط المركز
          </Link>
          <button
            type="button"
            className="primary-button"
            disabled={isPending || unreadCount === 0}
            onClick={() => void handleMarkAll()}
          >
            {isPending ? <Loader2 className="spin" size={16} /> : "تعليم الكل كمقروء"}
          </button>
        </div>
      </div>

      {alertsSummary ? (
        <section className="summary-grid">
          {alertKeys.map((key) => (
            <article key={key} className="workspace-panel">
              <p className="eyebrow">{getAlertLabel(key)}</p>
              <h2>{formatCompactNumber(alertsSummary[key])}</h2>
              <p className="workspace-footnote">يُعرض هذا الرقم مرة واحدة لكل cluster تشغيلي بدل الضوضاء المتكررة.</p>
              <div className="action-row">
                <Link href={getAlertHref(key)} className="secondary-button">
                  فتح المسار
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Global Search</p>
            <h2>البحث الشامل</h2>
          </div>
          <Search size={18} />
        </div>

        <form className="filters-grid" method="GET">
          <input type="hidden" name="status" value={filters.status} />
          <input type="hidden" name="type" value={filters.type ?? ""} />
          <input type="hidden" name="page" value={String(filters.page)} />
          <input type="hidden" name="page_size" value={String(filters.pageSize)} />

          <label className="stack-field">
            <span>الاستعلام</span>
            <input
              name="q"
              defaultValue={searchBaseline.filters.q}
              placeholder="اسم منتج، رقم فاتورة، عميل أو رقم صيانة"
            />
          </label>

          <label className="stack-field">
            <span>الكيان</span>
            <select name="entity" defaultValue={searchBaseline.filters.entity}>
              <option value="all">الكل</option>
              {searchBaseline.allowedEntities.includes("product") ? <option value="product">المنتجات</option> : null}
              {searchBaseline.allowedEntities.includes("invoice") ? <option value="invoice">الفواتير</option> : null}
              {searchBaseline.allowedEntities.includes("debt_customer") ? <option value="debt_customer">الديون</option> : null}
              {searchBaseline.allowedEntities.includes("maintenance_job") ? (
                <option value="maintenance_job">الصيانة</option>
              ) : null}
            </select>
          </label>

          <label className="stack-field">
            <span>حد النتائج</span>
            <input type="number" name="limit" min={1} max={20} defaultValue={String(searchBaseline.filters.limit)} />
          </label>

          <div className="action-row action-row--end">
            <button type="submit" className="primary-button">
              تنفيذ البحث
            </button>
          </div>
        </form>

        {searchBaseline.errorMessage ? (
          <div className="empty-panel">
            <p>{searchBaseline.errorMessage}</p>
          </div>
        ) : searchBaseline.filters.q ? (
          <>
            <p className="workspace-footnote">
              النتائج الحالية: {formatCompactNumber(searchBaseline.totalCount)} ضمن الحدود المسموح بها للدور الحالي.
            </p>

            <div className="detail-grid">
              {searchBaseline.groups.length > 0 ? (
                searchBaseline.groups.map((group) => (
                  <section key={group.entity} className="workspace-panel">
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">{group.entity}</p>
                        <h2>{group.title}</h2>
                      </div>
                    </div>

                    <div className="stack-list">
                      {group.items.map((item) => (
                        <article key={item.id} className="list-card">
                          <div className="list-card__header">
                            <strong>{item.label}</strong>
                            <span>{group.title}</span>
                          </div>
                          <p>{item.secondary}</p>
                          <div className="action-row">
                            <Link href={getSearchResultHref(item)} className="secondary-button">
                              فتح المسار
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="empty-panel">
                  <p>لا توجد نتائج مطابقة ضمن حدود الدور الحالي.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-panel">
            <p>أدخل استعلامًا من حرفين على الأقل لعرض النتائج المجمعة حسب الكيان.</p>
          </div>
        )}
      </section>

      <section className="summary-grid">
        <article className="workspace-panel">
          <p className="eyebrow">Unread</p>
          <h2>{formatCompactNumber(unreadCount)}</h2>
          <p className="workspace-footnote">الإشعارات غير المقروءة ضمن النطاق الحالي.</p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Visible Total</p>
          <h2>{formatCompactNumber(totalCount)}</h2>
          <p className="workspace-footnote">إجمالي الإشعارات بعد الفلاتر الحالية.</p>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Role Scope</p>
          <h2>{role === "admin" ? "Admin" : "POS"}</h2>
          <p className="workspace-footnote">
            {role === "admin"
              ? "يعرض كل الإشعارات التشغيلية مع alert summary المجمعة."
              : "يعرض الإشعارات الخاصة بالمستخدم الحالي فقط دون أي كاشف مالي إداري."}
          </p>
        </article>
      </section>

      <section className="workspace-panel">
        <form className="filters-grid" method="GET">
          <input type="hidden" name="q" value={searchBaseline.filters.q} />
          <input type="hidden" name="entity" value={searchBaseline.filters.entity} />
          <input type="hidden" name="limit" value={String(searchBaseline.filters.limit)} />

          <label className="stack-field">
            <span>الحالة</span>
            <select name="status" defaultValue={filters.status}>
              <option value="all">الكل</option>
              <option value="unread">غير مقروء</option>
            </select>
          </label>

          <label className="stack-field">
            <span>النوع</span>
            <input name="type" defaultValue={filters.type ?? ""} placeholder="maintenance_ready" />
          </label>

          <label className="stack-field">
            <span>رقم الصفحة</span>
            <input type="number" min={1} name="page" defaultValue={String(filters.page)} />
          </label>

          <label className="stack-field">
            <span>حجم الصفحة</span>
            <input type="number" min={1} max={100} name="page_size" defaultValue={String(filters.pageSize)} />
          </label>

          <div className="action-row action-row--end">
            <button type="submit" className="primary-button">
              تطبيق فلاتر الإشعارات
            </button>
          </div>
        </form>
      </section>

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inbox</p>
            <h2>الإشعارات الحالية</h2>
          </div>
          <BellRing size={18} />
        </div>

        <div className="stack-list">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const referenceHref = getReferenceHref(notification);

              return (
                <article key={notification.id} className="list-card">
                  <div className="list-card__header">
                    <strong>{notification.title}</strong>
                    <span>{notification.is_read ? "مقروء" : "غير مقروء"}</span>
                  </div>
                  <p>{notification.body}</p>
                  <p className="workspace-footnote">
                    النوع: {notification.type} — {formatDateTime(notification.created_at)}
                  </p>
                  {role === "admin" ? (
                    <p className="workspace-footnote">المستخدم: {notification.user_name ?? "غير معروف"}</p>
                  ) : null}
                  <div className="action-row">
                    {!notification.is_read ? (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isPending}
                        onClick={() => void handleMarkSingle(notification.id)}
                      >
                        تعليم كمقروء
                      </button>
                    ) : null}
                    {role === "admin" && notification.contact_phone && notification.whatsapp_template_key ? (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isPending}
                        onClick={() => handleWhatsAppSend(notification)}
                      >
                        إرسال واتساب
                      </button>
                    ) : null}
                    {referenceHref ? (
                      <Link href={referenceHref} className="secondary-button">
                        فتح المرجع
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-panel">
              <p>لا توجد إشعارات مطابقة للفلاتر الحالية.</p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
