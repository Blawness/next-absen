// app/api/attendance/history/services.test.ts
import { prisma } from "@/lib/prisma"
import { getAttendanceHistory, validateSession } from "./services"
import { getServerSession } from "next-auth"

jest.mock("next-auth")
jest.mock("@/lib/prisma", () => ({
  prisma: {
    absensiRecord: {
      findMany: jest.fn(),
    },
  },
}))

const mockedGetServerSession = getServerSession as jest.Mock

describe("History Service", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("validateSession", () => {
    it("should return the session when a valid session exists", async () => {
      const mockSession = { user: { id: "test-user-id" } }
      mockedGetServerSession.mockResolvedValue(mockSession)
      const session = await validateSession()
      expect(session).toEqual(mockSession)
    })
  })

  describe("getAttendanceHistory", () => {
    it("should return a list of formatted attendance records", async () => {
      const mockRecords = [
        {
          id: "1",
          date: new Date(),
          checkInTime: new Date(),
          checkOutTime: new Date(),
          checkInAddress: "123 Main St",
          checkOutAddress: "123 Main St",
          status: "present",
        },
      ]
      ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue(mockRecords)

      const result = await getAttendanceHistory("user-1", 10, 0)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: "1",
        date: expect.any(Date),
        checkInTime: expect.any(Date),
        checkOutTime: expect.any(Date),
        checkInAddress: "123 Main St",
        checkOutAddress: "123 Main St",
        status: "present",
      })
      expect(prisma.absensiRecord.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { date: "desc" },
        take: 10,
        skip: 0,
      })
    })

    it("should return an empty array when no records are found", async () => {
      ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue([])
      const result = await getAttendanceHistory("user-1", 10, 0)
      expect(result).toEqual([])
    })
  })
})
