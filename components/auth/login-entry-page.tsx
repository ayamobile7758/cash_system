import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { InstallPrompt } from "@/components/runtime/install-prompt";

export function LoginEntryPage() {
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
          <p>سجّل الدخول وانتقل مباشرة إلى شاشة البيع لبدء عملية بيع جديدة.</p>
          <div className="inline-actions">
            الانتقال للبيع <ArrowLeft size={16} />
          </div>
        </Link>

        <InstallPrompt />
      </section>
    </main>
  );
}
