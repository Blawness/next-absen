// app/api/attendance/checkout/services.test.ts
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { type AbsensiRecord } from "@prisma/client"
import {
  validateSession,
  validateLocationData,
  getTodaysAttendance,
  processCheckout,
  logCheckoutActivity,
  HttpError,
} from "./services"

// Type definitions for testing
interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  address?: string
}


// Mock dependencies
jest.mock("next-auth")
jest.mock("@/lib/prisma", () => ({
  prisma: {
    absensiRecord: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}))

// Type assertion for the mocked getServerSession
const mockedGetServerSession = getServerSession as jest.Mock

describe("Checkout Service", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  // Since validateSession and validateLocationData are identical to the check-in service,
  // we can reuse the same tests to ensure their functionality here as well.
  describe("validateSession", () => {
    it("should return the session when a valid session exists", async () => {
      const mockSession = { user: { id: "test-user-id" } }
      mockedGetServerSession.mockResolvedValue(mockSession)
      const session = await validateSession()
      expect(session).toEqual(mockSession)
    })

    it("should throw an HttpError when no session is found", async () => {
      mockedGetServerSession.mockResolvedValue(null)
      await expect(validateSession()).rejects.toThrow(
        new HttpError("Unauthorized", 401)
      )
    })
  })

  describe("validateLocationData", () => {
    it("should not throw an error for valid location data", () => {
      const validData = { latitude: 1, longitude: 1, accuracy: 10 }
      expect(() => validateLocationData(validData)).not.toThrow()
    })

    it("should throw an HttpError for missing location data", () => {
      const invalidData = { latitude: 1, longitude: 1 }
      expect(() => validateLocationData(invalidData as Partial<LocationData>)).toThrow(
        new HttpError("Location data is required", 400)
      )
    })
  })

  describe("getTodaysAttendance", () => {
    it("should return the attendance record if the user has checked in but not out", async () => {
      const mockAttendance = {
        id: "att-1",
        checkInTime: new Date(),
        checkOutTime: null,
      }
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(
        mockAttendance
      )
      const result = await getTodaysAttendance("user-1", new Date())
      expect(result).toEqual(mockAttendance)
    })

    it("should throw an error if no attendance record is found", async () => {
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(getTodaysAttendance("user-1", new Date())).rejects.toThrow(
        "Anda belum check-in hari ini"
      )
    })

    it("should throw an error if the user has already checked out", async () => {
      const mockAttendance = {
        id: "att-1",
        checkInTime: new Date(),
        checkOutTime: new Date(),
      }
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(
        mockAttendance
      )
      await expect(getTodaysAttendance("user-1", new Date())).rejects.toThrow(
        "Anda sudah check-out hari ini"
      )
    })

    it("should throw an error if check-in time is missing", async () => {
      const mockAttendance = { id: "att-1", checkInTime: null }
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(
        mockAttendance
      )
      await expect(getTodaysAttendance("user-1", new Date())).rejects.toThrow(
        "Data check-in tidak ditemukan"
      )
    })
  })

  describe("processCheckout", () => {
    it("should update the attendance record with checkout data", async () => {
      const checkInTime = new Date(new Date().getTime() - 8 * 60 * 60 * 1000) // 8 hours ago
      const mockAttendance = { id: "att-1", checkInTime }
      const checkoutData = { latitude: 1, longitude: 1, address: "test", accuracy: 1 }
      const updatedRecord = { ...mockAttendance, checkOutTime: new Date() }
      ;(prisma.absensiRecord.update as jest.Mock).mockResolvedValue(updatedRecord)

      const result = await processCheckout(mockAttendance as AbsensiRecord, checkoutData)

      expect(prisma.absensiRecord.update).toHaveBeenCalled()
      expect(result.checkOutTime).not.toBeNull()
      expect(result).toEqual(updatedRecord)
    })

    it("should throw an error if the database update fails", async () => {
      const mockAttendance = { id: "att-1", checkInTime: new Date() }
      const checkoutData = { latitude: 1, longitude: 1, address: "test", accuracy: 1 }
      ;(prisma.absensiRecord.update as jest.Mock).mockRejectedValue(
        new Error("DB Error")
      )

      await expect(
        processCheckout(mockAttendance as AbsensiRecord, checkoutData)
      ).rejects.toThrow("Gagal melakukan check-out. Silakan coba lagi.")
    })
  })

  describe("logCheckoutActivity", () => {
    it("should create an activity log for the check-out event", async () => {
      const attendance = { id: "att-1", status: "present" } as AbsensiRecord
      const checkoutData = { latitude: 1, longitude: 1, address: "test", accuracy: 1 }

      await logCheckoutActivity("user-1", attendance, checkoutData)

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          action: "check_out",
          resourceType: "absensi_record",
          resourceId: "att-1",
          details: {
            location: checkoutData,
            finalStatus: "present",
          },
        },
      })
    })
  })
})
