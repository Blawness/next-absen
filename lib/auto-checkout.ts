import { Prisma } from "@prisma/client"
import { prisma } from "./prisma"
import { getBusinessHoursConfig } from "./business-hours"

/**
 * Auto-checkout closes attendance records left open past the configured
 * maximum shift length.
 *
 * There is no cron job. The sweep piggybacks on regular read traffic
 * (see `maybeSweepAutoCheckout` callers): whichever request happens to
 * come in first does the work. That is safe because the recorded
 * checkout time is derived from `checkInTime + maxWorkHours`, never from
 * the wall clock at sweep time — so a sweep that runs hours late writes
 * exactly the same row a punctual cron job would have written.
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

/**
 * Derive the checkout time and worked hours for a shift that ran past the
 * limit. Pure and deterministic — the result depends only on the check-in
 * time and the configured limit, never on when this runs.
 */
export function computeAutoCheckout(
  checkInTime: Date,
  maxWorkHours: number,
): { checkOutTime: Date; workHours: number } {
  const checkOutTime = new Date(checkInTime.getTime() + maxWorkHours * 60 * 60 * 1000)
  return { checkOutTime, workHours: maxWorkHours }
}

/** Build the note appended to an auto-closed record, preserving any existing note. */
export function buildAutoCheckoutNote(
  existingNotes: string | null,
  maxWorkHours: number,
): string {
  const marker = `[Auto checkout: melebihi batas ${maxWorkHours} jam kerja]`
  const trimmed = existingNotes?.trim()
  return trimmed ? `${trimmed}\n${marker}` : marker
}

/** Reset the throttle. Test-only seam. */
export function resetAutoCheckoutThrottle() {
  lastSweepAt = 0
}

/**
 * Close every attendance record whose shift has exceeded the configured
 * maximum, oldest first. Returns the number of records actually closed.
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
  const cutoff = new Date(now.getTime() - config.maxWorkHours * 60 * 60 * 1000)

  const stale = await prisma.absensiRecord.findMany({
    where: {
      checkOutTime: null,
      checkInTime: { not: null, lt: cutoff },
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
    const { checkOutTime, workHours } = computeAutoCheckout(checkInTime, config.maxWorkHours)

    // The `checkOutTime: null` guard makes this idempotent: if a concurrent
    // request (or a real checkout) closed the record first, count is 0 and
    // we neither overwrite it nor log a duplicate.
    const { count } = await prisma.absensiRecord.updateMany({
      where: { id: record.id, checkOutTime: null },
      data: {
        checkOutTime,
        workHours,
        overtimeHours: 0,
        notes: buildAutoCheckoutNote(record.notes, config.maxWorkHours),
      },
    })

    if (count === 0) continue

    logs.push({
      userId: record.userId,
      action: "auto_check_out",
      resourceType: "absensi_record",
      resourceId: record.id,
      details: {
        reason: "max_work_hours_exceeded",
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
