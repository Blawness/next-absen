import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { UserRole, Prisma } from "@prisma/client"

export const GET = withErrorHandling(async (request: NextRequest) => {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== UserRole.admin && session.user.role !== UserRole.superadmin)) {
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
    const hideSuperadmin = searchParams.get("includeSuperadmin") === "false"

    // Audit trail integrity: superadmin actions are visible to admins by default.
    // The role is included in the response so admins can filter or identify actor privileges.
    const whereClause: Prisma.ActivityLogWhereInput = {}

    // includeSuperadmin=false retains the legacy behavior (hide superadmin actions).
    // Defaults to including superadmin so admins can audit every privileged change.
    if (hideSuperadmin) {
        whereClause.user = { role: { not: UserRole.superadmin } }
    }

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
                        avatarUrl: true,
                        role: true
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
}, "fetching activity logs")
