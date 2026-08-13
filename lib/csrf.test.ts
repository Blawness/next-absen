import type { NextRequest } from "next/server"
import { requireSameOrigin } from "./csrf"

function makeReq(opts: {
  method?: string
  origin?: string | null
  referer?: string | null
  host?: string | null
}): NextRequest {
  const headers = new Headers()
  if (opts.origin !== undefined && opts.origin !== null) headers.set("origin", opts.origin)
  if (opts.referer !== undefined && opts.referer !== null) headers.set("referer", opts.referer)
  if (opts.host !== undefined && opts.host !== null) headers.set("host", opts.host)

  return {
    method: opts.method ?? "POST",
    headers,
  } as unknown as NextRequest
}

describe("requireSameOrigin", () => {
  it("passes through GET/HEAD/OPTIONS without checks", () => {
    expect(requireSameOrigin(makeReq({ method: "GET", host: "app.example" }))).toBeNull()
    expect(requireSameOrigin(makeReq({ method: "HEAD", host: "app.example" }))).toBeNull()
    expect(requireSameOrigin(makeReq({ method: "OPTIONS", host: "app.example" }))).toBeNull()
  })

  it("allows same-origin POST", () => {
    const req = makeReq({ method: "POST", origin: "https://app.example", host: "app.example" })
    expect(requireSameOrigin(req)).toBeNull()
  })

  it("blocks cross-origin POST via Origin header", () => {
    const req = makeReq({ method: "POST", origin: "https://evil.example", host: "app.example" })
    const result = requireSameOrigin(req)
    expect(result?.status).toBe(403)
  })

  it("blocks cross-origin POST via Referer header when Origin missing", () => {
    const req = makeReq({
      method: "POST",
      origin: null,
      referer: "https://evil.example/page",
      host: "app.example",
    })
    const result = requireSameOrigin(req)
    expect(result?.status).toBe(403)
  })

  it("blocks POST with no Origin or Referer", () => {
    const req = makeReq({ method: "POST", origin: null, referer: null, host: "app.example" })
    const result = requireSameOrigin(req)
    expect(result?.status).toBe(403)
  })

  it("blocks POST with no Host header", () => {
    const req = makeReq({ method: "POST", origin: "https://app.example", host: null })
    const result = requireSameOrigin(req)
    expect(result?.status).toBe(403)
  })

  it("blocks POST with malformed origin", () => {
    const req = makeReq({ method: "POST", origin: "not a url", host: "app.example" })
    const result = requireSameOrigin(req)
    expect(result?.status).toBe(403)
  })
})
