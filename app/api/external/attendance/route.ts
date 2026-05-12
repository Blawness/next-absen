import { NextRequest } from "next/server"
import {
  validateApiKey,
  externalSuccessResponse,
  externalErrorResponse,
} from "@/app/api/external/utils"
import { getAttendanceData } from "./services"

export async function GET(request: NextRequest) {
  try {
    const apiKey = await validateApiKey(request, [
      "attendance:read",
      "attendance:readwrite",
    ])

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
  } catch (error) {
    return externalErrorResponse(error)
  }
}
