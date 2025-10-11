import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, AttendanceStatus } from "@prisma/client"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface WhereClause {
  date?: {
    gte?: Date
    lte?: Date
  }
  userId?: string | { in: string[] }
  department?: string
  status?: AttendanceStatus
}

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

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') as 'csv' | 'pdf'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    if (!format || (format !== 'csv' && format !== 'pdf')) {
      return NextResponse.json(
        { error: "Invalid format. Use 'csv' or 'pdf'" },
        { status: 400 }
      )
    }

    // Build where clause based on user role and filters
    // eslint-disable-next-line prefer-const
    let whereClause: WhereClause = {}

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
    if ((session.user.role as string) === 'user') {
      // Regular users can only see their own data
      whereClause.userId = session.user.id
    } else if ((session.user.role as string) === 'manager') {
      // Managers can see their department data
      if (userId) {
        whereClause.userId = userId
      } else {
        // Get all users in manager's department
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
        }
      }
    }
    // Admins can see all data, additional filters applied

    // Additional filters
    if (userId) {
      whereClause.userId = userId
    }

    if (department) {
      const departmentUsers = await prisma.user.findMany({
        where: { department },
        select: { id: true }
      })
      whereClause.userId = {
        in: departmentUsers.map(u => u.id)
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

    if (format === 'csv') {
      return generateCSV(records)
    } else if (format === 'pdf') {
      return generatePDF(records)
    }

  } catch (error) {
    console.error("Error exporting reports:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

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
function generatePDF(records: any[]): NextResponse {
  // For now, we'll create a simple HTML that can be converted to PDF
  // In a real application, you might want to use a library like jsPDF or puppeteer
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Laporan Absensi</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #333; }
        .header p { margin: 5px 0; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .status-present { color: #10b981; }
        .status-late { color: #f59e0b; }
        .status-absent { color: #ef4444; }
        .status-half_day { color: #8b5cf6; }
        .summary { margin-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Laporan Absensi</h1>
        <p>Periode: ${startDate ? format(new Date(startDate), 'dd MMM yyyy', { locale: id }) : 'Awal'} - ${endDate ? format(new Date(endDate), 'dd MMM yyyy', { locale: id }) : 'Akhir'}</p>
        <p>Generated: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: id })}</p>
      </div>

      <div class="summary">
        <h2>Ringkasan</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Record</h3>
            <p>${records.length}</p>
          </div>
          <div class="summary-card">
            <h3>Total Pengguna</h3>
            <p>${new Set(records.map(r => r.user.id)).size}</p>
          </div>
          <div class="summary-card">
            <h3>Total Jam Kerja</h3>
            <p>${records.reduce((sum, r) => sum + (Number(r.workHours) || 0), 0).toFixed(1)}j</p>
          </div>
          <div class="summary-card">
            <h3>Total Lembur</h3>
            <p>${records.reduce((sum, r) => sum + Number(r.overtimeHours), 0).toFixed(1)}j</p>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Nama</th>
            <th>Departemen</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Jam Kerja</th>
            <th>Lembur</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(record => `
            <tr>
              <td>${format(record.date, 'dd MMM yyyy', { locale: id })}</td>
              <td>${record.user.name}</td>
              <td>${record.user.department || '-'}</td>
              <td>${record.checkInTime ? format(record.checkInTime, 'HH:mm') : '-'}</td>
              <td>${record.checkOutTime ? format(record.checkOutTime, 'HH:mm') : '-'}</td>
              <td>${record.workHours ? `${record.workHours}j` : '-'}</td>
              <td>${record.overtimeHours || 0}j</td>
              <td><span class="status-${record.status}">${getStatusLabel(record.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="attendance-report-${format(new Date(), 'yyyy-MM-dd')}.html"`
    }
  })
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    present: 'Hadir',
    late: 'Terlambat',
    absent: 'Tidak Hadir',
    half_day: 'Setengah Hari'
  }
  return labels[status] || status
}
