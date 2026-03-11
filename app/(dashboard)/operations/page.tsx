import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { OperationsWorkspace } from "@/components/dashboard/operations-workspace";
import { getOperationsPageBaseline } from "@/lib/api/dashboard";
import { hasPermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function OperationsPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لمسارات الشحن والتحويلات"
        description="عمليات الشحن والتحويلات محمية بجلسة صالحة، والتحويل الداخلي محصور بالـ Admin."
      />
    );
  }

  if (access.state !== "ok" || !hasPermission(access.permissions, "operations.read")) {
    return (
      <AccessRequired
        title="هذه الشاشة تتطلب bundle عمليات صالحًا"
        description="يحتاج المستخدم إلى صلاحية `operations.read` لعرض الشحن. التحويل الداخلي يبقى محصورًا بالـ Admin."
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
