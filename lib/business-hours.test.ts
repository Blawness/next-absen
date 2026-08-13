import { computeLateStatus, getBusinessHoursConfig } from "./business-hours"
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
    const result = computeLateStatus(new Date("2025-01-15T08:00:00"), config)
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
  })

  it("returns present when check-in is within grace period", () => {
    const result = computeLateStatus(new Date("2025-01-15T08:10:00"), config)
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
  })

  it("returns present when check-in is exactly at grace boundary", () => {
    const result = computeLateStatus(new Date("2025-01-15T08:15:00"), config)
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
  })

  it("returns late with floor-rounded minutes when past grace period", () => {
    const result = computeLateStatus(new Date("2025-01-15T08:45:00"), config)
    expect(result.lateMinutes).toBe(45)
    expect(result.status).toBe(AttendanceStatus.late)
  })

  it("returns present for early check-in (before start)", () => {
    const result = computeLateStatus(new Date("2025-01-15T07:30:00"), config)
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
  })

  it("handles malformed startTime gracefully", () => {
    const result = computeLateStatus(new Date(), { ...config, startTime: "bogus" })
    expect(result.lateMinutes).toBe(0)
    expect(result.status).toBe(AttendanceStatus.present)
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
