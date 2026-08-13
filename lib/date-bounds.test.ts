import { getUtcDayBounds, getUtcDateKey } from "./date-bounds"

describe("getUtcDayBounds", () => {
  it("returns a 24-hour window starting at UTC midnight", () => {
    const { start, end } = getUtcDayBounds(new Date("2025-01-15T13:00:00Z"))
    expect(start.toISOString()).toBe("2025-01-15T00:00:00.000Z")
    expect(end.toISOString()).toBe("2025-01-16T00:00:00.000Z")
  })

  it("produces a non-inclusive upper bound (start of next day)", () => {
    const { start, end } = getUtcDayBounds(new Date("2025-01-15T23:59:59Z"))
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it("handles month/year rollover", () => {
    const { start, end } = getUtcDayBounds(new Date("2025-01-01T05:00:00Z"))
    expect(start.toISOString()).toBe("2025-01-01T00:00:00.000Z")
    expect(end.toISOString()).toBe("2025-01-02T00:00:00.000Z")
  })

  it("handles year-end rollover", () => {
    const { start, end } = getUtcDayBounds(new Date("2025-12-31T20:00:00Z"))
    expect(start.toISOString()).toBe("2025-12-31T00:00:00.000Z")
    expect(end.toISOString()).toBe("2026-01-01T00:00:00.000Z")
  })
})

describe("getUtcDateKey", () => {
  it("returns YYYY-MM-DD slice from UTC", () => {
    expect(getUtcDateKey(new Date("2025-01-15T13:00:00Z"))).toBe("2025-01-15")
  })
})
