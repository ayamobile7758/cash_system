import type { Metadata } from "next";
import { getPublicReceiptViewByToken } from "@/lib/api/communication";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

type PublicReceiptPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const metadata: Metadata = {
  title: "الإيصال",
  description: "عرض الإيصال في صفحة قراءة فقط مع بيانات البيع الأساسية."
};

function PublicReceiptStateMessage(props: {
  title: string;
  description: string;
}) {
  return (
    <main className="dashboard-shell">
      <section className="workspace-panel empty-panel empty-panel--danger">
        <h2>{props.title}</h2>
        <p>{props.description}</p>
      </section>
    </main>
  );
}

export default async function PublicReceiptPage({ params }: PublicReceiptPageProps) {
  const { token } = await params;
  const supabase = getSupabaseAdminClient();
  const result = await getPublicReceiptViewByToken(supabase, token);

  if (result.state === "invalid") {
    return (
      <PublicReceiptStateMessage
        title="رابط الإيصال غير صالح"
        description="تحقق من الرابط أو اطلب رابطًا جديدًا من النظام."
      />
    );
  }

  if (result.state === "revoked") {
    return (
      <PublicReceiptStateMessage
        title="تم إلغاء رابط الإيصال"
        description="هذا الرابط لم يعد متاحًا للعرض. اطلب من المتجر إصدار رابط جديد إذا لزم."
      />
    );
  }

  if (result.state === "expired") {
    return (
      <PublicReceiptStateMessage
        title="انتهت صلاحية رابط الإيصال"
        description="انتهت مدة صلاحية هذا الرابط. اطلب رابطًا جديدًا إذا كنت بحاجة إلى الاطلاع على الإيصال."
      />
    );
  }

  return (
    <main className="dashboard-shell">
      <section className="workspace-stack">
        <div className="workspace-hero">
          <div>
            <p className="eyebrow">الإيصال</p>
            <h1>{result.data.store_name}</h1>
            <p className="workspace-lead">
              هذا العرض للقراءة فقط. لا يعرض أي تكلفة أو ربح أو ملاحظات داخلية.
            </p>
          </div>
        </div>

        <section className="workspace-panel print-receipt">
          <div className="section-heading">
            <div>
              <p className="eyebrow">الفاتورة</p>
              <h2>{result.data.invoice_number}</h2>
            </div>
          </div>

          <div className="info-strip">
            <span>التاريخ: {formatDate(result.data.invoice_date)}</span>
            <span>الإجمالي: {formatCurrency(result.data.total)}</span>
            <span>الطباعة: استخدم أمر المتصفح</span>
          </div>

          <div className="stack-list">
            {result.data.items.map((item) => (
              <article key={`${item.product_name}-${item.quantity}-${item.line_total}`} className="list-card">
                <div className="list-card__header">
                  <strong>{item.product_name}</strong>
                  <span>{formatCurrency(item.line_total)}</span>
                </div>
                <p>الكمية: {item.quantity}</p>
                <p className="workspace-footnote">سعر الوحدة: {formatCurrency(item.unit_price)}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
