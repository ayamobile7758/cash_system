"use client";

import React from "react";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBanner } from "@/components/ui/status-banner";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
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
    <div className="auth-card">
      <header className="auth-header">
        <div className="auth-logo">
          <Store size={28} />
        </div>
        <h1>تسجيل الدخول</h1>
      </header>

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
                  const message = getSafeArabicErrorMessage(error, "تعذر إكمال تسجيل الدخول. حاول مجددًا.");
                  setErrorMessage(message);
                  toast.error(message);
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
                const message = getSafeArabicErrorMessage(error, "تعذر إكمال تسجيل الدخول الآن.");
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
            message="رصدنا أن الجهاز يبدو غير متصل حاليًا."
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
            dir="ltr"
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
            dir="ltr"
          />
        </label>

        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="spin" size={16} />
              جارٍ تسجيل الدخول...
            </>
          ) : (
            "تسجيل الدخول"
          )}
        </button>
      </form>
    </div>
  );
}
