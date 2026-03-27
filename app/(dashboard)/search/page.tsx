import type { Metadata } from "next";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { SearchWorkspace } from "@/components/dashboard/search-workspace";
import { getGlobalSearchPageBaseline } from "@/lib/api/search";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "البحث",
  description: "بحث شامل داخل المنتجات والفواتير والديون والصيانة من مساحة واحدة."
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح البحث"
        description="سجّل الدخول للوصول إلى البحث الشامل بين المنتجات والفواتير والديون والصيانة."
      />
    );
  }

  if (access.state !== "ok") {
    return (
      <AccessRequired
        title="هذا المسار غير متاح لهذا الحساب"
        description="تحتاج إلى حساب تشغيلي صالح للوصول إلى البحث داخل مساحة العمل."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getGlobalSearchPageBaseline(
    supabase,
    {
      role: access.role,
      userId: access.userId,
      permissions: access.permissions
    },
    resolvedSearchParams
  );

  return <SearchWorkspace baseline={baseline} />;
}
