import { NextRequest } from "next/server"
import { validateApiKey, externalSuccessResponse, externalErrorResponse } from "@/app/api/external/utils"
import { HttpError } from "@/lib/errors"
import { validateLocationData, autoCheckIn } from "./services"

export async function POST(request: NextRequest) {
  try {
    const apiKey = await validateApiKey(request, [
      "attendance:auto-checkin",
      "attendance:readwrite",
    ])

    const body = await request.json()
    const { userId, latitude, longitude, accuracy, notes } = body

    validateLocationData(body)

    const result = await autoCheckIn(
      { userId, latitude, longitude, accuracy, notes },
      apiKey
    )

    return externalSuccessResponse(result, 201)
  } catch (error) {
    return externalErrorResponse(error)
  }
}
