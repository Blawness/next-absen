import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, checkOutSchema } from "@/lib/validation"
import {
  getTodaysAttendance,
  processCheckout,
  logCheckoutActivity,
} from "./services"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await validateSession()
  const body = await parseBody(request, checkOutSchema)

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
}, "check-out")
