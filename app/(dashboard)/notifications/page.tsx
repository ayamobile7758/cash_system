import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { NotificationsWorkspace } from "@/components/dashboard/notifications-workspace";
import { getNotificationsPageBaseline } from "@/lib/api/notifications";
import { getAlertsSummary, getGlobalSearchPageBaseline } from "@/lib/api/search";
import { hasPermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type NotificationsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function NotificationsPage({ searchParams = {} }: NotificationsPageProps) {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح مركز التنبيهات والبحث"
        description="السطح الحالي محمي بجلسة Supabase صالحة ويُستخدم كمركز تشغيل موحد للتنبيهات والبحث السريع."
      />
    );
  }

  if (
    access.state !== "ok" ||
    !["admin", "pos_staff"].includes(access.role) ||
    !hasPermission(access.permissions, "notifications.read")
  ) {
    return (
      <AccessRequired
        title="لا تملك صلاحية الوصول إلى مركز التنبيهات والبحث"
        description="هذا السطح متاح فقط للمستخدمين الذين يملكون `notifications.read` ضمن الدور أو الـ bundle الفعالة."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const viewer = {
    role: access.role,
    userId: access.userId
  };
  const [baseline, searchBaseline, alertsSummary] = await Promise.all([
    getNotificationsPageBaseline(supabase, viewer, searchParams),
    getGlobalSearchPageBaseline(
      supabase,
      {
        ...viewer,
        permissions: access.permissions
      },
      searchParams
    ),
    access.role === "admin" ? getAlertsSummary(supabase, viewer) : Promise.resolve(null)
  ]);

  return (
    <NotificationsWorkspace
      role={access.role}
      alertsSummary={alertsSummary}
      filters={baseline.filters}
      notifications={baseline.notifications}
      searchBaseline={searchBaseline}
      unreadCount={baseline.unreadCount}
      totalCount={baseline.totalCount}
    />
  );
}
