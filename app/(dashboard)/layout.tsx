import type { ReactNode } from "react";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getUnreadNotificationCount } from "@/lib/api/notifications";
import { hasPermission, type PermissionKey } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type DashboardNavConfig = {
  href: string;
  label: string;
  description: string;
  icon:
    | "home"
    | "pos"
    | "products"
    | "invoices"
    | "debts"
    | "notifications"
    | "expenses"
    | "inventory"
    | "suppliers"
    | "operations"
    | "maintenance"
    | "reports"
    | "portability"
    | "settings";
  group: "daily" | "operations" | "management";
  permission?: PermissionKey;
  adminOnly?: boolean;
};

const navigation: DashboardNavConfig[] = [
  {
    href: "/home",
    label: "لوحة المتابعة",
    description: "نظرة يومية على المبيعات والتنبيهات والأداء.",
    icon: "home",
    group: "management",
    adminOnly: true
  },
  {
    href: "/pos",
    label: "نقطة البيع",
    description: "تنفيذ البيع السريع ومتابعة السلة الحالية.",
    icon: "pos",
    group: "daily",
    permission: "pos.use"
  },
  {
    href: "/products",
    label: "المنتجات",
    description: "استعراض الأصناف الجاهزة للبيع والمتابعة اليومية.",
    icon: "products",
    group: "daily",
    permission: "products.read"
  },
  {
    href: "/invoices",
    label: "الفواتير",
    description: "مراجعة الفواتير، الإيصالات، والمرتجعات.",
    icon: "invoices",
    group: "daily",
    permission: "invoices.read"
  },
  {
    href: "/debts",
    label: "الديون",
    description: "متابعة الأرصدة المستحقة وتسجيل التسديدات.",
    icon: "debts",
    group: "daily",
    permission: "debts.read"
  },
  {
    href: "/notifications",
    label: "الإشعارات",
    description: "مركز التنبيهات والبحث الشامل المرتبط بالدور الحالي.",
    icon: "notifications",
    group: "daily",
    permission: "notifications.read"
  },
  {
    href: "/expenses",
    label: "المصروفات",
    description: "تسجيل المصروفات اليومية وربطها بالتقارير.",
    icon: "expenses",
    group: "operations",
    permission: "expenses.read"
  },
  {
    href: "/inventory",
    label: "الجرد والتسوية",
    description: "بدء الجرد، إكماله، ومراجعة التسويات.",
    icon: "inventory",
    group: "operations",
    permission: "inventory.read"
  },
  {
    href: "/suppliers",
    label: "الموردون",
    description: "إدارة الموردين وأوامر الشراء والتسديد.",
    icon: "suppliers",
    group: "operations",
    adminOnly: true
  },
  {
    href: "/operations",
    label: "الشحن والتحويلات",
    description: "تسجيل الشحن والتحويل بين الحسابات ومتابعة أثره.",
    icon: "operations",
    group: "operations",
    permission: "operations.read"
  },
  {
    href: "/maintenance",
    label: "الصيانة",
    description: "متابعة أوامر الصيانة والتسليم والتحصيل.",
    icon: "maintenance",
    group: "operations",
    permission: "maintenance.read"
  },
  {
    href: "/reports",
    label: "التقارير",
    description: "قراءة الأداء المالي والتشغيلي ومقارنة الفترات.",
    icon: "reports",
    group: "management",
    adminOnly: true
  },
  {
    href: "/portability",
    label: "النقل والنسخ",
    description: "التصدير والاستيراد وتجارب الاستعادة الموثقة.",
    icon: "portability",
    group: "management",
    adminOnly: true
  },
  {
    href: "/settings",
    label: "الإعدادات",
    description: "الإغلاق اليومي، الصلاحيات، وضبط التشغيل.",
    icon: "settings",
    group: "management",
    adminOnly: true
  }
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const access = await getWorkspaceAccess();

  const scopedNavigation =
    access.state !== "ok"
      ? []
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

  const accountLabel =
    access.state === "ok"
      ? access.fullName ?? (access.role === "admin" ? "الحساب الإداري" : "حساب نقطة البيع")
      : "سجل الدخول للوصول إلى مساحات التشغيل المناسبة.";

  const roleLabel = access.state === "ok" ? (access.role === "admin" ? "إداري" : "نقطة بيع") : "زائر";

  return (
    <DashboardShell
      accountLabel={accountLabel}
      homeHref={access.state === "ok" ? "/home" : "/"}
      isAuthenticated={access.state === "ok"}
      navigation={[...scopedNavigation]}
      unreadNotifications={unreadNotifications}
      roleLabel={roleLabel}
    >
      {children}
    </DashboardShell>
  );
}
