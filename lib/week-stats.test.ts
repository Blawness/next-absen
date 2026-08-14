import { computeWeekStats } from "./week-stats"

/**
 * Local literals (no Z): the week runs on the user's own clock.
 * Reference week is Mon 2025-01-06 .. Sun 2025-01-12.
 */
const at = (iso: string) => new Date(iso)

const wednesday = at("2025-01-08T12:00:00")

function record(date: string, workHours: number | null, attended = true) {
  return {
    date: at(`${date}T00:00:00`),
    checkInTime: attended ? at(`${date}T08:00:00`) : null,
    workHours,
  }
}

describe("computeWeekStats", () => {
  it("reports the week's full business days as the attendance target", () => {
    const stats = computeWeekStats([record("2025-01-06", 8)], wednesday)

    // The "x/5" target stays the whole week, even mid-week.
    expect(stats.businessDays).toBe(5)
  })

  it("counts days attended from records that have a check-in", () => {
    const stats = computeWeekStats(
      [record("2025-01-06", 8), record("2025-01-07", 8), record("2025-01-08", null, false)],
      wednesday,
    )

    expect(stats.daysAttended).toBe(2)
  })

  it("averages work hours over business days elapsed, not days attended", () => {
    // Mon+Tue worked 8h each, Wed absent. Three business days have elapsed.
    const stats = computeWeekStats(
      [record("2025-01-06", 8), record("2025-01-07", 8)],
      wednesday,
    )

    expect(stats.avgWorkHours).toBeCloseTo(16 / 3, 5)
  })

  it("does not dilute the average with business days still in the future", () => {
    // Worked 8h on Monday only; on Monday the divisor is 1, not 5.
    const stats = computeWeekStats([record("2025-01-06", 8)], at("2025-01-06T18:00:00"))

    expect(stats.avgWorkHours).toBe(8)
  })

  it("divides by the full week once the week is over", () => {
    const stats = computeWeekStats(
      [record("2025-01-06", 8), record("2025-01-07", 8)],
      at("2025-01-12T12:00:00"),
    )

    expect(stats.avgWorkHours).toBeCloseTo(16 / 5, 5)
  })

  it("counts an open shift as zero hours rather than skipping the day", () => {
    // Checked in Tuesday but never checked out: the day still consumed a
    // business day, so it must drag the average down.
    const stats = computeWeekStats(
      [record("2025-01-06", 8), record("2025-01-07", null)],
      wednesday,
    )

    expect(stats.avgWorkHours).toBeCloseTo(8 / 3, 5)
  })

  it("ignores records outside the current week", () => {
    const stats = computeWeekStats(
      [record("2025-01-06", 8), record("2024-12-30", 40)],
      wednesday,
    )

    expect(stats.daysAttended).toBe(1)
    expect(stats.avgWorkHours).toBeCloseTo(8 / 3, 5)
  })

  it("reports a zero average when nothing was worked", () => {
    const stats = computeWeekStats([], wednesday)

    expect(stats.avgWorkHours).toBe(0)
    expect(stats.daysAttended).toBe(0)
  })

  it("accepts serialized dates coming back from the API", () => {
    const stats = computeWeekStats(
      [{ date: "2025-01-06T00:00:00", checkInTime: "2025-01-06T08:00:00", workHours: 8 }],
      wednesday,
    )

    expect(stats.daysAttended).toBe(1)
  })
})
