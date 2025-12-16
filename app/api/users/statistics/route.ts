import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // Only admin and manager can view statistics
        if (session.user.role !== UserRole.admin && session.user.role !== UserRole.manager) {
            return NextResponse.json(
                { error: "Insufficient permissions" },
                { status: 403 }
            )
        }

        // Managers and Admins can see all statistics (department is for display/sorting only)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = {}

        // Get total counts
        const [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
            prisma.user.count({ where: whereClause }),
            prisma.user.count({ where: { ...whereClause, isActive: true } }),
            prisma.user.count({ where: { ...whereClause, isActive: false } })
        ])

        // Get department breakdown
        const departmentStats = await prisma.user.groupBy({
            by: ['department'],
            where: {
                ...whereClause,
                department: { not: null }
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

        // Get role distribution
        const roleStats = await prisma.user.groupBy({
            by: ['role'],
            where: whereClause,
            _count: {
                id: true
            }
        })

        const roleDistribution = roleStats.map(stat => ({
            role: stat.role,
            count: stat._count.id
        }))

        // Get recent activity count (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const recentLogins = await prisma.user.count({
            where: {
                ...whereClause,
                lastLogin: {
                    gte: thirtyDaysAgo
                }
            }
        })

        // Get new users this month
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const newUsersThisMonth = await prisma.user.count({
            where: {
                ...whereClause,
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
    } catch (error) {
        console.error("Error fetching user statistics:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
