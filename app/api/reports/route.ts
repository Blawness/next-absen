import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { maybeSweepAutoCheckout } from "@/lib/auto-checkout"
import { averageWorkHoursPerDay, countReportBusinessDays } from "@/lib/business-days"
import { buildUserAttendanceStats } from "@/lib/attendance-stats"
import { UserRole, AttendanceStatus, Prisma } from "@prisma/client"

interface ReportsQuery {
  startDate?: string | null
  endDate?: string | null
  userId?: string | null
  department?: string | null
  status?: string | null
}

/**
 * Build the Prisma where clause for reports.
 *
 * Regular users are pinned to their own records here. The UI hides the
 * pickers from them, but the API is the security boundary, so any userId
 * or department param they pass is ignored (BUG-008 / IDOR).
 *
 * Managers are deliberately org-wide, same as admins. They used to be
 * hard-scoped to their own department, but `/api/users` fills the employee
 * picker with the whole org, so picking anyone from another department
 * 403'd the whole request and every summary card disappeared. At this
 * company's size a manager reading any employee's attendance is intended,
 * so the two halves now agree on the wider scope rather than the narrower.
 */
export function buildReportsWhereClause(
  session: { user: { id: string; role: UserRole } },
  query: ReportsQuery
): Prisma.AbsensiRecordWhereInput {
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

  // Manager / admin / superadmin
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

  const whereClause = buildReportsWhereClause(
    { user: { id: session.user.id, role: session.user.role as UserRole } },
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

    // Average is per business day per person, matching the dashboard and KPI.
    // Dividing by record count instead would quietly reward absence: fewer
    // records, same hours, higher "average".
    const reportBusinessDays = countReportBusinessDays(
      records.map(r => r.date),
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      new Date(),
    )

    const statusBreakdown = records.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const userBreakdown = buildUserAttendanceStats(records)

    summary = {
      totalRecords,
      totalUsers,
      totalWorkHours: Number(totalWorkHours.toFixed(2)),
      totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
      averageWorkHours: Number(
        averageWorkHoursPerDay(totalWorkHours, reportBusinessDays, totalUsers).toFixed(2)
      ),
      statusBreakdown,
      userBreakdown,
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
