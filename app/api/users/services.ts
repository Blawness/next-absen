import { prisma } from "@/lib/prisma"
import { UserRole, Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

import { HttpError } from "@/lib/errors"
import { generatePassword } from "@/lib/password"
import { isAdmin, isManagerOrAdmin, canAssignRole } from "@/lib/permissions"

export { HttpError }

/**
 * Wrap a Prisma P2002 (unique constraint) violation as a clean HttpError
 * with a caller-supplied message. Without this, users see the raw
 * constraint name (which leaks the column) instead of a friendly message.
 */
function asUniqueConstraintError(cause: unknown, message: string): never {
  if (
    cause instanceof Error &&
    "code" in cause &&
    (cause as { code?: string }).code === "P2002"
  ) {
    throw new HttpError(message, 400)
  }
  throw cause
}

export async function getUsers(currentUser: { id: string; role: string }, statusFilter?: 'all' | 'active' | 'inactive') {
    if (!isManagerOrAdmin(currentUser.role as UserRole)) {
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

export async function createUser(currentUser: { id: string; role: string; department?: string | null }, data: CreateUserData) {
    if (!isAdmin(currentUser.role as UserRole)) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const { name, email, department, position, role, password } = data

    if (!name || !email || !password || !role) {
        throw new HttpError("Missing required fields", 400)
    }

    // Privilege-escalation guard (BUG-007). A regular admin must not be
    // able to create a superadmin (or any role higher than their own).
    if (!canAssignRole(currentUser.role as UserRole, role as UserRole)) {
        throw new HttpError(
            `Cannot assign role "${role}" — your role (${currentUser.role}) does not have permission to grant it.`,
            403
        )
    }

    // Pre-check for fast-fail UX, but the actual source of truth is the
    // DB unique constraint. We catch P2002 below in case a concurrent
    // request inserts the same email between this check and the create.
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
    }).catch((err) => asUniqueConstraintError(err, "Email already exists"))

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
    if (!isAdmin(currentUser.role as UserRole)) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const { name, email, department, position, role } = data

    if (!name || !email || !role) {
        throw new HttpError("Missing required fields", 400)
    }

    // Privilege-escalation guard (BUG-007). A regular admin must not be
    // able to promote a user to superadmin (or any role higher than their own).
    if (!canAssignRole(currentUser.role as UserRole, role as UserRole)) {
        throw new HttpError(
            `Cannot assign role "${role}" — your role (${currentUser.role}) does not have permission to grant it.`,
            403
        )
    }

    const existingUser = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!existingUser) {
        throw new HttpError("User not found", 404)
    }

    // Additional guard: prevent an admin from changing the role of a
    // superadmin, even if they're not the one creating the target user.
    // Without this, an admin could downgrade a superadmin and break the
    // system (or change a superadmin's email and re-create them).
    if (existingUser.role === UserRole.superadmin &&
        currentUser.role !== UserRole.superadmin) {
      throw new HttpError(
        "Insufficient permissions to modify a superadmin",
        403
      )
    }

    if (email !== existingUser.email) {
        // Pre-check, but catch P2002 below to handle concurrent inserts.
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

    const emailChanged = email !== existingUser.email

    // One transaction, so a failed revocation can never leave the account
    // renamed with its old sessions still live — which is the exact hole
    // the revocation exists to close.
    const updatedUser = await prisma.$transaction(async (tx) => {
        // NOTE: password changes go through /api/users/[id]/reset-password
        // so they get the dedicated RESET_PASSWORD audit log entry. The
        // userUpdateSchema no longer accepts a password field, but we
        // defensively ignore any stray one too.
        const user = await tx.user.update({
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
        }).catch((err) => asUniqueConstraintError(err, "Email already exists"))

        // SECURITY: changing the address someone signs in with must end the
        // sessions opened under the old one. Sessions read the user row live
        // (see readSessionToken), so without this the old session would keep
        // working and silently adopt the new email.
        if (emailChanged) {
            await tx.persistedSessionToken.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: new Date() },
            })
        }

        await tx.activityLog.create({
            data: {
                userId: currentUser.id,
                action: "UPDATE_USER",
                resourceType: "USER",
                resourceId: userId,
                details: {
                  targetUser: email,
                  ...(emailChanged
                    ? { previousEmail: existingUser.email, sessionsRevoked: true }
                    : {}),
                }
            }
        })

        return user
    })

    return updatedUser
}

