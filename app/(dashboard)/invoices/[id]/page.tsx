import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { InvoiceDetail } from "@/components/dashboard/invoice-detail";
import { getInvoiceDetailPageData } from "@/lib/api/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "تفاصيل الفاتورة",
  description: "عرض تفاصيل الفاتورة والبنود والمدفوعات والمرتجعات والإيصال."
};

type InvoiceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح تفاصيل الفاتورة"
        description="سجّل الدخول أولًا للوصول إلى بيانات الفاتورة والإيصال والمرتجعات."
      />
    );
  }

  if (access.state !== "ok") {
    return (
      <AccessRequired
        title="الحساب الحالي غير مخول لهذا المسار"
        description="هذه الصفحة مخصصة للحسابات المصرح لها فقط."
      />
    );
  }

  const supabase = getSupabaseAdminClient();
  const data = await getInvoiceDetailPageData(supabase, {
    role: access.role,
    userId: access.userId
  }, id);

  if (!data.invoice) {
    notFound();
  }

  return <InvoiceDetail role={access.role} invoice={data.invoice} accounts={data.accounts} />;
}
