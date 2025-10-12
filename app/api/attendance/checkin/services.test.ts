// app/api/attendance/checkin/services.test.ts
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import {
  validateSession,
  validateLocationData,
  getExistingAttendance,
  createOrUpdateAttendance,
  logCheckInActivity,
  HttpError,
} from "./services"

// Type definitions for testing
interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  address?: string
}

interface AttendanceRecord {
  id: string
  checkInTime?: Date
  checkOutTime?: Date
  status: string
}

// Mock dependencies
jest.mock("next-auth")
jest.mock("@/lib/prisma", () => ({
  prisma: {
    absensiRecord: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}))

// Type assertion for the mocked getServerSession
const mockedGetServerSession = getServerSession as jest.Mock

describe("Check-in Service", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("validateSession", () => {
    it("should return the session when a valid session exists", async () => {
      const mockSession = { user: { id: "test-user-id" } }
      mockedGetServerSession.mockResolvedValue(mockSession)

      const session = await validateSession()
      expect(session).toEqual(mockSession)
      expect(getServerSession).toHaveBeenCalled()
    })

    it("should throw an HttpError when no session is found", async () => {
      mockedGetServerSession.mockResolvedValue(null)

      await expect(validateSession()).rejects.toThrow(HttpError)
      await expect(validateSession()).rejects.toMatchObject({
        message: "Unauthorized",
        status: 401,
      })
    })

    it("should throw an HttpError when session exists but user id is missing", async () => {
      const mockSession = { user: {} }
      mockedGetServerSession.mockResolvedValue(mockSession)

      await expect(validateSession()).rejects.toThrow(HttpError)
    })
  })

  describe("validateLocationData", () => {
    it("should not throw an error for valid location data", () => {
      const validData = { latitude: 1, longitude: 1, accuracy: 10 }
      expect(() => validateLocationData(validData)).not.toThrow()
    })

    it("should throw an HttpError for missing location data", () => {
      const invalidData = { latitude: 1, longitude: 1 }
      expect(() => validateLocationData(invalidData as Partial<LocationData>)).toThrow(HttpError)
      expect(() => validateLocationData(invalidData as Partial<LocationData>)).toThrow("Location data is required")
    })

    it("should throw an HttpError for inaccurate GPS data", () => {
      const inaccurateData = { latitude: 1, longitude: 1, accuracy: 9999 }
      expect(() => validateLocationData(inaccurateData)).toThrow(HttpError)
      expect(() => validateLocationData(inaccurateData)).toThrow(
        "Akurasi GPS tidak mencukupi. Pastikan GPS aktif dan akurat."
      )
    })
  })

  describe("getExistingAttendance", () => {
    it("should return null when no attendance exists for the day", async () => {
      (prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(null)
      const result = await getExistingAttendance("user-1", new Date())
      expect(result).toBeNull()
    })

    it("should throw an error if the user has already checked in", async () => {
      const existingRecord = { id: "att-1", checkInTime: new Date() }
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(existingRecord)
      await expect(getExistingAttendance("user-1", new Date())).rejects.toThrow(
        "Anda sudah check-in hari ini"
      )
    })

    it("should return the attendance record if it exists but the user has not checked in", async () => {
      const existingRecord = { id: "att-1", checkInTime: null }
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(existingRecord)
      const result = await getExistingAttendance("user-1", new Date())
      expect(result).toEqual(existingRecord)
    })
  })

  describe("createOrUpdateAttendance", () => {
    const checkInData = { latitude: 1, longitude: 1, address: "test", accuracy: 1 }

    it("should create a new attendance record if none exists", async () => {
      const newRecord = { id: "new-att-1" }
      ;(prisma.absensiRecord.create as jest.Mock).mockResolvedValue(newRecord)

      const result = await createOrUpdateAttendance("user-1", checkInData, null)
      expect(prisma.absensiRecord.create).toHaveBeenCalled()
      expect(prisma.absensiRecord.update).not.toHaveBeenCalled()
      expect(result).toEqual(newRecord)
    })

    it("should update an existing attendance record", async () => {
      const existingRecord = { id: "att-1" }
      const updatedRecord = { id: "att-1", checkInTime: new Date() }
      ;(prisma.absensiRecord.update as jest.Mock).mockResolvedValue(updatedRecord)

      const result = await createOrUpdateAttendance(
        "user-1",
        checkInData,
        existingRecord as AttendanceRecord
      )
      expect(prisma.absensiRecord.update).toHaveBeenCalled()
      expect(prisma.absensiRecord.create).not.toHaveBeenCalled()
      expect(result).toEqual(updatedRecord)
    })
  })

  describe("logCheckInActivity", () => {
    it("should create an activity log for the check-in event", async () => {
      const attendance = { id: "att-1", status: "present" } as AttendanceRecord
      const checkInData = { latitude: 1, longitude: 1, address: "test", accuracy: 1 }

      await logCheckInActivity("user-1", attendance, checkInData)

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          action: "check_in",
          resourceType: "absensi_record",
          resourceId: "att-1",
          details: {
            location: checkInData,
            status: "present",
          },
        },
      })
    })
  })
})
