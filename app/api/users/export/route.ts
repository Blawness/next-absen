import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// Helper function to convert data to CSV
function convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return ""

    // Get headers from first object
    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(",")

    // Convert each row to CSV
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header]
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = value === null || value === undefined ? "" : String(value)
            const escapedValue = stringValue.replace(/"/g, '""')
            return escapedValue.includes(",") || escapedValue.includes("\n")
                ? `"${escapedValue}"`
                : escapedValue
        }).join(",")
    })

    return [csvHeaders, ...csvRows].join("\n")
}

// GET /api/users/export - Export users to CSV
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // Only admin and manager can export
        if (session.user.role !== UserRole.admin && session.user.role !== UserRole.manager) {
            return NextResponse.json(
                { error: "Insufficient permissions" },
                { status: 403 }
            )
        }

        // Get query parameters for filtering
        const searchParams = request.nextUrl.searchParams
        const department = searchParams.get("department")
        const role = searchParams.get("role")
        const status = searchParams.get("status")

        // Build where clause
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = {}

        if (department) {
            whereClause.department = department
        }

        if (role && ["admin", "manager", "user"].includes(role)) {
            whereClause.role = role as UserRole
        }

        if (status === "active") {
            whereClause.isActive = true
        } else if (status === "inactive") {
            whereClause.isActive = false
        }

        // Managers and Admins can export all users (department is for display/sorting only)

        // Fetch users
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

        // Format data for CSV
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

        // Convert to CSV
        const csv = convertToCSV(csvData)

        // Log activity
        await prisma.activityLog.create({
            data: {
                userId: session.user.id,
                action: "EXPORT_USERS",
                resourceType: "USER",
                resourceId: session.user.id,
                details: {
                    count: users.length,
                    filters: { department, role, status }
                }
            }
        })

        // Return CSV file
        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`
            }
        })
    } catch (error) {
        console.error("Error exporting users:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
