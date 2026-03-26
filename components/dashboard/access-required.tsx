import Link from "next/link";

type AccessRequiredProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function AccessRequired({
  title,
  description,
  actionLabel = "الانتقال إلى تسجيل الدخول",
  actionHref = "/"
}: AccessRequiredProps) {
  return (
    <section className="workspace-stack">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">يتطلب صلاحية</p>
          <h1>{title}</h1>
          <p className="workspace-lead">{description}</p>
        </div>
      </div>

      <div className="workspace-panel">
        <div className="empty-panel">
          <h2>هذه الشاشة غير متاحة بالحالة الحالية</h2>
          <p>
            سجّل الدخول أولًا، ثم استخدم الحساب الذي يملك الصلاحية المناسبة لعرض هذه الشاشة أو
            تنفيذ إجراءاتها.
          </p>
          <div className="action-row">
            <Link href={actionHref} className="primary-button">
              {actionLabel}
            </Link>
            <Link href="/" className="secondary-button">
              العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
