import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling, HttpError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { maybeSweepAutoCheckout } from "@/lib/auto-checkout"
import { UserRole, AttendanceStatus, Prisma } from "@prisma/client"

interface ReportsQuery {
  startDate?: string | null
  endDate?: string | null
  userId?: string | null
  department?: string | null
  status?: string | null
}

/**
 * Build the Prisma where clause for reports, enforcing that managers
 * can never escape their department scope — regardless of the userId
 * or department query params they pass.
 *
 * Without this helper, a manager could pass `?userId=<other-dept-user>`
 * and get that user's attendance data (BUG-008 / IDOR). The UI may have
 * a picker, but the API is the security boundary.
 */
async function buildReportsWhereClause(
  session: { user: { id: string; role: UserRole; department?: string | null } },
  query: ReportsQuery
): Promise<Prisma.AbsensiRecordWhereInput> {
  const where: Prisma.AbsensiRecordWhereInput = {}

  if (query.startDate || query.endDate) {
    where.date = {}
    if (query.startDate) where.date.gte = new Date(query.startDate)
    if (query.endDate) where.date.lte = new Date(query.endDate)
  }

  if (query.status) {
    where.status = query.status as AttendanceStatus
  }

  if (session.user.role === UserRole.user) {
    // Regular users can only see their own data — ignore all userId/department params.
    where.userId = session.user.id
    return where
  }

  if (session.user.role === UserRole.manager) {
    // Managers are hard-scoped to their own department.
    const dept = session.user.department
    if (!dept) {
      // Manager with no department: fail closed — see only self.
      where.userId = session.user.id
      return where
    }
    if (query.userId) {
      // Verify the requested user is actually in the manager's department.
      const target = await prisma.user.findUnique({
        where: { id: query.userId },
        select: { department: true, isActive: true },
      })
      if (!target || !target.isActive || target.department !== dept) {
        throw new HttpError("User not in your department", 403)
      }
      where.userId = query.userId
    } else {
      where.user = { department: dept }
    }
    return where
  }

  // Admin / superadmin
  if (query.userId) {
    where.userId = query.userId
  } else if (query.department) {
    where.user = { department: query.department }
  }
  return where
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const userId = searchParams.get('userId')
  const department = searchParams.get('department')
  const status = searchParams.get('status')
  const includeSummary = searchParams.get('includeSummary') === 'true'

  // Reports must not count an unclosed shift as ongoing work.
  await maybeSweepAutoCheckout()

  const whereClause = await buildReportsWhereClause(
    { user: { id: session.user.id, role: session.user.role as UserRole, department: session.user.department } },
    { startDate, endDate, userId, department, status },
  )

  // Get attendance records
  const attendanceRecords = await prisma.absensiRecord.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          department: true,
          position: true,
          email: true
        }
      }
    },
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  // Format the response data
  const records = attendanceRecords.map(record => ({
    id: record.id,
    date: record.date,
    user: record.user,
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime,
    checkInAddress: record.checkInAddress,
    checkOutAddress: record.checkOutAddress,
    workHours: record.workHours,
    overtimeHours: record.overtimeHours,
    lateMinutes: record.lateMinutes,
    status: record.status,
    notes: record.notes,
  }))

  // Generate summary statistics if requested
  let summary = null
  if (includeSummary) {
    const totalRecords = records.length
    const totalUsers = new Set(records.map(r => r.user.id)).size
    const totalWorkHours = records.reduce((sum, r) => sum + (Number(r.workHours) || 0), 0)
    const totalOvertimeHours = records.reduce((sum, r) => sum + Number(r.overtimeHours), 0)

    const statusBreakdown = records.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const departmentBreakdown = records.reduce((acc, record) => {
      const dept = record.user.department || 'Unknown'
      acc[dept] = (acc[dept] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    summary = {
      totalRecords,
      totalUsers,
      totalWorkHours: Number(totalWorkHours.toFixed(2)),
      totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
      averageWorkHours: totalRecords > 0 ? Number((totalWorkHours / totalRecords).toFixed(2)) : 0,
      statusBreakdown,
      departmentBreakdown,
      dateRange: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      }
    }
  }

  return NextResponse.json({
    records,
    summary,
    filters: {
      startDate,
      endDate,
      userId,
      department,
      status
    }
  })
}, "fetching reports data")
