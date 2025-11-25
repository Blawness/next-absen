import { NextRequest, NextResponse } from "next/server"
import { getKpi, HttpError } from "./services"

export async function GET(req: NextRequest, { params }: { params: Promise<{ period: string }> }) {
  try {
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
      scope: scope as any,
      department,
      userId,
      start,
      end,
    })

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("KPI API error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


