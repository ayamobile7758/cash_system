"use client";

import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Mail, Store } from "lucide-react";
import { toast } from "sonner";
import { redirectAfterLogin } from "@/lib/auth/redirect-after-login";
import { StatusBanner } from "@/components/ui/status-banner";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const REMEMBERED_EMAIL_KEY = "aya.login.email";

export function LoginForm() {
  const submitLockRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    try {
      const storedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (storedEmail) {
        setEmail(storedEmail);
        setRememberEmail(true);
      }
    } catch {
      // Ignore storage issues and keep the form usable.
    }

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLockRef.current || isPending) {
      return;
    }

    const normalizedEmail = email.trim();
    let didRequestRedirect = false;

    setEmail(normalizedEmail);
    setErrorMessage(null);
    setIsPending(true);
    submitLockRef.current = true;

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (error) {
        const message = getSafeArabicErrorMessage(
          error,
          "تعذر إكمال تسجيل الدخول. حاول مجددًا."
        );
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      let nextRoute = "/pos";

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle<{ role: "admin" | "pos_staff" }>();

        if (profile?.role === "admin") {
          nextRoute = "/reports";
        }
      }

      try {
        if (rememberEmail) {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
        } else {
          window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // Browser storage is optional for the login flow.
      }

      didRequestRedirect = true;
      redirectAfterLogin(nextRoute);
    } catch (error) {
      const message = getSafeArabicErrorMessage(
        error,
        "تعذر إكمال تسجيل الدخول. حاول مجددًا."
      );
      setErrorMessage(message);
      toast.error(message);
    } finally {
      if (!didRequestRedirect) {
        submitLockRef.current = false;
        setIsPending(false);
      }
    }
  }

  return (
    <div className="auth-card" aria-busy={isPending}>
      <header className="auth-header">
        <div className="auth-logo">
          <Store size={28} />
        </div>

        <div className="auth-header__copy">
          <h1>تسجيل الدخول</h1>
          <p>ادخل بالحساب للوصول مباشرة إلى مساحة العمل المناسبة.</p>
        </div>
      </header>

      <form className="stack-form auth-form" autoComplete="on" onSubmit={handleSubmit}>
        {isOffline ? (
          <StatusBanner
            variant="offline"
            title="الاتصال غير متاح"
            message="يبدو أن الجهاز غير متصل حاليًا."
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

        <label className="stack-field auth-field">
          <span>البريد الإلكتروني</span>

          <span className="auth-field__control">
            <Mail className="auth-field__icon" size={18} aria-hidden="true" />
            <input
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError();
              }}
              autoFocus
              required
              dir="ltr"
            />
          </span>
        </label>

        <label className="stack-field auth-field">
          <span>كلمة المرور</span>

          <span className="auth-field__control">
            <KeyRound className="auth-field__icon" size={18} aria-hidden="true" />
            <input
              type={isPasswordVisible ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              required
              dir="ltr"
            />

            <button
              type="button"
              className="auth-field__toggle"
              onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
              aria-label={isPasswordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              aria-pressed={isPasswordVisible}
              disabled={isPending}
            >
              {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>

        <label className="auth-persist">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(event) => setRememberEmail(event.target.checked)}
          />
          <span>تذكّر البريد على هذا الجهاز</span>
        </label>

        <div className="auth-form__actions">
          <button type="submit" className="primary-button auth-submit" disabled={isPending}>
            تسجيل الدخول
          </button>

          <div className="auth-submit-state" aria-live="polite" aria-atomic="true">
            {isPending ? (
              <div className="auth-submit-state__loading" role="status">
                <span className="auth-submit-state__spinner">
                  <Loader2 className="spin" size={20} />
                </span>
                <span>جارٍ تجهيز الدخول...</span>
              </div>
            ) : (
              <span className="auth-submit-state__idle" aria-hidden="true" />
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
