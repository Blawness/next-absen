import { Prisma } from "@prisma/client"
import { prisma } from "./prisma"
import { getBusinessHoursConfig, parseClock, type BusinessHoursConfig } from "./business-hours"

/**
 * Auto-checkout closes attendance records left open past the end of their
 * shift.
 *
 * There is no cron job. The sweep piggybacks on regular read traffic
 * (see `maybeSweepAutoCheckout` callers): whichever request happens to
 * come in first does the work. That is safe because the recorded
 * checkout time is derived from the shift schedule, never from the wall
 * clock at sweep time — so a sweep that runs hours late writes exactly
 * the same row a punctual cron job would have written.
 */

/** Upper bound on records closed in a single sweep, so one unlucky request never stalls. */
const SWEEP_LIMIT = 200

/** Minimum gap between sweeps, so a busy endpoint doesn't re-query on every hit. */
const THROTTLE_MS = 60_000

let lastSweepAt = 0

export interface SweepResult {
  closed: number
  /** True when the sweep was skipped entirely (disabled or throttled). */
  skipped: boolean
}

/** Which rule decided the checkout time. */
export type AutoCheckoutReason = "shift_ended" | "max_work_hours_exceeded"

export interface AutoCheckout {
  checkOutTime: Date
  workHours: number
  reason: AutoCheckoutReason
}

/**
 * Derive the checkout time and worked hours for a shift left open.
 *
 * The shift normally closes at `endTime` on the check-in's own local date.
 * `maxWorkHours` stays on as a safety bound in the two cases where the
 * shift end alone would produce nonsense:
 *
 *   - an overnight check-in whose shift end is further away than the limit
 *   - a check-in at or after the shift end, where that day's end has passed
 *     and would otherwise place checkout *before* check-in
 *
 * Pure and deterministic — the result depends only on the check-in time and
 * the configured schedule, never on when this runs.
 */
export function computeAutoCheckout(
  checkInTime: Date,
  config: BusinessHoursConfig,
): AutoCheckout {
  const capMs = checkInTime.getTime() + config.maxWorkHours * 60 * 60 * 1000
  const parsed = parseClock(config.endTime, checkInTime)
  const shiftEndMs = parsed?.[0]

  const useShiftEnd =
    shiftEndMs !== undefined && shiftEndMs > checkInTime.getTime() && shiftEndMs <= capMs

  const checkOutTime = new Date(useShiftEnd ? shiftEndMs : capMs)
  const workedMs = checkOutTime.getTime() - checkInTime.getTime()

  return {
    checkOutTime,
    workHours: Math.round((workedMs / (60 * 60 * 1000)) * 100) / 100,
    reason: useShiftEnd ? "shift_ended" : "max_work_hours_exceeded",
  }
}

/** Build the note appended to an auto-closed record, preserving any existing note. */
export function buildAutoCheckoutNote(
  existingNotes: string | null,
  reason: AutoCheckoutReason,
  config: BusinessHoursConfig,
): string {
  const marker =
    reason === "shift_ended"
      ? `[Auto checkout: jam kerja selesai ${config.endTime}]`
      : `[Auto checkout: melebihi batas ${config.maxWorkHours} jam kerja]`
  const trimmed = existingNotes?.trim()
  return trimmed ? `${trimmed}\n${marker}` : marker
}

/** Reset the throttle. Test-only seam. */
export function resetAutoCheckoutThrottle() {
  lastSweepAt = 0
}

/**
 * Close every attendance record whose shift end has already passed, oldest
 * first. Returns the number of records actually closed.
 *
 * Eligibility can't be expressed as a fixed age in SQL any more: someone who
 * checks in at 16:55 becomes eligible five minutes later, while an overnight
 * check-in may wait hours. So the query selects open records and the shift
 * rule is applied per record. Ordering oldest-first keeps that honest —
 * records become eligible in roughly check-in order, so the ones `take`
 * drops are the ones least likely to be due.
 */
export async function sweepAutoCheckout(options?: {
  now?: Date
  limit?: number
}): Promise<SweepResult> {
  const config = await getBusinessHoursConfig()
  if (!config.autoCheckoutEnabled) {
    return { closed: 0, skipped: true }
  }

  const now = options?.now ?? new Date()
  const limit = options?.limit ?? SWEEP_LIMIT

  const stale = await prisma.absensiRecord.findMany({
    where: {
      checkOutTime: null,
      checkInTime: { not: null },
    },
    select: { id: true, userId: true, checkInTime: true, notes: true },
    orderBy: { checkInTime: "asc" },
    take: limit,
  })

  if (stale.length === 0) {
    return { closed: 0, skipped: false }
  }

  const logs: Prisma.ActivityLogCreateManyInput[] = []

  for (const record of stale) {
    const checkInTime = record.checkInTime!
    const { checkOutTime, workHours, reason } = computeAutoCheckout(checkInTime, config)

    // Not due yet — the shift it belongs to hasn't finished.
    if (checkOutTime.getTime() > now.getTime()) continue

    // The `checkOutTime: null` guard makes this idempotent: if a concurrent
    // request (or a real checkout) closed the record first, count is 0 and
    // we neither overwrite it nor log a duplicate.
    const { count } = await prisma.absensiRecord.updateMany({
      where: { id: record.id, checkOutTime: null },
      data: {
        checkOutTime,
        workHours,
        overtimeHours: 0,
        notes: buildAutoCheckoutNote(record.notes, reason, config),
      },
    })

    if (count === 0) continue

    logs.push({
      userId: record.userId,
      action: "auto_check_out",
      resourceType: "absensi_record",
      resourceId: record.id,
      details: {
        reason,
        endTime: config.endTime,
        maxWorkHours: config.maxWorkHours,
        checkInTime: checkInTime.toISOString(),
        checkOutTime: checkOutTime.toISOString(),
      } as unknown as Prisma.InputJsonValue,
    })
  }

  if (logs.length > 0) {
    await prisma.activityLog.createMany({ data: logs })
  }

  return { closed: logs.length, skipped: false }
}

/**
 * Throttled, never-throwing wrapper for use on read paths. A failure here
 * must never break the request the user actually made.
 */
export async function maybeSweepAutoCheckout(): Promise<void> {
  const now = Date.now()
  if (now - lastSweepAt < THROTTLE_MS) return
  lastSweepAt = now

  try {
    await sweepAutoCheckout()
  } catch (error) {
    console.error("Auto-checkout sweep failed:", error)
  }
}
