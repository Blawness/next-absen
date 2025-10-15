import { AttendanceStatus } from "@prisma/client"

export interface ReportRecord {
  id: string
  date: Date
  user: {
    id: string
    name: string
    department: string | null
    position: string | null
    email: string
  }
  checkInTime: Date | null
  checkOutTime: Date | null
  checkInAddress: string | null
  checkOutAddress: string | null
  workHours: number | null
  overtimeHours: number | null
  lateMinutes: number | null
  status: AttendanceStatus
  notes: string | null
}

export interface ReportSummary {
  totalRecords: number
  totalUsers: number
  totalWorkHours: number
  totalOvertimeHours: number
  averageWorkHours: number
  statusBreakdown: Record<string, number>
  departmentBreakdown: Record<string, number>
  dateRange: {
    startDate: Date | null
    endDate: Date | null
  }
}

export interface ReportFilters {
  startDate: string
  endDate: string
  userId: string
  department: string
  status: string
}

export interface FilterOptions {
  departments: string[]
  users: { id: string; name: string; department: string }[]
}

export interface Message {
  type: 'success' | 'error'
  text: string
}
