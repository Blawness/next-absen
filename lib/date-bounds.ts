/**
 * Return the UTC calendar date (YYYY-MM-DD) for a given moment.
 *
 * Meant for `AbsensiRecord.date` values and other calendar dates pinned to
 * UTC midnight (see lib/office-time.ts), where the UTC date *is* the
 * calendar date. For a wall-clock instant, go through
 * `toOfficeCalendarDate` first — its UTC date can be the day before.
 */
export function getUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
