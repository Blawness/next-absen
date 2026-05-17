import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rate limit auth endpoints (5 requests per minute per IP)
  if (pathname.startsWith("/api/auth/") && request.method === "POST") {
    const rateLimitResult = await rateLimit(request, {
      maxRequests: 5,
      windowMs: 60000,
    })
    if (rateLimitResult) return rateLimitResult
  }

  // Handle /api/external/* routes — CORS headers + OPTIONS preflight
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

  // Page route auth protection
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    // Use NEXTAUTH_URL as the canonical base so the callbackUrl reflects
    // the public domain, not the internal host (localhost:PORT) seen by
    // Next.js when sitting behind a reverse proxy.
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
  ],
}
