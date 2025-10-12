import { NextRequest, NextResponse } from "next/server"
import {
  validateSession,
  validateLocationData,
  getTodaysAttendance,
  processCheckout,
  logCheckoutActivity,
  HttpError,
} from "./services"

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession()
    const body = await request.json()
    validateLocationData(body)

    const today = new Date()
    const attendance = await getTodaysAttendance(session.user.id, today)

    const updatedAttendance = await processCheckout(attendance, body)

    await logCheckoutActivity(session.user.id, updatedAttendance, body)

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
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error during check-out:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
