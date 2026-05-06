import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// GET /api/settings/api-keys — List all API keys (prefix only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const keys = await prisma.apiKey.findMany({
      select: {
        id: true,
        prefix: true,
        name: true,
        scope: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(keys)
  } catch (error) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/settings/api-keys — Generate new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, scope } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const validScopes = ["attendance:readwrite", "attendance:read", "attendance:auto-checkin"]
    const resolvedScope = validScopes.includes(scope) ? scope : "attendance:readwrite"

    // Generate key: api_live_ + 48 random chars
    const rawKey = "api_live_" + randomBytes(36).toString("base64url")

    // Hash with bcryptjs (salt 12)
    const hashedKey = await bcrypt.hash(rawKey, 12)

    const prefix = rawKey.slice(-8)

    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        prefix,
        name: name.trim(),
        scope: resolvedScope,
        createdBy: session.user.id,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_API_KEY",
        resourceType: "api_key",
        resourceId: apiKey.id,
        details: {
          name: apiKey.name,
          scope: apiKey.scope,
          prefix: apiKey.prefix,
        },
      },
    })

    // Return the raw key (only time it's shown)
    return NextResponse.json({
      id: apiKey.id,
      prefix: apiKey.prefix,
      name: apiKey.name,
      scope: apiKey.scope,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
      rawKey,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
