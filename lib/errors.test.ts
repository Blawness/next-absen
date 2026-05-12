import { NextRequest, NextResponse } from "next/server"
import { HttpError, withErrorHandling } from "./errors"

describe("HttpError", () => {
  it("creates an error with message and status", () => {
    const error = new HttpError("Not found", 404)
    expect(error.message).toBe("Not found")
    expect(error.status).toBe(404)
    expect(error).toBeInstanceOf(Error)
  })

  it("can be used in instanceof checks", () => {
    const error = new HttpError("Unauthorized", 401)
    expect(error instanceof HttpError).toBe(true)
  })
})

describe("withErrorHandling", () => {
  it("passes through successful responses", async () => {
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withErrorHandling(handler, "test-op")

    const req = new NextRequest("http://localhost/api/test")
    const res = await wrapped(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it("catches HttpError and returns proper status", async () => {
    const handler = jest.fn().mockRejectedValue(new HttpError("Not found", 404))
    const wrapped = withErrorHandling(handler, "test-op")

    const req = new NextRequest("http://localhost/api/test")
    const res = await wrapped(req)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })

  it("catches unknown errors and returns 500", async () => {
    const handler = jest.fn().mockRejectedValue(new Error("Boom"))
    const wrapped = withErrorHandling(handler, "test-op")

    const req = new NextRequest("http://localhost/api/test")
    const res = await wrapped(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: "Internal server error" })
  })

  it("works without a request argument (GET handler)", async () => {
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withErrorHandling(handler, "test-op")

    const res = await wrapped()

    expect(res.status).toBe(200)
  })

  it("handles handlers that throw HttpError without request argument", async () => {
    const handler = jest.fn().mockRejectedValue(new HttpError("Unauthorized", 401))
    const wrapped = withErrorHandling(handler, "test-op")

    const res = await wrapped()

    expect(res.status).toBe(401)
  })
})
