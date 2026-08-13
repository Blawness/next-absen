import { checkPasswordPolicy, PASSWORD_MIN_LENGTH } from "./password-policy"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: {
      findFirst: jest.fn(),
    },
  },
}))

import { prisma } from "./prisma"

const mockedFindFirst = prisma.systemSettings.findFirst as jest.Mock

describe("password-policy", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("rejects passwords below the minimum length", async () => {
    mockedFindFirst.mockResolvedValue(null)
    const result = await checkPasswordPolicy("Aa1!x")
    expect(result.ok).toBe(false)
    expect(result.reason).toContain(String(PASSWORD_MIN_LENGTH))
  })

  it("accepts a long enough password when requireStrongPassword is false", async () => {
    mockedFindFirst.mockResolvedValue(null)
    const result = await checkPasswordPolicy("simplepassword")
    expect(result.ok).toBe(true)
  })

  it("rejects a password missing complexity when requireStrongPassword is true", async () => {
    mockedFindFirst.mockResolvedValue({
      security: { requireStrongPassword: true },
    })
    const result = await checkPasswordPolicy("alllowercase")
    expect(result.ok).toBe(false)
  })

  it("accepts a complex password when requireStrongPassword is true", async () => {
    mockedFindFirst.mockResolvedValue({
      security: { requireStrongPassword: true },
    })
    const result = await checkPasswordPolicy("Str0ng!Pass")
    expect(result.ok).toBe(true)
  })

  it("returns ok when DB lookup fails (fail open on complexity only)", async () => {
    mockedFindFirst.mockRejectedValue(new Error("DB down"))
    // Length is still enforced.
    const shortResult = await checkPasswordPolicy("Aa1!")
    expect(shortResult.ok).toBe(false)
    // Long but not complex — DB error so policy is "off", length check passes.
    const longResult = await checkPasswordPolicy("simplebutlong")
    expect(longResult.ok).toBe(true)
  })
})
