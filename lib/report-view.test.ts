import {
  computeOverallRate,
  detectPreset,
  getPresetRange,
  paginate,
} from "./report-view"

const today = new Date(2026, 9, 13) // 13 Oct 2026, local time

describe("getPresetRange", () => {
  it("counts 7 days inclusive of today", () => {
    expect(getPresetRange("7d", today)).toEqual({ startDate: "2026-10-07", endDate: "2026-10-13" })
  })

  it("counts 30 days inclusive of today", () => {
    expect(getPresetRange("30d", today)).toEqual({ startDate: "2026-09-14", endDate: "2026-10-13" })
  })

  it("runs this month from the 1st to today", () => {
    expect(getPresetRange("thisMonth", today)).toEqual({ startDate: "2026-10-01", endDate: "2026-10-13" })
  })

  it("covers the whole previous month", () => {
    expect(getPresetRange("lastMonth", today)).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" })
  })

  it("rolls last month back across a year boundary", () => {
    expect(getPresetRange("lastMonth", new Date(2026, 0, 5))).toEqual({
      startDate: "2025-12-01",
      endDate: "2025-12-31",
    })
  })
})

describe("detectPreset", () => {
  it("recognises a range a preset produced", () => {
    expect(detectPreset(getPresetRange("thisMonth", today), today)).toBe("thisMonth")
    expect(detectPreset(getPresetRange("lastMonth", today), today)).toBe("lastMonth")
  })

  it("falls back to custom for anything else", () => {
    expect(detectPreset({ startDate: "2026-10-02", endDate: "2026-10-05" }, today)).toBe("custom")
  })
})

describe("computeOverallRate", () => {
  it("counts late as attended and half day as half", () => {
    expect(computeOverallRate({ present: 6, late: 2, half_day: 2, absent: 0 })).toBe(90)
  })

  it("returns null when there is nothing to rate", () => {
    expect(computeOverallRate({})).toBeNull()
  })
})

describe("paginate", () => {
  const items = Array.from({ length: 45 }, (_, i) => i)

  it("slices the requested page", () => {
    expect(paginate(items, 2, 20)).toEqual({ items: items.slice(20, 40), page: 2, totalPages: 3 })
  })

  it("clamps a page past the end to the last page", () => {
    expect(paginate(items, 9, 20)).toEqual({ items: items.slice(40), page: 3, totalPages: 3 })
  })

  it("reports a single empty page for no items", () => {
    expect(paginate([], 1, 20)).toEqual({ items: [], page: 1, totalPages: 1 })
  })
})
