import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"
import { Prisma } from "@prisma/client"
import type { ValidatedApiKey } from "@/app/api/external/utils"

export interface GetAttendanceParams {
  date?: string
  dateFrom?: string
  dateTo?: string
  userId?: string
  limit?: number
  offset?: number
}

export async function getAttendanceData(
  params: GetAttendanceParams,
  apiKey: ValidatedApiKey
) {
  const { date, dateFrom, dateTo, userId, limit = 50, offset = 0 } = params

  const effectiveLimit = Math.min(Math.max(1, limit), 200)
  const effectiveOffset = Math.max(0, offset)

  const where: Prisma.AbsensiRecordWhereInput = {}

  if (date) {
    const d = new Date(date)
    if (!isNaN(d.getTime())) {
      where.date = {
        gte: startOfDay(d),
        lte: endOfDay(d),
      }
    }
  } else {
    const dateFilter: { gte?: Date; lte?: Date } = {}

    if (dateFrom) {
      const from = new Date(dateFrom)
      if (!isNaN(from.getTime())) {
        dateFilter.gte = startOfDay(from)
      }
    }
    if (dateTo) {
      const to = new Date(dateTo)
      if (!isNaN(to.getTime())) {
        dateFilter.lte = endOfDay(to)
      }
    }

    if (dateFilter.gte || dateFilter.lte) {
      where.date = dateFilter
    } else {
      const today = new Date()
      where.date = {
        gte: startOfDay(today),
        lte: endOfDay(today),
      }
    }
  }

  if (userId) {
    where.userId = userId
  }

  const [total, records] = await Promise.all([
    prisma.absensiRecord.count({ where }),
    prisma.absensiRecord.findMany({
      where,
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { date: "desc" },
      take: effectiveLimit,
      skip: effectiveOffset,
    }),
  ])

  await prisma.activityLog.create({
    data: {
      userId: apiKey.createdBy,
      action: "EXTERNAL_API_READ_ATTENDANCE",
      resourceType: "absensi_record",
      resourceId: "batch",
      details: {
        apiKeyId: apiKey.id,
        prefix: apiKey.prefix,
        endpoint: "GET /api/external/attendance",
        filters: { date, dateFrom, dateTo, userId },
      } as unknown as Prisma.InputJsonValue,
    },
  })

  const data = records.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    date: r.date,
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    checkInLatitude: r.checkInLatitude,
    checkInLongitude: r.checkInLongitude,
    checkInAddress: r.checkInAddress,
    checkOutLatitude: r.checkOutLatitude,
    checkOutLongitude: r.checkOutLongitude,
    checkOutAddress: r.checkOutAddress,
    workHours: r.workHours?.toString() ?? null,
    overtimeHours: r.overtimeHours?.toString() ?? "0.00",
    lateMinutes: r.lateMinutes,
    status: r.status,
  }))

  return {
    data,
    pagination: {
      total,
      limit: effectiveLimit,
      offset: effectiveOffset,
    },
  }
}
