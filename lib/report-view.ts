import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns"

export type PeriodPreset = "7d" | "30d" | "thisMonth" | "lastMonth" | "custom"

export interface DateRange {
  startDate: string
  endDate: string
}

export const PERIOD_PRESETS: Array<{ value: Exclude<PeriodPreset, "custom">; label: string }> = [
  { value: "7d", label: "7 Hari" },
  { value: "30d", label: "30 Hari" },
  { value: "thisMonth", label: "Bulan Ini" },
  { value: "lastMonth", label: "Bulan Lalu" },
]

const toDateString = (date: Date) => format(date, "yyyy-MM-dd")

/**
 * The date range a quick-period button stands for. "N days" includes
 * today, so "7 Hari" is today plus the six days before it.
 */
export function getPresetRange(preset: Exclude<PeriodPreset, "custom">, today: Date): DateRange {
  switch (preset) {
    case "7d":
      return { startDate: toDateString(subDays(today, 6)), endDate: toDateString(today) }
    case "30d":
      return { startDate: toDateString(subDays(today, 29)), endDate: toDateString(today) }
    case "thisMonth":
      return { startDate: toDateString(startOfMonth(today)), endDate: toDateString(today) }
    case "lastMonth": {
      const lastMonth = subMonths(today, 1)
      return {
        startDate: toDateString(startOfMonth(lastMonth)),
        endDate: toDateString(endOfMonth(lastMonth)),
      }
    }
  }
}

/** Which quick-period button, if any, the current range matches. */
export function detectPreset(range: DateRange, today: Date): PeriodPreset {
  const match = PERIOD_PRESETS.find(({ value }) => {
    const presetRange = getPresetRange(value, today)
    return presetRange.startDate === range.startDate && presetRange.endDate === range.endDate
  })
  return match?.value ?? "custom"
}

/**
 * Overall attendance rate across a status breakdown, using the same rule
 * as the per-employee figure in `lib/attendance-stats.ts`: late still
 * counts as attended, a half day as half of one. Null when there are no
 * records, so the UI can show "—" instead of NaN.
 */
export function computeOverallRate(statusBreakdown: Record<string, number>): number | null {
  const count = (status: string) => statusBreakdown[status] ?? 0
  const total = Object.values(statusBreakdown).reduce((sum, value) => sum + value, 0)
  if (total === 0) return null

  const attended = count("present") + count("late") + count("half_day") * 0.5
  return (attended / total) * 100
}

/** One page of a list; a page past the end clamps to the last one. */
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * pageSize
  return { items: items.slice(start, start + pageSize), page: currentPage, totalPages }
}

/** Whole numbers stay whole — "100%" reads better than "100.0%". */
export const formatRate = (rate: number) =>
  Number.isInteger(rate) ? String(rate) : rate.toFixed(1)
