import { validateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

import { HttpError } from "@/lib/errors"

export { HttpError }

export async function getAttendanceHistory(
  userId: string,
  limit: number,
  offset: number
) {
  const attendanceRecords = await prisma.absensiRecord.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      date: 'desc',
    },
    take: limit,
    skip: offset,
  })

  return attendanceRecords.map(record => ({
    id: record.id,
    date: record.date,
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime,
    checkInAddress: record.checkInAddress,
    checkOutAddress: record.checkOutAddress,
    checkInLatitude: record.checkInLatitude,
    checkInLongitude: record.checkInLongitude,
    checkOutLatitude: record.checkOutLatitude,
    checkOutLongitude: record.checkOutLongitude,
    status: record.status,
  }))
}
