/**
 * The office clock: every "what day is it" and "what time is it" question
 * the attendance rules ask is answered here, in the office's timezone.
 *
 * The server's own timezone must never leak into those answers. Production
 * runs on a VPS that keeps UTC, so reading the server clock made "08:00"
 * mean 15:00 WIB (nobody was ever late) and filed a 06:45 WIB check-in
 * under the previous day. Going through Intl with an explicit timeZone
 * gives the same result on any machine.
 *
 * Calendar dates follow the convention of `AbsensiRecord.date` (MySQL
 * DATE): a Date pinned to UTC midnight of the office date. Prisma writes
 * DateTime values as UTC, so that round-trips to the right DATE.
 */

const DEFAULT_OFFICE_TIME_ZONE = "Asia/Jakarta"

const DAY_MS = 24 * 60 * 60 * 1000

function resolveTimeZone(value: string | undefined): string {
  const candidate = value?.trim()
  if (!candidate) return DEFAULT_OFFICE_TIME_ZONE
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate })
    return candidate
  } catch {
    return DEFAULT_OFFICE_TIME_ZONE
  }
}

export const OFFICE_TIME_ZONE = resolveTimeZone(process.env.OFFICE_TIME_ZONE)

const officeClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: OFFICE_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

interface OfficeClock {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
}

/** The office wall-clock reading at `date`. */
export function getOfficeClock(date: Date): OfficeClock {
  const parts: Record<string, number> = {}
  for (const part of officeClockFormatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value)
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  }
}

/** How far the office clock runs ahead of UTC at `date`, in ms. */
function officeOffsetMs(date: Date): number {
  const clock = getOfficeClock(date)
  const asUtc = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** The office calendar date of `date`, pinned to UTC midnight. */
export function toOfficeCalendarDate(date: Date): Date {
  const { year, month, day } = getOfficeClock(date)
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * [start, end) of the office day containing `date`, as UTC-midnight DATE
 * keys — the window to query `AbsensiRecord.date` with.
 */
export function getOfficeDayBounds(date: Date = new Date()): { start: Date; end: Date } {
  const start = toOfficeCalendarDate(date)
  return { start, end: new Date(start.getTime() + DAY_MS) }
}

/** The instant the office clock reads hours:minutes on the office date of `reference`. */
export function officeClockOn(hours: number, minutes: number, reference: Date): Date {
  const { year, month, day } = getOfficeClock(reference)
  const wallMs = Date.UTC(year, month - 1, day, hours, minutes)
  // Two passes so a zone with DST settles on the offset in force at the
  // target time rather than the one at the wall-clock guess.
  const firstGuess = wallMs - officeOffsetMs(new Date(wallMs))
  return new Date(wallMs - officeOffsetMs(new Date(firstGuess)))
}

/**
 * A Date whose *local* fields read as the office wall clock at `date`.
 * Only for handing to date-fns `format`, which always formats in the
 * machine's timezone; never store or compare the result.
 */
export function toOfficeDisplayDate(date: Date): Date {
  const { year, month, day, hour, minute, second } = getOfficeClock(date)
  return new Date(year, month - 1, day, hour, minute, second)
}

/** A UTC-midnight calendar date as a local Date of the same day, for date-fns `format`. */
export function calendarDateForDisplay(calendarDate: Date): Date {
  return new Date(
    calendarDate.getUTCFullYear(),
    calendarDate.getUTCMonth(),
    calendarDate.getUTCDate(),
  )
}
