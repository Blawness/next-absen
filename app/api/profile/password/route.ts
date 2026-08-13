import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling, HttpError } from "@/lib/errors"
import { parseBody, passwordChangeSchema } from "@/lib/validation"
import { requireSameOrigin } from "@/lib/csrf"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { checkPasswordPolicy } from "@/lib/password-policy"

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const csrf = requireSameOrigin(request)
  if (csrf) return csrf

  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await parseBody(request, passwordChangeSchema)
  const { currentPassword, newPassword } = body

  const policy = await checkPasswordPolicy(newPassword)
  if (!policy.ok) {
    throw new HttpError(policy.reason ?? "Password tidak memenuhi kebijakan", 400)
  }

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

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword },
    }),
    // SECURITY: revoke ALL of this user's existing persisted session
    // tokens. Without this, anyone with a stolen JWT (or a forgotten
    // logged-in device) keeps access until the JWT's natural expiry
    // (default 10 years per lib/auth.ts).
    prisma.persistedSessionToken.updateMany({
      where: { userId: session.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "change_password",
        resourceType: "user",
        resourceId: session.user.id,
        details: {
          timestamp: new Date().toISOString(),
          // Note: also revoked all other active sessions.
        },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    message: "Password berhasil diubah. Sesi lain akan diakhiri, silakan masuk kembali.",
  })
}, "changing password")
