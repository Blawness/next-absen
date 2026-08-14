import { prisma } from "./prisma"
import { AttendanceStatus } from "@prisma/client"

export interface BusinessHoursConfig {
  startTime: string      // "HH:mm"
  endTime: string        // "HH:mm"
  gracePeriodMinutes: number
  checkInDeadline: string
  autoCheckoutEnabled: boolean
  maxWorkHours: number   // hours; a shift longer than this is closed automatically
}

export interface LateCheckResult {
  lateMinutes: number
  status: AttendanceStatus
  config: BusinessHoursConfig
}

const DEFAULTS: BusinessHoursConfig = {
  startTime: "08:00",
  endTime: "17:00",
  checkInDeadline: "09:00",
  gracePeriodMinutes: 15,
  autoCheckoutEnabled: false,
  maxWorkHours: 12,
}

export const MIN_MAX_WORK_HOURS = 1
export const MAX_MAX_WORK_HOURS = 24

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return fallback
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) return value
  return fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value
  return fallback
}

/**
 * Clamp maxWorkHours into a sane range. A shift shorter than an hour or
 * longer than a day would make auto-checkout either fire constantly or
 * never fire at all, so out-of-range values fall back to the default.
 */
function asWorkHours(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) return fallback
  if (parsed < MIN_MAX_WORK_HOURS || parsed > MAX_MAX_WORK_HOURS) return fallback
  return parsed
}

/**
 * Read the business hours configuration from SystemSettings.businessHours.
 * Returns the project's default values if no settings row exists.
 */
export async function getBusinessHoursConfig(): Promise<BusinessHoursConfig> {
  try {
    const settings = await prisma.systemSettings.findFirst()
    const raw = (settings?.businessHours ?? null) as Record<string, unknown> | null

    if (!raw) return DEFAULTS

    return {
      startTime: asString(raw.startTime, DEFAULTS.startTime),
      endTime: asString(raw.endTime, DEFAULTS.endTime),
      checkInDeadline: asString(raw.checkInDeadline, DEFAULTS.checkInDeadline),
      gracePeriodMinutes: asNumber(raw.gracePeriodMinutes, DEFAULTS.gracePeriodMinutes),
      autoCheckoutEnabled: asBoolean(raw.autoCheckoutEnabled, DEFAULTS.autoCheckoutEnabled),
      maxWorkHours: asWorkHours(raw.maxWorkHours, DEFAULTS.maxWorkHours),
    }
  } catch {
    return DEFAULTS
  }
}

/**
 * Resolve an "HH:mm" string against the local-clock date of `reference`.
 * Returns [timestampMs, dstShifted] where dstShifted is 1 when the wall
 * clock time does not exist on that date, or null if the input is malformed.
 */
export function parseClock(time: string, reference: Date): [number, number] | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  const start = new Date(reference)
  start.setHours(hours, minutes, 0, 0)
  return [start.getTime(), start.getHours() === hours ? 0 : 1] // 1 if DST shifted
}

/**
 * Compute whether a check-in time is late relative to the office start time.
 *
 * "Late" means the check-in time exceeds startTime + gracePeriodMinutes.
 * Status is `late` when late, otherwise `present` (we don't infer `absent`
 * here — that comes from the absence tracker).
 */
export function computeLateStatus(
  checkInTime: Date,
  config: BusinessHoursConfig,
): { lateMinutes: number; status: AttendanceStatus } {
  const parsed = parseClock(config.startTime, checkInTime)
  if (!parsed) {
    return { lateMinutes: 0, status: AttendanceStatus.present }
  }
  const [startMs] = parsed
  const diffMs = checkInTime.getTime() - startMs
  if (diffMs <= 0) {
    return { lateMinutes: 0, status: AttendanceStatus.present }
  }
  const graceMs = config.gracePeriodMinutes * 60 * 1000
  if (diffMs <= graceMs) {
    return { lateMinutes: 0, status: AttendanceStatus.present }
  }
  const lateMinutes = Math.floor(diffMs / (60 * 1000))
  return { lateMinutes, status: AttendanceStatus.late }
}
