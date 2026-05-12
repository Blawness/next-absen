import { NextResponse } from "next/server"
import { validateSession } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { getTodaysAttendance } from "./services"

export const GET = withErrorHandling(async () => {
  const session = await validateSession()

  const attendance = await getTodaysAttendance(session.user.id)

  if (!attendance) {
    return NextResponse.json(null)
  }

  return NextResponse.json(attendance)
}, "fetching today's attendance")
