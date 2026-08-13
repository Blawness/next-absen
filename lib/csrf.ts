import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * Same-origin guard for state-changing requests (POST/PUT/PATCH/DELETE).
 *
 * Browser-based cross-site request forgery attempts include an `Origin`
 * (or `Referer`) header that does NOT match the application's host. We
 * reject those with 403. Same-origin browser requests always include
 * Origin/Referer; legitimate API clients can set `Origin` manually.
 *
 * The check is intentionally strict: missing header → 403. This may
 * break some non-browser clients (Postman/curl without --origin), but
 * the alternative is silent CSRF exposure.
 *
 * Returns `null` when the request is allowed, or a NextResponse when
 * it should be rejected.
 */
export function requireSameOrigin(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null
  }

  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")
  const host = req.headers.get("host")

  if (!host) {
    return NextResponse.json(
      { error: "Forbidden: missing host header" },
      { status: 403 },
    )
  }

  const candidate = origin ?? (referer ? new URL(referer).origin : null)
  if (!candidate) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin request blocked" },
      { status: 403 },
    )
  }

  let candidateHost: string
  try {
    candidateHost = new URL(candidate).host
  } catch {
    return NextResponse.json(
      { error: "Forbidden: invalid origin" },
      { status: 403 },
    )
  }

  if (candidateHost !== host) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin request blocked" },
      { status: 403 },
    )
  }

  return null
}
