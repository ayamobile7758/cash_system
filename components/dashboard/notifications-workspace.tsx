"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent
} from "react";
import { BellRing, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBanner } from "@/components/ui/status-banner";
import type { NotificationFilters, NotificationItem } from "@/lib/api/notifications";
import type {
  AlertsSummary,
  GlobalSearchBaseline,
  GlobalSearchItem
} from "@/lib/api/search";
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

type NotificationsSection = "inbox" | "alerts" | "search";
type NotificationsRetryAction = "mark-all" | "mark-single" | "whatsapp";

const NOTIFICATION_TABS = [
  { key: "inbox", label: "صندوق الإشعارات" },
  { key: "alerts", label: "الملخصات والتنبيهات" },
  { key: "search", label: "البحث الشامل" }
] as const;

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

function getRoleLabel(role: "admin" | "pos_staff") {
  return role === "admin" ? "إداري" : "نقطة بيع";
}

function getNotificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    low_stock: "مخزون منخفض",
    overdue_debt: "دين متأخر",
    maintenance_ready: "صيانة جاهزة",
    large_discount: "خصم كبير",
    portability_event: "عملية نقل أو نسخ",
    reconciliation_drift: "فروقات تسوية",
    unread_notifications: "إشعارات غير مقروءة"
  };

  return labels[type] ?? type.replace(/_/g, " ");
}

