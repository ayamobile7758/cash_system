import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getWorkspaceAccess } from "@/app/(dashboard)/access";
import { AccessRequired } from "@/components/dashboard/access-required";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getAlertsSummary } from "@/lib/api/search";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "لوحة المتابعة",
  description: "ملخص يومي للمبيعات والتنبيهات والحركة الأخيرة داخل مساحة العمل."
};

export default async function HomePage() {
  const access = await getWorkspaceAccess();

  if (access.state === "unauthenticated") {
    return (
      <AccessRequired
        title="يلزم تسجيل الدخول لفتح لوحة المتابعة"
        description="سجّل الدخول بحساب إداري للوصول إلى ملخص الأداء والتنبيهات اليومية."
      />
    );
  }

  if (access.state !== "ok") {
    return (
      <AccessRequired
        title="هذا المسار غير متاح لهذا الحساب"
        description="تحتاج إلى حساب إداري للوصول إلى لوحة المتابعة اليومية."
      />
    );
  }

  if (access.role === "pos_staff") {
    redirect("/pos");
  }

  const supabase = getSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [alertsSummary, invoiceRowsResult, recentInvoicesResult] = await Promise.all([
    getAlertsSummary(supabase, { role: access.role, userId: access.userId }),
    supabase
      .from("invoices")
      .select("id, total_amount")
      .eq("invoice_date", today)
      .returns<Array<{ id: string; total_amount: number }>>(),
    supabase
      .from("invoices")
      .select("id, invoice_number, invoice_date, total_amount, status")
      .eq("invoice_date", today)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<Array<{ id: string; invoice_number: string; invoice_date: string; total_amount: number; status: string }>>()
  ]);

  if (invoiceRowsResult.error) {
    throw invoiceRowsResult.error;
  }

  if (recentInvoicesResult.error) {
    throw recentInvoicesResult.error;
  }

  if (!alertsSummary) {
    throw new Error("ERR_ALERTS_SUMMARY_UNAVAILABLE");
  }

  const todayInvoices = invoiceRowsResult.data ?? [];
  const todaySalesCount = todayInvoices.length;
  const todaySalesTotal = todayInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);

  return (
    <DashboardHome
      alertsSummary={alertsSummary}
      recentInvoices={recentInvoicesResult.data ?? []}
      today={today}
      todaySalesCount={todaySalesCount}
      todaySalesTotal={todaySalesTotal}
    />
  );
}
