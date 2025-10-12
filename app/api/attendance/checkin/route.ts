import { NextRequest, NextResponse } from "next/server"
import {
  validateSession,
  validateLocationData,
  getExistingAttendance,
  createOrUpdateAttendance,
  logCheckInActivity,
  HttpError,
} from "./services"

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession()
    const body = await request.json()
    validateLocationData(body)

    const today = new Date()
    const existingAttendance = await getExistingAttendance(session.user.id, today)

    const attendance = await createOrUpdateAttendance(
      session.user.id,
      body,
      existingAttendance
    )

    await logCheckInActivity(session.user.id, attendance, body)

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
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error during check-in:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
