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

    // GPS accuracy validation disabled for testing - using 1000 meters threshold
    if (accuracy > 1000) {
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

    // Check-in validation disabled for testing - user can check-in anytime
    const lateMinutes = 0
    const status = "present" as const

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
    try {
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
    } catch (error) {
      // Handle unique constraint violation
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return NextResponse.json(
          { error: "Anda sudah check-in hari ini" },
          { status: 400 }
        )
      }
      throw error
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
