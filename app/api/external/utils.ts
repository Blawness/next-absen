import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { HttpError } from "@/lib/errors"

const VALID_SCOPES = ["attendance:readwrite", "attendance:read", "attendance:auto-checkin"] as const
export type ApiKeyScope = (typeof VALID_SCOPES)[number]

export interface ValidatedApiKey {
  id: string
  prefix: string
  name: string
  scope: ApiKeyScope
  createdBy: string
}

export async function validateApiKey(
  request: Request,
  requiredScopes: ApiKeyScope[]
): Promise<ValidatedApiKey> {
  const apiKey = request.headers.get("x-api-key")

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new HttpError("Missing API key", 401)
  }

  const trimmedKey = apiKey.trim()
  const prefix = trimmedKey.slice(-8)

  const candidates = await prisma.apiKey.findMany({
    where: { prefix, isActive: true },
  })

  let matched: ValidatedApiKey | null = null

  for (const candidate of candidates) {
    const isValid = await bcrypt.compare(trimmedKey, candidate.key)
    if (isValid) {
      matched = {
        id: candidate.id,
        prefix: candidate.prefix,
        name: candidate.name,
        scope: candidate.scope as ApiKeyScope,
        createdBy: candidate.createdBy,
      }
      break
    }
  }

  if (!matched) {
    throw new HttpError("Invalid API key", 401)
  }

  const hasRequiredScope = requiredScopes.includes(matched.scope) ||
    (requiredScopes.includes("attendance:auto-checkin") && matched.scope === "attendance:readwrite") ||
    (requiredScopes.includes("attendance:read") && matched.scope === "attendance:readwrite")

  if (!hasRequiredScope) {
    throw new HttpError("Insufficient API key scope", 403)
  }

  // Update lastUsedAt asynchronously (don't block response)
  prisma.apiKey
    .update({ where: { id: matched.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return matched
}

export function externalSuccessResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function externalErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status }
    )
  }
  console.error("External API error:", error)
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 }
  )
}
