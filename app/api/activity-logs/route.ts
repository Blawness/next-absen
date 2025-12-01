import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== UserRole.admin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            )
        }

        const searchParams = request.nextUrl.searchParams
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")
        const offset = (page - 1) * limit
        const userId = searchParams.get("userId")
        const action = searchParams.get("action")

        const whereClause: Prisma.ActivityLogWhereInput = {}

        if (userId) {
            whereClause.userId = userId
        }

        if (action) {
            whereClause.action = action
        }

        const [activities, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip: offset,
                take: limit
            }),
            prisma.activityLog.count({
                where: whereClause
            })
        ])

        return NextResponse.json({
            activities,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                page,
                limit
            }
        })
    } catch (error) {
        console.error("Error fetching activity logs:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
