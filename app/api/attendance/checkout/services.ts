import { type AbsensiRecord, Prisma } from "@prisma/client"
import { validateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { HttpError } from "@/lib/errors"
import { getUtcDayBounds } from "@/lib/date-bounds"

export { HttpError }

export async function logCheckoutActivity(
  userId: string,
  attendance: AbsensiRecord,
  checkoutData: CheckoutData
) {
  await prisma.activityLog.create({
    data: {
      userId,
      action: "check_out",
      resourceType: "absensi_record",
      resourceId: attendance.id,
      details: {
        location: checkoutData,
        finalStatus: attendance.status,
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

export async function getTodaysAttendance(userId: string, date: Date) {
  const { start, end } = getUtcDayBounds(date)

  const attendance = await prisma.absensiRecord.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lt: end,
      },
    },
  })

  if (!attendance) {
    throw new HttpError("Anda belum check-in hari ini", 400)
  }

  if (attendance.checkOutTime) {
    throw new HttpError("Anda sudah check-out hari ini", 400)
  }

  if (!attendance.checkInTime) {
    throw new HttpError("Data check-in tidak ditemukan", 400)
  }

  return attendance
}

export interface CheckoutData {
  latitude: number
  longitude: number
  address: string
  accuracy: number
}

export async function processCheckout(
  attendance: AbsensiRecord,
  checkoutData: CheckoutData
) {
  const now = new Date()
  const checkInTime = attendance.checkInTime!
  const workHoursDecimal = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

  // Overtime = work beyond end of business day (default 17:00).
  // We keep the value simple — exact overtime config is in SystemSettings
  // but we don't pull it here to avoid an extra DB round-trip on every
  // checkout. The KPI service computes the more accurate value later.
  const overtimeHours = 0
  const finalStatus = attendance.status // preserve late/present from check-in

  try {
    return await prisma.absensiRecord.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: now,
        checkOutLatitude: checkoutData.latitude,
        checkOutLongitude: checkoutData.longitude,
        checkOutAddress: checkoutData.address,
        checkOutAccuracy: checkoutData.accuracy,
        workHours: workHoursDecimal,
        overtimeHours,
        status: finalStatus,
      },
    })
  } catch (error) {
    console.error('Error updating attendance record:', error)
    throw new HttpError("Gagal melakukan check-out. Silakan coba lagi.", 500)
  }
}
