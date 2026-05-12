import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, passwordResetSchema } from "@/lib/validation"
import { resetUserPassword } from "../../services"

interface RouteParams {
    params: Promise<{ id: string }>
}

export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await parseBody(request, passwordResetSchema)

    const result = await resetUserPassword(
        { id: session.user.id, role: session.user.role },
        id,
        body.newPassword
    )

    return NextResponse.json(result)
}, "resetting password")
