import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptSources = ["'self'", "'unsafe-inline'"];

if (process.env.NODE_ENV !== "production") {
  // Next.js dev runtime still relies on eval-based tooling.
  scriptSources.push("'unsafe-eval'");
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https: wss: http://127.0.0.1:* ws://127.0.0.1:*",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  `script-src ${scriptSources.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  webpack(config) {
    config.cache = false;
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "es-toolkit/compat/get": path.join(
        __dirname,
        "node_modules/es-toolkit/compat/get.js"
      ),
      "es-toolkit/compat/range": path.join(
        __dirname,
        "node_modules/es-toolkit/compat/range.js"
      ),
      "es-toolkit/compat/sortBy": path.join(
        __dirname,
        "node_modules/es-toolkit/compat/sortBy.js"
      ),
      "es-toolkit/compat/throttle": path.join(
        __dirname,
        "node_modules/es-toolkit/compat/throttle.js"
      ),
      "es-toolkit/compat/uniqBy": path.join(
        __dirname,
        "node_modules/es-toolkit/compat/uniqBy.js"
      )
    };

    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
