import { NextRequest, NextResponse } from "next/server"

interface RateLimitOptions {
  maxRequests: number
  windowMs: number
  keyExtractor?: (req: NextRequest) => string
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const DEFAULT_KEY_EXTRACTOR = (req: NextRequest): string => {
  const forwarded = req.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() ?? "unknown"
}

export function resetRateLimiter(): void {
  store.clear()
}

export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const keyExtractor = options.keyExtractor ?? DEFAULT_KEY_EXTRACTOR
  const key = keyExtractor(req)
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return null
  }

  if (entry.count >= options.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    )
  }

  entry.count++
  return null
}
