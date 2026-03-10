import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { MaintenanceWorkspace } from "@/components/dashboard/maintenance-workspace";
import { getMaintenancePageBaseline } from "@/lib/api/dashboard";
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

  if (access.state !== "ok" || !["admin", "pos_staff"].includes(access.role)) {
    return (
      <AccessRequired
        title="هذه الشاشة تتطلب دورًا تشغيليًا صالحًا"
        description="يمكن للـ Admin وPOS إدارة أوامر الصيانة، بينما الإلغاء محصور بالـ Admin."
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
