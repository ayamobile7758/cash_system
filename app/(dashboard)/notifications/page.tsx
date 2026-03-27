import type { Metadata } from "next";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { NotificationsWorkspace } from "@/components/dashboard/notifications-workspace";
import { getNotificationsPageBaseline } from "@/lib/api/notifications";
import { getAlertsSummary, getGlobalSearchPageBaseline } from "@/lib/api/search";
import { hasPermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type NotificationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "الإشعارات",
  description: "متابعة التنبيهات والإشعارات والبحث السريع من شاشة واحدة واضحة."
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح مركز التنبيهات والبحث"
        description="سجّل الدخول لمتابعة التنبيهات والبحث السريع من الحساب المصرح له."
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
        title="هذه الشاشة غير متاحة لهذا الحساب"
        description="تحتاج إلى صلاحية عرض الإشعارات والبحث المرتبط بها حتى تتمكن من فتح هذه الشاشة."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const viewer = {
    role: access.role,
    userId: access.userId
  };
  const [baseline, searchBaseline, alertsSummary] = await Promise.all([
    getNotificationsPageBaseline(supabase, viewer, resolvedSearchParams),
    getGlobalSearchPageBaseline(
      supabase,
      {
        ...viewer,
        permissions: access.permissions
      },
      resolvedSearchParams
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
