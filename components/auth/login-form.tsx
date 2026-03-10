"use client";

import { useState, useTransition } from "react";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="login-grid">
      <section className="workspace-panel login-panel">
        <div className="workspace-hero">
          <div>
            <p className="eyebrow">PX-05 / Runtime Access</p>
            <h1>تسجيل الدخول للتشغيل الحقيقي</h1>
            <p className="workspace-lead">
              استخدم حساب <code>Admin</code> أو <code>POS</code> لاختبار الشاشات التشغيلية،
              والبيع، والمرتجع، وتسديد الدين على نفس Web App.
            </p>
          </div>
        </div>

        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();

            startTransition(() => {
              void (async () => {
                const supabase = createSupabaseBrowserClient();
                const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password
                });

                if (error) {
                  toast.error(error.message);
                  return;
                }

                await supabase.auth.getSession();
                window.location.assign("/pos");
              })();
            });
          }}
        >
          <label className="stack-field">
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@aya.local"
              required
            />
          </label>

          <label className="stack-field">
            <span>كلمة المرور</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" className="primary-button" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="spin" size={16} />
                جارٍ تسجيل الدخول...
              </>
            ) : (
              <>
                <LogIn size={16} />
                الدخول إلى بيئة التشغيل
              </>
            )}
          </button>
        </form>
      </section>

      <aside className="workspace-panel login-panel login-panel--accent">
        <p className="eyebrow">Device QA</p>
        <h2>ما الذي سنثبته في PX-05؟</h2>
        <div className="workspace-stack">
          <article className="baseline-card">
            <div className="hero-stat-card hero-stat-card--safe">
              <ShieldCheck size={18} />
              <strong>Phone / Tablet / Laptop</strong>
            </div>
            <p>نفس مسارات التشغيل الأساسية يجب أن تبقى قابلة للاستخدام بدون كسر الواجهة أو فقد أزرار الإجراء.</p>
          </article>

          <article className="baseline-card">
            <h3>المسارات المتوقعة</h3>
            <p>POS، الفواتير، الديون، الإعدادات، والتقارير مع نفس الصلاحيات المعتمدة في الخادم.</p>
          </article>
        </div>
      </aside>
    </div>
  );
}
