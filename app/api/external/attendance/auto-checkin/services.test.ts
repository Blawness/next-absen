import { prisma } from "@/lib/prisma"
import { reverseGeocode } from "@/lib/location"
import { validateLocationData, autoCheckIn, HttpError } from "./services"
import type { ValidatedApiKey } from "@/app/api/external/utils"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    absensiRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    systemSettings: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("@/lib/location", () => ({
  reverseGeocode: jest.fn(),
}))

const mockApiKey: ValidatedApiKey = {
  id: "key-1",
  prefix: "api_live",
  name: "Test Key",
  scope: "attendance:readwrite",
  createdBy: "admin-1",
}

describe("Auto Check-In Service", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("validateLocationData", () => {
    it("should not throw for valid location data", () => {
      expect(() =>
        validateLocationData({ latitude: 1, longitude: 1, accuracy: 10 })
      ).not.toThrow()
    })

    it("should throw for missing data", () => {
      expect(() =>
        validateLocationData({ latitude: 1, longitude: 1 } as any)
      ).toThrow(HttpError)
    })

    it("should throw for poor accuracy", () => {
      expect(() =>
        validateLocationData({ latitude: 1, longitude: 1, accuracy: 9999 })
      ).toThrow(HttpError)
    })
  })

  describe("autoCheckIn", () => {
    const validInput = {
      userId: "user-1",
      latitude: -6.2088,
      longitude: 106.8456,
      accuracy: 12.5,
      notes: "via QR",
    }

    it("should throw 400 if userId is missing", async () => {
      await expect(
        autoCheckIn({ ...validInput, userId: "" }, mockApiKey)
      ).rejects.toThrow("userId is required")
    })

    it("should throw 404 if user not found", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(autoCheckIn(validInput, mockApiKey)).rejects.toThrow(
        "User not found or inactive"
      )
    })

    it("should throw 404 if user is inactive", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        isActive: false,
      })

      await expect(autoCheckIn(validInput, mockApiKey)).rejects.toThrow(
        "User not found or inactive"
      )
    })

    it("should throw 409 if attendance exists today", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        isActive: true,
      })
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue({
        id: "rec-1",
      })

      await expect(autoCheckIn(validInput, mockApiKey)).rejects.toThrow(
        "Attendance already exists for today"
      )
    })

    it("should create attendance record and return data", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        isActive: true,
      })
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(null)
      ;(reverseGeocode as jest.Mock).mockResolvedValue("Jl. Sudirman, Jakarta")
      ;(prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.absensiRecord.create as jest.Mock).mockResolvedValue({
        id: "rec-1",
        checkInTime: new Date("2026-05-05T08:00:00Z"),
        checkOutTime: new Date("2026-05-05T16:00:00Z"),
        workHours: { toString: () => "8.00" },
        status: "present",
        checkInAddress: "Jl. Sudirman, Jakarta",
      })
      ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

      const result = await autoCheckIn(validInput, mockApiKey)

      expect(result.id).toBe("rec-1")
      expect(prisma.absensiRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            workHours: 8.00,
          }),
        })
      )
      expect(prisma.activityLog.create).toHaveBeenCalled()
    })

    it("should mark check-in as 'late' when after grace period", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        isActive: true,
      })
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(null)
      ;(reverseGeocode as jest.Mock).mockResolvedValue("Test Address")
      // Pretend business hours start at 09:00 with 5 min grace, but the
      // system clock says it's 23:30 — well past grace. We patch
      // Date.now() to be deterministic.
      ;(prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue({
        businessHours: {
          startTime: "09:00",
          endTime: "17:00",
          checkInDeadline: "10:00",
          gracePeriodMinutes: 5,
        },
      })
      ;(prisma.absensiRecord.create as jest.Mock).mockResolvedValue({
        id: "rec-late",
        checkInTime: new Date(),
        checkOutTime: new Date(),
        workHours: { toString: () => "8.00" },
        status: "late",
        checkInAddress: "Test Address",
      })
      ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

      // Force "now" to be 23:30 local so computeLateStatus returns late.
      const fakeNow = new Date()
      fakeNow.setHours(23, 30, 0, 0)
      const dateSpy = jest.spyOn(Date, "now").mockReturnValue(fakeNow.getTime())

      try {
        await autoCheckIn(validInput, mockApiKey)
        expect(prisma.absensiRecord.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: "late",
              lateMinutes: expect.any(Number),
            }),
          })
        )
      } finally {
        dateSpy.mockRestore()
      }
    })

    it("should handle P2002 unique constraint race condition", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        isActive: true,
      })
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(null)
      ;(reverseGeocode as jest.Mock).mockResolvedValue("Test Address")
      ;(prisma.absensiRecord.create as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Unique constraint"), { code: "P2002" })
      )
      ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

      await expect(autoCheckIn(validInput, mockApiKey)).rejects.toThrow(
        "Attendance already exists for today"
      )
    })
  })
})
