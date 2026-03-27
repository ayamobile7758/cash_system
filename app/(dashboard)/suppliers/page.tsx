import type { Metadata } from "next";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { SuppliersWorkspace } from "@/components/dashboard/suppliers-workspace";
import { getSuppliersPageBaseline } from "@/lib/api/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "الموردون والمشتريات",
  description: "إدارة الموردين وتسجيل أوامر الشراء ومتابعة التسديدات من مساحة واحدة."
};

export default async function SuppliersPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لإدارة الموردين والمشتريات"
        description="إدارة الموردين، أوامر الشراء، وتسديدات الموردين محصورة بجلسة إدارية صالحة."
      />
    );
  }

  if (access.state !== "ok" || access.role !== "admin") {
    return (
      <AccessRequired
        title="هذه الشاشة مخصصة للإدارة فقط"
        description="هذه المساحة مخصصة لإدارة الموردين وأوامر الشراء وتسديداتها."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getSuppliersPageBaseline(supabase);

  return <SuppliersWorkspace {...baseline} />;
}
