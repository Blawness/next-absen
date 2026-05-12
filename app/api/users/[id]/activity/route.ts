import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { getUserActivity } from "../../services"

interface RouteParams {
    params: Promise<{ id: string }>
}

export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    const startDate = searchParams.get("startDate") ?? undefined
    const endDate = searchParams.get("endDate") ?? undefined

    const result = await getUserActivity(
        { id: session.user.id, role: session.user.role },
        id,
        { limit, offset, startDate, endDate }
    )

    return NextResponse.json(result)
}, "fetching user activity")
