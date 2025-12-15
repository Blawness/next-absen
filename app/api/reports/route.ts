import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, AttendanceStatus } from "@prisma/client"

interface WhereClause {
  date?: { gte?: Date; lte?: Date }
  userId?: string | { in: string[] }
  department?: string
  status?: AttendanceStatus
}

export async function GET(request: NextRequest) {
  try {
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

    // Build where clause based on user role and filters
    // eslint-disable-next-line prefer-const
    let whereClause: WhereClause = {}

    // Date range filter
    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) {
        whereClause.date.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate)
      }
    }

    // User-based filtering based on role
    if (session.user.role === UserRole.user) {
      // Regular users can only see their own data
      whereClause.userId = session.user.id
    } else if (session.user.role === UserRole.manager) {
      // Managers can see their department data
      if (userId) {
        whereClause.userId = userId
      } else {
        // Get all users in manager's department
        const manager = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { department: true }
        })

        if (manager?.department) {
          const departmentUsers = await prisma.user.findMany({
            where: { department: manager.department },
            select: { id: true }
          })
          whereClause.userId = {
            in: departmentUsers.map(u => u.id)
          }
        } else {
          // Fallback: if manager has no department, only show their own records
          console.warn(`Manager ${session.user.id} has no department assigned, showing only their own records`)
          whereClause.userId = session.user.id
        }
      }
    }
    // Admins can see all data, additional filters applied

    // Additional filters
    if (userId) {
      whereClause.userId = userId
    }

    if (department) {
      const departmentUsers = await prisma.user.findMany({
        where: { department },
        select: { id: true }
      })
      whereClause.userId = {
        in: departmentUsers.map(u => u.id)
      }
    }

    if (status) {
      whereClause.status = status as AttendanceStatus
    }

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

      // Status breakdown
      const statusBreakdown = records.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Department breakdown
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
  } catch (error) {
    console.error("Error fetching reports data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
