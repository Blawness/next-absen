/**
 * Compute UTC day boundaries for "today" queries against MySQL DATE columns.
 *
 * `AbsensiRecord.date` is stored as `DATE` (no time, no timezone info).
 * Prisma converts JS Date → MySQL DATE using the server's timezone. To
 * avoid a class of off-by-one bugs at day boundaries (especially when
 * the app server runs in UTC but users are in +07:00 / -08:00), we
 * compute the [start, end) window in UTC and let MySQL compare dates
 * consistently.
 *
 * If you need the window for a different date, pass it explicitly.
 */
export function getUtcDayBounds(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

/**
 * Return the UTC calendar date (YYYY-MM-DD) for a given moment.
 * Useful for building deterministic date keys (e.g. timeseries grouping).
 */
export function getUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
