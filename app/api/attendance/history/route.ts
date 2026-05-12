import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { getAttendanceHistory } from "./services"

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await validateSession()

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '30')
  const offset = parseInt(searchParams.get('offset') || '0')

  const history = await getAttendanceHistory(session.user.id, limit, offset)

  return NextResponse.json(history)
}, "fetching attendance history")
