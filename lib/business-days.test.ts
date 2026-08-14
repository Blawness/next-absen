import {
  countBusinessDays,
  countElapsedBusinessDays,
  countReportBusinessDays,
  isBusinessDay,
  toCalendarDate,
} from "./business-days"

/**
 * Calendar dates are UTC midnights so that day-of-week is unambiguous.
 * `toCalendarDate` is the seam callers use to get there from a wall-clock
 * Date, so tests that start from a local literal go through it.
 */
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe("toCalendarDate", () => {
  it("keeps the local calendar date and pins it to UTC midnight", () => {
    // Local literal (no Z): late evening must not roll into the next date.
    const result = toCalendarDate(new Date("2025-01-08T23:30:00"))

    expect(result.toISOString()).toBe("2025-01-08T00:00:00.000Z")
  })

  it("is idempotent for a date already at UTC midnight in UTC-ish zones", () => {
    const once = toCalendarDate(new Date("2025-01-08T09:00:00"))
    const twice = toCalendarDate(once)

    expect(twice.getTime()).toBe(once.getTime())
  })
})

describe("isBusinessDay", () => {
  it("accepts Monday through Friday", () => {
    const weekdays = ["2025-01-06", "2025-01-07", "2025-01-08", "2025-01-09", "2025-01-10"]

    expect(weekdays.map(d => isBusinessDay(day(d)))).toEqual([true, true, true, true, true])
  })

  it("rejects Saturday and Sunday", () => {
    expect(isBusinessDay(day("2025-01-11"))).toBe(false)
    expect(isBusinessDay(day("2025-01-12"))).toBe(false)
  })
})

describe("countBusinessDays", () => {
  it("counts five business days across a full Monday-to-Sunday week", () => {
    expect(countBusinessDays(day("2025-01-06"), day("2025-01-12"))).toBe(5)
  })

  it("counts the boundaries inclusively", () => {
    // Mon through Fri.
    expect(countBusinessDays(day("2025-01-06"), day("2025-01-10"))).toBe(5)
  })

  it("counts a weekend as zero", () => {
    expect(countBusinessDays(day("2025-01-11"), day("2025-01-12"))).toBe(0)
  })

  it("counts a single weekday as one", () => {
    expect(countBusinessDays(day("2025-01-08"), day("2025-01-08"))).toBe(1)
  })

  it("returns zero when the range is inverted", () => {
    expect(countBusinessDays(day("2025-01-10"), day("2025-01-06"))).toBe(0)
  })

  it("counts across a month boundary", () => {
    // Mon 27 Jan - Fri 7 Feb 2025: two full working weeks.
    expect(countBusinessDays(day("2025-01-27"), day("2025-02-07"))).toBe(10)
  })
})

describe("countReportBusinessDays", () => {
  const now = day("2025-01-31")

  it("uses the explicit range when both ends are given", () => {
    expect(countReportBusinessDays([], day("2025-01-06"), day("2025-01-10"), now)).toBe(5)
  })

  it("falls back to the span of the records when no range is given", () => {
    const dates = [day("2025-01-08"), day("2025-01-06"), day("2025-01-07")]

    expect(countReportBusinessDays(dates, null, null, now)).toBe(3)
  })

  it("fills in only the missing end of a half-open range", () => {
    const dates = [day("2025-01-10"), day("2025-01-06")]

    expect(countReportBusinessDays(dates, day("2025-01-06"), null, now)).toBe(5)
  })

  it("returns zero when there is neither a range nor any record", () => {
    expect(countReportBusinessDays([], null, null, now)).toBe(0)
  })

  it("does not count business days that have not happened yet", () => {
    // Range runs to the end of the month but today is only the 8th.
    expect(
      countReportBusinessDays([], day("2025-01-06"), day("2025-01-31"), day("2025-01-08"))
    ).toBe(3)
  })
})

describe("countElapsedBusinessDays", () => {
  const weekStart = day("2025-01-06") // Mon
  const weekEnd = day("2025-01-12") // Sun

  it("counts only the business days up to and including today", () => {
    // Wednesday: Mon, Tue, Wed.
    expect(countElapsedBusinessDays(weekStart, weekEnd, day("2025-01-08"))).toBe(3)
  })

  it("counts the first day as one on the first day of the range", () => {
    expect(countElapsedBusinessDays(weekStart, weekEnd, day("2025-01-06"))).toBe(1)
  })

  it("stops at the range end once the period is over", () => {
    expect(countElapsedBusinessDays(weekStart, weekEnd, day("2025-02-01"))).toBe(5)
  })

  it("does not count past the end when today is the final Sunday", () => {
    expect(countElapsedBusinessDays(weekStart, weekEnd, day("2025-01-12"))).toBe(5)
  })

  it("still counts the week's business days so far on a weekend mid-range", () => {
    // Saturday: the working week is done even though the range is not.
    expect(countElapsedBusinessDays(weekStart, weekEnd, day("2025-01-11"))).toBe(5)
  })

  it("returns zero before the range has started", () => {
    expect(countElapsedBusinessDays(weekStart, weekEnd, day("2025-01-01"))).toBe(0)
  })

  it("derives the calendar date from the local clock of the given moment", () => {
    // Wednesday evening local time — still Wednesday, so three days.
    const wednesdayEvening = new Date("2025-01-08T22:00:00")

    expect(countElapsedBusinessDays(weekStart, weekEnd, wednesdayEvening)).toBe(3)
  })
})
