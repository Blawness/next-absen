import { computeLateStatus, computeOvertimeHours, getBusinessHoursConfig } from "./business-hours"
import { AttendanceStatus } from "@prisma/client"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: {
      findFirst: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const mockedFindFirst = prisma.systemSettings.findFirst as jest.Mock

describe("computeLateStatus", () => {
  const config = {
    startTime: "08:00",
    endTime: "17:00",
    checkInDeadline: "09:00",
    gracePeriodMinutes: 15,
    autoCheckoutEnabled: false,
    maxWorkHours: 12,
  }

  it("returns present with 0 minutes when check-in is exactly at start", () => {
    const result = computeLateStatus(new Date("2025-01-15T08:00:00+07:00"), config)
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
  })

  it("returns present when check-in is within grace period", () => {
    const result = computeLateStatus(new Date("2025-01-15T08:10:00+07:00"), config)
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
  })

  it("returns present when check-in is exactly at grace boundary", () => {
    const result = computeLateStatus(new Date("2025-01-15T08:15:00+07:00"), config)
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
  })

  it("returns late with floor-rounded minutes when past grace period", () => {
    const result = computeLateStatus(new Date("2025-01-15T08:45:00+07:00"), config)
    expect(result.lateMinutes).toBe(45)
    expect(result.status).toBe(AttendanceStatus.late)
  })

  it("returns present for early check-in (before start)", () => {
    const result = computeLateStatus(new Date("2025-01-15T07:30:00+07:00"), config)
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
  })

  it("reads startTime on the office clock, not the server clock", () => {
    // 08:45 WIB is 01:45 UTC. On a UTC server, reading 08:00 off the server
    // clock would put the start at 15:00 WIB and call this check-in early.
    const result = computeLateStatus(new Date("2025-01-15T01:45:00Z"), config)
    expect(result.lateMinutes).toBe(45)
    expect(result.status).toBe(AttendanceStatus.late)
  })

  it("handles malformed startTime gracefully", () => {
    const result = computeLateStatus(new Date(), { ...config, startTime: "bogus" })
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
  })
})

describe("computeOvertimeHours", () => {
  const config = {
    startTime: "08:00",
    endTime: "17:00",
    checkInDeadline: "09:00",
    gracePeriodMinutes: 15,
    autoCheckoutEnabled: false,
    maxWorkHours: 12,
  }
  const wib = (iso: string) => new Date(`${iso}+07:00`)

  it("is zero when the shift ends before endTime", () => {
    expect(computeOvertimeHours(wib("2025-01-15T08:00:00"), wib("2025-01-15T16:30:00"), config)).toBe(0)
  })

  it("is zero when checking out exactly at endTime", () => {
    expect(computeOvertimeHours(wib("2025-01-15T08:00:00"), wib("2025-01-15T17:00:00"), config)).toBe(0)
  })

  it("counts the time worked past endTime", () => {
    expect(computeOvertimeHours(wib("2025-01-15T08:00:00"), wib("2025-01-15T19:30:00"), config)).toBe(2.5)
  })

  it("counts the whole shift when check-in is already past endTime", () => {
    expect(computeOvertimeHours(wib("2025-01-15T18:00:00"), wib("2025-01-15T21:00:00"), config)).toBe(3)
  })

  it("reads endTime on the office clock, not the server clock", () => {
    // 08:00-19:00 WIB is 01:00-12:00 UTC: a UTC-clock 17:00 would see no overtime.
    expect(computeOvertimeHours(new Date("2025-01-15T01:00:00Z"), new Date("2025-01-15T12:00:00Z"), config)).toBe(2)
  })

  it("rounds to two decimals, matching the DECIMAL(4,2) column", () => {
    expect(computeOvertimeHours(wib("2025-01-15T08:00:00"), wib("2025-01-15T17:20:00"), config)).toBe(0.33)
  })

  it("is zero when endTime is malformed", () => {
    expect(computeOvertimeHours(wib("2025-01-15T08:00:00"), wib("2025-01-15T22:00:00"), { ...config, endTime: "oops" })).toBe(0)
  })
})

describe("getBusinessHoursConfig", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("returns project defaults when no settings row exists", async () => {
    mockedFindFirst.mockResolvedValue(null)
    const config = await getBusinessHoursConfig()
    expect(config.startTime).toBe("08:00")
    expect(config.gracePeriodMinutes).toBe(15)
  })

  it("merges configured values over defaults", async () => {
    mockedFindFirst.mockResolvedValue({
      businessHours: { startTime: "09:30", gracePeriodMinutes: 30 },
    })
    const config = await getBusinessHoursConfig()
    expect(config.startTime).toBe("09:30")
    expect(config.gracePeriodMinutes).toBe(30)
    expect(config.endTime).toBe("17:00") // default preserved
  })

  it("ignores malformed values and falls back to defaults", async () => {
    mockedFindFirst.mockResolvedValue({
      businessHours: { startTime: "not-a-time", gracePeriodMinutes: "lots" },
    })
    const config = await getBusinessHoursConfig()
    expect(config.startTime).toBe("08:00")
    expect(config.gracePeriodMinutes).toBe(15)
  })

  it("defaults auto-checkout to off with a 12 hour limit", async () => {
    mockedFindFirst.mockResolvedValue({ businessHours: {} })
    const config = await getBusinessHoursConfig()
    expect(config.autoCheckoutEnabled).toBe(false)
    expect(config.maxWorkHours).toBe(12)
  })

  it("reads configured auto-checkout values, including fractional hours", async () => {
    mockedFindFirst.mockResolvedValue({
      businessHours: { autoCheckoutEnabled: true, maxWorkHours: 10.5 },
    })
    const config = await getBusinessHoursConfig()
    expect(config.autoCheckoutEnabled).toBe(true)
    expect(config.maxWorkHours).toBe(10.5)
  })

  it("clamps out-of-range maxWorkHours back to the default", async () => {
    mockedFindFirst.mockResolvedValue({
      businessHours: { maxWorkHours: 0 },
    })
    expect((await getBusinessHoursConfig()).maxWorkHours).toBe(12)

    mockedFindFirst.mockResolvedValue({
      businessHours: { maxWorkHours: 100 },
    })
    expect((await getBusinessHoursConfig()).maxWorkHours).toBe(12)
  })

  it("rejects a non-boolean autoCheckoutEnabled", async () => {
    mockedFindFirst.mockResolvedValue({
      businessHours: { autoCheckoutEnabled: "yes" },
    })
    expect((await getBusinessHoursConfig()).autoCheckoutEnabled).toBe(false)
  })

  it("returns defaults on DB error", async () => {
    mockedFindFirst.mockRejectedValue(new Error("DB down"))
    const config = await getBusinessHoursConfig()
    expect(config.startTime).toBe("08:00")
  })
})
