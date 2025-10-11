import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const today = new Date()
    const startToday = startOfDay(today)
    const endToday = endOfDay(today)

    const attendance = await prisma.absensiRecord.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: startToday,
          lte: endToday,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('API /attendance/today debug:', {
      userId: session.user.id,
      today,
      startToday,
      endToday,
      attendance: attendance ? {
        id: attendance.id,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        date: attendance.date
      } : null
    })

    if (!attendance) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      id: attendance.id,
      date: attendance.date,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      checkInLatitude: attendance.checkInLatitude,
      checkInLongitude: attendance.checkInLongitude,
      checkInAddress: attendance.checkInAddress,
      checkInAccuracy: attendance.checkInAccuracy,
      checkOutLatitude: attendance.checkOutLatitude,
      checkOutLongitude: attendance.checkOutLongitude,
      checkOutAddress: attendance.checkOutAddress,
      checkOutAccuracy: attendance.checkOutAccuracy,
      workHours: attendance.workHours,
      overtimeHours: attendance.overtimeHours,
      lateMinutes: attendance.lateMinutes,
      status: attendance.status,
      notes: attendance.notes,
    })
  } catch (error) {
    console.error("Error fetching today's attendance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
