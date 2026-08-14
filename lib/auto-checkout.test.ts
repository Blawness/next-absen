import {
  buildAutoCheckoutNote,
  computeAutoCheckout,
  maybeSweepAutoCheckout,
  resetAutoCheckoutThrottle,
  sweepAutoCheckout,
} from "./auto-checkout"
import type { BusinessHoursConfig } from "./business-hours"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: { findFirst: jest.fn() },
    absensiRecord: { findMany: jest.fn(), updateMany: jest.fn() },
    activityLog: { createMany: jest.fn() },
  },
}))

import { prisma } from "@/lib/prisma"

const mockedSettings = prisma.systemSettings.findFirst as jest.Mock
const mockedFindMany = prisma.absensiRecord.findMany as jest.Mock
const mockedUpdateMany = prisma.absensiRecord.updateMany as jest.Mock
const mockedCreateMany = prisma.activityLog.createMany as jest.Mock

/**
 * Date literals here deliberately omit the trailing `Z`: auto-checkout now
 * resolves `endTime` against the local clock (same convention as
 * business-hours.test.ts). Assertions compare `getTime()` so they hold in
 * any machine timezone.
 */
const local = (iso: string) => new Date(iso)

function config(overrides: Partial<BusinessHoursConfig> = {}): BusinessHoursConfig {
  return {
    startTime: "08:00",
    endTime: "17:00",
    checkInDeadline: "09:00",
    gracePeriodMinutes: 15,
    autoCheckoutEnabled: true,
    maxWorkHours: 12,
    ...overrides,
  }
}

