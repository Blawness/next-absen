import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, checkInSchema } from "@/lib/validation"
import {
  getExistingAttendance,
  createOrUpdateAttendance,
  logCheckInActivity,
} from "./services"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await validateSession()
  const body = await parseBody(request, checkInSchema)

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
}, "check-in")
