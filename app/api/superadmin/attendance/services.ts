import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { HttpError } from "@/lib/errors"
import { hasPermission, Permission } from "@/lib/permissions"

async function checkPermission() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new HttpError("Unauthorized", 401)
  }
  if (!hasPermission(session.user.role, Permission.ABSENSI_MANAGE)) {
    throw new HttpError("Forbidden", 403)
  }
  return session
}

async function logManageActivity(
  superadminId: string,
  action: string,
  details: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: {
      userId: superadminId,
      action: "MANAGE_ATTENDANCE",
      resourceType: "absensi_record",
      resourceId: (details.recordId as string) ?? undefined,
      details: details as Prisma.InputJsonValue,
    },
  })
}

export interface ListAttendanceParams {
  userId?: string
  dateFrom?: string
  dateTo?: string
  status?: string
  page?: number
  limit?: number
}

export async function listAttendance(params: ListAttendanceParams) {
  await checkPermission()

  const { userId, dateFrom, dateTo, status, page = 1, limit = 20 } = params
  const where: Record<string, unknown> = {}

  if (userId) {
    where.userId = userId
  }
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom)
    if (dateTo) (where.date as Record<string, Date>).lte = new Date(dateTo)
  }
  if (status) {
    where.status = status
  }

  const [data, total] = await Promise.all([
    prisma.absensiRecord.findMany({
      where: where as any,
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.absensiRecord.count({ where: where as any }),
  ])

  const records = data.map((r) => ({
    ...r,
    workHours: r.workHours ? Number(r.workHours) : null,
    overtimeHours: Number(r.overtimeHours),
    checkInLatitude: r.checkInLatitude ? Number(r.checkInLatitude) : null,
    checkInLongitude: r.checkInLongitude ? Number(r.checkInLongitude) : null,
    checkInAccuracy: r.checkInAccuracy ? Number(r.checkInAccuracy) : null,
    checkOutLatitude: r.checkOutLatitude ? Number(r.checkOutLatitude) : null,
    checkOutLongitude: r.checkOutLongitude ? Number(r.checkOutLongitude) : null,
    checkOutAccuracy: r.checkOutAccuracy ? Number(r.checkOutAccuracy) : null,
  }))

  return { data: records, total, page, limit }
}

export interface CreateAttendanceData {
  userId: string
  date: string
  checkInTime?: string
  checkOutTime?: string
  status?: string
  notes?: string
}

export async function createAttendance(data: CreateAttendanceData) {
  const session = await checkPermission()

  const user = await prisma.user.findUnique({ where: { id: data.userId } })
  if (!user) {
    throw new HttpError("User not found", 404)
  }

  const dateObj = new Date(data.date)
  if (isNaN(dateObj.getTime())) {
    throw new HttpError("Invalid date format", 400)
  }

  const checkInTime = data.checkInTime ? new Date(data.checkInTime) : null
  const checkOutTime = data.checkOutTime ? new Date(data.checkOutTime) : null

  if (checkInTime && isNaN(checkInTime.getTime())) {
    throw new HttpError("Invalid checkInTime format", 400)
  }
  if (checkOutTime && isNaN(checkOutTime.getTime())) {
    throw new HttpError("Invalid checkOutTime format", 400)
  }
  if (checkInTime && checkOutTime && checkOutTime <= checkInTime) {
    throw new HttpError("checkOutTime must be after checkInTime", 400)
  }

  try {
    const record = await prisma.absensiRecord.create({
      data: {
        userId: data.userId,
        date: dateObj,
        checkInTime,
        checkOutTime,
        status: (data.status as any) ?? "absent",
        notes: data.notes ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    await logManageActivity(session.user.id, "create", {
      type: "create",
      recordId: record.id,
      targetUserId: data.userId,
    })

    return record
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as any).code === "P2002") {
      throw new HttpError("Attendance record for this user and date already exists", 409)
    }
    throw error
  }
}

export interface UpdateAttendanceData {
  id: string
  checkInTime?: string | null
  checkOutTime?: string | null
  status?: string
  notes?: string | null
}

export async function updateAttendance(data: UpdateAttendanceData) {
  const session = await checkPermission()

  const existing = await prisma.absensiRecord.findUnique({
    where: { id: data.id },
    include: { user: { select: { id: true, name: true } } },
  })
  if (!existing) {
    throw new HttpError("Attendance record not found", 404)
  }

  const updateData: Record<string, unknown> = {}
  const changes: Record<string, unknown> = {}

  if (data.checkInTime !== undefined) {
    updateData.checkInTime = data.checkInTime ? new Date(data.checkInTime) : null
    changes.checkInTime = data.checkInTime
  }
  if (data.checkOutTime !== undefined) {
    updateData.checkOutTime = data.checkOutTime ? new Date(data.checkOutTime) : null
    changes.checkOutTime = data.checkOutTime
  }
  if (data.status !== undefined) {
    updateData.status = data.status
    changes.status = data.status
  }
  if (data.notes !== undefined) {
    updateData.notes = data.notes
    changes.notes = data.notes
  }

  if (Object.keys(updateData).length === 0) {
    throw new HttpError("No fields to update", 400)
  }

  // Recalculate workHours whenever checkIn or checkOut is touched.
  // Resolve the final values by merging incoming changes over existing record.
  const finalCheckIn = "checkInTime" in updateData
    ? (updateData.checkInTime as Date | null)
    : existing.checkInTime
  const finalCheckOut = "checkOutTime" in updateData
    ? (updateData.checkOutTime as Date | null)
    : existing.checkOutTime

  if (finalCheckIn && finalCheckOut) {
    updateData.workHours = (finalCheckOut.getTime() - finalCheckIn.getTime()) / (1000 * 60 * 60)
  } else if ("checkInTime" in updateData || "checkOutTime" in updateData) {
    // One of them was cleared — work hours can no longer be computed
    updateData.workHours = null
  }

  const record = await prisma.absensiRecord.update({
    where: { id: data.id },
    data: updateData as any,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  await logManageActivity(session.user.id, "update", {
    type: "update",
    recordId: record.id,
    targetUserId: existing.userId,
    targetUserName: existing.user.name,
    changes,
  })

  return record
}

export async function deleteAttendance(id: string) {
  const session = await checkPermission()

  const existing = await prisma.absensiRecord.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  })
  if (!existing) {
    throw new HttpError("Attendance record not found", 404)
  }

  await prisma.absensiRecord.delete({ where: { id } })

  await logManageActivity(session.user.id, "delete", {
    type: "delete",
    recordId: id,
    targetUserId: existing.userId,
    targetUserName: existing.user.name,
    deletedRecord: {
      date: existing.date,
      checkInTime: existing.checkInTime,
      checkOutTime: existing.checkOutTime,
    },
  })

  return { success: true }
}

export async function getUsers() {
  await checkPermission()
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, department: true },
    orderBy: { name: "asc" },
  })
}
