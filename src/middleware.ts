import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { applyCorsHeaders } from "@/lib/cors";

const publicPaths = [
  "/",
  "/pricing",
  "/features",
  "/templates",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/terms",
  "/privacy",
  "/refund",
  "/cookies",
  "/acceptable-use",
  "/content-policy",
  "/dpa",
  "/help",
  "/contact",
  "/403",
  "/404",
  "/500",
];

const authPaths = ["/login", "/register", "/forgot-password"];

function withCors(request: NextRequest, response: NextResponse) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    applyCorsHeaders(response.headers, request.headers.get("origin"));
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  // Canonical: www → apex (also configured in vercel.json)
  if (host === "www.lirazai.com") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "lirazai.com";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    applyCorsHeaders(preflight.headers, request.headers.get("origin"));
    return preflight;
  }

  if (pathname.startsWith("/api/webhooks")) {
    return withCors(request, NextResponse.next());
  }

  if (process.env.FEATURE_MAINTENANCE_MODE === "true" && !pathname.startsWith("/admin")) {
    if (!pathname.startsWith("/api") && pathname !== "/500") {
      return NextResponse.rewrite(new URL("/500", request.url));
    }
  }

  const isPublic =
    publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/preview/") ||
    pathname.startsWith("/api/preview/") ||
    pathname.startsWith("/api/runtime/");

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  });

  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?callbackUrl=/admin", request.url));
    }
    const role = token.globalRole as string;
    if (role !== "ADMINISTRATOR" && role !== "SUPER_ADMINISTRATOR") {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding") || pathname.startsWith("/editor")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?callbackUrl=" + encodeURIComponent(pathname), request.url));
    }
  }

  if (token && authPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublic && !token && pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return withCors(request, unauthorized);
  }

  const response = NextResponse.next();
  response.headers.set("X-Request-Id", crypto.randomUUID());
  return withCors(request, response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
