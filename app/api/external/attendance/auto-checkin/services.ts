import { prisma } from "@/lib/prisma"
import { reverseGeocode } from "@/lib/location"
import { HttpError } from "@/lib/errors"
import { startOfDay, endOfDay } from "date-fns"
import { Prisma } from "@prisma/client"
import type { ValidatedApiKey } from "@/app/api/external/utils"

export { HttpError }

export interface AutoCheckInInput {
  userId: string
  latitude: number
  longitude: number
  accuracy: number
  notes?: string
}

export function validateLocationData(body: {
  latitude?: number
  longitude?: number
  accuracy?: number
}) {
  const { latitude, longitude, accuracy } = body

  if (latitude === undefined || longitude === undefined || accuracy === undefined) {
    throw new HttpError("Location data is required (latitude, longitude, accuracy)", 400)
  }

  if (accuracy > 5000) {
    throw new HttpError(
      "Akurasi GPS tidak mencukupi. Pastikan GPS aktif dan akurat.",
      400
    )
  }
}

export async function autoCheckIn(input: AutoCheckInInput, apiKey: ValidatedApiKey) {
  const { userId, latitude, longitude, accuracy, notes } = input

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || !user.isActive) {
    throw new HttpError("User not found or inactive", 404)
  }

  const now = new Date()
  const existing = await prisma.absensiRecord.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay(now),
        lte: endOfDay(now),
      },
    },
  })

  if (existing) {
    throw new HttpError("Attendance already exists for today", 409)
  }

  const address = await reverseGeocode(latitude, longitude)

  const checkInTime = now
  const checkOutTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const status = "present" as const

  const attendance = await prisma.absensiRecord.create({
    data: {
      userId,
      date: now,
      checkInTime,
      checkOutTime,
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      checkInAddress: address,
      checkInAccuracy: accuracy,
      workHours: 8.00,
      overtimeHours: 0.00,
      lateMinutes: 0,
      status,
      notes: notes ?? null,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: apiKey.createdBy,
      action: "EXTERNAL_API_AUTO_CHECKIN",
      resourceType: "absensi_record",
      resourceId: attendance.id,
      details: {
        apiKeyId: apiKey.id,
        prefix: apiKey.prefix,
        endpoint: "POST /api/external/attendance/auto-checkin",
        attendanceUserId: userId,
      } as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    id: attendance.id,
    checkInTime: attendance.checkInTime,
    checkOutTime: attendance.checkOutTime,
    workHours: attendance.workHours?.toString() ?? "8.00",
    status: attendance.status,
    checkInAddress: attendance.checkInAddress,
  }
}
