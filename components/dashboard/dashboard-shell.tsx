"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  ChartColumn,
  ChevronLeft,
  FileArchive,
  FileText,
  HandCoins,
  Home,
  LayoutDashboard,
  Menu,
  Package,
  PackageSearch,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  ToolCase,
  Wallet,
  Wrench,
  X
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

type DashboardNavGroup = "daily" | "operations" | "management";

type DashboardNavItem = {
  href: string;
  label: string;
  description: string;
  icon: string;
  group: DashboardNavGroup;
};

type DashboardShellProps = {
  accountLabel: string;
  homeHref: string;
  isAuthenticated: boolean;
  navigation: DashboardNavItem[];
  unreadNotifications: number;
  children: ReactNode;
  roleLabel: string;
};

const GROUP_LABELS: Record<DashboardNavGroup, string> = {
  daily: "التشغيل اليومي",
  operations: "المخزون والخدمات",
  management: "المتابعة والإدارة"
};

const ICONS = {
  pos: ShoppingCart,
  products: Package,
  expenses: Wallet,
  inventory: PackageSearch,
  suppliers: Store,
  operations: HandCoins,
  maintenance: Wrench,
  invoices: ReceiptText,
  debts: BriefcaseBusiness,
  reports: ChartColumn,
  portability: FileArchive,
  notifications: Bell,
  settings: Settings
} as const;

function getIcon(icon: DashboardNavItem["icon"]) {
  return ICONS[icon as keyof typeof ICONS] ?? LayoutDashboard;
}

function getRoleMessage(roleLabel: string) {
  return roleLabel === "إداري"
    ? "تتابع من هنا التشغيل، التقارير، والتنبيهات الإدارية من مسار واحد واضح."
    : "تصل بسرعة إلى البيع، الفواتير، والديون من دون ازدحام روابط غير لازمة.";
}

function getQuickLinks(roleLabel: string, navigation: DashboardNavItem[]) {
  const preferred =
    roleLabel === "إداري"
      ? ["/reports", "/inventory", "/notifications"]
      : ["/pos", "/invoices", "/debts"];

  return preferred
    .map((href) => navigation.find((item) => item.href === href))
    .filter((item): item is DashboardNavItem => Boolean(item));
}

function getPageContext(pathname: string, navigation: DashboardNavItem[]) {
  const item = [...navigation]
    .sort((left, right) => right.href.length - left.href.length)
    .find((entry) => entry.href !== "/" && (pathname === entry.href || pathname.startsWith(`${entry.href}/`)));

  if (!item) {
    return {
      title: "مساحات التشغيل",
      description: "اختر المسار الذي تريد العمل عليه من الشريط الجانبي.",
      groupLabel: "لوحة العمل",
      breadcrumbs: [{ label: "مساحات التشغيل", href: null }]
    };
  }

  return {
    title: item.label,
    description: item.description,
    groupLabel: GROUP_LABELS[item.group],
    breadcrumbs: [
      { label: "مساحات التشغيل", href: null },
      { label: GROUP_LABELS[item.group], href: null },
      { label: item.label, href: item.href }
    ]
  };
}

