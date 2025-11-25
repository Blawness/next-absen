import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/users/[id]/activity - Get user activity log
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // Only admin and manager can view activity logs
        if (session.user.role !== UserRole.admin && session.user.role !== UserRole.manager) {
            return NextResponse.json(
                { error: "Insufficient permissions" },
                { status: 403 }
            )
        }

        const { id } = await params

        // Get query parameters
        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get("limit") || "50")
        const offset = parseInt(searchParams.get("offset") || "0")
        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, name: true, department: true }
        })

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        // Managers can only view activity for users in their department
        if (session.user.role === UserRole.manager) {
            const manager = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { department: true }
            })

            if (manager?.department !== user.department) {
                return NextResponse.json(
                    { error: "Insufficient permissions" },
                    { status: 403 }
                )
            }
        }

        // Build where clause
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = { userId: id }

        if (startDate || endDate) {
            whereClause.createdAt = {}
            if (startDate) {
                whereClause.createdAt.gte = new Date(startDate)
            }
            if (endDate) {
                whereClause.createdAt.lte = new Date(endDate)
            }
        }

        // Fetch activity logs
        const [activities, totalCount] = await Promise.all([
            prisma.activityLog.findMany({
                where: whereClause,
                select: {
                    id: true,
                    action: true,
                    resourceType: true,
                    resourceId: true,
                    details: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.activityLog.count({ where: whereClause })
        ])

        return NextResponse.json({
            activities,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            },
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        })
    } catch (error) {
        console.error("Error fetching user activity:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
