import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const buildId =
    process.env.NEXT_PUBLIC_APP_VERSION ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "dev";

  const manifest: MetadataRoute.Manifest & { version: string } = {
    name: "Aya Mobile",
    short_name: "Aya Mobile",
    description: "Aya Mobile ERP/POS",
    id: "/",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#f9f8f5",
    theme_color: "#f9f8f5",
    categories: ["business", "productivity", "finance"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/aya-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/aya-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    version: buildId
  };

  return manifest;
}