function enableAutoCheckout(maxWorkHours = 12, endTime = "17:00") {
  mockedSettings.mockResolvedValue({
    businessHours: { autoCheckoutEnabled: true, maxWorkHours, endTime },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  resetAutoCheckoutThrottle()
  mockedUpdateMany.mockResolvedValue({ count: 1 })
  mockedCreateMany.mockResolvedValue({ count: 1 })
})

describe("computeAutoCheckout", () => {
  it("closes the shift at the configured end time", () => {
    const result = computeAutoCheckout(local("2025-01-15T08:00:00"), config())

    expect(result.checkOutTime.getTime()).toBe(local("2025-01-15T17:00:00").getTime())
    expect(result.workHours).toBe(9)
    expect(result.reason).toBe("shift_ended")
  })

  it("reports fractional worked hours to two decimals", () => {
    const result = computeAutoCheckout(local("2025-01-15T08:20:00"), config())

    expect(result.workHours).toBe(8.67)
  })

  it("caps at maxWorkHours when the shift end is further away than the limit", () => {
    // Overnight check-in: 02:00 to 17:00 would be 15h, beyond the 12h limit.
    const result = computeAutoCheckout(local("2025-01-15T02:00:00"), config())

    expect(result.checkOutTime.getTime()).toBe(local("2025-01-15T14:00:00").getTime())
    expect(result.workHours).toBe(12)
    expect(result.reason).toBe("max_work_hours_exceeded")
  })

  it("falls back to the limit when check-in happens after the shift end", () => {
    const result = computeAutoCheckout(local("2025-01-15T20:00:00"), config())

    expect(result.checkOutTime.getTime()).toBe(local("2025-01-16T08:00:00").getTime())
    expect(result.reason).toBe("max_work_hours_exceeded")
  })

  it("falls back to the limit when check-in lands exactly on the shift end", () => {
    const result = computeAutoCheckout(local("2025-01-15T17:00:00"), config())

    expect(result.checkOutTime.getTime()).toBe(local("2025-01-16T05:00:00").getTime())
    expect(result.reason).toBe("max_work_hours_exceeded")
  })

  it("falls back to the limit when endTime is malformed", () => {
    const result = computeAutoCheckout(local("2025-01-15T08:00:00"), config({ endTime: "oops" }))

    expect(result.checkOutTime.getTime()).toBe(local("2025-01-15T20:00:00").getTime())
    expect(result.reason).toBe("max_work_hours_exceeded")
  })

  it("never derives a checkout that precedes the check-in", () => {
    const result = computeAutoCheckout(local("2025-01-15T23:30:00"), config())

    expect(result.checkOutTime.getTime()).toBeGreaterThan(local("2025-01-15T23:30:00").getTime())
    expect(result.workHours).toBeGreaterThan(0)
  })
})

describe("buildAutoCheckoutNote", () => {
  it("names the shift end when the shift simply ended", () => {
    expect(buildAutoCheckoutNote(null, "shift_ended", config())).toBe(
      "[Auto checkout: jam kerja selesai 17:00]"
    )
  })

  it("names the hour limit when the limit was the binding constraint", () => {
    expect(buildAutoCheckoutNote(null, "max_work_hours_exceeded", config())).toBe(
      "[Auto checkout: melebihi batas 12 jam kerja]"
    )
  })

  it("appends without destroying an existing note", () => {
    const result = buildAutoCheckoutNote("Lembur project A", "shift_ended", config())

    expect(result).toBe("Lembur project A\n[Auto checkout: jam kerja selesai 17:00]")
  })

  it("treats a whitespace-only note as empty", () => {
    expect(buildAutoCheckoutNote("   ", "shift_ended", config())).toBe(
      "[Auto checkout: jam kerja selesai 17:00]"
    )
  })
})

describe("sweepAutoCheckout", () => {
  it("does nothing and touches no attendance table when disabled", async () => {
    mockedSettings.mockResolvedValue({
      businessHours: { autoCheckoutEnabled: false, maxWorkHours: 12 },
    })

    const result = await sweepAutoCheckout()

    expect(result).toEqual({ closed: 0, skipped: true })
    expect(mockedFindMany).not.toHaveBeenCalled()
  })

  it("is disabled by default when no settings row exists", async () => {
    mockedSettings.mockResolvedValue(null)

    const result = await sweepAutoCheckout()

    expect(result.skipped).toBe(true)
    expect(mockedFindMany).not.toHaveBeenCalled()
  })

  it("queries every open record rather than a fixed-age slice", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([])

    await sweepAutoCheckout({ now: local("2025-01-15T20:00:00") })

    const where = mockedFindMany.mock.calls[0][0].where
    expect(where.checkOutTime).toBeNull()
    expect(where.checkInTime.not).toBeNull()
    // Eligibility now depends on each record's own shift end, so no fixed
    // age cutoff can be pushed into the query.
    expect(where.checkInTime.lt).toBeUndefined()
  })

  it("leaves a record open until its shift end has passed", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: local("2025-01-15T08:00:00"), notes: null },
    ])

    const result = await sweepAutoCheckout({ now: local("2025-01-15T16:00:00") })

    expect(result).toEqual({ closed: 0, skipped: false })
    expect(mockedUpdateMany).not.toHaveBeenCalled()
  })

  it("closes the record as soon as the shift end has passed", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: local("2025-01-15T08:00:00"), notes: null },
    ])

    const result = await sweepAutoCheckout({ now: local("2025-01-15T17:00:00") })

    expect(result.closed).toBe(1)
    const data = mockedUpdateMany.mock.calls[0][0].data
    expect(data.checkOutTime.getTime()).toBe(local("2025-01-15T17:00:00").getTime())
    expect(data.workHours).toBe(9)
    expect(data.overtimeHours).toBe(0)
  })

  it("writes checkout derived from the shift end, not from the sweep time", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: local("2025-01-15T08:00:00"), notes: null },
    ])

    // Sweep runs a full day late; the written row must not reflect that.
    const result = await sweepAutoCheckout({ now: local("2025-01-16T09:00:00") })

    expect(result.closed).toBe(1)
    const data = mockedUpdateMany.mock.calls[0][0].data
    expect(data.checkOutTime.getTime()).toBe(local("2025-01-15T17:00:00").getTime())
    expect(data.workHours).toBe(9)
  })

  it("clamps an out-of-range maxWorkHours back to the default", async () => {
    enableAutoCheckout(999)
    mockedFindMany.mockResolvedValue([
      // Checked in after the shift end, so the limit is what decides.
      { id: "a1", userId: "u1", checkInTime: local("2025-01-15T20:00:00"), notes: null },
    ])

    await sweepAutoCheckout({ now: local("2025-01-17T00:00:00") })

    const data = mockedUpdateMany.mock.calls[0][0].data
    // 12h default, not 999h.
    expect(data.checkOutTime.getTime()).toBe(local("2025-01-16T08:00:00").getTime())
  })

  it("preserves status by not writing it", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: local("2025-01-15T08:00:00"), notes: null },
    ])

    await sweepAutoCheckout({ now: local("2025-01-16T09:00:00") })

    expect(mockedUpdateMany.mock.calls[0][0].data).not.toHaveProperty("status")
  })

  it("guards the update on checkOutTime still being null", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: local("2025-01-15T08:00:00"), notes: null },
    ])

    await sweepAutoCheckout({ now: local("2025-01-16T09:00:00") })

    expect(mockedUpdateMany.mock.calls[0][0].where).toEqual({ id: "a1", checkOutTime: null })
  })

  it("skips logging when a concurrent writer already closed the record", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: local("2025-01-15T08:00:00"), notes: null },
    ])
    mockedUpdateMany.mockResolvedValue({ count: 0 })

    const result = await sweepAutoCheckout({ now: local("2025-01-16T09:00:00") })

    expect(result.closed).toBe(0)
    expect(mockedCreateMany).not.toHaveBeenCalled()
  })

  it("logs one activity entry per closed record, owned by the record's user", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: local("2025-01-15T08:00:00"), notes: null },
      { id: "a2", userId: "u2", checkInTime: local("2025-01-15T09:00:00"), notes: null },
    ])

    const result = await sweepAutoCheckout({ now: local("2025-01-16T09:00:00") })

    expect(result.closed).toBe(2)
    const logs = mockedCreateMany.mock.calls[0][0].data
    expect(logs).toHaveLength(2)
    expect(logs[0].userId).toBe("u1")
    expect(logs[0].action).toBe("auto_check_out")
    expect(logs[0].resourceId).toBe("a1")
    expect(logs[1].userId).toBe("u2")
  })

  it("records which rule closed the record in the activity log", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: local("2025-01-15T08:00:00"), notes: null },
    ])

    await sweepAutoCheckout({ now: local("2025-01-16T09:00:00") })

    expect(mockedCreateMany.mock.calls[0][0].data[0].details.reason).toBe("shift_ended")
  })

  it("returns early without logging when nothing is stale", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([])

    const result = await sweepAutoCheckout({ now: local("2025-01-16T09:00:00") })

    expect(result).toEqual({ closed: 0, skipped: false })
    expect(mockedUpdateMany).not.toHaveBeenCalled()
    expect(mockedCreateMany).not.toHaveBeenCalled()
  })

  it("processes the oldest records first, bounded by the limit", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([])

    await sweepAutoCheckout({ now: local("2025-01-16T09:00:00"), limit: 50 })

    const args = mockedFindMany.mock.calls[0][0]
    expect(args.take).toBe(50)
    expect(args.orderBy).toEqual({ checkInTime: "asc" })
  })
})

describe("maybeSweepAutoCheckout", () => {
  it("throttles a second call made immediately after the first", async () => {
    enableAutoCheckout()
    mockedFindMany.mockResolvedValue([])

    await maybeSweepAutoCheckout()
    await maybeSweepAutoCheckout()

    expect(mockedFindMany).toHaveBeenCalledTimes(1)
  })

  it("swallows errors so the caller's request still succeeds", async () => {
    enableAutoCheckout()
    mockedFindMany.mockRejectedValue(new Error("db down"))
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    await expect(maybeSweepAutoCheckout()).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
