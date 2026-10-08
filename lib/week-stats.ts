import { countBusinessDays, countElapsedBusinessDays, toCalendarDate } from "./business-days"

const DAY_MS = 24 * 60 * 60 * 1000

export interface WeekStats {
  daysAttended: number
  /** Business days in the whole week — the attendance target, e.g. the 5 in "3/5". */
  businessDays: number
  /** Work hours per business day elapsed so far this week. */
  avgWorkHours: number
}

export interface WeekStatsRecord {
  date: Date | string
  checkInTime: Date | string | null
  workHours: number | string | null
}

/**
 * Summarise the current week for the dashboard cards.
 *
 * The average divides by business days *elapsed*, not by days attended: a
 * day someone skipped, or checked in without checking out, has to pull the
 * number down — otherwise "average hours per day" reports the same 8.0 for
 * someone who worked five days as for someone who worked one.
 */
export function computeWeekStats(
  records: WeekStatsRecord[],
  now: Date = new Date(),
): WeekStats {
  // The week is Monday..Sunday of the office date. Records carry calendar
  // dates pinned to UTC midnight (AbsensiRecord.date), so compare them as
  // calendar dates too — date-fns startOfWeek would cut on the browser's
  // own timezone instead.
  const today = toCalendarDate(now)
  const daysSinceMonday = (today.getUTCDay() + 6) % 7
  const startDate = new Date(today.getTime() - daysSinceMonday * DAY_MS)
  const endDate = new Date(startDate.getTime() + 6 * DAY_MS)

  const inWeek = records.filter(r => {
    const time = new Date(r.date).getTime()
    return time >= startDate.getTime() && time <= endDate.getTime()
  })

  const totalWorkHours = inWeek.reduce((sum, r) => sum + (Number(r.workHours) || 0), 0)
  const elapsed = countElapsedBusinessDays(startDate, endDate, now)

  return {
    daysAttended: inWeek.filter(r => r.checkInTime != null).length,
    businessDays: countBusinessDays(startDate, endDate),
    avgWorkHours: elapsed > 0 ? totalWorkHours / elapsed : 0,
  }
}
