import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { convertToCSV } from "@/lib/csv"
import { exportUsers } from "../services"

export const GET = withErrorHandling(async (request: NextRequest) => {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const department = searchParams.get("department") ?? undefined
    const role = searchParams.get("role") ?? undefined
    const status = searchParams.get("status") ?? undefined

    const { csvData } = await exportUsers(
        { id: session.user.id, role: session.user.role },
        { department, role, status }
    )

    const csv = convertToCSV(csvData)

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
    })
}, "exporting users")
