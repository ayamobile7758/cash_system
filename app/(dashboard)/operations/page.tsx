import type { Metadata } from "next";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { OperationsWorkspace } from "@/components/dashboard/operations-workspace";
import { getOperationsPageBaseline } from "@/lib/api/dashboard";
import { hasPermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "الشحن والتحويلات",
  description: "تسجيل عمليات الشحن والتحويلات الداخلية ومتابعة أثرها على الحسابات."
};

export default async function OperationsPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لمسارات الشحن والتحويلات"
        description="عمليات الشحن والتحويلات محمية بجلسة صالحة، والتحويل الداخلي محصور بالحساب الإداري."
      />
    );
  }

  if (access.state !== "ok" || !hasPermission(access.permissions, "operations.read")) {
    return (
      <AccessRequired
        title="هذه الشاشة غير متاحة لهذا الحساب"
        description="تحتاج إلى صلاحية عرض العمليات، بينما تبقى التحويلات الداخلية للحسابات الإدارية."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getOperationsPageBaseline(supabase, {
    role: access.role,
    userId: access.userId
  });

  return <OperationsWorkspace {...baseline} />;
}
