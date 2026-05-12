import { HttpError } from "./errors"

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
