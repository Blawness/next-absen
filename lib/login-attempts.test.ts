import {
  isLoginAllowed,
  registerFailedLogin,
  registerSuccessfulLogin,
  resetLoginAttempts,
} from "./login-attempts"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: {
      findFirst: jest.fn(),
    },
  },
}))

import { prisma } from "./prisma"

const mockedFindFirst = prisma.systemSettings.findFirst as jest.Mock

describe("login-attempts", () => {
  beforeEach(() => {
    resetLoginAttempts()
    mockedFindFirst.mockResolvedValue(null) // use defaults
  })

  it("allows login when no prior failures", async () => {
    expect(isLoginAllowed("user@example.com", "1.2.3.4").allowed).toBe(true)
  })

  it("locks the email after 5 failures", async () => {
    for (let i = 0; i < 5; i++) {
      await registerFailedLogin("user@example.com", "1.2.3.4")
    }
    const result = isLoginAllowed("user@example.com", "1.2.3.4")
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })

  it("does not lock before threshold (4 failures)", async () => {
    for (let i = 0; i < 4; i++) {
      await registerFailedLogin("user@example.com", "1.2.3.4")
    }
    expect(isLoginAllowed("user@example.com", "1.2.3.4").allowed).toBe(true)
  })

  it("successful login clears the counter", async () => {
    for (let i = 0; i < 4; i++) {
      await registerFailedLogin("user@example.com", "1.2.3.4")
    }
    registerSuccessfulLogin("user@example.com", "1.2.3.4")
    expect(isLoginAllowed("user@example.com", "1.2.3.4").allowed).toBe(true)
  })

  it("locks per-IP after 20 failures across many emails", async () => {
    for (let i = 0; i < 20; i++) {
      await registerFailedLogin(`user${i}@example.com`, "1.2.3.4")
    }
    expect(isLoginAllowed("new@example.com", "1.2.3.4").allowed).toBe(false)
    expect(isLoginAllowed("new@example.com", "9.9.9.9").allowed).toBe(true)
  })

  it("treats email case-insensitively", async () => {
    await registerFailedLogin("User@Example.com", "1.2.3.4")
    expect(isLoginAllowed("user@example.com", "1.2.3.4").allowed).toBe(true)
    for (let i = 0; i < 4; i++) {
      await registerFailedLogin("USER@example.com", "1.2.3.4")
    }
    expect(isLoginAllowed("user@example.com", "1.2.3.4").allowed).toBe(false)
  })

  it("uses SystemSettings maxLoginAttempts when configured", async () => {
    mockedFindFirst.mockResolvedValue({
      security: { maxLoginAttempts: 2 },
    })
    await registerFailedLogin("u@example.com", "1.2.3.4")
    await registerFailedLogin("u@example.com", "1.2.3.4")
    expect(isLoginAllowed("u@example.com", "1.2.3.4").allowed).toBe(false)
  })
})
