import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { createAttendance, updateAttendance } from "./services"

jest.mock("next-auth")
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    absensiRecord: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    activityLog: { create: jest.fn() },
    systemSettings: {
      findFirst: jest.fn(), // null → project defaults: 08:00-17:00
    },
  },
}))

const mockedSession = getServerSession as jest.Mock
const mockedCreate = prisma.absensiRecord.create as jest.Mock

describe("createAttendance", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedSession.mockResolvedValue({ user: { id: "sa-1", role: "superadmin" } })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1" })
    ;(prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue(null)
    mockedCreate.mockResolvedValue({ id: "rec-1" })
  })

  it("computes work hours and overtime when both times are given", async () => {
    // 08:00-19:30 WIB: 11.5h worked, 2.5h past the 17:00 end.
    await createAttendance({
      userId: "user-1",
      date: "2025-01-15",
      checkInTime: "2025-01-15T08:00:00+07:00",
      checkOutTime: "2025-01-15T19:30:00+07:00",
      status: "present",
    })

    const { data } = mockedCreate.mock.calls[0][0]
    expect(data.workHours).toBe(11.5)
    expect(data.overtimeHours).toBe(2.5)
  })

  it("rounds work hours to the DECIMAL(4,2) column", async () => {
    await createAttendance({
      userId: "user-1",
      date: "2025-01-15",
      checkInTime: "2025-01-15T08:00:00+07:00",
      checkOutTime: "2025-01-15T16:20:00+07:00",
    })

    const { data } = mockedCreate.mock.calls[0][0]
    expect(data.workHours).toBe(8.33)
    expect(data.overtimeHours).toBe(0)
  })

  it("leaves work hours empty when the record has no check-out yet", async () => {
    await createAttendance({
      userId: "user-1",
      date: "2025-01-15",
      checkInTime: "2025-01-15T08:00:00+07:00",
    })

    const { data } = mockedCreate.mock.calls[0][0]
    expect(data.workHours).toBeNull()
    expect(data.overtimeHours).toBe(0)
  })

  it("rejects a check-out before the check-in", async () => {
    await expect(
      createAttendance({
        userId: "user-1",
        date: "2025-01-15",
        checkInTime: "2025-01-15T17:00:00+07:00",
        checkOutTime: "2025-01-15T08:00:00+07:00",
      }),
    ).rejects.toThrow("checkOutTime must be after checkInTime")
    expect(mockedCreate).not.toHaveBeenCalled()
  })
})

describe("updateAttendance", () => {
  const mockedUpdate = prisma.absensiRecord.update as jest.Mock
  const existing = {
    id: "rec-1",
    userId: "user-1",
    user: { id: "user-1", name: "Budi" },
    checkInTime: new Date("2025-01-15T08:00:00+07:00"),
    checkOutTime: new Date("2025-01-15T16:00:00+07:00"),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedSession.mockResolvedValue({ user: { id: "sa-1", role: "superadmin" } })
    ;(prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.absensiRecord.findUnique as jest.Mock).mockResolvedValue(existing)
    mockedUpdate.mockResolvedValue({ id: "rec-1" })
  })

  it("recomputes work hours and overtime against the stored check-in", async () => {
    await updateAttendance({ id: "rec-1", checkOutTime: "2025-01-15T18:00:00+07:00" })

    const { data } = mockedUpdate.mock.calls[0][0]
    expect(data.workHours).toBe(10)
    expect(data.overtimeHours).toBe(1)
  })

  it("empties work hours when the check-out is cleared", async () => {
    await updateAttendance({ id: "rec-1", checkOutTime: null })

    const { data } = mockedUpdate.mock.calls[0][0]
    expect(data.workHours).toBeNull()
    expect(data.overtimeHours).toBe(0)
  })

  it("leaves hours untouched when only the status changes", async () => {
    await updateAttendance({ id: "rec-1", status: "late" })

    const { data } = mockedUpdate.mock.calls[0][0]
    expect(data).not.toHaveProperty("workHours")
    expect(data).not.toHaveProperty("overtimeHours")
  })
})
