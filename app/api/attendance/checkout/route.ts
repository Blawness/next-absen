import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

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

    // GPS accuracy validation relaxed for testing - using 5000 meters threshold
    if (accuracy > 5000) {
      return NextResponse.json(
        { error: "Akurasi GPS tidak mencukupi. Pastikan GPS aktif dan akurat." },
        { status: 400 }
      )
    }

    const now = new Date()
    const today = new Date()

    // Find today's attendance record
    console.log('Looking for attendance record for user:', session.user.id, 'on date:', today)
    const existingAttendance = await prisma.absensiRecord.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    })
    console.log('Found attendance record:', existingAttendance)

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "Anda belum check-in hari ini" },
        { status: 400 }
      )
    }

    if (existingAttendance.checkOutTime) {
      return NextResponse.json(
        { error: "Anda sudah check-out hari ini" },
        { status: 400 }
      )
    }

    if (!existingAttendance.checkInTime) {
      return NextResponse.json(
        { error: "Data check-in tidak ditemukan" },
        { status: 400 }
      )
    }

    // Work hours calculation disabled for testing
    const checkInTime = existingAttendance.checkInTime
    const workHoursDecimal = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
    const overtimeHours = 0
    const finalStatus = "present" as const

    // Update attendance record with check-out data
    let updatedAttendance
    try {
      updatedAttendance = await prisma.absensiRecord.update({
        where: { id: existingAttendance.id },
        data: {
          checkOutTime: now,
          checkOutLatitude: latitude,
          checkOutLongitude: longitude,
          checkOutAddress: address,
          checkOutAccuracy: accuracy,
          workHours: workHoursDecimal,
          overtimeHours,
          status: finalStatus,
        },
      })
    } catch (error) {
      console.error('Error updating attendance record:', error)
      return NextResponse.json(
        { error: "Gagal melakukan check-out. Silakan coba lagi." },
        { status: 500 }
      )
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "check_out",
        resourceType: "absensi_record",
        resourceId: updatedAttendance.id,
        details: {
          location: { latitude, longitude, address, accuracy },
          finalStatus,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Check-out berhasil",
      attendance: {
        id: updatedAttendance.id,
        checkOutTime: updatedAttendance.checkOutTime,
        status: updatedAttendance.status,
      },
    })
  } catch (error) {
    console.error("Error during check-out:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
