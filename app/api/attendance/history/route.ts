import { NextRequest, NextResponse } from "next/server"
import { validateSession, getAttendanceHistory, HttpError } from "./services"

export async function GET(request: NextRequest) {
  try {
    const session = await validateSession()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')
    const offset = parseInt(searchParams.get('offset') || '0')

    const history = await getAttendanceHistory(session.user.id, limit, offset)

    return NextResponse.json(history)
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error fetching attendance history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
