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

describe("authOptions session defaults", () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = { ...originalEnv }
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("uses a very long session lifetime by default", async () => {
    process.env = { ...originalEnv }
    delete process.env.SESSION_MAX_AGE_SECONDS
    delete process.env.SESSION_UPDATE_AGE_SECONDS

    const { authOptions } = await import("./auth")

    expect(authOptions.session).toMatchObject({
      strategy: "jwt",
      maxAge: 10 * 365 * 24 * 60 * 60,
    })
  })
})
