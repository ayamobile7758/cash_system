import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { OperationsWorkspace } from "@/components/dashboard/operations-workspace";
import { getOperationsPageBaseline } from "@/lib/api/dashboard";
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

  if (access.state !== "ok" || !["admin", "pos_staff"].includes(access.role)) {
    return (
      <AccessRequired
        title="هذه الشاشة تتطلب دورًا تشغيليًا صالحًا"
        description="يمكن للـ Admin وPOS استخدام مسار الشحن، بينما التحويل الداخلي متاح للـ Admin فقط."
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
