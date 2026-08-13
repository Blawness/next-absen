import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, bulkActionSchema } from "@/lib/validation"
import { requireSameOrigin } from "@/lib/csrf"
import { bulkUserAction } from "../services"

export const POST = withErrorHandling(async (request: NextRequest) => {
    const csrf = requireSameOrigin(request)
    if (csrf) return csrf

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, userIds } = await parseBody(request, bulkActionSchema)

    const result = await bulkUserAction(
        { id: session.user.id, role: session.user.role },
        action,
        userIds
    )

    return NextResponse.json(result)
}, "performing bulk action")
