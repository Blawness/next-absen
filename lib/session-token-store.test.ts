import type { JWT } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { persistSessionToken, readSessionToken } from "./session-token-store"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    persistedSessionToken: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const upsert = prisma.persistedSessionToken.upsert as unknown as jest.Mock
const findUnique = prisma.persistedSessionToken.findUnique as unknown as jest.Mock

const SESSION_TOKEN = "session-token-under-test"
const USER_ID = "user-1"

/**
 * Persist a payload for real so the test works against the actual
 * encryption, then hand the resulting ciphertext back through findUnique
 * as if it had been sitting in the database since login.
 */
async function storedTokenFor(payload: JWT, user: Record<string, unknown>) {
  upsert.mockResolvedValue({})
  await persistSessionToken({
    sessionToken: SESSION_TOKEN,
    payload,
    userId: USER_ID,
    expiresAt: new Date(Date.now() + 60_000),
  })

  const { encryptedToken } = upsert.mock.calls[0][0].create

  findUnique.mockResolvedValue({
    userId: USER_ID,
    encryptedToken,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user,
  })
}

describe("readSessionToken", () => {
  afterEach(() => jest.clearAllMocks())

  it("re-reads role, department and position from the database", async () => {
    // Signed in as a plain user, then promoted to manager of Finance.
    await storedTokenFor(
      { sub: USER_ID, role: "user", department: "Legal", position: "Staff" },
      { isActive: true, role: "manager", department: "Finance", position: "Head of Finance" },
    )

    const token = await readSessionToken(SESSION_TOKEN)

    expect(token).toMatchObject({
      sub: USER_ID,
      role: "manager",
      department: "Finance",
      position: "Head of Finance",
    })
  })

  it("keeps the rest of the payload intact", async () => {
    await storedTokenFor(
      { sub: USER_ID, sid: "abc", role: "admin", department: "IT", position: "Lead" },
      { isActive: true, role: "admin", department: "IT", position: "Lead" },
    )

    const token = await readSessionToken(SESSION_TOKEN)

    expect(token).toMatchObject({ sub: USER_ID, sid: "abc", role: "admin" })
  })

  it("rejects a token whose user has been deactivated", async () => {
    await storedTokenFor(
      { sub: USER_ID, role: "admin", department: "IT", position: "Lead" },
      { isActive: false, role: "admin", department: "IT", position: "Lead" },
    )

    expect(await readSessionToken(SESSION_TOKEN)).toBeNull()
  })

  it("rejects a revoked token", async () => {
    await storedTokenFor(
      { sub: USER_ID, role: "admin", department: "IT", position: "Lead" },
      { isActive: true, role: "admin", department: "IT", position: "Lead" },
    )
    findUnique.mockResolvedValue({
      ...(await findUnique.mock.results[0]?.value),
      revokedAt: new Date(),
    })

    expect(await readSessionToken(SESSION_TOKEN)).toBeNull()
  })
})
