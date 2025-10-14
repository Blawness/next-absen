import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, AttendanceStatus } from "@prisma/client"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { chromium } from "playwright"

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
    const isPreview = searchParams.get('preview') === 'true'

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
      return await generatePDF(records, startDate, endDate, isPreview)
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
async function generatePDF(records: any[], startDate?: string | null, endDate?: string | null, isPreview?: boolean): Promise<NextResponse> {
  // Generate HTML content for PDF
  const htmlContent = generatePDFHTML(records, startDate, endDate)

  try {
    // Launch Playwright browser (more reliable than Puppeteer in server environments)
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security'
      ]
    })

    const page = await browser.newPage()

    // Set viewport for consistent rendering
    await page.setViewportSize({ width: 1200, height: 800 })

    // Set content with timeout and better error handling
    try {
      await page.setContent(htmlContent, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      // Wait for fonts and images to load
      await page.waitForLoadState('networkidle', { timeout: 5000 })
    } catch (contentError) {
      console.error('Error setting page content:', contentError)
      await browser.close()
      throw new Error('Failed to load HTML content for PDF generation')
    }

    // Add a small delay to ensure all resources are loaded
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Generate PDF buffer with better error handling
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        preferCSSPageSize: true,
        displayHeaderFooter: false
      })
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError)
      await browser.close()
      throw new Error('Failed to generate PDF from content')
    }

    await browser.close()

    const timestamp = format(new Date(), 'yyyy-MM-dd')
    const filename = `attendance-report-${timestamp}.pdf`

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': isPreview
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Error generating PDF:', error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('spawn') || error.message.includes('Executable')) {
        throw new Error('Browser executable not found. Please install browser dependencies.')
      } else if (error.message.includes('Protocol') || error.message.includes('Target')) {
        throw new Error('Browser communication error. Please check browser installation.')
      }
    }

    throw new Error('Failed to generate PDF. Please try again or contact support.')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generatePDFHTML(records: any[], startDate?: string | null, endDate?: string | null): string {
  const totalWorkHours = records.reduce((sum, r) => sum + (Number(r.workHours) || 0), 0)
  const totalOvertimeHours = records.reduce((sum, r) => sum + Number(r.overtimeHours || 0), 0)
  const uniqueUsers = new Set(records.map(r => r.user.id)).size

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Laporan Absensi</title>
      <style>
        @page {
          margin: 20px;
          size: A4;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
        }

        .header h1 {
          margin: 0;
          color: #2563eb;
          font-size: 28px;
          font-weight: 700;
        }

        .header .subtitle {
          margin: 8px 0;
          color: #64748b;
          font-size: 14px;
        }

        .header .generated {
          margin: 5px 0;
          color: #64748b;
          font-size: 12px;
        }

        .summary {
          margin-bottom: 30px;
          background: #f8fafc;
          border-radius: 8px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }

        .summary h2 {
          margin: 0 0 20px 0;
          color: #334155;
          font-size: 18px;
          font-weight: 600;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .summary-card {
          background: white;
          border: 1px solid #e2e8f0;
          padding: 15px;
          border-radius: 6px;
          text-align: center;
        }

        .summary-card h3 {
          margin: 0 0 8px 0;
          color: #475569;
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-card .value {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #2563eb;
        }

        .summary-card .label {
          margin: 5px 0 0 0;
          font-size: 12px;
          color: #64748b;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }

        th, td {
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          text-align: left;
          vertical-align: top;
        }

        th {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: white;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        tr:nth-child(even) {
          background-color: #f8fafc;
        }

        tr:hover {
          background-color: #f1f5f9;
        }

        .status-present {
          color: #059669;
          font-weight: 600;
        }

        .status-late {
          color: #d97706;
          font-weight: 600;
        }

        .status-absent {
          color: #dc2626;
          font-weight: 600;
        }

        .status-half_day {
          color: #7c3aed;
          font-weight: 600;
        }

        .text-center {
          text-align: center;
        }

        .text-right {
          text-align: right;
        }

        .font-medium {
          font-weight: 500;
        }

        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
        }

        @media print {
          body { -webkit-print-color-adjust: exact; }
          .summary-card { break-inside: avoid; }
          tr { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Laporan Absensi Karyawan</h1>
        <div class="subtitle">
          Periode: ${startDate ? format(new Date(startDate), 'dd MMMM yyyy', { locale: id }) : 'Awal'} - ${endDate ? format(new Date(endDate), 'dd MMMM yyyy', { locale: id }) : 'Akhir'}
        </div>
        <div class="generated">
          Laporan dibuat pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}
        </div>
      </div>

      <div class="summary">
        <h2>Ringkasan Laporan</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Record</h3>
            <p class="value">${records.length}</p>
            <p class="label">Data absensi</p>
          </div>
          <div class="summary-card">
            <h3>Total Pengguna</h3>
            <p class="value">${uniqueUsers}</p>
            <p class="label">Pengguna aktif</p>
          </div>
          <div class="summary-card">
            <h3>Total Jam Kerja</h3>
            <p class="value">${totalWorkHours.toFixed(1)}j</p>
            <p class="label">Jam kerja keseluruhan</p>
          </div>
          <div class="summary-card">
            <h3>Total Lembur</h3>
            <p class="value">${totalOvertimeHours.toFixed(1)}j</p>
            <p class="label">Jam lembur keseluruhan</p>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 10%;">Tanggal</th>
            <th style="width: 15%;">Nama</th>
            <th style="width: 12%;">Departemen</th>
            <th style="width: 8%;">Check-in</th>
            <th style="width: 8%;">Check-out</th>
            <th style="width: 10%;">Jam Kerja</th>
            <th style="width: 10%;">Lembur</th>
            <th style="width: 10%;">Status</th>
            <th style="width: 17%;">Lokasi</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(record => `
            <tr>
              <td>${format(record.date, 'dd/MM/yyyy', { locale: id })}</td>
              <td class="font-medium">${record.user.name}</td>
              <td>${record.user.department || '-'}</td>
              <td class="text-center">${record.checkInTime ? format(record.checkInTime, 'HH:mm') : '-'}</td>
              <td class="text-center">${record.checkOutTime ? format(record.checkOutTime, 'HH:mm') : '-'}</td>
              <td class="text-right">${record.workHours ? `${record.workHours}j` : '-'}</td>
              <td class="text-right">${record.overtimeHours || 0}j</td>
              <td class="text-center status-${record.status}">${getStatusLabel(record.status)}</td>
              <td class="text-sm">
                ${record.checkInAddress ? `<div><strong>In:</strong> ${formatAddress(record.checkInAddress)}</div>` : ''}
                ${record.checkOutAddress ? `<div><strong>Out:</strong> ${formatAddress(record.checkOutAddress)}</div>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        Laporan ini dibuat secara otomatis oleh sistem absensi. Untuk pertanyaan lebih lanjut, silakan hubungi administrator.
      </div>
    </body>
    </html>
  `
}

function formatAddress(address?: string | null): string {
  if (!address) return '-'

  // If address starts with "Koordinat:", extract the coordinates part
  if (address.startsWith('Koordinat:')) {
    const coordsMatch = address.match(/Koordinat:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
    if (coordsMatch) {
      return `${coordsMatch[1]}, ${coordsMatch[2]}`
    }
  }

  return address.length > 30 ? address.substring(0, 30) + '...' : address
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
