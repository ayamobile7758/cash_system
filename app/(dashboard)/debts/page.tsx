import type { Metadata } from "next";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { DebtsWorkspace } from "@/components/dashboard/debts-workspace";
import { getDebtsPageBaseline } from "@/lib/api/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "الديون",
  description: "متابعة ديون العملاء وتسجيل التسديدات والقيود ذات الصلة."
};

export default async function DebtsPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح شاشة الديون"
        description="سجّل الدخول لمتابعة أرصدة العملاء وتسجيل التسديدات من الحساب المصرح له."
      />
    );
  }

  if (access.state !== "ok") {
    return (
      <AccessRequired
        title="الحساب الحالي غير مخول لهذا المسار"
        description="هذه الشاشة متاحة فقط للحسابات الإدارية وحسابات POS النشطة."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getDebtsPageBaseline(supabase, {
    role: access.role,
    userId: access.userId
  });

  return <DebtsWorkspace role={access.role} {...baseline} />;
}
