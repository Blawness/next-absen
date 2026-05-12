import { prisma } from "@/lib/prisma"
import { getAttendanceData } from "./services"
import type { ValidatedApiKey } from "@/app/api/external/utils"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    absensiRecord: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}))

const mockApiKey: ValidatedApiKey = {
  id: "key-1",
  prefix: "api_live",
  name: "Test Key",
  scope: "attendance:readwrite",
  createdBy: "admin-1",
}

describe("getAttendanceData", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockRecord = {
    id: "rec-1",
    userId: "user-1",
    user: { name: "John Doe" },
    date: new Date("2026-05-05"),
    checkInTime: new Date("2026-05-05T08:00:00Z"),
    checkOutTime: new Date("2026-05-05T16:00:00Z"),
    checkInLatitude: { toString: () => "-6.20880000" },
    checkInLongitude: { toString: () => "106.84560000" },
    checkInAddress: "Jl. Sudirman",
    checkOutLatitude: null,
    checkOutLongitude: null,
    checkOutAddress: null,
    workHours: { toString: () => "8.00" },
    overtimeHours: { toString: () => "0.00" },
    lateMinutes: 0,
    status: "present",
  }

  it("should return paginated attendance data", async () => {
    ;(prisma.absensiRecord.count as jest.Mock).mockResolvedValue(1)
    ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue([mockRecord])
    ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

    const result = await getAttendanceData({}, mockApiKey)

    expect(result.data).toHaveLength(1)
    expect(result.data[0].userName).toBe("John Doe")
    expect(result.pagination.total).toBe(1)
    expect(result.pagination.limit).toBe(50)
    expect(result.pagination.offset).toBe(0)
    expect(prisma.absensiRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { user: { select: { name: true } } },
      })
    )
  })

  it("should enforce max limit of 200", async () => {
    ;(prisma.absensiRecord.count as jest.Mock).mockResolvedValue(0)
    ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

    const result = await getAttendanceData({ limit: 500 }, mockApiKey)

    expect(result.pagination.limit).toBe(200)
  })

  it("should filter by date param", async () => {
    ;(prisma.absensiRecord.count as jest.Mock).mockResolvedValue(0)
    ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

    await getAttendanceData({ date: "2026-05-05" }, mockApiKey)

    expect(prisma.absensiRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.any(Object),
        }),
      })
    )
  })

  it("should filter by userId", async () => {
    ;(prisma.absensiRecord.count as jest.Mock).mockResolvedValue(0)
    ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

    await getAttendanceData({ userId: "user-1" }, mockApiKey)

    expect(prisma.absensiRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      })
    )
  })
})
