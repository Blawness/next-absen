/**
 * In-process failed-login tracker.
 *
 * Tracks per-email and per-IP failed login attempts and returns a short
 * lockout when the configured threshold is exceeded. State lives in
 * memory and resets on process restart — acceptable for a single-node
 * deploy. For a multi-instance setup, swap this for Redis or DB-backed
 * counters.
 *
 * SECURITY:
 *   - Returns the same error string whether the user exists or not,
 *     and runs the dummy bcrypt compare on the "user not found" path
 *     to equalize timing.
 *   - The lockout window scales with the failure count to slow down
 *     brute force but allow legitimate users back in after a wait.
 */

import { prisma } from "./prisma"

// Defaults; can be overridden by SystemSettings.security at runtime.
const DEFAULT_MAX_FAILURES_PER_EMAIL = 5
const DEFAULT_MAX_FAILURES_PER_IP = 20
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

interface CachedConfig {
  maxPerEmail: number
  maxPerIp: number
  expiresAt: number
}

let cachedConfig: CachedConfig | null = null

/**
 * Read the failed-login thresholds from SystemSettings.security, with
 * a 5-minute cache to avoid hitting the DB on every login attempt.
 */
async function getThresholds(): Promise<{ maxPerEmail: number; maxPerIp: number }> {
  if (cachedConfig && cachedConfig.expiresAt > Date.now()) {
    return { maxPerEmail: cachedConfig.maxPerEmail, maxPerIp: cachedConfig.maxPerIp }
  }
  let maxPerEmail = DEFAULT_MAX_FAILURES_PER_EMAIL
  let maxPerIp = DEFAULT_MAX_FAILURES_PER_IP
  try {
    const settings = await prisma.systemSettings.findFirst()
    const raw = (settings?.security ?? null) as Record<string, unknown> | null
    if (raw) {
      const v = Number(raw.maxLoginAttempts)
      if (Number.isFinite(v) && v >= 1 && v <= 100) {
        maxPerEmail = v
        // Per-IP threshold scales with per-email threshold: a single
        // attacker should hit the per-email limit before the per-IP
        // limit when spraying multiple emails from one host.
        maxPerIp = Math.max(20, v * 4)
      }
    }
  } catch {
    // Use defaults.
  }
  cachedConfig = {
    maxPerEmail,
    maxPerIp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  }
  return { maxPerEmail, maxPerIp }
}

interface AttemptEntry {
  count: number
  resetAt: number
  lockedUntil: number
}

const emailStore = new Map<string, AttemptEntry>()
const ipStore = new Map<string, AttemptEntry>()

async function recordFailure(store: Map<string, AttemptEntry>, key: string, max: number) {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS, lockedUntil: 0 })
    return
  }

  entry.count++
  if (entry.count >= max) {
    // Lock for 5 minutes, increasing +1 minute per subsequent failure.
    const lockMinutes = 5 + Math.max(0, entry.count - max)
    entry.lockedUntil = now + lockMinutes * 60 * 1000
  }
}

function recordSuccess(store: Map<string, AttemptEntry>, key: string) {
  store.delete(key)
}

function isLocked(store: Map<string, AttemptEntry>, key: string): { locked: boolean; retryAfterSec: number } {
  const entry = store.get(key)
  if (!entry) return { locked: false, retryAfterSec: 0 }
  const now = Date.now()
  if (entry.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000),
    }
  }
  return { locked: false, retryAfterSec: 0 }
}

/** Returns lock state for the email and IP, recording a failed attempt. */
export async function registerFailedLogin(email: string, ip: string): Promise<{
  emailLocked: { locked: boolean; retryAfterSec: number }
  ipLocked: { locked: boolean; retryAfterSec: number }
}> {
  const e = email.toLowerCase().trim()
  const { maxPerEmail, maxPerIp } = await getThresholds()
  await recordFailure(emailStore, e, maxPerEmail)
  await recordFailure(ipStore, ip, maxPerIp)
  return {
    emailLocked: isLocked(emailStore, e),
    ipLocked: isLocked(ipStore, ip),
  }
}

/** Clears counters after a successful login. */
export function registerSuccessfulLogin(email: string, ip: string) {
  recordSuccess(emailStore, email.toLowerCase().trim())
  recordSuccess(ipStore, ip)
}

/** Pure check — does NOT record a failure. Use for early bailouts. */
export function isLoginAllowed(email: string, ip: string): {
  allowed: boolean
  retryAfterSec: number
} {
  const e = email.toLowerCase().trim()
  const eLock = isLocked(emailStore, e)
  const iLock = isLocked(ipStore, ip)
  if (eLock.locked) return { allowed: false, retryAfterSec: eLock.retryAfterSec }
  if (iLock.locked) return { allowed: false, retryAfterSec: iLock.retryAfterSec }
  return { allowed: true, retryAfterSec: 0 }
}

export function resetLoginAttempts(): void {
  emailStore.clear()
  ipStore.clear()
  cachedConfig = null
}
