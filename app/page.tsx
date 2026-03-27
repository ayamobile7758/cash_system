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
            <span className="inline-actions">
              <ShoppingCart size={20} aria-hidden="true" />
              <span>نقطة البيع المباشرة</span>
            </span>
          </h2>
          <p>
            {"\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0648\u0627\u0646\u062a\u0642\u0644 \u0645\u0628\u0627\u0634\u0631\u0629 \u0625\u0644\u0649 \u0634\u0627\u0634\u0629 \u0627\u0644\u0628\u064a\u0639 \u2014 \u0627\u0644\u0637\u0631\u064a\u0642 \u0627\u0644\u0623\u0633\u0631\u0639 \u0644\u0628\u062f\u0621 \u0639\u0645\u0644\u064a\u0629 \u0628\u064a\u0639 \u062c\u062f\u064a\u062f\u0629."}
          </p>
          <div className="inline-actions">
            الانتقال للبيع <ArrowLeft size={16} />
          </div>
        </Link>

        <InstallPrompt />
      </section>
    </main>
  );
}
