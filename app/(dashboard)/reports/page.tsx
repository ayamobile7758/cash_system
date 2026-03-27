import type { Metadata } from "next";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { ReportsOverview } from "@/components/dashboard/reports-overview";
import { getReportsPageBaseline } from "@/lib/api/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "التقارير",
  description: "مراجعة الأداء المالي والتشغيلي ومقارنة الفترات من شاشة تقارير متقدمة."
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح التقارير"
        description="سجّل الدخول بحساب إداري لمراجعة التقارير التفصيلية ومقارنة الفترات."
      />
    );
  }

  if (access.state !== "ok" || access.role !== "admin") {
    return (
      <AccessRequired
        title="التقارير محصورة بحساب Admin"
        description="هذه الشاشة مخصصة للإدارة لأنها تعرض التقارير التفصيلية وعمليات التصدير."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getReportsPageBaseline(supabase, resolvedSearchParams);

  return <ReportsOverview {...baseline} />;
}
