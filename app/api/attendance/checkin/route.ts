import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, isWithinInterval } from "date-fns"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { latitude, longitude, address, accuracy } = body

    if (!latitude || !longitude || !accuracy) {
      return NextResponse.json(
        { error: "Location data is required" },
        { status: 400 }
      )
    }

    // Check if accuracy is acceptable (within 10 meters)
    if (accuracy > 10) {
      return NextResponse.json(
        { error: "Akurasi GPS tidak mencukupi. Pastikan GPS aktif dan akurat." },
        { status: 400 }
      )
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Check if user already checked in today
    const existingAttendance = await prisma.absensiRecord.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    })

    if (existingAttendance?.checkInTime) {
      return NextResponse.json(
        { error: "Anda sudah check-in hari ini" },
        { status: 400 }
      )
    }

    // Check if within allowed check-in time (6:00 - 10:00)
    const checkInStart = new Date(today.getTime() + 6 * 60 * 60 * 1000) // 6:00
    const checkInEnd = new Date(today.getTime() + 10 * 60 * 60 * 1000) // 10:00

    if (!isWithinInterval(now, { start: checkInStart, end: checkInEnd })) {
      return NextResponse.json(
        { error: "Check-in hanya dapat dilakukan antara pukul 06:00 - 10:00" },
        { status: 400 }
      )
    }

    // Calculate late minutes (if after 8:00)
    const expectedCheckIn = new Date(today.getTime() + 8 * 60 * 60 * 1000) // 8:00
    const lateMinutes = now > expectedCheckIn
      ? Math.floor((now.getTime() - expectedCheckIn.getTime()) / (1000 * 60))
      : 0

    // Determine status based on check-in time
    let status = "present" as const
    if (lateMinutes > 15) {
      status = "late"
    }

    // Create or update attendance record
    const attendanceData = {
      userId: session.user.id,
      date: today,
      checkInTime: now,
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      checkInAddress: address,
      checkInAccuracy: accuracy,
      lateMinutes,
      status,
    }

    let attendance
    if (existingAttendance) {
      // Update existing record
      attendance = await prisma.absensiRecord.update({
        where: { id: existingAttendance.id },
        data: attendanceData,
      })
    } else {
      // Create new record
      attendance = await prisma.absensiRecord.create({
        data: attendanceData,
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "check_in",
        resourceType: "absensi_record",
        resourceId: attendance.id,
        details: {
          location: { latitude, longitude, address, accuracy },
          lateMinutes,
          status,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Check-in berhasil",
      attendance: {
        id: attendance.id,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
      },
    })
  } catch (error) {
    console.error("Error during check-in:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
