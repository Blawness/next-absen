import { NextRequest } from "next/server"
import { validateApiKey, externalSuccessResponse, externalErrorResponse } from "@/app/api/external/utils"
import { validateLocationData, autoCheckIn, HttpError } from "./services"

export async function POST(request: NextRequest) {
  try {
    const apiKey = await validateApiKey(request, [
      "attendance:auto-checkin",
      "attendance:readwrite",
    ])

    const body = await request.json()
    const { userId, latitude, longitude, accuracy, notes } = body

    if (!userId || typeof userId !== "string") {
      throw new HttpError("userId is required", 400)
    }

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
