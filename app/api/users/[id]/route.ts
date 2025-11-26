import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updateUser, deleteUser, HttpError } from "../services"

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const updatedUser = await updateUser({
      id: session.user.id,
      role: session.user.role
    }, id, body)

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user (soft delete by deactivating)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    const deletedUser = await deleteUser({
      id: session.user.id,
      role: session.user.role
    }, id)

    return NextResponse.json({
      message: "User deleted successfully",
      user: deletedUser
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
