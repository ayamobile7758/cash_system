import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { PortabilityWorkspace } from "@/components/dashboard/portability-workspace";
import { getPortabilityPageBaseline } from "@/lib/api/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function PortabilityPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لمسارات النقل والنسخ"
        description="عمليات التصدير والاستيراد والاستعادة محمية بجلسة صالحة وصلاحية Admin."
      />
    );
  }

  if (access.state !== "ok" || access.role !== "admin") {
    return (
      <AccessRequired
        title="هذه الشاشة محصورة بالـ Admin"
        description="Data portability وrestore drill لا تعمل إلا من خلال جلسة إدارية مع audit كامل."
      />
    );
  }

  const baseline = await getPortabilityPageBaseline(getSupabaseAdminClient());
  return <PortabilityWorkspace {...baseline} />;
}
