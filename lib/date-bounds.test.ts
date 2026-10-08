import { getUtcDateKey } from "./date-bounds"

describe("getUtcDateKey", () => {
  it("returns YYYY-MM-DD slice from UTC", () => {
    expect(getUtcDateKey(new Date("2025-01-15T13:00:00Z"))).toBe("2025-01-15")
  })
})
