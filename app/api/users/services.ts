import { prisma } from "@/lib/prisma"
import { UserRole, Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

export class HttpError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

export async function getUsers(currentUser: { id: string; role: string }) {
    // Only admin and manager can access
    if (currentUser.role !== UserRole.admin && currentUser.role !== UserRole.manager) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const whereClause: Prisma.UserWhereInput = {}

    // Managers can only see users in their department
    if (currentUser.role === UserRole.manager) {
        const manager = await prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { department: true }
        })

        if (manager?.department) {
            whereClause.department = manager.department
        }
    }

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
}

export async function updateUser(currentUser: { id: string; role: string }, userId: string, data: UpdateUserData) {
    if (currentUser.role !== UserRole.admin) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const { name, email, department, position, role } = data

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

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            name,
            email,
            department,
            position,
            role
        },
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
            details: { targetUser: email }
        }
    })

    return updatedUser
}

export async function deleteUser(currentUser: { id: string; role: string }, userId: string) {
    if (currentUser.role !== UserRole.admin) {
        throw new HttpError("Insufficient permissions", 403)
    }

    const existingUser = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!existingUser) {
        throw new HttpError("User not found", 404)
    }

    if (userId === currentUser.id) {
        throw new HttpError("Cannot delete your own account", 400)
    }

    const deletedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
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
            action: "DELETE_USER",
            resourceType: "USER",
            resourceId: userId,
            details: { targetUser: existingUser.email }
        }
    })

    return deletedUser
}
