import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/users/[id]/status - Toggle user active status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admin can toggle user status
    if (session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    // Validate input
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if trying to deactivate self
    if (id === session.user.id && !isActive) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account" },
        { status: 400 }
      )
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
        resourceType: "USER",
        resourceId: id,
        details: { targetUser: existingUser.email, newStatus: isActive }
      }
    })

    return NextResponse.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    })
  } catch (error) {
    console.error("Error updating user status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
