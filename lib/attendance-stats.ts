import { AttendanceStatus } from "@prisma/client"

export interface AttendanceStatRecord {
  status: AttendanceStatus
  user: { id: string; name: string; department: string | null }
}

export interface UserAttendanceStat {
  userId: string
  name: string
  department: string | null
  present: number
  late: number
  halfDay: number
  absent: number
  totalRecords: number
  attendanceRate: number
}

/**
 * Per-employee attendance stats for the reports summary.
 *
 * `attendanceRate` counts a late arrival as a full day — the person did
 * show up — and a half day as half of one, so the figure reads as "how
 * much of the expected time did they actually work". Only `absent` costs
 * a whole day.
 *
 * Sorted worst-first: the point of the card is to surface who needs
 * attention, and with a handful of employees that beats alphabetical.
 * Ties fall back to name so the order is stable between requests rather
 * than following whatever order the database returned.
 */
export function buildUserAttendanceStats(
  records: AttendanceStatRecord[],
): UserAttendanceStat[] {
  const byUser = new Map<string, UserAttendanceStat>()

  for (const record of records) {
    let stat = byUser.get(record.user.id)
    if (!stat) {
      stat = {
        userId: record.user.id,
        name: record.user.name,
        department: record.user.department,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        totalRecords: 0,
        attendanceRate: 0,
      }
      byUser.set(record.user.id, stat)
    }

    stat.totalRecords++
    if (record.status === AttendanceStatus.present) stat.present++
    else if (record.status === AttendanceStatus.late) stat.late++
    else if (record.status === AttendanceStatus.half_day) stat.halfDay++
    else if (record.status === AttendanceStatus.absent) stat.absent++
  }

  const stats = [...byUser.values()]

  for (const stat of stats) {
    const attended = stat.present + stat.late + stat.halfDay * 0.5
    stat.attendanceRate = (attended / stat.totalRecords) * 100
  }

  return stats.sort(
    (a, b) => a.attendanceRate - b.attendanceRate || a.name.localeCompare(b.name),
  )
}
