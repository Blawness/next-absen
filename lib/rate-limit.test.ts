import { NextRequest, NextResponse } from "next/server"
import { rateLimit, resetRateLimiter } from "./rate-limit"

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimiter()
  })

  it("allows requests within limit", async () => {
    const req = new NextRequest("http://localhost/api/auth/login")

    for (let i = 0; i < 5; i++) {
      const res = await rateLimit(req, { maxRequests: 10, windowMs: 60000 })
      expect(res).toBeNull() // null means pass through
    }
  })

  it("blocks requests exceeding limit", async () => {
    const req = new NextRequest("http://localhost/api/auth/login")

    for (let i = 0; i < 3; i++) {
      await rateLimit(req, { maxRequests: 3, windowMs: 60000 })
    }

    const res = await rateLimit(req, { maxRequests: 3, windowMs: 60000 })
    expect(res).not.toBeNull()
    expect(res!.status).toBe(429)
    const body = await res!.json()
    expect(body.error).toContain("Too many requests")
  })

  it("tracks different keys separately", async () => {
    const req1 = new NextRequest("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "1.1.1.1" },
    })
    const req2 = new NextRequest("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "2.2.2.2" },
    })

    // Exhaust requests for req1
    for (let i = 0; i < 3; i++) {
      await rateLimit(req1, { maxRequests: 3, windowMs: 60000 })
    }

    // req2 should still be allowed
    const res = await rateLimit(req2, { maxRequests: 3, windowMs: 60000 })
    expect(res).toBeNull()
  })

  it("uses custom key extractor", async () => {
    const req = new NextRequest("http://localhost/api/external/attendance", {
      headers: { "x-api-key": "test-key-123" },
    })

    const keyExtractor = (r: NextRequest) => r.headers.get("x-api-key") ?? "unknown"

    for (let i = 0; i < 2; i++) {
      await rateLimit(req, {
        maxRequests: 2,
        windowMs: 60000,
        keyExtractor,
      })
    }

    const res = await rateLimit(req, {
      maxRequests: 2,
      windowMs: 60000,
      keyExtractor,
    })
    expect(res!.status).toBe(429)
  })

  it("returns remaining count in headers", async () => {
    const req = new NextRequest("http://localhost/api/auth/login")

    const res = await rateLimit(req, { maxRequests: 5, windowMs: 60000 })
    expect(res).toBeNull() // first request passes
  })
})
