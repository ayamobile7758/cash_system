import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { ReportsOverview } from "@/components/dashboard/reports-overview";
import { getReportsPageBaseline } from "@/lib/api/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ReportsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ReportsPage({ searchParams = {} }: ReportsPageProps) {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح التقارير"
        description="شاشة التقارير محصورة بحساب Admin نشط لأنها تعرض الأرصدة والحركات والديون واللقطات اليومية."
      />
    );
  }

  if (access.state !== "ok" || access.role !== "admin") {
    return (
      <AccessRequired
        title="التقارير محصورة بحساب Admin"
        description="حسابات POS لا تفتح تقارير الإدارة التفصيلية ولا ملف التصدير Excel."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getReportsPageBaseline(supabase, searchParams);

  return <ReportsOverview {...baseline} />;
}