export function DashboardShell({
  accountLabel,
  homeHref,
  isAuthenticated,
  navigation,
  unreadNotifications,
  children,
  roleLabel
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const groupedNavigation = useMemo(() => {
    return navigation.reduce<Record<DashboardNavGroup, DashboardNavItem[]>>(
      (current, item) => {
        current[item.group].push(item);
        return current;
      },
      { daily: [], operations: [], management: [] }
    );
  }, [navigation]);

  const pageContext = useMemo(() => getPageContext(pathname, navigation), [navigation, pathname]);
  const quickLinks = useMemo(() => getQuickLinks(roleLabel, navigation), [navigation, roleLabel]);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      router.push("/notifications");
      closeMenu();
      return;
    }

    const params = new URLSearchParams({
      q: trimmed,
      entity: "all",
      limit: "8",
      status: "all",
      page: "1",
      page_size: "20"
    });

    router.push(`/notifications?${params.toString()}`);
    closeMenu();
  }

  return (
    <div className="dashboard-shell dashboard-shell--sidebar">
      <div
        className={isMenuOpen ? "dashboard-mobile-backdrop is-open" : "dashboard-mobile-backdrop"}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <aside className={isMenuOpen ? "dashboard-sidebar is-open" : "dashboard-sidebar"}>
        <div className="dashboard-sidebar__brand">
          <Link href={homeHref} className="dashboard-brandmark" onClick={closeMenu}>
            <span className="dashboard-brandmark__logo">Aya</span>
            <span className="dashboard-brandmark__copy">
              <strong>Aya Mobile</strong>
              <small>تشغيل يومي سريع وواضح للتجزئة</small>
            </span>
          </Link>

          <button type="button" className="icon-button dashboard-menu-close" onClick={closeMenu} aria-label="إغلاق القائمة">
            <X size={18} />
          </button>
        </div>

        <SectionCard
          className="dashboard-role-card"
          eyebrow="الحساب الحالي"
          title={roleLabel}
          description={getRoleMessage(roleLabel)}
          tone="accent"
        >
          <div className="dashboard-role-card__meta">
            <strong>{accountLabel}</strong>
            <span className="status-pill status-pill--soft">
              <Bell size={14} />
              {unreadNotifications > 0 ? `${unreadNotifications} تنبيهًا غير مقروء` : "صندوق الإشعارات هادئ الآن"}
            </span>
          </div>

          {quickLinks.length > 0 ? (
            <div className="dashboard-shortcuts">
              <span className="dashboard-shortcuts__label">اختصارات اليوم</span>
              <div className="dashboard-shortcuts__grid">
                {quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="dashboard-shortcut-tile"
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={closeMenu}
                  >
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>

        <nav className="dashboard-sidebar__nav" aria-label="التنقل داخل مساحات التشغيل">
          {(Object.keys(groupedNavigation) as DashboardNavGroup[]).map((groupKey) =>
            groupedNavigation[groupKey].length > 0 ? (
              <section key={groupKey} className="dashboard-nav-group section-card section-card--subtle">
                <div className="dashboard-nav-group__header">
                  <div>
                    <p className="dashboard-nav-group__title">{GROUP_LABELS[groupKey]}</p>
                    <p className="dashboard-nav-group__count">{groupedNavigation[groupKey].length} مسارات جاهزة</p>
                  </div>
                  <span className="status-pill status-pill--neutral">
                    {groupKey === "daily"
                      ? "تشغيلي"
                      : groupKey === "operations"
                        ? "تشغيلي متقدم"
                        : "إداري"}
                  </span>
                </div>

                <div className="dashboard-nav-group__items">
                  {groupedNavigation[groupKey].map((item) => {
                    const isActive =
                      item.href === "/notifications"
                        ? pathname === item.href || pathname.startsWith("/notifications")
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = getIcon(item.icon);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={isActive ? "dashboard-nav__item is-active" : "dashboard-nav__item"}
                        aria-current={isActive ? "page" : undefined}
                        onClick={closeMenu}
                      >
                        <span className="dashboard-nav__icon">
                          <Icon size={18} />
                        </span>

                        <span className="dashboard-nav__content">
                          <strong>
                            {item.label}
                            {item.href === "/notifications" && unreadNotifications > 0 ? (
                              <span className="dashboard-nav__badge">{unreadNotifications}</span>
                            ) : null}
                          </strong>
                          <small>{item.description}</small>
                        </span>

                        <ChevronLeft size={16} className="dashboard-nav__arrow" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null
          )}
        </nav>

        <div className="dashboard-sidebar__footer">
          {isAuthenticated ? (
            <LogoutButton />
          ) : (
            <Link href="/" className="secondary-button" onClick={closeMenu}>
              تسجيل الدخول
            </Link>
          )}
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-topbar workspace-panel">
          <div className="dashboard-topbar__context">
            <button
              type="button"
              className="icon-button dashboard-menu-toggle"
              onClick={() => setIsMenuOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu size={18} />
            </button>

            <PageHeader
              eyebrow="مساحات التشغيل"
              title={pageContext.title}
              description={pageContext.description}
              meta={
                <>
                  <span className="status-pill status-pill--brand">
                    <Sparkles size={14} />
                    {pageContext.groupLabel}
                  </span>
                  <span className="status-pill status-pill--soft">
                    <LayoutDashboard size={14} />
                    {roleLabel}
                  </span>
                </>
              }
            />
          </div>

          <form className="dashboard-quick-search" onSubmit={handleSearchSubmit}>
            <div className="dashboard-search-card">
              <label className="workspace-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="ابحث سريعًا عن فاتورة أو منتج أو عميل"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>

              <button type="submit" className="primary-button">
                <Sparkles size={16} />
                البحث الشامل
              </button>
            </div>
            <p className="workspace-footnote dashboard-quick-search__hint">
              ابحث في الفواتير والمنتجات والعملاء والإشعارات من نفس نقطة الوصول.
            </p>
          </form>
        </header>

        <div className="dashboard-breadcrumbs workspace-panel" aria-label="مسار الصفحة">
          <Link href={homeHref} className="dashboard-breadcrumbs__home">
            <Home size={16} />
            الرئيسية
          </Link>

          <ol>
            {pageContext.breadcrumbs.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
              </li>
            ))}
          </ol>
        </div>

        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
