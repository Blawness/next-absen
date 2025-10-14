import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function validateSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new HttpError("Unauthorized", 401)
  }

  return session
}

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
