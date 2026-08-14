import { resolveRange } from "./services"
import { averageWorkHoursPerDay, countBusinessDays } from "@/lib/business-days"

describe("KPI services helpers", () => {
  it("calculates weekly range starting Monday without clamping", () => {
    const today = new Date("2025-01-08T12:00:00Z") // Wed
    const { start, end } = resolveRange("weekly", today)
    expect(start.toISOString().slice(0,10)).toBe("2025-01-06") // Monday
    expect(end.toISOString().slice(0,10)).toBe("2025-01-12") // Sunday
  })

  it("counts business days Mon-Fri", () => {
    const start = new Date("2025-01-06T00:00:00Z") // Mon
    const end = new Date("2025-01-12T00:00:00Z")   // Sun
    expect(countBusinessDays(start, end)).toBe(5)
  })
})

describe("averageWorkHoursPerDay", () => {
  it("divides total hours by the expected person-days", () => {
    // 2 people x 3 elapsed business days = 6 slots; 48h worked.
    expect(averageWorkHoursPerDay(48, 3, 2)).toBe(8)
  })

  it("counts a missed day against the average", () => {
    // One person, three elapsed days, but only two worked.
    expect(averageWorkHoursPerDay(16, 3, 1)).toBeCloseTo(16 / 3, 5)
  })

  it("returns zero when no hours were logged", () => {
    expect(averageWorkHoursPerDay(0, 5, 3)).toBe(0)
  })

  it("returns zero rather than dividing by zero before any day has elapsed", () => {
    expect(averageWorkHoursPerDay(0, 0, 4)).toBe(0)
  })

  it("returns zero when the scope has no active users", () => {
    expect(averageWorkHoursPerDay(20, 5, 0)).toBe(0)
  })
})
