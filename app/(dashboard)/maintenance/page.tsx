import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { MaintenanceWorkspace } from "@/components/dashboard/maintenance-workspace";
import { getMaintenancePageBaseline } from "@/lib/api/dashboard";
import { hasPermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function MaintenancePage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لمسارات الصيانة"
        description="إدارة أوامر الصيانة محمية بجلسة صالحة وتُدار من خلال لوحة التشغيل."
      />
    );
  }

  if (access.state !== "ok" || !hasPermission(access.permissions, "maintenance.read")) {
    return (
      <AccessRequired
        title="هذه الشاشة تتطلب bundle صيانة صالحًا"
        description="يحتاج المستخدم إلى صلاحية `maintenance.read` لعرض أوامر الصيانة، بينما الإلغاء يبقى محصورًا بالـ Admin."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getMaintenancePageBaseline(supabase, {
    role: access.role,
    userId: access.userId
  });

  return <MaintenanceWorkspace {...baseline} />;
}
