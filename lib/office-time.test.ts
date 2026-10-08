import {
  OFFICE_TIME_ZONE,
  getOfficeDayBounds,
  officeClockOn,
  toOfficeCalendarDate,
  toOfficeDisplayDate,
} from "./office-time"

/**
 * Every literal here carries an explicit offset, so these tests pin the
 * office clock (Asia/Jakarta, UTC+7) no matter what timezone the machine
 * running them is in. `npm test` on a UTC CI box and on a WIB laptop must
 * agree.
 */
describe("OFFICE_TIME_ZONE", () => {
  it("defaults to Asia/Jakarta", () => {
    expect(OFFICE_TIME_ZONE).toBe("Asia/Jakarta")
  })
})

describe("toOfficeCalendarDate", () => {
  it("keeps the office date for an early-morning check-in that is still yesterday in UTC", () => {
    // 06:45 WIB on the 15th is 23:45 UTC on the 14th.
    const result = toOfficeCalendarDate(new Date("2025-01-15T06:45:00+07:00"))

    expect(result.toISOString()).toBe("2025-01-15T00:00:00.000Z")
  })

  it("does not roll a late-evening time into the next day", () => {
    const result = toOfficeCalendarDate(new Date("2025-01-15T23:30:00+07:00"))

    expect(result.toISOString()).toBe("2025-01-15T00:00:00.000Z")
  })
})

describe("getOfficeDayBounds", () => {
  it("spans exactly the office calendar day, as UTC-midnight DATE keys", () => {
    const { start, end } = getOfficeDayBounds(new Date("2025-01-15T00:30:00+07:00"))

    expect(start.toISOString()).toBe("2025-01-15T00:00:00.000Z")
    expect(end.toISOString()).toBe("2025-01-16T00:00:00.000Z")
  })

  it("rolls over month and year boundaries", () => {
    const { start, end } = getOfficeDayBounds(new Date("2025-12-31T20:00:00+07:00"))

    expect(start.toISOString()).toBe("2025-12-31T00:00:00.000Z")
    expect(end.toISOString()).toBe("2026-01-01T00:00:00.000Z")
  })
})

describe("officeClockOn", () => {
  it("resolves HH:mm on the office date of the reference", () => {
    const result = officeClockOn(8, 0, new Date("2025-01-15T13:00:00+07:00"))

    expect(result.toISOString()).toBe("2025-01-15T01:00:00.000Z") // 08:00 WIB
  })

  it("uses the office date even when the UTC date differs", () => {
    // 06:00 WIB on the 15th — the UTC date is still the 14th.
    const result = officeClockOn(17, 0, new Date("2025-01-15T06:00:00+07:00"))

    expect(result.toISOString()).toBe("2025-01-15T10:00:00.000Z") // 17:00 WIB on the 15th
  })
})

describe("toOfficeDisplayDate", () => {
  it("carries the office wall-clock fields for date-fns formatting", () => {
    const display = toOfficeDisplayDate(new Date("2025-01-15T01:05:00Z"))

    expect([display.getFullYear(), display.getMonth(), display.getDate()]).toEqual([2025, 0, 15])
    expect([display.getHours(), display.getMinutes()]).toEqual([8, 5])
  })
})