function getNotificationStatusLabel(notification: NotificationItem) {
  return notification.is_read ? "مقروء" : "غير مقروء";
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
  const [activeSection, setActiveSection] = useState<NotificationsSection>(
    searchBaseline.filters.q ? "search" : "inbox"
  );
  const [isInboxFiltersOpen, setIsInboxFiltersOpen] = useState(
    () =>
      filters.status === "unread" ||
      Boolean(filters.type) ||
      filters.page !== 1 ||
      filters.pageSize !== 20
  );
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<NotificationsRetryAction | null>(null);
  const [retryNotificationId, setRetryNotificationId] = useState<string | null>(null);
  const tabRefs = useRef<Record<NotificationsSection, HTMLButtonElement | null>>({
    inbox: null,
    alerts: null,
    search: null
  });

  useEffect(() => {
    setActiveSection(searchBaseline.filters.q ? "search" : "inbox");
  }, [searchBaseline.filters.q]);

  useEffect(() => {
    if (!alertsSummary && activeSection === "alerts") {
      setActiveSection(searchBaseline.filters.q ? "search" : "inbox");
    }
  }, [activeSection, alertsSummary, searchBaseline.filters.q]);

  function clearActionFeedback() {
    setActionErrorMessage(null);
    setRetryAction(null);
    setRetryNotificationId(null);
  }

  function failAction(
    message: string,
    action: NotificationsRetryAction,
    notificationId?: string
  ) {
    setActionErrorMessage(message);
    setRetryAction(action);
    setRetryNotificationId(notificationId ?? null);
    toast.error(message);
  }

  async function postRead(
    body: { notification_ids?: string[]; mark_all?: boolean },
    action: NotificationsRetryAction,
    notificationId?: string
  ) {
    const response = await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const envelope = (await response.json()) as StandardEnvelope<MarkReadResponse>;
    if (!response.ok || !envelope.success || !envelope.data) {
      failAction(getApiErrorMessage(envelope), action, notificationId);
      return;
    }

    clearActionFeedback();
    toast.success(`تم تحديث ${envelope.data.updated_count} إشعار.`);
    router.refresh();
  }

  function handleMarkSingle(notificationId: string) {
    clearActionFeedback();
    startTransition(() => {
      void postRead(
        { notification_ids: [notificationId] },
        "mark-single",
        notificationId
      );
    });
  }

  function handleMarkAll() {
    clearActionFeedback();
    startTransition(() => {
      void postRead({ mark_all: true }, "mark-all");
    });
  }

  function handleWhatsAppSend(notification: NotificationItem) {
    if (
      !notification.contact_phone ||
      !notification.whatsapp_template_key ||
      !notification.reference_type ||
      !notification.reference_id
    ) {
      failAction("تعذر تجهيز محاولة الإرسال لهذا الإشعار.", "whatsapp", notification.id);
      return;
    }

    clearActionFeedback();
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

        const envelope =
          (await response.json()) as StandardEnvelope<SendWhatsAppResponse>;
        if (!response.ok || !envelope.success || !envelope.data) {
          failAction(getApiErrorMessage(envelope), "whatsapp", notification.id);
          return;
        }

        clearActionFeedback();
        window.open(envelope.data.wa_url, "_blank", "noopener,noreferrer");
        toast.success("تم تجهيز رابط واتساب وتسجيل المحاولة.");
      })();
    });
  }

  function retryLastAction() {
    switch (retryAction) {
      case "mark-all":
        handleMarkAll();
        break;
      case "mark-single":
        if (retryNotificationId) {
          handleMarkSingle(retryNotificationId);
        }
        break;
      case "whatsapp": {
        const notification = notifications.find(
          (item) => item.id === retryNotificationId
        );
        if (notification) {
          handleWhatsAppSend(notification);
        }
        break;
      }
      default:
        break;
    }
  }

  const alertKeys = alertsSummary
    ? ([
        "low_stock",
        "overdue_debts",
        "reconciliation_drift",
        "maintenance_ready",
        "unread_notifications"
      ] as const)
    : [];
  const visibleAlertKeys = alertsSummary
    ? alertKeys.filter((key) => alertsSummary[key] > 0)
    : [];
  const visibleTabs = useMemo(
    () => NOTIFICATION_TABS.filter((tab) => tab.key !== "alerts" || alertsSummary),
    [alertsSummary]
  );
  const inboxFilterSummary = useMemo(() => {
    const summary: string[] = [];

    if (filters.status === "unread") {
      summary.push("غير مقروء");
    }

    if (filters.type) {
      summary.push(`النوع: ${filters.type}`);
    }

    if (filters.page !== 1) {
      summary.push(`صفحة ${filters.page}`);
    }

    if (filters.pageSize !== 20) {
      summary.push(`${filters.pageSize} في الصفحة`);
    }

    return summary;
  }, [filters.page, filters.pageSize, filters.status, filters.type]);

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: NotificationsSection
  ) {
    const currentIndex = visibleTabs.findIndex((tab) => tab.key === currentTab);
    if (currentIndex === -1) {
      return;
    }

    const focusTab = (index: number) => {
      const nextTab = visibleTabs[index]?.key;
      if (nextTab) {
        tabRefs.current[nextTab]?.focus();
      }
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusTab((currentIndex + 1) % visibleTabs.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusTab((currentIndex - 1 + visibleTabs.length) % visibleTabs.length);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(visibleTabs.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        setActiveSection(currentTab);
        break;
      default:
        break;
    }
  }

  return (
    <section className="operational-page notifications-page">
      <PageHeader
        title="الإشعارات"
        meta={
          <>
            <span className="status-pill badge badge--neutral">
              الدور: {getRoleLabel(role)}
            </span>
            <span className="status-pill badge badge--neutral">
              غير المقروء: {formatCompactNumber(unreadCount)}
            </span>
            <span className="status-pill badge badge--neutral">
              الإجمالي: {formatCompactNumber(totalCount)}
            </span>
          </>
        }
        actions={
          <div className="transaction-action-cluster">
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
        }
      />

      <div
        className="operational-section-nav notifications-page__sections"
        aria-label="أقسام مركز الإشعارات"
      >
        <div
          className="notifications-page__tabs nav-tabs"
          aria-label="تبويبات مركز الإشعارات"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[tab.key] = node;
              }}
              type="button"
              id={`notifications-tab-${tab.key}`}
              aria-pressed={activeSection === tab.key}
              aria-controls={`notifications-panel-${tab.key}`}
              className={`notifications-page__tab nav-tab ${activeSection === tab.key ? "is-active" : ""}`}
              onClick={() => setActiveSection(tab.key)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {actionErrorMessage ? (
        <StatusBanner
          variant="danger"
          title="تعذر تنفيذ الإجراء"
          message={actionErrorMessage}
          actionLabel={retryAction ? "إعادة المحاولة" : undefined}
          onAction={retryAction ? retryLastAction : undefined}
          onDismiss={clearActionFeedback}
        />
      ) : null}

      {alertsSummary ? (
        <section
          id="notifications-panel-alerts"
          aria-labelledby="notifications-tab-alerts"
          className="notifications-page__alerts notifications-page__tab-panel"
          hidden={activeSection !== "alerts"}
        >
          {visibleAlertKeys.length > 0 ? (
            visibleAlertKeys.map((key) => (
              <Link
                key={key}
                href={getAlertHref(key)}
                className="notifications-alert-chip"
              >
                <span className="notifications-alert-chip__label">
                  {getAlertLabel(key)}
                </span>
                <strong className="notifications-alert-chip__count">
                  {formatCompactNumber(alertsSummary[key])}
                </strong>
              </Link>
            ))
          ) : (
            <div className="empty-panel notifications-page__empty">
              <BellRing size={20} />
              <h3>لا توجد تنبيهات مجمعة</h3>
              <Link href="/notifications" className="secondary-button">
                فتح الصندوق
              </Link>
            </div>
          )}
        </section>
      ) : null}

      <section
        id="notifications-panel-search"
        aria-labelledby="notifications-tab-search"
        className="operational-layout operational-layout--wide notifications-page__search notifications-page__tab-panel"
        hidden={activeSection !== "search"}
      >
        <SectionCard
          title="البحث"
          tone="accent"
          className="operational-sidebar operational-sidebar--sticky notifications-page__sidebar"
        >
          <form className="workspace-stack" method="GET">
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
                {searchBaseline.allowedEntities.includes("product") ? (
                  <option value="product">المنتجات</option>
                ) : null}
                {searchBaseline.allowedEntities.includes("invoice") ? (
                  <option value="invoice">الفواتير</option>
                ) : null}
                {searchBaseline.allowedEntities.includes("debt_customer") ? (
                  <option value="debt_customer">الديون</option>
                ) : null}
                {searchBaseline.allowedEntities.includes("maintenance_job") ? (
                  <option value="maintenance_job">الصيانة</option>
                ) : null}
              </select>
            </label>

            <label className="stack-field">
              <span>حد النتائج</span>
              <input
                type="number"
                name="limit"
                min={1}
                max={20}
                defaultValue={String(searchBaseline.filters.limit)}
              />
            </label>

            <div className="action-row action-row--end">
              <button type="submit" className="primary-button">
                تنفيذ البحث
              </button>
            </div>
          </form>
        </SectionCard>

        <div className="operational-content">
          {searchBaseline.errorMessage ? (
            <StatusBanner
              variant="danger"
              title="تعذر إتمام البحث"
              message={searchBaseline.errorMessage}
            />
          ) : searchBaseline.filters.q ? (
            <>
              <SectionCard title="نتائج البحث" tone="subtle">
                <div className="operational-inline-summary">
                  <span className="status-pill">
                    <Search size={16} />
                    الاستعلام الحالي: {searchBaseline.filters.q}
                  </span>
                  <span className="status-pill">
                    حد النتائج: {searchBaseline.filters.limit}
                  </span>
                </div>
              </SectionCard>

              {searchBaseline.groups.length > 0 ? (
                <div className="operational-list">
                  {searchBaseline.groups.map((group) => (
                    <SectionCard key={group.entity} title={group.title}>
                      <div className="operational-list">
                        {group.items.map((item) => (
                          <article key={item.id} className="operational-list-card">
                            <div className="operational-list-card__header">
                              <div>
                                <h3 className="operational-list-card__title">
                                  {item.label}
                                </h3>
                                <p className="operational-list-card__description">
                                  {item.secondary}
                                </p>
                              </div>
                              <div className="operational-list-card__meta">
                                <span className="status-pill">{group.title}</span>
                              </div>
                            </div>

                            <div className="action-row">
                              <Link
                                href={getSearchResultHref(item)}
                                className="secondary-button"
                              >
                                فتح المسار
                              </Link>
                            </div>
                          </article>
                        ))}
                      </div>
                    </SectionCard>
                  ))}
                </div>
              ) : (
                <div className="empty-panel notifications-page__empty">
                  <Search size={20} />
                  <h3>لا توجد نتائج مطابقة</h3>
                  <Link href="/notifications" className="secondary-button">
                    إعادة ضبط البحث
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="empty-panel notifications-page__empty">
              <Search size={20} />
              <h3>ابدأ استعلامًا جديدًا</h3>
              <Link href="/notifications" className="secondary-button">
                إعادة ضبط البحث
              </Link>
            </div>
          )}
        </div>
      </section>

      <section
        id="notifications-panel-inbox"
        aria-labelledby="notifications-tab-inbox"
        className="operational-layout operational-layout--split notifications-page__inbox notifications-page__tab-panel"
        hidden={activeSection !== "inbox"}
      >
        <SectionCard
          title="فلاتر المتابعة"
          className="operational-sidebar operational-sidebar--sticky notifications-page__sidebar"
          actions={
            <span className="status-pill badge badge--neutral">
              {inboxFilterSummary.length > 0
                ? `${inboxFilterSummary.length} مفعّل`
                : "الكل"}
            </span>
          }
        >
          <button
            type="button"
            className="secondary-button notifications-page__filter-collapse"
            aria-expanded={isInboxFiltersOpen}
            aria-controls="notifications-inbox-filters"
            onClick={() => setIsInboxFiltersOpen((current) => !current)}
          >
            <span>{isInboxFiltersOpen ? "إخفاء الفلاتر" : "إظهار الفلاتر"}</span>
            <span className="notifications-page__filter-summary">
              {inboxFilterSummary.join(" • ") || "كل الإشعارات"}
            </span>
          </button>

          <div
            id="notifications-inbox-filters"
            className="notifications-page__filter-content"
            hidden={!isInboxFiltersOpen}
          >
            <form className="workspace-stack" method="GET">
              <input type="hidden" name="q" value={searchBaseline.filters.q} />
              <input type="hidden" name="entity" value={searchBaseline.filters.entity} />
              <input
                type="hidden"
                name="limit"
                value={String(searchBaseline.filters.limit)}
              />

              <label className="stack-field">
                <span>الحالة</span>
                <select name="status" defaultValue={filters.status}>
                  <option value="all">الكل</option>
                  <option value="unread">غير مقروء</option>
                  <option value="read">مقروء</option>
                </select>
              </label>

              <label className="stack-field">
                <span>النوع</span>
                <input
                  name="type"
                  defaultValue={filters.type ?? ""}
                  placeholder="اختياري"
                />
              </label>

              <label className="stack-field">
                <span>رقم الصفحة</span>
                <input
                  type="number"
                  min={1}
                  name="page"
                  defaultValue={String(filters.page)}
                />
              </label>

              <label className="stack-field">
                <span>حجم الصفحة</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  name="page_size"
                  defaultValue={String(filters.pageSize)}
                />
              </label>

              <div className="action-row action-row--end">
                <button type="submit" className="secondary-button">
                  تطبيق الفلاتر
                </button>
              </div>
            </form>
          </div>
        </SectionCard>

        <div className="operational-content">
          <SectionCard
            title="قائمة الإشعارات"
            tone="accent"
            actions={
              <span className="status-pill badge badge--neutral">
                {formatCompactNumber(notifications.length)} إشعار
              </span>
            }
          >
            <div className="operational-list">
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const referenceHref = getReferenceHref(notification);

                  return (
                    <article
                      key={notification.id}
                      className="operational-list-card notification-feed-card"
                    >
                      <div className="operational-list-card__header notification-feed-card__header">
                        <div>
                          <h3 className="operational-list-card__title">
                            {notification.title}
                          </h3>
                          <p className="operational-list-card__description">
                            {notification.body}
                          </p>
                        </div>
                        <div className="operational-list-card__meta">
                          {!notification.is_read ? (
                            <span
                              className="notification-feed-card__dot"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span
                            className={
                              notification.is_read
                                ? "status-pill"
                                : "status-pill status-pill--brand"
                            }
                          >
                            {getNotificationStatusLabel(notification)}
                          </span>
                          <span className="status-pill">
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                        </div>
                      </div>

                      <div className="operational-inline-summary notification-feed-card__summary">
                        <span className="status-pill">
                          {formatDateTime(notification.created_at)}
                        </span>
                        {role === "admin" ? (
                          <span className="status-pill">
                            المستخدم: {notification.user_name ?? "غير معروف"}
                          </span>
                        ) : null}
                      </div>

                      <div className="action-row notification-feed-card__actions">
                        {!notification.is_read ? (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={isPending}
                            onClick={() => void handleMarkSingle(notification.id)}
                          >
                            تعليم كمقروء
                          </button>
                        ) : role === "admin" &&
                          notification.contact_phone &&
                          notification.whatsapp_template_key ? (
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
                <div className="empty-panel notifications-page__empty">
                  <BellRing size={20} />
                  <h3>لا توجد إشعارات مطابقة</h3>
                  <Link href="/notifications" className="secondary-button">
                    إعادة ضبط الفلاتر
                  </Link>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </section>
    </section>
  );
}
