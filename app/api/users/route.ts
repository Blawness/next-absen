import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admin and manager can access this endpoint
    if (session.user.role !== UserRole.admin && session.user.role !== UserRole.manager) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    let whereClause: any = {
      isActive: true
    }

    // Managers can only see users in their department
    if (session.user.role === UserRole.manager) {
      const manager = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { department: true }
      })

      if (manager?.department) {
        whereClause.department = manager.department
      }
    }

    // Get users based on role permissions
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        department: true,
        position: true,
        email: true
      },
      orderBy: [
        { department: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
