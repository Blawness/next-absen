import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function GET(_request: NextRequest) {
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

    // eslint-disable-next-line prefer-const
    let whereClause: {
      isActive: boolean
      department?: string
    } = {
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
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
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

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admin can create users
    if (session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, department, position, role, password } = body

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        department,
        position,
        role,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        department: true,
        position: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_USER",
        resourceType: "USER",
        resourceId: newUser.id,
        details: { targetUser: email }
      }
    })

    return NextResponse.json({
      message: "User created successfully",
      user: newUser
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
