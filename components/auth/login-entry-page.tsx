"use client";

import { Store } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { InstallPrompt } from "@/components/runtime/install-prompt";

export function LoginEntryPage() {
  return (
    <div className="split-layout">
      <main className="form-column">
        <div className="form-container">
          <header className="form-header">
            <h1>مرحباً بك مجدداً</h1>
          </header>

          <LoginForm />
        </div>
      </main>

      <aside className="brand-column">
        <div className="pattern-grid"></div>
        <div className="brand-pattern pattern-1"></div>
        <div className="brand-pattern pattern-2"></div>
        
        <div className="brand-content">
          <div className="brand-logo-icon">
            <Store size={40} />
          </div>
          <h2>Aya Mobile</h2>
          <p>نظام إدارة متكامل لنقاط البيع وجرد المخزون، صُمم خصيصاً لمتاجر الهواتف الذكية بهدف تحسين الإنتاجية وتسهيل المبيعات.</p>
          <div className="install-prompt-wrapper">
            <InstallPrompt />
          </div>
        </div>
      </aside>
    </div>
  );
}
