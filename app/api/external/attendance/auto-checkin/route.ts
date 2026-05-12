import { NextRequest } from "next/server"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, autoCheckInSchema } from "@/lib/validation"
import { rateLimit } from "@/lib/rate-limit"
import { validateApiKey, externalSuccessResponse } from "@/app/api/external/utils"
import { autoCheckIn } from "./services"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const apiKey = await validateApiKey(request, [
    "attendance:auto-checkin",
    "attendance:readwrite",
  ])

  const rateLimitResult = await rateLimit(request, {
    maxRequests: 60,
    windowMs: 60000,
    keyExtractor: (req) => req.headers.get("x-api-key") ?? "unknown",
  })
  if (rateLimitResult) return rateLimitResult

  const body = await parseBody(request, autoCheckInSchema)

  const result = await autoCheckIn(body, apiKey)

  return externalSuccessResponse(result, 201)
}, "auto check-in")
