import { buildUserAttendanceStats, type AttendanceStatRecord } from "./attendance-stats"

const record = (
  userId: string,
  name: string,
  status: AttendanceStatRecord["status"],
  department: string | null = "Finance",
): AttendanceStatRecord => ({
  status,
  user: { id: userId, name, department },
})

describe("buildUserAttendanceStats", () => {
  it("groups records by user and counts each status", () => {
    const stats = buildUserAttendanceStats([
      record("u1", "Employee One", "present"),
      record("u1", "Employee One", "present"),
      record("u1", "Employee One", "late"),
      record("u1", "Employee One", "absent"),
      record("u1", "Employee One", "half_day"),
    ])

    expect(stats).toHaveLength(1)
    expect(stats[0]).toMatchObject({
      userId: "u1",
      name: "Employee One",
      department: "Finance",
      present: 2,
      late: 1,
      halfDay: 1,
      absent: 1,
      totalRecords: 5,
    })
  })

  it("counts a half day as half a day present", () => {
    // 4 present + 1 late + 0.5 * 1 half day, over 7 records.
    const stats = buildUserAttendanceStats([
      ...Array(4).fill(null).map(() => record("u1", "Employee One", "present")),
      record("u1", "Employee One", "late"),
      record("u1", "Employee One", "half_day"),
      record("u1", "Employee One", "absent"),
    ])

    expect(stats[0].attendanceRate).toBeCloseTo(78.57, 2)
  })

  it("rates a user with no absences at 100", () => {
    const stats = buildUserAttendanceStats([
      record("u1", "Employee One", "present"),
      record("u1", "Employee One", "late"),
    ])

    expect(stats[0].attendanceRate).toBe(100)
  })

  it("sorts the worst attendance first", () => {
    const stats = buildUserAttendanceStats([
      record("good", "Good", "present"),
      record("good", "Good", "present"),
      record("bad", "Bad", "present"),
      record("bad", "Bad", "absent"),
    ])

    expect(stats.map(s => s.userId)).toEqual(["bad", "good"])
  })

  it("breaks a tie on name so the order never wobbles between requests", () => {
    const stats = buildUserAttendanceStats([
      record("u2", "Zulfa", "present"),
      record("u1", "Andi", "present"),
      record("u3", "Made", "present"),
    ])

    expect(stats.map(s => s.name)).toEqual(["Andi", "Made", "Zulfa"])
  })

  it("returns nothing for no records rather than dividing by zero", () => {
    expect(buildUserAttendanceStats([])).toEqual([])
  })

  it("labels a user without a department", () => {
    const stats = buildUserAttendanceStats([record("u1", "Employee One", "present", null)])

    expect(stats[0].department).toBeNull()
  })
})
