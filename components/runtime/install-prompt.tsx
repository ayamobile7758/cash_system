"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

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
    <button
      type="button"
      className="floating-install-btn"
      onClick={handleInstallClick}
      title="تثبيت النظام"
      aria-label="تثبيت النظام"
      data-state={installState}
    >
      <Download size={24} />
    </button>
  );
}
