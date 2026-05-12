import { prisma } from "@/lib/prisma"
import { UserRole, Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

import { HttpError } from "@/lib/errors"
import { generatePassword } from "@/lib/password"

export { HttpError }

export async function getUsers(currentUser: { id: string; role: string }, statusFilter?: 'all' | 'active' | 'inactive') {
    // Only admin and manager can access
    if (currentUser.role !== UserRole.admin && currentUser.role !== UserRole.manager) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const whereClause: Prisma.UserWhereInput = {}

    // Apply status filter
    if (statusFilter === 'active') {
        whereClause.isActive = true
    } else if (statusFilter === 'inactive') {
        whereClause.isActive = false
    }
    // If statusFilter is 'all' or undefined, don't filter by isActive (show all users)
    // Managers and Admins can see all users (department is for display/sorting only)

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

    return users
}

interface CreateUserData {
    name: string
    email: string
    password?: string
    department?: string | null
    position?: string | null
    role: UserRole
}

export async function createUser(currentUser: { id: string; role: string }, data: CreateUserData) {
    if (currentUser.role !== UserRole.admin) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const { name, email, department, position, role, password } = data

    if (!name || !email || !password || !role) {
        throw new HttpError("Missing required fields", 400)
    }

    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        throw new HttpError("Email already exists", 400)
    }

    const hashedPassword = await bcrypt.hash(password, 12)

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

    await prisma.activityLog.create({
        data: {
            userId: currentUser.id,
            action: "CREATE_USER",
            resourceType: "USER",
            resourceId: newUser.id,
            details: { targetUser: email }
        }
    })

    return newUser
}

interface UpdateUserData {
    name: string
    email: string
    department?: string | null
    position?: string | null
    role: UserRole
    password?: string
}

export async function updateUser(currentUser: { id: string; role: string }, userId: string, data: UpdateUserData) {
    if (currentUser.role !== UserRole.admin) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const { name, email, department, position, role, password } = data

    if (!name || !email || !role) {
        throw new HttpError("Missing required fields", 400)
    }

    const existingUser = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!existingUser) {
        throw new HttpError("User not found", 404)
    }

    if (email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
            where: { email }
        })

        if (emailExists) {
            throw new HttpError("Email already exists", 400)
        }
    }

    const updateData: Prisma.UserUpdateInput = {
        name,
        email,
        department,
        position,
        role
    }

    if (password) {
        updateData.password = await bcrypt.hash(password, 12)
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
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
        }
    })

    await prisma.activityLog.create({
        data: {
            userId: currentUser.id,
            action: "UPDATE_USER",
            resourceType: "USER",
            resourceId: userId,
            details: { targetUser: email, passwordUpdated: !!password }
        }
    })

    return updatedUser
}

export async function deleteUser(currentUser: { id: string; role: string }, userId: string) {
    if (currentUser.role !== UserRole.admin) {
        throw new HttpError("Insufficient permissions", 403)
    }

    if (userId === currentUser.id) {
        throw new HttpError("Cannot delete your own account", 400)
    }

    const existingUser = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!existingUser) {
        throw new HttpError("User not found", 404)
    }

    // Soft delete
    const deletedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: {
            id: true,
            email: true,
            isActive: true
        }
    })

    await prisma.activityLog.create({
        data: {
            userId: currentUser.id,
            action: "DELETE_USER",
            resourceType: "USER",
            resourceId: userId,
            details: { targetUser: existingUser.email }
        }
    })

    return deletedUser
}

export async function toggleUserStatus(
    currentUser: { id: string; role: string },
    targetUserId: string,
    isActive: boolean
) {
    if (currentUser.role !== UserRole.admin) {
        throw new HttpError("Insufficient permissions", 403)
    }

    if (targetUserId === currentUser.id && !isActive) {
        throw new HttpError("Cannot deactivate your own account", 400)
    }

    const existingUser = await prisma.user.findUnique({
        where: { id: targetUserId }
    })

    if (!existingUser) {
        throw new HttpError("User not found", 404)
    }

    const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { isActive },
        select: {
            id: true,
            name: true,
            email: true,
            isActive: true
        }
    })

    await prisma.activityLog.create({
        data: {
            userId: currentUser.id,
            action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
            resourceType: "USER",
            resourceId: targetUserId,
            details: { targetUser: existingUser.email, newStatus: isActive }
        }
    })

    return {
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user: updatedUser
    }
}

