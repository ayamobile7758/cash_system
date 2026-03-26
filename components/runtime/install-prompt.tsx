"use client";

import { useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

type InstallState = "waiting" | "ready" | "accepted" | "dismissed" | "unsupported";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>("waiting");

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setInstallState("ready");
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstallState("accepted");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const timeout = window.setTimeout(() => {
      setInstallState((current) => (current === "waiting" ? "unsupported" : current));
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const statusLabel = useMemo(() => {
    switch (installState) {
      case "ready":
        return "التثبيت متاح الآن على هذا المتصفح.";
      case "accepted":
        return "تم تثبيت التطبيق أو تم قبول التثبيت من قبل المستخدم.";
      case "dismissed":
        return "تم تأجيل التثبيت. يمكن إعادة المحاولة لاحقًا.";
      case "unsupported":
        return "زر التثبيت يظهر فقط على المتصفحات التي تدعم Install App / Add to Home Screen.";
      default:
        return "جارٍ التحقق من دعم التثبيت على هذا الجهاز.";
    }
  }, [installState]);

  async function handleInstallClick() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setInstallState(choice.outcome === "accepted" ? "accepted" : "dismissed");
  }

  return (
    <section className="baseline-card install-card" aria-labelledby="install-card-title">
      <h2 id="install-card-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
        تثبيت النظام على جهازك
      </h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--aya-muted)', lineHeight: 1.6 }}>
        النظام يعمل كتطبيق ويب على جميع الأجهزة، مع توفر التثبيت الاختياري.
      </p>

      <div className="install-card__actions">
        <button
          type="button"
          className="ghost-button"
          style={{ width: '100%' }}
          onClick={handleInstallClick}
          disabled={installState !== "ready"}
        >
          تثبيت Aya Mobile
        </button>
        <p className="install-status" style={{ fontSize: '0.85rem', textAlign: 'center' }} data-install-state={installState}>
          {statusLabel}
        </p>
      </div>
    </section>
  );
}
