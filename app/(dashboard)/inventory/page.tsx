import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { InventoryWorkspace } from "@/components/dashboard/inventory-workspace";
import { getInventoryPageBaseline } from "@/lib/api/dashboard";
import { hasPermission } from "@/lib/permissions";
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

  if (access.state !== "ok" || !hasPermission(access.permissions, "inventory.read")) {
    return (
      <AccessRequired
        title="هذه الشاشة تتطلب bundle جرد صالحًا"
        description="الجرد يحتاج `inventory.read`. التسوية المالية نفسها تبقى محصورة بالـ Admin داخل نفس الشاشة."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const baseline = await getInventoryPageBaseline(supabase, {
    role: access.role
  });

  return <InventoryWorkspace {...baseline} canReconcile={access.role === "admin"} />;
}
