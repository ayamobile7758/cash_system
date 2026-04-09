"use client";

import Link from "next/link";
import * as React from "react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const bottomMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRestoreFocusRef = useRef<HTMLElement | null>(null);
  const navPopoverRef = useRef<HTMLDivElement | null>(null);

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
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusNavItem = window.requestAnimationFrame(() => {
      navPopoverRef.current
        ?.querySelector<HTMLElement>(".dashboard-nav__item")
        ?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        return;
      }

      const popover = navPopoverRef.current;

      if (!popover) {
        return;
      }

      const focusableElements = Array.from(
        popover.querySelectorAll(focusableSelector)
      ) as HTMLElement[];

      const tabbableElements = focusableElements.filter(
        (element) => element.tabIndex >= 0 && !element.hasAttribute("disabled")
      );

      if (tabbableElements.length === 0) {
        return;
      }

      const navItems = Array.from(popover.querySelectorAll(".dashboard-nav__item")) as HTMLElement[];

      if (e.key === "Tab") {
        const currentIndex = tabbableElements.indexOf(document.activeElement as HTMLElement);

        if (currentIndex === -1) {
          e.preventDefault();
          tabbableElements[e.shiftKey ? tabbableElements.length - 1 : 0]?.focus();
        } else if (e.shiftKey && currentIndex <= 0) {
          e.preventDefault();
          tabbableElements[tabbableElements.length - 1]?.focus();
        } else if (!e.shiftKey && currentIndex === tabbableElements.length - 1) {
          e.preventDefault();
          tabbableElements[0]?.focus();
        }

        return;
      }

      if (!navItems.length) {
        return;
      }

      const currentNavIndex = navItems.indexOf(document.activeElement as HTMLElement);
      const moveNavIndex = (index: number, offset: number) =>
        (index + offset + navItems.length) % navItems.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        navItems[moveNavIndex(currentNavIndex < 0 ? 0 : currentNavIndex, 1)]?.focus();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        navItems[moveNavIndex(currentNavIndex < 0 ? 0 : currentNavIndex, -1)]?.focus();
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        navItems[0]?.focus();
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        navItems[navItems.length - 1]?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusNavItem);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  function closeMenu(options: { restoreFocus?: boolean } = {}) {
    const { restoreFocus = true } = options;
    const focusTarget = menuRestoreFocusRef.current;
    setIsMenuOpen(false);

    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        focusTarget?.focus();
      });
    }
  }

  function openMenu(trigger?: HTMLElement | null) {
    menuRestoreFocusRef.current = trigger ?? menuButtonRef.current;
    setIsSearchOpen(false);
    setIsMenuOpen(true);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      router.push("/search");
      setIsSearchOpen(false);
      return;
    }

    const params = new URLSearchParams({
      q: trimmed
    });

    router.push(`/search?${params.toString()}`);
    setIsSearchOpen(false);
  }

  return (
    <div
      className={[
        "dashboard-shell",
        "dashboard-layout",
        isPosPage ? "dashboard-shell--pos dashboard-layout--pos" : "",
        isOffline ? "dashboard-shell--offline" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isMobileViewport ? (
        <nav
          className="dashboard-bottom-bar dashboard-layout__bottom-bar"
          aria-label="التنقل السريع"
        >
          {bottomBarItems.map((item) => {
            const Icon = getIcon(item.icon);
            const isActive = isPathActive(pathname, item.href);
            const compactLabel =
              BOTTOM_BAR_LABELS[item.href as keyof typeof BOTTOM_BAR_LABELS] ?? item.label;

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
                onClick={() => closeMenu({ restoreFocus: false })}
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
            ref={bottomMenuButtonRef}
            onClick={(event) => openMenu(event.currentTarget)}
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

      <div className="dashboard-content">
        {isOffline ? (
          <div className="dashboard-offline-bar">
            <StatusBanner variant="offline" message="لا يوجد اتصال بالإنترنت" />
          </div>
        ) : null}

        <header className="dashboard-topbar">
          <div className="dashboard-topbar__start dashboard-topbar__context">
            <div className="dashboard-nav-trigger" aria-label="فتح القائمة">
              <button
                type="button"
                className="icon-button dashboard-menu-toggle"
                ref={menuButtonRef}
                onClick={(event) => openMenu(event.currentTarget)}
                aria-label="فتح القائمة"
                aria-expanded={isMenuOpen}
                aria-haspopup="dialog"
              >
                <Menu size={18} />
              </button>

              {isMenuOpen ? (
                <>
                  <div
                    className="dashboard-nav-backdrop"
                    onClick={() => closeMenu()}
                    aria-hidden="true"
                  />
                  <div
                    ref={navPopoverRef}
                    className={[
                      "dashboard-nav-popover",
                      isMobileViewport
                        ? "dashboard-nav-popover--sheet"
                        : "dashboard-nav-popover--dropdown"
                    ].join(" ")}
                    role="dialog"
                    aria-label="التنقل داخل مساحات التشغيل"
                    aria-modal="true"
                  >
                    <div className="dashboard-nav-popover__header">
                      <Link
                        href={homeHref}
                        className="dashboard-brandmark"
                        onClick={() => closeMenu({ restoreFocus: false })}
                      >
                        <span className="dashboard-brandmark__logo">Aya</span>
                        <span className="dashboard-brandmark__copy">
                          <strong>Aya Mobile</strong>
                          <small>{roleLabel}</small>
                        </span>
                      </Link>

                      <button
                        type="button"
                        className="icon-button dashboard-menu-close"
                        onClick={() => closeMenu()}
                        aria-label="إغلاق القائمة"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <nav
                      className="dashboard-nav-popover__nav"
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
                                    onClick={() => closeMenu({ restoreFocus: false })}
                                  >
                                    <span className="dashboard-nav__icon">
                                      <Icon size={18} />
                                    </span>
                                    <span className="dashboard-nav__label">
                                      {item.label}
                                      {item.href === "/notifications" &&
                                      unreadNotifications > 0 ? (
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

                    <div className="dashboard-nav-popover__footer">
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
                        <Link
                          href="/"
                          className="secondary-button"
                          onClick={() => closeMenu({ restoreFocus: false })}
                        >
                          تسجيل الدخول
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="dashboard-header-title">
              <div className="dashboard-header-title__row">
                <h1>{pageContext.title}</h1>
              </div>
            </div>
          </div>

          <div className="dashboard-topbar__end dashboard-topbar__actions">
            {!isPosPage ? (
              isSearchOpen ? (
                <form
                  className="dashboard-quick-search-minimal is-open"
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
              )
            ) : null}

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
