import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import type { JWT } from "next-auth/jwt"

import { prisma } from "@/lib/prisma"

const KEY_LENGTH_BYTES = 32
const IV_LENGTH_BYTES = 12
const ALGORITHM = "aes-256-gcm"

const getEncryptionKey = (): Buffer => {
  const configuredKey = process.env.SESSION_TOKEN_ENCRYPTION_KEY?.trim()

  if (configuredKey) {
    const isHexKey = /^[0-9a-fA-F]{64}$/.test(configuredKey)
    if (isHexKey) {
      return Buffer.from(configuredKey, "hex")
    }

    const base64Key = Buffer.from(configuredKey, "base64")
    if (base64Key.length === KEY_LENGTH_BYTES) {
      return base64Key
    }
  }

  const fallbackSecret = process.env.NEXTAUTH_SECRET ?? "next-absen-dev-session-secret"
  return createHash("sha256").update(fallbackSecret).digest()
}

const encryptValue = (plainText: string): string => {
  const iv = randomBytes(IV_LENGTH_BYTES)
  const key = getEncryptionKey()
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString("hex")}.${authTag.toString("hex")}.${encrypted.toString("hex")}`
}

const decryptValue = (cipherText: string): string | null => {
  const [ivHex, authTagHex, encryptedHex] = cipherText.split(".")
  if (!ivHex || !authTagHex || !encryptedHex) {
    return null
  }

  try {
    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")
    const encrypted = Buffer.from(encryptedHex, "hex")

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString("utf8")
  } catch {
    return null
  }
}

const hashSessionToken = (sessionToken: string): string => {
  return createHash("sha256").update(sessionToken).digest("hex")
}

export const persistSessionToken = async (params: {
  sessionToken: string
  payload: JWT
  userId: string
  expiresAt: Date
}) => {
  const tokenHash = hashSessionToken(params.sessionToken)
  const encryptedPayload = encryptValue(JSON.stringify(params.payload))

  await prisma.persistedSessionToken.upsert({
    where: { tokenHash },
    create: {
      userId: params.userId,
      tokenHash,
      encryptedToken: encryptedPayload,
      expiresAt: params.expiresAt,
      issuedAt: new Date(),
      lastUsedAt: new Date(),
      revokedAt: null,
    },
    update: {
      encryptedToken: encryptedPayload,
      expiresAt: params.expiresAt,
      lastUsedAt: new Date(),
      revokedAt: null,
    },
  })
}

export const readSessionToken = async (sessionToken: string): Promise<JWT | null> => {
  const tokenHash = hashSessionToken(sessionToken)
  const now = new Date()

  const storedToken = await prisma.persistedSessionToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          isActive: true,
        },
      },
    },
  })

  if (
    !storedToken ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= now ||
    !storedToken.user.isActive
  ) {
    return null
  }

  const decryptedPayload = decryptValue(storedToken.encryptedToken)
  if (!decryptedPayload) {
    return null
  }

  let parsedPayload: JWT | null = null
  try {
    parsedPayload = JSON.parse(decryptedPayload) as JWT
  } catch {
    return null
  }

  if (!parsedPayload?.sub || parsedPayload.sub !== storedToken.userId) {
    return null
  }

  await prisma.persistedSessionToken.update({
    where: { tokenHash },
    data: { lastUsedAt: now },
  })

  return parsedPayload
}

export const revokeSessionToken = async (sessionToken: string) => {
  const tokenHash = hashSessionToken(sessionToken)

  await prisma.persistedSessionToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  })
}
