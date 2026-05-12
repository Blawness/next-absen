import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, userCreateSchema } from "@/lib/validation"
import { getUsers, createUser } from "./services"

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') as 'all' | 'active' | 'inactive' | null

  const users = await getUsers({
    id: session.user.id,
    role: session.user.role
  }, status || undefined)

  return NextResponse.json(users)
}, "fetching users")

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await parseBody(request, userCreateSchema)
  const newUser = await createUser({
    id: session.user.id,
    role: session.user.role
  }, body)

  return NextResponse.json({
    message: "User created successfully",
    user: newUser
  })
}, "creating user")
