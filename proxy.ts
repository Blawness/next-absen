import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

/**
 * Edge "proxy" (formerly `middleware.ts`).
 *
 * Runs at the Edge before any route handler. We do THREE things here:
 *
 *   1. Rate-limit POSTs to `/api/auth/*` to slow down credential stuffing.
 *      NextAuth also has its own internal checks; this is a defense in
 *      depth layer.
 *   2. CORS preflight + headers for `/api/external/*` (used by external
 *      API-key clients like QR scanners).
 *   3. Redirect to /auth/signin when a page request has no session
 *      cookie. We can't validate the JWT here (Prisma doesn't run on
 *      the Edge runtime), so this is a presence check only — real
 *      authorization is enforced per-request by `validateSession` in
 *      route handlers.
 *
 * Anything else (all other /api/* and page routes) passes through.
 */
export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Rate limit auth POSTs (5 req/min/IP)
  if (pathname.startsWith("/api/auth/") && request.method === "POST") {
    const rateLimitResult = await rateLimit(request, {
      maxRequests: 5,
      windowMs: 60000,
    })
    if (rateLimitResult) return rateLimitResult
  }

  // 2. CORS for external API
  if (pathname.startsWith("/api/external/")) {
    const origin = request.headers.get("origin") ?? "*"

    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          "Access-Control-Max-Age": "86400",
        },
      })
    }

    const response = NextResponse.next()
    response.headers.set("Access-Control-Allow-Origin", origin === "null" ? "*" : origin)
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key")
    return response
  }

  // 3. Page route auth protection (presence check only).
  // Skip /api/* — NextAuth's own endpoints under /api/auth/* must
  // work BEFORE login, and other API routes do their own per-handler
  // auth check (validateSession in lib/auth.ts).
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const sessionCookie =
    request.cookies.get("__Secure-next-auth.session-token") ??
    request.cookies.get("next-auth.session-token")

  if (!sessionCookie?.value) {
    const base = (process.env.NEXTAUTH_URL ?? request.nextUrl.origin).replace(/\/$/, "")
    const callbackUrl = base + request.nextUrl.pathname + request.nextUrl.search
    const signInUrl = new URL("/auth/signin", base)
    signInUrl.searchParams.set("callbackUrl", callbackUrl)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/external/:path*",
    "/dashboard/:path*",
    "/attendance/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/activity-logs/:path*",
    "/superadmin/:path*",
  ],
}