export async function deleteUser(currentUser: { id: string; role: string }, userId: string) {
    if (!isAdmin(currentUser.role as UserRole)) {
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

    // Privilege escalation: cannot soft-delete a superadmin unless you
    // are also a superadmin.
    if (existingUser.role === UserRole.superadmin &&
        currentUser.role !== UserRole.superadmin) {
      throw new HttpError(
        "Insufficient permissions to delete a superadmin",
        403
      )
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
    if (!isAdmin(currentUser.role as UserRole)) {
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

    // Privilege escalation: cannot deactivate a superadmin unless you
    // are also a superadmin.
    if (!isActive &&
        existingUser.role === UserRole.superadmin &&
        currentUser.role !== UserRole.superadmin) {
      throw new HttpError(
        "Insufficient permissions to deactivate a superadmin",
        403
      )
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
    if (!isAdmin(currentUser.role as UserRole)) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, name: true, role: true }
    })

    if (!user) {
        throw new HttpError("User not found", 404)
    }

    // Privilege escalation guard: an admin shouldn't be able to reset a
    // superadmin's password. Resetting passwords gives effective login
    // access — equivalent to creating the account.
    if (!canAssignRole(currentUser.role as UserRole, user.role)) {
      throw new HttpError(
        `Cannot reset password for role "${user.role}" — your role does not have permission to manage it.`,
        403
      )
    }

    const newPassword = customPassword || generatePassword(12)
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    const sendEmail = false

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: targetUserId },
            data: { password: hashedPassword }
        })

        // SECURITY: same rule the self-service change already follows in
        // /api/profile/password — a new password must end every session
        // opened with the old one, or the reset gives the admin a new
        // password while whoever was already signed in keeps their access.
        await tx.persistedSessionToken.updateMany({
            where: { userId: targetUserId, revokedAt: null },
            data: { revokedAt: new Date() },
        })

        await tx.activityLog.create({
            data: {
                userId: currentUser.id,
                action: "RESET_PASSWORD",
                resourceType: "USER",
                resourceId: targetUserId,
                details: {
                    targetUser: user.email,
                    emailSent: sendEmail,
                    sessionsRevoked: true
                }
            }
        })
    })

    return {
        message: "Password reset successfully",
        temporaryPassword: sendEmail ? undefined : newPassword,
        emailSent: sendEmail
    }
}

export async function getUserActivity(
    currentUser: { id: string; role: string; department?: string | null },
    targetUserId: string,
    options: { limit?: number; offset?: number; startDate?: string; endDate?: string }
) {
    if (!isManagerOrAdmin(currentUser.role as UserRole)) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, name: true, department: true }
    })

    if (!user) {
        throw new HttpError("User not found", 404)
    }

    // Managers can only view activity logs of users in their own
    // department. Without this check, a manager could pivot off the
    // activity log to infer org-wide operational data.
    if (currentUser.role === UserRole.manager) {
      if (!currentUser.department || user.department !== currentUser.department) {
        throw new HttpError("Insufficient permissions to view this user's activity", 403)
      }
    }

    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
    const offset = Math.max(options.offset ?? 0, 0)

    const whereClause: Prisma.ActivityLogWhereInput = { userId: targetUserId }

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
    if (!isAdmin(currentUser.role as UserRole)) {
        throw new HttpError("Insufficient permissions", 403)
    }

    if (userIds.includes(currentUser.id)) {
        throw new HttpError("Cannot perform bulk actions on your own account", 400)
    }

    // Privilege escalation guard: a non-superadmin admin must not be able
    // to bulk-deactivate other admins or superadmins. Read all targets
    // up front so we can validate before mutating any of them.
    if (action === "deactivate") {
        const targets = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, role: true }
        })
        for (const t of targets) {
            if (!canAssignRole(currentUser.role as UserRole, t.role)) {
                throw new HttpError(
                    `Cannot deactivate user with role "${t.role}" — your role does not have permission.`,
                    403
                )
            }
        }
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
    currentUser: { id: string; role: string; department?: string | null },
    filters: { department?: string; role?: string; status?: string }
) {
    if (!isManagerOrAdmin(currentUser.role as UserRole)) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const whereClause: Prisma.UserWhereInput = {}

    // Managers are always scoped to their own department regardless of
    // what filter they pass. Admins/superadmins honor the query filter.
    if (currentUser.role === UserRole.manager) {
      whereClause.department = currentUser.department ?? "__never__"
    } else if (filters.department) {
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
