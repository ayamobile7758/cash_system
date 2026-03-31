import type { Metadata } from "next";
import { LoginEntryPage } from "@/components/auth/login-entry-page";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "سجّل الدخول للوصول إلى بيئة التشغيل."
};

export default function LoginPage() {
  return <LoginEntryPage />;
}
