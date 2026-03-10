import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { InventoryWorkspace } from "@/components/dashboard/inventory-workspace";
import { getInventoryPageBaseline } from "@/lib/api/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function InventoryPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح الجرد والتسوية"
        description="هذه الشاشة مخصصة لإدارة الجرد اليومي والشامل وتسويات الحسابات من حساب Admin فقط."
      />
    );
  }

  if (access.state !== "ok" || access.role !== "admin") {
    return (
      <AccessRequired
        title="الجرد والتسوية محصوران بحساب Admin"
        description="حسابات POS لا تبدأ الجرد ولا تنفذ التسويات المالية مباشرة."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getInventoryPageBaseline(supabase);

  return <InventoryWorkspace {...baseline} />;
}
