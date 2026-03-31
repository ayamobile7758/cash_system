import type { Metadata } from "next";
import { LoginEntryPage } from "@/components/auth/login-entry-page";

export const metadata: Metadata = {
  title: "الصفحة الرئيسية",
  description: "نظام تشغيل يومي للبيع والمخزون والتقارير."
};

export default function HomePage() {
  return <LoginEntryPage />;
}
