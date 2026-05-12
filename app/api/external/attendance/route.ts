import { NextRequest } from "next/server"
import { withErrorHandling } from "@/lib/errors"
import { rateLimit } from "@/lib/rate-limit"
import {
  validateApiKey,
  externalSuccessResponse,
} from "@/app/api/external/utils"
import { getAttendanceData } from "./services"

export const GET = withErrorHandling(async (request: NextRequest) => {
  const apiKey = await validateApiKey(request, [
    "attendance:read",
    "attendance:readwrite",
  ])

  const rateLimitResult = await rateLimit(request, {
    maxRequests: 100,
    windowMs: 60000,
    keyExtractor: (req) => req.headers.get("x-api-key") ?? "unknown",
  })
  if (rateLimitResult) return rateLimitResult

  const { searchParams } = new URL(request.url)

  const result = await getAttendanceData(
    {
      date: searchParams.get("date") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : 50,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : 0,
    },
    apiKey
  )

  return externalSuccessResponse(result)
}, "external attendance")
