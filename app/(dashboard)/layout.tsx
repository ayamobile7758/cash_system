import Link from "next/link";
import type { ReactNode } from "react";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { LogoutButton } from "@/components/auth/logout-button";

const navigation = [
  { href: "/pos", label: "POS" },
  { href: "/products", label: "المنتجات" },
  { href: "/inventory", label: "الجرد والتسوية" },
  { href: "/suppliers", label: "الموردون" },
  { href: "/operations", label: "الشحن والتحويلات" },
  { href: "/maintenance", label: "الصيانة" },
  { href: "/invoices", label: "الفواتير" },
  { href: "/debts", label: "الديون" },
  { href: "/reports", label: "التقارير" },
  { href: "/settings", label: "الإعدادات" },
  { href: "/", label: "الصفحة الرئيسية" }
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const access = await getWorkspaceAccess();

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">PX-07 / V1 Expansion</p>
          <h1>Aya Mobile Workspace</h1>
          <p className="workspace-footnote">
            {access.state === "ok"
              ? `الجلسة الحالية: ${access.fullName ?? access.role} (${access.role === "admin" ? "Admin" : "POS"})`
              : "المسارات التشغيلية محمية بجلسة Supabase صالحة وصلاحية دور صحيحة."}
          </p>
        </div>

        <nav className="dashboard-nav" aria-label="workspace navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="dashboard-nav__link">
              {item.label}
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
