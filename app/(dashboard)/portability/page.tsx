import type { Metadata } from "next";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { PortabilityWorkspace } from "@/components/dashboard/portability-workspace";
import { getPortabilityPageBaseline } from "@/lib/api/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "النقل والنسخ",
  description: "إدارة التصدير والاستيراد والاستعادة التجريبية من مساحة إدارية واحدة."
};

export default async function PortabilityPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لمسارات النقل والنسخ"
        description="عمليات التصدير والاستيراد والاستعادة محمية بجلسة صالحة وصلاحية إدارية."
      />
    );
  }

  if (access.state !== "ok" || access.role !== "admin") {
    return (
      <AccessRequired
        title="هذه الشاشة مخصصة للإدارة فقط"
        description="من هنا تُدار عمليات التصدير والاستيراد والاستعادة التجريبية بشكل إداري وآمن."
      />
    );
  }

  const baseline = await getPortabilityPageBaseline(getSupabaseAdminClient());
  return <PortabilityWorkspace {...baseline} />;
}
