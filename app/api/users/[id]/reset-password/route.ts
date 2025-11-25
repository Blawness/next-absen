import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

interface RouteParams {
    params: Promise<{ id: string }>
}

// Generate random password
function generatePassword(length: number = 12): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
}

// POST /api/users/[id]/reset-password - Reset user password
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // Only admin can reset passwords
        if (session.user.role !== UserRole.admin) {
            return NextResponse.json(
                { error: "Insufficient permissions" },
                { status: 403 }
            )
        }

        const { id } = await params
        const body = await request.json()
        const { customPassword, sendEmail = false } = body

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, name: true }
        })

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        // Generate or use custom password
        const newPassword = customPassword || generatePassword(12)

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        // Update user password
        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        })

        // Log activity
        await prisma.activityLog.create({
            data: {
                userId: session.user.id,
                action: "RESET_PASSWORD",
                resourceType: "USER",
                resourceId: id,
                details: {
                    targetUser: user.email,
                    emailSent: sendEmail
                }
            }
        })

        // TODO: Implement email sending functionality
        // if (sendEmail) {
        //   await sendPasswordResetEmail(user.email, user.name, newPassword)
        // }

        return NextResponse.json({
            message: "Password reset successfully",
            // Only return password if not sending via email
            temporaryPassword: sendEmail ? undefined : newPassword,
            emailSent: sendEmail
        })
    } catch (error) {
        console.error("Error resetting password:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
