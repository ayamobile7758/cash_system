import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { SuppliersWorkspace } from "@/components/dashboard/suppliers-workspace";
import { getSuppliersPageBaseline } from "@/lib/api/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function SuppliersPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لإدارة الموردين والمشتريات"
        description="إدارة الموردين، أوامر الشراء، وتسديدات الموردين محصورة بجلسة Admin صالحة."
      />
    );
  }

  if (access.state !== "ok" || access.role !== "admin") {
    return (
      <AccessRequired
        title="هذه الشاشة مخصصة للـ Admin فقط"
        description="الموردون والمشتريات جزء من توسعة V1 ولا تُفتح لحسابات POS."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getSuppliersPageBaseline(supabase);

  return <SuppliersWorkspace {...baseline} />;
}
