import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { InstallPrompt } from "@/components/runtime/install-prompt";

export const metadata: Metadata = {
  title: "الصفحة الرئيسية",
  description: "نظام تشغيل يومي للبيع والمخزون والتقارير."
};

export default function HomePage() {
  return (
    <main className="baseline-shell baseline-shell--auth login-shell">
      <LoginForm />

      <section className="entry-grid" aria-label="وصول سريع وتثبيت">
        <Link href="/pos" className="baseline-link-card baseline-link-card--accent">
          <h2>
            <ShoppingCart size={20} style={{ display: 'inline-block', verticalAlign: 'middle', marginInlineEnd: '0.5rem' }} />
            نقطة البيع المباشرة
          </h2>
          <p>
            ابدأ البيع فوراً والوصول لشاشة نقطة البيع بدون الحاجة للدخول الكامل لمساحة العمل.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--aya-accent)', fontWeight: 700, fontSize: '0.9rem' }}>
            الانتقال للبيع <ArrowLeft size={16} />
          </div>
        </Link>

        <InstallPrompt />
      </section>
    </main>
  );
}
