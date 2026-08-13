import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { UserRole, Prisma } from "@prisma/client"

export const GET = withErrorHandling(async (_request: NextRequest) => {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }

    if (session.user.role !== UserRole.admin && session.user.role !== UserRole.manager && session.user.role !== UserRole.superadmin) {
        return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
        )
    }

    // Managers are scoped to their own department. Without this filter a
    // manager could see aggregated counts across the entire org.
    const baseWhere: Prisma.UserWhereInput =
      session.user.role === UserRole.manager
        ? { department: session.user.department ?? "__never__" }
        : {}

    // Get total counts
    const [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
        prisma.user.count({ where: baseWhere }),
        prisma.user.count({ where: { ...baseWhere, isActive: true } }),
        prisma.user.count({ where: { ...baseWhere, isActive: false } })
    ])

    // Get department breakdown (still global, since it's org-level info
    // admins want to see; for managers we limit to their own dept).
    const departmentStats = await prisma.user.groupBy({
        by: ['department'],
        where: {
            department: { not: null },
            ...(session.user.role === UserRole.manager
              ? { department: session.user.department ?? "__never__" }
              : {}),
        },
        _count: {
            id: true
        },
        orderBy: {
            _count: {
                id: 'desc'
            }
        }
    })

    const departmentBreakdown = departmentStats.map(stat => ({
        department: stat.department || "Unknown",
        count: stat._count.id
    }))

    // Get role distribution (within scope)
    const roleStats = await prisma.user.groupBy({
        by: ['role'],
        where: baseWhere,
        _count: {
            id: true
        }
    })

    const roleDistribution = roleStats.map(stat => ({
        role: stat.role,
        count: stat._count.id
    }))

    // Get recent activity count (last 30 days) within scope
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentLogins = await prisma.user.count({
        where: {
            ...baseWhere,
            lastLogin: {
                gte: thirtyDaysAgo
            }
        }
    })

    // Get new users this month within scope
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const newUsersThisMonth = await prisma.user.count({
        where: {
            ...baseWhere,
            createdAt: {
                gte: startOfMonth
            }
        }
    })

    return NextResponse.json({
        overview: {
            total: totalUsers,
            active: activeUsers,
            inactive: inactiveUsers,
            recentLogins,
            newThisMonth: newUsersThisMonth
        },
        departmentBreakdown,
        roleDistribution
    })
}, "fetching user statistics")
