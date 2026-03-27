import type { Metadata } from "next";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { PosAccessRequired } from "@/components/pos/access-required";
import { PosWorkspace } from "@/components/pos/pos-workspace";

export const metadata: Metadata = {
  title: "نقطة البيع",
  description: "إدارة البيع السريع والسلة وتأكيد العمليات اليومية من شاشة واحدة واضحة."
};

export default async function PosPage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <PosAccessRequired
        title="يلزم تسجيل الدخول لفتح نقطة البيع"
        description="سجّل الدخول بحساب مخصص للبيع حتى تتمكن من إدارة السلة وتأكيد العملية."
      />
    );
  }

  if (access.state === "forbidden") {
    return (
      <PosAccessRequired
        title="هذا الحساب لا يملك صلاحية نقطة البيع"
        description="هذا الحساب غير مخصص لاستخدام نقطة البيع. استخدم حسابًا مناسبًا للبيع أو تواصل مع الإدارة."
      />
    );
  }

  return <PosWorkspace maxDiscountPercentage={access.maxDiscountPercentage} />;
}
