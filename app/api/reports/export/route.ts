import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { UserRole, AttendanceStatus } from "@prisma/client"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

interface WhereClause {
  date?: {
    gte?: Date
    lte?: Date
  }
  userId?: string | { in: string[] }
  status?: AttendanceStatus
}

export const GET = withErrorHandling(async (request: NextRequest) => {
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

  const { searchParams } = new URL(request.url)
  const exportFormat = searchParams.get('format') as 'csv' | 'pdf'
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const userId = searchParams.get('userId')
  const department = searchParams.get('department')
  const status = searchParams.get('status')

  if (!exportFormat || (exportFormat !== 'csv' && exportFormat !== 'pdf')) {
    return NextResponse.json(
      { error: "Invalid format. Use 'csv' or 'pdf'" },
      { status: 400 }
    )
  }

  // Build where clause based on user role and filters
  const whereClause: WhereClause = {}

  // Date range filter
  if (startDate || endDate) {
    whereClause.date = {}
    if (startDate) {
      whereClause.date.gte = new Date(startDate)
    }
    if (endDate) {
      whereClause.date.lte = new Date(endDate)
    }
  }

  // User-based filtering based on role
  if (userId) {
    whereClause.userId = userId
  } else if (department) {
    const departmentUsers = await prisma.user.findMany({
      where: { department },
      select: { id: true }
    })
    whereClause.userId = {
      in: departmentUsers.map(u => u.id)
    }
  } else if (session.user.role === UserRole.manager) {
    // Managers without specific filters: scope to their department
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { department: true }
    })

    if (manager?.department) {
      const departmentUsers = await prisma.user.findMany({
        where: { department: manager.department },
        select: { id: true }
      })
      whereClause.userId = {
        in: departmentUsers.map(u => u.id)
      }
    } else {
      whereClause.userId = session.user.id
    }
  }

  if (status) {
    whereClause.status = status as AttendanceStatus
  }

  // Get attendance records
  const attendanceRecords = await prisma.absensiRecord.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          department: true,
          position: true,
          email: true
        }
      }
    },
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  // Format the response data
  const records = attendanceRecords.map(record => ({
    id: record.id,
    date: record.date,
    user: record.user,
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime,
    checkInAddress: record.checkInAddress,
    checkOutAddress: record.checkOutAddress,
    workHours: record.workHours,
    overtimeHours: record.overtimeHours,
    lateMinutes: record.lateMinutes,
    status: record.status,
    notes: record.notes,
  }))

  if (exportFormat === 'csv') {
    return generateCSV(records)
  } else if (exportFormat === 'pdf') {
    return await generatePDF(records, startDate, endDate)
  }

  return NextResponse.json({ error: "Invalid format" }, { status: 400 })
}, "exporting reports")

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateCSV(records: any[]): NextResponse {
  const headers = [
    'Tanggal',
    'Nama',
    'Departemen',
    'Posisi',
    'Check-in',
    'Check-out',
    'Jam Kerja',
    'Lembur',
    'Terlambat (menit)',
    'Status',
    'Lokasi Check-in',
    'Lokasi Check-out',
    'Catatan'
  ]

  const csvData = [
    headers.join(','),
    ...records.map(record => [
      format(record.date, 'yyyy-MM-dd'),
      record.user.name,
      record.user.department || '',
      record.user.position || '',
      record.checkInTime ? format(record.checkInTime, 'HH:mm') : '',
      record.checkOutTime ? format(record.checkOutTime, 'HH:mm') : '',
      record.workHours || '',
      record.overtimeHours || '',
      record.lateMinutes || '',
      record.status,
      record.checkInAddress || '',
      record.checkOutAddress || '',
      record.notes || ''
    ].map(field => `"${field}"`).join(','))
  ].join('\n')

  return new NextResponse(csvData, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv"`
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generatePDF(records: any[], startDate?: string | null, endDate?: string | null): Promise<NextResponse> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  const totalWorkHours = records.reduce((sum, r) => sum + (Number(r.workHours) || 0), 0)
  const totalOvertimeHours = records.reduce((sum, r) => sum + Number(r.overtimeHours || 0), 0)
  const uniqueUsers = new Set(records.map((r: any) => r.user.id)).size

  // Title
  doc.setFontSize(16)
  doc.text("Laporan Absensi Karyawan", 14, 20)

  // Period
  const startStr = startDate ? format(new Date(startDate), "dd MMMM yyyy", { locale: id }) : "Awal"
  const endStr = endDate ? format(new Date(endDate), "dd MMMM yyyy", { locale: id }) : "Akhir"
  doc.setFontSize(10)
  doc.text(`Periode: ${startStr} - ${endStr}`, 14, 28)
  doc.text(`Dibuat: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: id })}`, 14, 34)

  // Summary card
  doc.setFontSize(11)
  doc.text(`Total: ${records.length} record | ${uniqueUsers} pengguna | ${totalWorkHours.toFixed(1)} jam kerja | ${totalOvertimeHours.toFixed(1)} jam lembur`, 14, 42)

  // Table
  const rows = records.map((record: any) => [
    format(record.date, "dd/MM/yyyy", { locale: id }),
    record.user.name,
    record.user.department || "-",
    record.checkInTime ? format(record.checkInTime, "HH:mm") : "-",
    record.checkOutTime ? format(record.checkOutTime, "HH:mm") : "-",
    record.workHours ? `${record.workHours}j` : "-",
    `${record.overtimeHours || 0}j`,
    getStatusLabel(record.status),
    formatAddress(record.checkInAddress) || "-",
  ])

  autoTable(doc, {
    head: [["Tanggal", "Nama", "Departemen", "Masuk", "Keluar", "Jam Kerja", "Lembur", "Status", "Lokasi"]],
    body: rows,
    startY: 48,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attendance-report-${format(new Date(), "yyyy-MM-dd")}.pdf"`,
    },
  })
}

function formatAddress(address?: string | null): string {
  if (!address) return "-"
  if (address.startsWith("Koordinat:")) {
    const match = address.match(/Koordinat:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
    if (match) return `${match[1]}, ${match[2]}`
  }
  return address.length > 30 ? address.substring(0, 30) + "..." : address
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    present: "Hadir",
    late: "Terlambat",
    absent: "Tidak Hadir",
    half_day: "Setengah Hari",
  }
  return labels[status] || status
}
