import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, checkInSchema } from "@/lib/validation"
import { requireSameOrigin } from "@/lib/csrf"
import {
  enforceGeofence,
  resolveCheckInStatus,
  validateLocationData,
  getExistingAttendance,
  createOrUpdateAttendance,
  logCheckInActivity,
} from "./services"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const csrf = requireSameOrigin(request)
  if (csrf) return csrf

  const session = await validateSession()
  const body = await parseBody(request, checkInSchema)

  validateLocationData(body)
  await enforceGeofence(body)

  const today = new Date()
  const existingAttendance = await getExistingAttendance(session.user.id, today)
  const { lateMinutes, status } = await resolveCheckInStatus(today)

  const attendance = await createOrUpdateAttendance(
    session.user.id,
    body,
    existingAttendance,
    lateMinutes,
    status
  )

  await logCheckInActivity(session.user.id, attendance, body)

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
}, "check-in")
