import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Tajawal } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegistration } from "@/components/runtime/service-worker-registration";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-numeric",
  display: "swap"
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-primary",
  display: "swap"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "Aya Mobile",
    template: "%s | Aya Mobile"
  },
  description:
    "نظام تشغيل للمبيعات والمخزون والمحاسبة اليومية على الهاتف والتابلت والكمبيوتر.",
  applicationName: "Aya Mobile",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Aya Mobile",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4F46E5"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const buildId =
    process.env.NEXT_PUBLIC_APP_VERSION ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "dev";

  return (
    <html lang="ar" dir="rtl" data-build-id={buildId} suppressHydrationWarning>
      <body className={`${tajawal.variable} ${jetBrainsMono.variable} ${inter.variable} aya-shell`}>
        {children}
        <ServiceWorkerRegistration buildId={buildId} />
        <Toaster
          position="top-right"
          dir="rtl"
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "var(--font-primary)"
            }
          }}
        />
      </body>
    </html>
  );
}
