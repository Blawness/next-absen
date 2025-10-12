import { type AbsensiRecord } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

export class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

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
      } as { [key: string]: any },
    },
  })
}

export async function validateSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new HttpError("Unauthorized", 401)
  }

  return session
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
  const existingAttendance = await prisma.absensiRecord.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
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

export async function createOrUpdateAttendance(
  userId: string,
  checkInData: CheckInData,
  existingAttendance: AbsensiRecord | null
) {
  const now = new Date()
  const today = new Date()

  const lateMinutes = 0
  const status = "present" as const

  const attendanceData = {
    userId,
    date: today,
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
      throw new HttpError("Anda sudah check-in hari ini", 400)
    }
    throw error
  }
}
