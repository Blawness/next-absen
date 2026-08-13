import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { parseBody, profileUpdateSchema } from "@/lib/validation"
import { requireSameOrigin } from "@/lib/csrf"
import { prisma } from "@/lib/prisma"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      department: true,
      position: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(user)
}, "fetching profile")

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

  const body = await parseBody(request, profileUpdateSchema)
  const { name, phone } = body

  // Sanitize string inputs — .trim() and coerce empties to null so the
  // UI can later clear a phone by saving an empty field.
  const trimmed = {
    name: typeof name === "string" ? name.trim() : undefined,
    phone: typeof phone === "string" ? (phone.trim() || null) : undefined,
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: trimmed,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      department: true,
      position: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "update_profile",
      resourceType: "user",
      resourceId: session.user.id,
      details: {
        updatedFields: Object.keys(trimmed).filter((k) => trimmed[k as keyof typeof trimmed] !== undefined),
      },
    },
  })

  return NextResponse.json({
    success: true,
    message: "Profil berhasil diperbarui",
    user: updatedUser,
  })
}, "updating profile")
