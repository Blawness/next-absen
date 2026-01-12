import { countBusinessDays, resolveRange } from "./services"

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
    const days = countBusinessDays({ start, end })
    expect(days).toBe(5)
  })
})



