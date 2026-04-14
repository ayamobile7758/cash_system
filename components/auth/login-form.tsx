"use client";

import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { StatusBanner } from "@/components/ui/status-banner";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const REMEMBERED_EMAIL_KEY = "aya.login.email";

export function LoginForm() {
  const router = useRouter();
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

      // Check role with 2-second timeout
      if (data.user) {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
          const profilePromise = supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle<{ role: "admin" | "pos_staff" }>();

          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Timeout")), 2000);
          });

          const { data: profile } = await Promise.race([
            profilePromise,
            timeoutPromise
          ]) as Awaited<typeof profilePromise>;

          if (profile?.role === "admin") {
            nextRoute = "/reports";
          }
        } catch {
          // Timeout or error: use default route
        } finally {
          clearTimeout(timeoutId);
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
      router.replace(nextRoute);
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
    <>
      <form onSubmit={handleSubmit}>
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

        <div className="input-group">
          <label htmlFor="email">البريد الإلكتروني</label>
          <div className="input-wrapper">
            <Mail className="icon" size={20} aria-hidden="true" />
            <input
              type="email"
              id="email"
              name="email"
              className="input-field"
              placeholder="أدخل البريد الإلكتروني"
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
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="password">كلمة المرور</label>
          <div className="input-wrapper password-input">
            <KeyRound className="icon" size={20} aria-hidden="true" />
            <input
              type={isPasswordVisible ? "text" : "password"}
              id="password"
              name="password"
              className="input-field"
              placeholder="••••••••"
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
              className="password-toggle"
              onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
              aria-label={isPasswordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              aria-pressed={isPasswordVisible}
              disabled={isPending}
            >
              {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-options">
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(event) => setRememberEmail(event.target.checked)}
            />
            <span>تذكّر البريد على هذا الجهاز</span>
          </label>
          <a href="#" className="forgot-password">نسيت كلمة المرور؟</a>
        </div>

        <button type="submit" className="btn-submit" disabled={isPending}>
          {isPending ? <Loader2 className="spin" aria-hidden="true" size={20} /> : undefined}
          <span>تسجيل الدخول</span>
        </button>
      </form>
    </>
  );
}
