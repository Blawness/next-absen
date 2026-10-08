import { prisma } from "@/lib/prisma"
import { getOfficeDayBounds, toOfficeCalendarDate } from "@/lib/office-time"
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

/**
 * A YYYY-MM-DD string is taken as that calendar date; a full timestamp is
 * read on the office clock. Returns null when the input does not parse.
 */
function parseCalendarDate(input: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const calendarDate = new Date(`${input}T00:00:00.000Z`)
    return isNaN(calendarDate.getTime()) ? null : calendarDate
  }
  const instant = new Date(input)
  return isNaN(instant.getTime()) ? null : toOfficeCalendarDate(instant)
}

function nextDay(calendarDate: Date): Date {
  return new Date(calendarDate.getTime() + 24 * 60 * 60 * 1000)
}

export async function getAttendanceData(
  params: GetAttendanceParams,
  apiKey: ValidatedApiKey
) {
  const { date, dateFrom, dateTo, userId, limit = 50, offset = 0 } = params

  const effectiveLimit = Math.min(Math.max(1, limit), 200)
  const effectiveOffset = Math.max(0, offset)

  const where: Prisma.AbsensiRecordWhereInput = {}

  // `AbsensiRecord.date` is a calendar date pinned to UTC midnight, so the
  // filter is built from calendar dates too: [first day, day after last).
  // date-fns startOfDay/endOfDay would cut the day on the server's clock.
  const day = date ? parseCalendarDate(date) : null
  const from = !date && dateFrom ? parseCalendarDate(dateFrom) : null
  const to = !date && dateTo ? parseCalendarDate(dateTo) : null

  if (day) {
    where.date = { gte: day, lt: nextDay(day) }
  } else if (from || to) {
    where.date = {
      ...(from && { gte: from }),
      ...(to && { lt: nextDay(to) }),
    }
  } else if (!date) {
    const { start, end } = getOfficeDayBounds()
    where.date = { gte: start, lt: end }
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
