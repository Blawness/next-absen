import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { maybeSweepAutoCheckout } from "@/lib/auto-checkout"
import { getAttendanceHistory } from "./services"

const MAX_LIMIT = 100

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await validateSession()

  const { searchParams } = new URL(request.url)
  // Bound the limit to prevent accidental (or malicious) huge queries.
  const rawLimit = parseInt(searchParams.get('limit') || '30', 10)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    : 30
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10)
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0

  await maybeSweepAutoCheckout()

  const history = await getAttendanceHistory(session.user.id, limit, offset)

  return NextResponse.json(history)
}, "fetching attendance history")
