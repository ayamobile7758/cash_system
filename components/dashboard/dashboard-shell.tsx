"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  ChartColumn,
  FileArchive,
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
  Store,
  Wrench,
  X
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { StatusBanner } from "@/components/ui/status-banner";

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

const PRIMARY_BOTTOM_NAV_HREFS = [
  "/pos",
  "/products",
  "/invoices",
  "/inventory"
] as const;

const BOTTOM_BAR_LABELS: Partial<Record<(typeof PRIMARY_BOTTOM_NAV_HREFS)[number], string>> = {
  "/pos": "البيع",
  "/inventory": "الجرد"
};

const ICONS = {
  home: Home,
  pos: ShoppingCart,
  products: Package,
  expenses: HandCoins,
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

function isPathActive(pathname: string, href: string) {
  return href === "/notifications"
    ? pathname === href || pathname.startsWith("/notifications/")
    : pathname === href || pathname.startsWith(`${href}/`);
}

function getPageContext(pathname: string, navigation: DashboardNavItem[]) {
  const item = [...navigation]
    .sort((left, right) => right.href.length - left.href.length)
    .find((entry) => entry.href !== "/" && isPathActive(pathname, entry.href));

  if (!item) {
    return {
      title: "مساحات التشغيل",
      groupLabel: "لوحة العمل",
      description: "اختر المسار التشغيلي المناسب للمهمة الحالية."
    };
  }

  return {
    title: item.label,
    groupLabel: GROUP_LABELS[item.group],
    description: item.description
  };
}

function getAccountInitials(accountLabel: string) {
  const compact = accountLabel.trim().replace(/\s+/g, " ");

  if (!compact) {
    return "A";
  }

  const words = compact.split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 1);
  }

  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.trim();
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const groupedNavigation = useMemo(() => {
    return navigation.reduce<Record<DashboardNavGroup, DashboardNavItem[]>>(
      (current, item) => {
        current[item.group].push(item);
        return current;
      },
      { daily: [], operations: [], management: [] }
    );
  }, [navigation]);

  const pageContext = useMemo(
    () => getPageContext(pathname, navigation),
    [navigation, pathname]
  );
  const isPosPage = pathname === "/pos" || pathname.startsWith("/pos/");
  const bottomBarItems = useMemo(
    () =>
      PRIMARY_BOTTOM_NAV_HREFS.map((href) =>
        navigation.find((item) => item.href === href)
      ).filter((item): item is DashboardNavItem => Boolean(item)),
    [navigation]
  );
  const hasNotificationsPage = navigation.some((item) => item.href === "/notifications");
  const accountInitials = getAccountInitials(accountLabel);

  useEffect(() => {
    const updateOfflineState = () => {
      setIsOffline(!window.navigator.onLine);
    };

    updateOfflineState();
    window.addEventListener("online", updateOfflineState);
    window.addEventListener("offline", updateOfflineState);

    return () => {
      window.removeEventListener("online", updateOfflineState);
      window.removeEventListener("offline", updateOfflineState);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const updateViewportState = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewportState();

    mediaQuery.addEventListener("change", updateViewportState);
    return () => {
      mediaQuery.removeEventListener("change", updateViewportState);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function openMenu() {
    setIsSearchOpen(false);
    setIsMenuOpen(true);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      router.push("/search");
      closeMenu();
      setIsSearchOpen(false);
      return;
    }

    const params = new URLSearchParams({
      q: trimmed
    });

    router.push(`/search?${params.toString()}`);
    closeMenu();
    setIsSearchOpen(false);
  }

  const showMobileBackdrop = isMenuOpen && isMobileViewport;

  return (
    <div
      className={[
        "dashboard-shell",
        "dashboard-shell--sidebar",
        "dashboard-layout",
        isPosPage ? "dashboard-shell--pos dashboard-layout--pos" : "",
        isMenuOpen ? "dashboard-layout--menu-open" : "",
        isOffline ? "dashboard-shell--offline" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showMobileBackdrop ? (
        <div
          className="dashboard-mobile-backdrop is-open"
          onClick={closeMenu}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={[
          "dashboard-sidebar",
          "dashboard-layout__sidebar",
          isMenuOpen ? "is-open" : "",
          isPosPage ? "dashboard-sidebar--compact dashboard-sidebar--pos" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="التنقل داخل مساحات التشغيل"
      >
        <div className="dashboard-sidebar__brand">
          <Link href={homeHref} className="dashboard-brandmark" onClick={closeMenu}>
            <span className="dashboard-brandmark__logo">Aya</span>
            <span className="dashboard-brandmark__copy">
              <strong>Aya Mobile</strong>
              <small>{roleLabel}</small>
            </span>
          </Link>

          <button
            type="button"
            className="icon-button dashboard-menu-close dashboard-sidebar__close"
            onClick={closeMenu}
            aria-label="إغلاق القائمة"
          >
            <X size={18} />
          </button>
        </div>

        <nav
          className="dashboard-sidebar__nav dashboard-layout__sidebar-nav"
          aria-label="التنقل داخل مساحات التشغيل"
        >
          {(Object.keys(groupedNavigation) as DashboardNavGroup[]).map((groupKey) =>
            groupedNavigation[groupKey].length > 0 ? (
              <section
                key={groupKey}
                className={`dashboard-nav-group dashboard-nav-group--${groupKey}`}
              >
                <div className="dashboard-nav-group__items">
                  {groupedNavigation[groupKey].map((item) => {
                    const isActive = isPathActive(pathname, item.href);
                    const Icon = getIcon(item.icon);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={
                          isActive
                            ? "dashboard-nav__item is-active"
                            : "dashboard-nav__item"
                        }
                        aria-current={isActive ? "page" : undefined}
                        onClick={closeMenu}
                      >
                        <span className="dashboard-nav__icon">
                          <Icon size={18} />
                        </span>

                        <span className="dashboard-nav__label">
                          {item.label}
                          {item.href === "/notifications" && unreadNotifications > 0 ? (
                            <span className="dashboard-nav__badge">
                              {unreadNotifications}
                            </span>
                          ) : null}
                        </span>
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
            <>
              <div className="dashboard-sidebar__account" title={accountLabel}>
                <span className="dashboard-sidebar__account-avatar" aria-hidden="true">
                  {accountInitials}
                </span>
                <span className="dashboard-sidebar__account-copy">
                  <strong>{roleLabel}</strong>
                  <small>{accountLabel}</small>
                </span>
              </div>
              <LogoutButton />
            </>
          ) : (
            <Link href="/" className="secondary-button" onClick={closeMenu}>
              تسجيل الدخول
            </Link>
          )}
        </div>
      </aside>

      {isMobileViewport ? (
        <nav
          className="dashboard-bottom-bar dashboard-layout__bottom-bar"
          aria-label="التنقل السريع"
        >
          {bottomBarItems.map((item) => {
            const Icon = getIcon(item.icon);
            const isActive = isPathActive(pathname, item.href);
            const compactLabel = BOTTOM_BAR_LABELS[item.href as keyof typeof BOTTOM_BAR_LABELS] ?? item.label;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "dashboard-bottom-bar__item is-active"
                    : "dashboard-bottom-bar__item"
                }
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                onClick={closeMenu}
              >
                <span className="dashboard-bottom-bar__icon">
                  <Icon size={18} />
                </span>
                <span className="dashboard-bottom-bar__label">{compactLabel}</span>
              </Link>
            );
          })}

          <button
            type="button"
            className="dashboard-bottom-bar__item dashboard-bottom-bar__item--menu"
            onClick={openMenu}
            aria-label="القائمة"
            aria-expanded={isMenuOpen}
          >
            <span className="dashboard-bottom-bar__icon">
              <Menu size={18} />
            </span>
            <span className="dashboard-bottom-bar__label">القائمة</span>
          </button>
        </nav>
      ) : null}

      <div className="dashboard-content dashboard-layout__content">
        {isOffline ? (
          <div className="dashboard-offline-bar">
            <StatusBanner variant="offline" message="لا يوجد اتصال بالإنترنت" />
          </div>
        ) : null}

        <header className="dashboard-topbar">
          <div className="dashboard-topbar__start dashboard-topbar__context">
            <button
              type="button"
              className="icon-button dashboard-menu-toggle"
              onClick={openMenu}
              aria-label="فتح القائمة"
              aria-expanded={isMenuOpen}
            >
              <Menu size={18} />
            </button>

            <div className="dashboard-header-title">
              <div className="dashboard-header-title__row">
                <h1>{pageContext.title}</h1>
              </div>
            </div>
          </div>

          <div className="dashboard-topbar__end dashboard-topbar__actions">
            {isSearchOpen ? (
              <form
                className="dashboard-quick-search-minimal"
                onSubmit={handleSearchSubmit}
              >
                <Search size={16} className="search-icon" />
                <input
                  type="search"
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  autoFocus
                  onBlur={() => !searchQuery && setIsSearchOpen(false)}
                />
              </form>
            ) : (
              <button
                type="button"
                className="icon-button ghost-button search-toggle"
                onClick={() => setIsSearchOpen(true)}
                aria-label="بحث"
              >
                <Search size={18} />
              </button>
            )}

            {hasNotificationsPage ? (
              <Link
                href="/notifications"
                className="icon-button ghost-button dashboard-topbar__notifications"
                aria-label={
                  unreadNotifications > 0
                    ? `الإشعارات (${unreadNotifications})`
                    : "الإشعارات"
                }
              >
                <Bell size={18} />
                {unreadNotifications > 0 ? (
                  <span className="dashboard-topbar__notifications-badge">
                    {unreadNotifications}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <div className="dashboard-user-chip" title={accountLabel}>
              <span className="dashboard-user-chip__avatar" aria-hidden="true">
                {accountInitials}
              </span>
              <span className="dashboard-user-chip__copy">
                <strong>{roleLabel}</strong>
                <small>{accountLabel}</small>
              </span>
            </div>
          </div>
        </header>

        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
