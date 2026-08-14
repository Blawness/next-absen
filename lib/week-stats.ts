import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns"
import { countBusinessDays, countElapsedBusinessDays, toCalendarDate } from "./business-days"

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
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const inWeek = records.filter(r =>
    isWithinInterval(new Date(r.date), { start: weekStart, end: weekEnd })
  )

  const startDate = toCalendarDate(weekStart)
  const endDate = toCalendarDate(weekEnd)

  const totalWorkHours = inWeek.reduce((sum, r) => sum + (Number(r.workHours) || 0), 0)
  const elapsed = countElapsedBusinessDays(startDate, endDate, now)

  return {
    daysAttended: inWeek.filter(r => r.checkInTime != null).length,
    businessDays: countBusinessDays(startDate, endDate),
    avgWorkHours: elapsed > 0 ? totalWorkHours / elapsed : 0,
  }
}
