import Link from "next/link";
import type { ReactNode } from "react";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { LogoutButton } from "@/components/auth/logout-button";
import { getUnreadNotificationCount } from "@/lib/api/notifications";
import { hasPermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const navigation = [
  { href: "/pos", label: "POS", permission: "pos.use" },
  { href: "/products", label: "المنتجات", permission: "products.read" },
  { href: "/expenses", label: "المصروفات", permission: "expenses.read" },
  { href: "/inventory", label: "الجرد والتسوية", permission: "inventory.read" },
  { href: "/suppliers", label: "الموردون", adminOnly: true },
  { href: "/operations", label: "الشحن والتحويلات", permission: "operations.read" },
  { href: "/maintenance", label: "الصيانة", permission: "maintenance.read" },
  { href: "/invoices", label: "الفواتير", permission: "invoices.read" },
  { href: "/debts", label: "الديون", permission: "debts.read" },
  { href: "/reports", label: "التقارير", adminOnly: true },
  { href: "/portability", label: "النقل والنسخ", adminOnly: true },
  { href: "/notifications", label: "الإشعارات", permission: "notifications.read" },
  { href: "/settings", label: "الإعدادات", adminOnly: true },
  { href: "/", label: "الصفحة الرئيسية" }
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const access = await getWorkspaceAccess();
  const scopedNavigation =
    access.state !== "ok"
      ? navigation.filter((item) => item.href === "/")
      : navigation.filter((item) => {
          if (item.adminOnly) {
            return access.role === "admin";
          }

          if (!item.permission) {
            return true;
          }

          return hasPermission(access.permissions, item.permission);
        });
  const unreadNotifications =
    access.state === "ok"
      ? await getUnreadNotificationCount(getSupabaseAdminClient(), {
          role: access.role,
          userId: access.userId
        })
      : 0;

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Post-PX-07 / V2 Execution</p>
          <h1>Aya Mobile Workspace</h1>
          <p className="workspace-footnote">
            {access.state === "ok"
              ? `الجلسة الحالية: ${access.fullName ?? access.role} (${access.role === "admin" ? "Admin" : "POS"})`
              : "المسارات التشغيلية محمية بجلسة Supabase صالحة وصلاحية دور صحيحة."}
          </p>
        </div>

        <nav className="dashboard-nav" aria-label="workspace navigation">
          {scopedNavigation.map((item) => (
            <Link key={item.href} href={item.href} className="dashboard-nav__link">
              {item.href === "/notifications" && unreadNotifications > 0
                ? `${item.label} (${unreadNotifications})`
                : item.label}
            </Link>
          ))}

          {access.state === "ok" ? (
            <LogoutButton />
          ) : (
            <Link href="/login" className="secondary-button">
              تسجيل الدخول
            </Link>
          )}
        </nav>
      </header>

      <main className="dashboard-main">{children}</main>
    </div>
  );
}
