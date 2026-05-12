import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { toggleUserStatus } from "../../services"

interface RouteParams {
  params: Promise<{ id: string }>
}

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  if (typeof body.isActive !== 'boolean') {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
  }

  const result = await toggleUserStatus(
    { id: session.user.id, role: session.user.role },
    id,
    body.isActive
  )

  return NextResponse.json(result)
}, "updating user status")
