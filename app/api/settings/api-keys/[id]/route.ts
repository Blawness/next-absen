import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// PUT /api/settings/api-keys/[id] — Update name or toggle active
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.apiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    const data: { name?: string; isActive?: boolean } = {}

    if (typeof body.name === "string" && body.name.trim().length > 0) {
      data.name = body.name.trim()
    }

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data,
      select: {
        id: true,
        prefix: true,
        name: true,
        scope: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: data.isActive === false ? "REVOKE_API_KEY" : "UPDATE_API_KEY",
        resourceType: "api_key",
        resourceId: id,
        details: {
          changes: Object.keys(data),
          active: data.isActive,
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/api-keys/[id] — Soft delete (set isActive = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const { id } = await params

    const existing = await prisma.apiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_API_KEY",
        resourceType: "api_key",
        resourceId: id,
        details: {
          prefix: existing.prefix,
          name: existing.name,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
