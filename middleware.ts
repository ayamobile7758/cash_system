import { NextRequest, NextResponse } from "next/server";
import {
  buildRateLimitKey,
  consumeRateLimit,
  resolveClientAddress,
  resolveRateLimitRule
} from "@/lib/runtime/rate-limit";

function isAllowedBrowser(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const isChromeFamily = ua.includes("chrome") || ua.includes("crios") || ua.includes("chromium");
  const isEdge = ua.includes("edg/");
  const isFirefox = ua.includes("firefox") || ua.includes("fxios");
  const isSafari = ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium");
  const isLegacyIe = ua.includes("msie") || ua.includes("trident/");

  if (isLegacyIe) return false;
  return isChromeFamily || isEdge || isFirefox || isSafari;
}

function isKnownDeviceClass(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const isPhone = ua.includes("mobile");
  const isTablet = ua.includes("tablet") || ua.includes("ipad");
  const isDesktopLike = ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux");
  return isPhone || isTablet || isDesktopLike;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next/") || pathname === "/unsupported-device") {
    return NextResponse.next();
  }

  const rateLimitRule = resolveRateLimitRule(pathname, request.method);
  if (rateLimitRule) {
    const result = consumeRateLimit({
      key: buildRateLimitKey(rateLimitRule.scope, resolveClientAddress(request), pathname),
      limit: rateLimitRule.limit,
      windowMs: rateLimitRule.windowMs
    });

    if (!result.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      const headers = new Headers({
        "Retry-After": String(retryAfterSeconds),
        "X-Aya-RateLimit-Limit": String(rateLimitRule.limit),
        "X-Aya-RateLimit-Remaining": String(result.remaining),
        "X-Aya-RateLimit-Reset": String(result.resetAt)
      });

      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ERR_API_RATE_LIMITED",
              message: "تم تجاوز الحد المؤقت للطلبات. حاول مجددًا بعد لحظات."
            }
          },
          {
            status: 429,
            headers
          }
        );
      }

      return new NextResponse("Too many requests", {
        status: 429,
        headers
      });
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request
  });

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent) {
    return response;
  }

  if (!isAllowedBrowser(userAgent) || !isKnownDeviceClass(userAgent)) {
    const url = request.nextUrl.clone();
    url.pathname = "/unsupported-device";
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  response.headers.set("x-aya-device-policy", "enforced");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
