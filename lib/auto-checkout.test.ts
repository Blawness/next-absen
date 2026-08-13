import {
  buildAutoCheckoutNote,
  computeAutoCheckout,
  maybeSweepAutoCheckout,
  resetAutoCheckoutThrottle,
  sweepAutoCheckout,
} from "./auto-checkout"

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

function enableAutoCheckout(maxWorkHours = 10) {
  mockedSettings.mockResolvedValue({
    businessHours: { autoCheckoutEnabled: true, maxWorkHours },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  resetAutoCheckoutThrottle()
  mockedUpdateMany.mockResolvedValue({ count: 1 })
  mockedCreateMany.mockResolvedValue({ count: 1 })
})

describe("computeAutoCheckout", () => {
  it("derives checkout from check-in plus the limit", () => {
    const result = computeAutoCheckout(new Date("2025-01-15T08:00:00Z"), 10)
    expect(result.checkOutTime.toISOString()).toBe("2025-01-15T18:00:00.000Z")
    expect(result.workHours).toBe(10)
  })

  it("supports fractional hours", () => {
    const result = computeAutoCheckout(new Date("2025-01-15T08:00:00Z"), 10.5)
    expect(result.checkOutTime.toISOString()).toBe("2025-01-15T18:30:00.000Z")
  })
})

describe("buildAutoCheckoutNote", () => {
  it("sets the marker when there is no existing note", () => {
    expect(buildAutoCheckoutNote(null, 10)).toBe(
      "[Auto checkout: melebihi batas 10 jam kerja]"
    )
  })

  it("appends without destroying an existing note", () => {
    const result = buildAutoCheckoutNote("Lembur project A", 10)
    expect(result).toBe("Lembur project A\n[Auto checkout: melebihi batas 10 jam kerja]")
  })

  it("treats a whitespace-only note as empty", () => {
    expect(buildAutoCheckoutNote("   ", 10)).toBe(
      "[Auto checkout: melebihi batas 10 jam kerja]"
    )
  })
})

describe("sweepAutoCheckout", () => {
  it("does nothing and touches no attendance table when disabled", async () => {
    mockedSettings.mockResolvedValue({
      businessHours: { autoCheckoutEnabled: false, maxWorkHours: 10 },
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

  it("queries only open records that started before the cutoff", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockResolvedValue([])

    await sweepAutoCheckout({ now: new Date("2025-01-15T20:00:00Z") })

    const where = mockedFindMany.mock.calls[0][0].where
    expect(where.checkOutTime).toBeNull()
    expect(where.checkInTime.not).toBeNull()
    expect(where.checkInTime.lt.toISOString()).toBe("2025-01-15T10:00:00.000Z")
  })

  it("writes checkout derived from check-in, not from the sweep time", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: new Date("2025-01-15T08:00:00Z"), notes: null },
    ])

    // Sweep runs a full day late; the written row must not reflect that.
    const result = await sweepAutoCheckout({ now: new Date("2025-01-16T09:00:00Z") })

    expect(result.closed).toBe(1)
    const data = mockedUpdateMany.mock.calls[0][0].data
    expect(data.checkOutTime.toISOString()).toBe("2025-01-15T18:00:00.000Z")
    expect(data.workHours).toBe(10)
    expect(data.overtimeHours).toBe(0)
  })

  it("preserves status by not writing it", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: new Date("2025-01-15T08:00:00Z"), notes: null },
    ])

    await sweepAutoCheckout({ now: new Date("2025-01-16T09:00:00Z") })

    expect(mockedUpdateMany.mock.calls[0][0].data).not.toHaveProperty("status")
  })

  it("guards the update on checkOutTime still being null", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: new Date("2025-01-15T08:00:00Z"), notes: null },
    ])

    await sweepAutoCheckout({ now: new Date("2025-01-16T09:00:00Z") })

    expect(mockedUpdateMany.mock.calls[0][0].where).toEqual({ id: "a1", checkOutTime: null })
  })

  it("skips logging when a concurrent writer already closed the record", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: new Date("2025-01-15T08:00:00Z"), notes: null },
    ])
    mockedUpdateMany.mockResolvedValue({ count: 0 })

    const result = await sweepAutoCheckout({ now: new Date("2025-01-16T09:00:00Z") })

    expect(result.closed).toBe(0)
    expect(mockedCreateMany).not.toHaveBeenCalled()
  })

  it("logs one activity entry per closed record, owned by the record's user", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", checkInTime: new Date("2025-01-15T08:00:00Z"), notes: null },
      { id: "a2", userId: "u2", checkInTime: new Date("2025-01-15T09:00:00Z"), notes: null },
    ])

    const result = await sweepAutoCheckout({ now: new Date("2025-01-16T09:00:00Z") })

    expect(result.closed).toBe(2)
    const logs = mockedCreateMany.mock.calls[0][0].data
    expect(logs).toHaveLength(2)
    expect(logs[0].userId).toBe("u1")
    expect(logs[0].action).toBe("auto_check_out")
    expect(logs[0].resourceId).toBe("a1")
    expect(logs[1].userId).toBe("u2")
  })

  it("returns early without logging when nothing is stale", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockResolvedValue([])

    const result = await sweepAutoCheckout({ now: new Date("2025-01-16T09:00:00Z") })

    expect(result).toEqual({ closed: 0, skipped: false })
    expect(mockedUpdateMany).not.toHaveBeenCalled()
    expect(mockedCreateMany).not.toHaveBeenCalled()
  })

  it("processes the oldest records first, bounded by the limit", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockResolvedValue([])

    await sweepAutoCheckout({ now: new Date("2025-01-16T09:00:00Z"), limit: 50 })

    const args = mockedFindMany.mock.calls[0][0]
    expect(args.take).toBe(50)
    expect(args.orderBy).toEqual({ checkInTime: "asc" })
  })

  it("falls back to the default limit when maxWorkHours is out of range", async () => {
    enableAutoCheckout(999)
    mockedFindMany.mockResolvedValue([])

    await sweepAutoCheckout({ now: new Date("2025-01-15T20:00:00Z") })

    // 12h default, not 999h
    const where = mockedFindMany.mock.calls[0][0].where
    expect(where.checkInTime.lt.toISOString()).toBe("2025-01-15T08:00:00.000Z")
  })
})

describe("maybeSweepAutoCheckout", () => {
  it("throttles a second call made immediately after the first", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockResolvedValue([])

    await maybeSweepAutoCheckout()
    await maybeSweepAutoCheckout()

    expect(mockedFindMany).toHaveBeenCalledTimes(1)
  })

  it("swallows errors so the caller's request still succeeds", async () => {
    enableAutoCheckout(10)
    mockedFindMany.mockRejectedValue(new Error("db down"))
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    await expect(maybeSweepAutoCheckout()).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
