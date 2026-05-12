import { getServerSession } from "next-auth"
import { validateSession } from "./auth"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock("@/lib/session-token-store", () => ({
  persistSessionToken: jest.fn(),
  readSessionToken: jest.fn(),
  revokeSessionToken: jest.fn(),
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

const mockedGetServerSession = getServerSession as jest.Mock

describe("validateSession", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("returns the session when a valid session exists", async () => {
    const mockSession = { user: { id: "test-user-id" } }
    mockedGetServerSession.mockResolvedValue(mockSession)

    const session = await validateSession()
    expect(session).toEqual(mockSession)
  })

  it("throws when no session is found", async () => {
    mockedGetServerSession.mockResolvedValue(null)

    await expect(validateSession()).rejects.toThrow("Unauthorized")
  })

  it("throws when session exists but user id is missing", async () => {
    mockedGetServerSession.mockResolvedValue({ user: {} })

    await expect(validateSession()).rejects.toThrow("Unauthorized")
  })
})

describe("authOptions session defaults", () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = { ...originalEnv }
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("uses a 30-day session lifetime by default", async () => {
    process.env = { ...originalEnv }
    delete process.env.SESSION_MAX_AGE_SECONDS
    delete process.env.SESSION_UPDATE_AGE_SECONDS

    const { authOptions } = await import("./auth")

    expect(authOptions.session).toMatchObject({
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
    })
  })
})
