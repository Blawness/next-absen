import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { UserRole } from "@prisma/client"

export const GET = withErrorHandling(async (_request: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  if (session.user.role !== UserRole.admin && session.user.role !== UserRole.manager && session.user.role !== UserRole.superadmin) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    )
  }

  // Return predefined list of departments
  const departmentList = [
    "Legal",
    "Human Resource",
    "Operational",
    "Finance",
    "IT"
  ]

  return NextResponse.json(departmentList)
}, "fetching departments")
