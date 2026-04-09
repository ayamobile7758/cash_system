"use client";

import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { InstallPrompt } from "@/components/runtime/install-prompt";

export function LoginEntryPage() {
  return (
    <div className="split-layout">
      <main className="form-column">
        <div className="form-container auth-card">
          <header className="form-header">
            <h1>تسجيل الدخول</h1>
            <p>مرحبًا بك مجددًا. أدخل بياناتك للمتابعة إلى مساحات التشغيل.</p>
          </header>

          <LoginForm />

          <div className="quick-links-area" aria-label="روابط الوصول السريع">
            <Link href="/pos" className="quick-link-ghost">
              <Store size={18} aria-hidden="true" />
              <span>نقطة البيع المباشرة</span>
              <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </main>

      <aside className="brand-column">
        <div className="pattern-grid" />
        <div className="brand-pattern pattern-1" />
        <div className="brand-pattern pattern-2" />

        <div className="brand-content">
          <div className="brand-logo-icon">
            <Store size={40} />
          </div>
          <h2>Aya Mobile</h2>
          <p>
            نظام إدارة متكامل لنقاط البيع وجرد المخزون، صُمم خصيصًا لمتاجر الهواتف الذكية بهدف
            تحسين الإنتاجية وتسهيل المبيعات.
          </p>
          <div className="install-prompt-wrapper">
            <InstallPrompt />
          </div>
        </div>
      </aside>
    </div>
  );
}