export async function resetUserPassword(
    currentUser: { id: string; role: string },
    targetUserId: string,
    customPassword?: string
) {
    if (currentUser.role !== UserRole.admin) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, name: true }
    })

    if (!user) {
        throw new HttpError("User not found", 404)
    }

    const newPassword = customPassword || generatePassword(12)
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
        where: { id: targetUserId },
        data: { password: hashedPassword }
    })

    const sendEmail = false

    await prisma.activityLog.create({
        data: {
            userId: currentUser.id,
            action: "RESET_PASSWORD",
            resourceType: "USER",
            resourceId: targetUserId,
            details: {
                targetUser: user.email,
                emailSent: sendEmail
            }
        }
    })

    return {
        message: "Password reset successfully",
        temporaryPassword: sendEmail ? undefined : newPassword,
        emailSent: sendEmail
    }
}

export async function getUserActivity(
    currentUser: { id: string; role: string },
    targetUserId: string,
    options: { limit?: number; offset?: number; startDate?: string; endDate?: string }
) {
    if (currentUser.role !== UserRole.admin && currentUser.role !== UserRole.manager) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, name: true }
    })

    if (!user) {
        throw new HttpError("User not found", 404)
    }

    const limit = options.limit ?? 50
    const offset = options.offset ?? 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { userId: targetUserId }

    if (options.startDate || options.endDate) {
        whereClause.createdAt = {}
        if (options.startDate) {
            whereClause.createdAt.gte = new Date(options.startDate)
        }
        if (options.endDate) {
            whereClause.createdAt.lte = new Date(options.endDate)
        }
    }

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

    return {
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
    }
}

export async function bulkUserAction(
    currentUser: { id: string; role: string },
    action: "activate" | "deactivate",
    userIds: string[]
) {
    if (currentUser.role !== UserRole.admin) {
        throw new HttpError("Insufficient permissions", 403)
    }

    if (userIds.includes(currentUser.id)) {
        throw new HttpError("Cannot perform bulk actions on your own account", 400)
    }

    let successCount = 0
    const errors: { userId: string; error: string }[] = []

    for (const userId of userIds) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, isActive: true }
            })

            if (!user) {
                errors.push({ userId, error: "User not found" })
                continue
            }

            await prisma.user.update({
                where: { id: userId },
                data: { isActive: action === "activate" }
            })

            await prisma.activityLog.create({
                data: {
                    userId: currentUser.id,
                    action: action === "activate" ? "ACTIVATE_USER" : "DEACTIVATE_USER",
                    resourceType: "USER",
                    resourceId: userId,
                    details: { targetUser: user.email, bulkAction: true }
                }
            })
            successCount++
        } catch (error) {
            console.error(`Error processing user ${userId}:`, error)
            errors.push({ userId, error: "Failed to process user" })
        }
    }

    return {
        message: `Bulk ${action} completed`,
        successCount,
        totalCount: userIds.length,
        errors: errors.length > 0 ? errors : undefined
    }
}

export async function exportUsers(
    currentUser: { id: string; role: string },
    filters: { department?: string; role?: string; status?: string }
) {
    if (currentUser.role !== UserRole.admin && currentUser.role !== UserRole.manager) {
        throw new HttpError("Insufficient permissions", 403)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {}

    if (filters.department) {
        whereClause.department = filters.department
    }

    if (filters.role && ["admin", "manager", "user"].includes(filters.role)) {
        whereClause.role = filters.role as UserRole
    }

    if (filters.status === "active") {
        whereClause.isActive = true
    } else if (filters.status === "inactive") {
        whereClause.isActive = false
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: true,
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

    const csvData = users.map(user => ({
        ID: user.id,
        Name: user.name,
        Email: user.email,
        Department: user.department || "",
        Position: user.position || "",
        Role: user.role,
        Status: user.isActive ? "Active" : "Inactive",
        "Last Login": user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never",
        "Created At": new Date(user.createdAt).toLocaleString()
    }))

    await prisma.activityLog.create({
        data: {
            userId: currentUser.id,
            action: "EXPORT_USERS",
            resourceType: "USER",
            resourceId: currentUser.id,
            details: {
                count: users.length,
                filters
            }
        }
    })

    return { csvData, rowCount: users.length }
}

