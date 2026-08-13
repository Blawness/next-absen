import { prisma } from "./prisma"

const MIN_LENGTH = 8

interface PolicyCheck {
  ok: boolean
  reason?: string
}

/**
 * Validate a candidate password against the configured password policy.
 *
 * Length is always enforced. If `security.requireStrongPassword` is
 * true in SystemSettings, additionally require a mix of upper, lower,
 * digit, and symbol.
 */
export async function checkPasswordPolicy(password: string): Promise<PolicyCheck> {
  if (password.length < MIN_LENGTH) {
    return { ok: false, reason: `Password minimal ${MIN_LENGTH} karakter` }
  }

  let requireStrong = false
  try {
    const settings = await prisma.systemSettings.findFirst()
    const security = (settings?.security ?? null) as Record<string, unknown> | null
    requireStrong = security?.requireStrongPassword === true
  } catch {
    // Fail open on DB error — length check still applies.
  }

  if (!requireStrong) return { ok: true }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
    return {
      ok: false,
      reason: "Password harus mengandung huruf besar, huruf kecil, angka, dan simbol",
    }
  }
  return { ok: true }
}

export const PASSWORD_MIN_LENGTH = MIN_LENGTH
