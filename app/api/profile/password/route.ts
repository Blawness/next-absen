import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, passwordChangeSchema } from "@/lib/validation"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await parseBody(request, passwordChangeSchema)
  const { currentPassword, newPassword } = body

  // Get current user with password
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    )
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password
  )

  if (!isCurrentPasswordValid) {
    return NextResponse.json(
      { error: "Password saat ini tidak benar" },
      { status: 400 }
    )
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12)

  // Update password
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedNewPassword },
  })

  // Log activity (without password details)
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "change_password",
      resourceType: "user",
      resourceId: session.user.id,
      details: {
        timestamp: new Date().toISOString(),
      },
    },
  })

  return NextResponse.json({
    success: true,
    message: "Password berhasil diubah",
  })
}, "changing password")
