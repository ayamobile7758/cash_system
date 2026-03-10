import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

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

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname === "/unsupported-device") {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({
    request
  });

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    });

    await supabase.auth.getUser();
  }

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
