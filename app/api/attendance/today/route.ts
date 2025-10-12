import { NextRequest, NextResponse } from "next/server"
import { validateSession, getTodaysAttendance, HttpError } from "./services"

export async function GET(_request: NextRequest) {
  try {
    const session = await validateSession()

    const attendance = await getTodaysAttendance(session.user.id)

    if (!attendance) {
      return NextResponse.json(null)
    }

    return NextResponse.json(attendance)
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error fetching today's attendance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
