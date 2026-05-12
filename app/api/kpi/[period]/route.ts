import { NextRequest, NextResponse } from "next/server"
import { withErrorHandling } from "@/lib/errors"
import { getKpi, ScopeType } from "./services"

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ period: string }> }) => {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get("scope") || undefined
  const department = searchParams.get("department") || undefined
  const userId = searchParams.get("userId") || undefined
  const start = searchParams.get("start") || undefined
  const end = searchParams.get("end") || undefined

  const { period } = await params
  const periodParam = period === "weekly" || period === "monthly" ? period : "weekly"

  const data = await getKpi({
    period: periodParam,
    scope: scope as ScopeType,
    department,
    userId,
    start,
    end,
  })

  return NextResponse.json(data)
}, "KPI API")


