import { type AbsensiRecord, Prisma, AttendanceStatus } from "@prisma/client"
import { validateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { HttpError } from "@/lib/errors"
import { getUtcDayBounds } from "@/lib/date-bounds"
import { validateGeofence } from "@/lib/geofence"
import { getBusinessHoursConfig, computeLateStatus } from "@/lib/business-hours"

export { HttpError }

export async function logCheckInActivity(
  userId: string,
  attendance: AbsensiRecord,
  checkInData: CheckInData
) {
  await prisma.activityLog.create({
    data: {
      userId,
      action: "check_in",
      resourceType: "absensi_record",
      resourceId: attendance.id,
      details: {
        location: checkInData,
        status: attendance.status,
      } as unknown as Prisma.InputJsonValue,
    },
  })
}

export function validateLocationData(body: {
  latitude?: number
  longitude?: number
  accuracy?: number
}) {
  const { latitude, longitude, accuracy } = body

  if (latitude === undefined || longitude === undefined || accuracy === undefined) {
    throw new HttpError("Location data is required", 400)
  }

  // GPS accuracy validation relaxed for testing - using 5000 meters threshold
  if (accuracy > 5000) {
    throw new HttpError(
      "Akurasi GPS tidak mencukupi. Pastikan GPS aktif dan akurat.",
      400
    )
  }
}

export async function getExistingAttendance(userId: string, date: Date) {
  const { start, end } = getUtcDayBounds(date)

  const existingAttendance = await prisma.absensiRecord.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lt: end,
      },
    },
  })

  if (existingAttendance?.checkInTime) {
    throw new HttpError("Anda sudah check-in hari ini", 400)
  }

  return existingAttendance
}

export interface CheckInData {
  latitude: number
  longitude: number
  address: string
  accuracy: number
}

/**
 * Resolve the late/present status for a check-in based on configured
 * business hours. Wraps `computeLateStatus` so the check-in route stays
 * short.
 */
export async function resolveCheckInStatus(now: Date = new Date()): Promise<{
  lateMinutes: number
  status: AttendanceStatus
}> {
  const config = await getBusinessHoursConfig()
  const { lateMinutes, status } = computeLateStatus(now, config)
  return { lateMinutes, status }
}

/**
 * Atomically create or update today's attendance record.
 *
 * Race-safety: two concurrent requests can both pass the "no existing
 * check-in" check, but only one will succeed in writing. We rely on
 * Prisma's unique constraint `@@unique([userId, date])` and let the
 * P2002 error decide the winner — no application-level locking needed.
 */
export async function createOrUpdateAttendance(
  userId: string,
  checkInData: CheckInData,
  existingAttendance: AbsensiRecord | null,
  lateMinutes: number,
  status: AttendanceStatus
) {
  const now = new Date()
  const { start, end } = getUtcDayBounds(now)

  const attendanceData = {
    userId,
    date: start,
    checkInTime: now,
    checkInLatitude: checkInData.latitude,
    checkInLongitude: checkInData.longitude,
    checkInAddress: checkInData.address,
    checkInAccuracy: checkInData.accuracy,
    lateMinutes,
    status,
  }

  try {
    if (existingAttendance) {
      return await prisma.absensiRecord.update({
        where: { id: existingAttendance.id },
        data: attendanceData,
      })
    } else {
      return await prisma.absensiRecord.create({
        data: attendanceData,
      })
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      // Race: another concurrent request already created today's record.
      throw new HttpError("Anda sudah check-in hari ini", 400)
    }
    throw error
  }
}

/**
 * Verify the user's location is inside the configured office geofence.
 * Throws 403 if outside. Returns silently when geofence isn't configured.
 */
export async function enforceGeofence(checkInData: CheckInData) {
  const result = await validateGeofence({
    latitude: checkInData.latitude,
    longitude: checkInData.longitude,
    accuracy: checkInData.accuracy,
    timestamp: new Date(),
  })
  if (result.withinGeofence === false) {
    const distanceStr =
      result.distance != null ? ` (${Math.round(result.distance)}m dari kantor)` : ""
    throw new HttpError(
      `Anda berada di luar area kantor${distanceStr}. Check-in tidak diizinkan.`,
      403,
    )
  }
}
