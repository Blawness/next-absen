// app/api/attendance/today/services.test.ts
import { prisma } from "@/lib/prisma"
import { getTodaysAttendance, validateSession } from "./services"
import { getServerSession } from "next-auth"

jest.mock("next-auth")
jest.mock("@/lib/prisma", () => ({
  prisma: {
    absensiRecord: {
      findFirst: jest.fn(),
    },
  },
}))

const mockedGetServerSession = getServerSession as jest.Mock

describe("Today Service", () => {
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

  describe("getTodaysAttendance", () => {
    it("should return the attendance record for today if it exists", async () => {
      const mockRecord = { id: "1", date: new Date() }
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(mockRecord)

      const result = await getTodaysAttendance("user-1")
      expect(result).toEqual(mockRecord)
      expect(prisma.absensiRecord.findFirst).toHaveBeenCalled()
    })

    it("should return null if no attendance record exists for today", async () => {
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(null)
      const result = await getTodaysAttendance("user-1")
      expect(result).toBeNull()
    })
  })
})
