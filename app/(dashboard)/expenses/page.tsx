import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { ExpensesWorkspace } from "@/components/dashboard/expenses-workspace";
import { getExpensesPageBaseline } from "@/lib/api/expenses";
import { hasPermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ExpensesPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح شاشة المصروفات"
        description="المصروفات التشغيلية محمية بجلسة صالحة وتُدار عبر لوحات التشغيل فقط."
      />
    );
  }

  if (access.state !== "ok" || !hasPermission(access.permissions, "expenses.read")) {
    return (
      <AccessRequired
        title="هذه الشاشة تتطلب bundle مصروفات صالحًا"
        description="يحتاج المستخدم إلى صلاحية `expenses.read` لفتح شاشة المصروفات. إدارة الفئات ما تزال محصورة بالـ Admin."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getExpensesPageBaseline(supabase, {
    role: access.role,
    userId: access.userId
  });

  return <ExpensesWorkspace role={access.role} {...baseline} />;
}
