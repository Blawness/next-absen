/**
 * Business-day arithmetic shared by the dashboard, KPI and reports.
 *
 * All three used to count Mon-Fri themselves, and disagreed: the dashboard
 * read the local clock while KPI read UTC. Everything now routes through
 * here, on one definition.
 *
 * A "calendar date" in this module is a Date pinned to UTC midnight, so
 * day-of-week is unambiguous. `toCalendarDate` is the seam that gets you
 * there from a wall-clock Date, reading its *local* date — the day a user
 * would say they are in.
 */

export function toCalendarDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

export function isBusinessDay(calendarDate: Date): boolean {
  const day = calendarDate.getUTCDay()
  return day !== 0 && day !== 6 // Mon-Fri
}

/** Business days between two calendar dates, both ends included. */
export function countBusinessDays(start: Date, end: Date): number {
  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    if (isBusinessDay(cursor)) count++
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
}

/**
 * Business days elapsed so far in a range: the same count, but stopping at
 * today rather than running to the end of a period still in progress.
 *
 * This is what per-day averages divide by. Dividing a partial week by its
 * full five days would report every Monday as though four days had been
 * missed, so the metric would only be true after close of business Friday.
 */
export function countElapsedBusinessDays(start: Date, end: Date, now: Date): number {
  const today = toCalendarDate(now)
  return countBusinessDays(start, today < end ? today : end)
}

/**
 * Average work hours per expected person-day.
 *
 * The divisor is business days elapsed times active users, not the number of
 * records: a day someone missed has to pull the average down, otherwise
 * working one day out of five reports the same figure as working all five.
 */
export function averageWorkHoursPerDay(
  totalWorkHours: number,
  elapsedBusinessDays: number,
  activeUsers: number,
): number {
  const expectedDays = elapsedBusinessDays * activeUsers
  return expectedDays > 0 ? totalWorkHours / expectedDays : 0
}

/**
 * Business days covered by a report. Reports may be run without a date
 * filter, in which case the range is whatever the returned records span.
 */
export function countReportBusinessDays(
  recordDates: Date[],
  start: Date | null,
  end: Date | null,
  now: Date,
): number {
  const times = recordDates.map(d => d.getTime())

  const rangeStart = start ?? (times.length > 0 ? new Date(Math.min(...times)) : null)
  const rangeEnd = end ?? (times.length > 0 ? new Date(Math.max(...times)) : null)
  if (!rangeStart || !rangeEnd) return 0

  return countElapsedBusinessDays(rangeStart, rangeEnd, now)
}
