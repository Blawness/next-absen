import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

type BulkAction = "activate" | "deactivate" | "delete"

interface BulkActionRequest {
    action: BulkAction
    userIds: string[]
}

// POST /api/users/bulk - Perform bulk actions on users
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // Only admin can perform bulk actions
        if (session.user.role !== UserRole.admin) {
            return NextResponse.json(
                { error: "Insufficient permissions" },
                { status: 403 }
            )
        }

        const body: BulkActionRequest = await request.json()
        const { action, userIds } = body

        // Validate input
        if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: "Invalid request. Action and userIds are required" },
                { status: 400 }
            )
        }

        if (!["activate", "deactivate", "delete"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Must be 'activate', 'deactivate', or 'delete'" },
                { status: 400 }
            )
        }

        // Prevent self-modification
        if (userIds.includes(session.user.id)) {
            return NextResponse.json(
                { error: "Cannot perform bulk actions on your own account" },
                { status: 400 }
            )
        }

        let successCount = 0
        const errors: { userId: string; error: string }[] = []

        // Perform bulk action
        for (const userId of userIds) {
            try {
                // Check if user exists
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { id: true, email: true, isActive: true }
                })

                if (!user) {
                    errors.push({ userId, error: "User not found" })
                    continue
                }

                // Perform the action
                switch (action) {
                    case "activate":
                        await prisma.user.update({
                            where: { id: userId },
                            data: { isActive: true }
                        })
                        await prisma.activityLog.create({
                            data: {
                                userId: session.user.id,
                                action: "ACTIVATE_USER",
                                resourceType: "USER",
                                resourceId: userId,
                                details: { targetUser: user.email, bulkAction: true }
                            }
                        })
                        successCount++
                        break

                    case "deactivate":
                        await prisma.user.update({
                            where: { id: userId },
                            data: { isActive: false }
                        })
                        await prisma.activityLog.create({
                            data: {
                                userId: session.user.id,
                                action: "DEACTIVATE_USER",
                                resourceType: "USER",
                                resourceId: userId,
                                details: { targetUser: user.email, bulkAction: true }
                            }
                        })
                        successCount++
                        break

                    case "delete":
                        // Soft delete by deactivating
                        await prisma.user.update({
                            where: { id: userId },
                            data: { isActive: false }
                        })
                        await prisma.activityLog.create({
                            data: {
                                userId: session.user.id,
                                action: "DELETE_USER",
                                resourceType: "USER",
                                resourceId: userId,
                                details: { targetUser: user.email, bulkAction: true }
                            }
                        })
                        successCount++
                        break
                }
            } catch (error) {
                console.error(`Error processing user ${userId}:`, error)
                errors.push({ userId, error: "Failed to process user" })
            }
        }

        return NextResponse.json({
            message: `Bulk ${action} completed`,
            successCount,
            totalCount: userIds.length,
            errors: errors.length > 0 ? errors : undefined
        })
    } catch (error) {
        console.error("Error performing bulk action:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
