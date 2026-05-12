import { NextRequest } from "next/server"
import {
  parseBody,
  parseSearchParams,
  checkInSchema,
  apiKeyCreateSchema,
  userCreateSchema,
  profileUpdateSchema,
  passwordChangeSchema,
} from "./validation"

describe("parseBody", () => {
  it("parses and validates valid data", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ latitude: 1, longitude: 2, accuracy: 10, address: "Test" }),
    })
    const result = await parseBody(req, checkInSchema)
    expect(result).toEqual({ latitude: 1, longitude: 2, accuracy: 10, address: "Test" })
  })

  it("throws on invalid data", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ latitude: "not-a-number" }),
    })
    await expect(parseBody(req, checkInSchema)).rejects.toThrow()
  })

  it("throws on missing required fields", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({}),
    })
    await expect(parseBody(req, checkInSchema)).rejects.toThrow()
  })
})

describe("parseSearchParams", () => {
  it("parses valid query params", () => {
    const req = new NextRequest(
      "http://localhost/api/test?limit=10&offset=0"
    )
    const result = parseSearchParams(req, ["limit", "offset"])
    expect(result.limit).toBe("10")
    expect(result.offset).toBe("0")
  })

  it("returns undefined for missing optional params", () => {
    const req = new NextRequest("http://localhost/api/test?limit=10")
    const result = parseSearchParams(req, ["limit", "offset"])
    expect(result.limit).toBe("10")
    expect(result.offset).toBeUndefined()
  })
})

describe("checkInSchema", () => {
  it("accepts valid GPS data", () => {
    const result = checkInSchema.safeParse({
      latitude: -6.2088,
      longitude: 106.8456,
      accuracy: 10,
      address: "Jl. Sudirman",
    })
    expect(result.success).toBe(true)
  })

  it("accepts optional address", () => {
    const result = checkInSchema.safeParse({
      latitude: -6.2088,
      longitude: 106.8456,
      accuracy: 10,
      address: "Jl. Sudirman",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing latitude", () => {
    const result = checkInSchema.safeParse({
      longitude: 106.8456,
      accuracy: 10,
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid latitude", () => {
    const result = checkInSchema.safeParse({
      latitude: 200,
      longitude: 106.8456,
      accuracy: 10,
    })
    expect(result.success).toBe(false)
  })
})

describe("apiKeyCreateSchema", () => {
  it("accepts valid data", () => {
    const result = apiKeyCreateSchema.safeParse({ name: "My Key" })
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = apiKeyCreateSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("accepts optional scope", () => {
    const result = apiKeyCreateSchema.safeParse({
      name: "My Key",
      scope: "attendance:read",
    })
    expect(result.success).toBe(true)
  })
})

describe("userCreateSchema", () => {
  it("accepts valid data", () => {
    const result = userCreateSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "user",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid email", () => {
    const result = userCreateSchema.safeParse({
      name: "Test",
      email: "not-email",
      password: "pass",
      role: "user",
    })
    expect(result.success).toBe(false)
  })
})

describe("profileUpdateSchema", () => {
  it("accepts partial update", () => {
    const result = profileUpdateSchema.safeParse({ name: "New Name" })
    expect(result.success).toBe(true)
  })

  it("accepts empty object", () => {
    const result = profileUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe("passwordChangeSchema", () => {
  it("accepts valid passwords", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "oldpass",
      newPassword: "newpass123",
    })
    expect(result.success).toBe(true)
  })

  it("rejects short passwords", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "old",
      newPassword: "new",
    })
    expect(result.success).toBe(false)
  })
})
