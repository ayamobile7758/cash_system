"use client";

import React from "react";
import { useEffect, useState, useTransition } from "react";
import { ChartColumnIncreasing, Loader2, LogIn, ShieldCheck, ShoppingCart, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBanner } from "@/components/ui/status-banner";
import { SectionCard } from "@/components/ui/section-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function clearError() {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }

  return (
    <div className="login-grid">
      <section className="workspace-panel login-panel">
        <div className="workspace-hero">
          <div>
            <p className="eyebrow">الدخول الآمن</p>
            <h1>تسجيل الدخول إلى مساحة العمل</h1>
            <p className="workspace-lead">
              سجّل الدخول بالحساب المخصص لك للوصول إلى نقطة البيع أو المساحات الإدارية ومتابعة
              العمل اليومي من شاشة واحدة.
            </p>
          </div>

          <div className="hero-badge-row" aria-label="مزايا الدخول">
            <span className="hero-badge">صلاحيات حسب الدور</span>
            <span className="hero-badge">مسارات واضحة بعد الدخول</span>
            <span className="hero-badge">جاهز للهاتف والتابلت</span>
          </div>
        </div>

        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            setErrorMessage(null);

            startTransition(() => {
              void (async () => {
                try {
                  const supabase = createSupabaseBrowserClient();
                  const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                  });

                  if (error) {
                    setErrorMessage(error.message);
                    toast.error(error.message);
                    return;
                  }

                  await supabase.auth.getSession();

                  const {
                    data: { user }
                  } = await supabase.auth.getUser();

                  let nextRoute = "/pos";

                  if (user) {
                    const { data: profile } = await supabase
                      .from("profiles")
                      .select("role")
                      .eq("id", user.id)
                      .single();

                    if (profile?.role === "admin") {
                      nextRoute = "/reports";
                    } else if (profile?.role === "pos_staff") {
                      nextRoute = "/pos";
                    }
                  }

                  router.replace(nextRoute);
                  router.refresh();
                } catch (error) {
                  const message = (error as Error).message || "تعذر إكمال تسجيل الدخول الآن.";
                  setErrorMessage(message);
                  toast.error(message);
                }
              })();
            });
          }}
        >
          {isOffline ? (
            <StatusBanner
              variant="offline"
              title="الاتصال غير متاح"
              message="رصدنا أن الجهاز يبدو غير متصل حاليًا. يمكنك المتابعة بالمحاولة الآن، لكن إكمال تسجيل الدخول يتطلب اتصالًا فعليًا بالشبكة."
            />
          ) : null}

          {errorMessage ? (
            <StatusBanner
              variant="danger"
              title="تعذر تسجيل الدخول"
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          ) : null}

          <label className="stack-field">
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError();
              }}
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
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
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
        <SectionCard
          tone="accent"
          eyebrow="جاهزية التشغيل"
          title="بعد الدخول ستصل مباشرة إلى مساحة العمل المناسبة"
          description="واجهة واحدة مرتبة تمنح كل مستخدم المسارات المناسبة له بدون ازدحام بصري أو خطوات مربكة."
        >
          <div className="landing-highlight-list">
            <span>
              <ShoppingCart size={16} />
              نقطة البيع تبقى قريبة من الموظف
            </span>
            <span>
              <ChartColumnIncreasing size={16} />
              التقارير والإشعارات أقرب للمديرين
            </span>
          </div>
        </SectionCard>

        <div className="workspace-stack">
          <SectionCard
            eyebrow="الأجهزة"
            title="الهاتف والتابلت والكمبيوتر"
            description="التجربة نفسها تبقى واضحة على الأجهزة الثلاثة مع مسارات مناسبة للمساحة المتاحة."
            tone="subtle"
          >
            <div className="hero-stat-card hero-stat-card--safe">
              <ShieldCheck size={18} />
              <strong>جاهز للاستخدام اليومي على أجهزة المتجر</strong>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="طريقة العمل"
            title="المسارات تظهر حسب الصلاحية"
            description="البيع، الفواتير، الديون، الإشعارات، والتقارير تظهر وفق الدور الممنوح لك بعد تسجيل الدخول."
          >
            <div className="landing-feature-meta">
              <span>
                <Smartphone size={16} />
                تنقل واضح على الشاشات الصغيرة
              </span>
              <span>
                <LogIn size={16} />
                دخول مباشر ثم انتقال فوري إلى نقطة البيع
              </span>
            </div>
          </SectionCard>
        </div>
      </aside>
    </div>
  );
}
