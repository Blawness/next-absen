import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, userUpdateSchema } from "@/lib/validation"
import { updateUser } from "../services"

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/users/[id] - Update user
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { id } = await params
  const body = await parseBody(request, userUpdateSchema)

  const updatedUser = await updateUser({
    id: session.user.id,
    role: session.user.role
  }, id, body)

  return NextResponse.json({
    message: "User updated successfully",
    user: updatedUser
  })
}, "updating user")

