import { UserRole } from "@prisma/client"
import { buildReportsWhereClause } from "./route"

jest.mock("next-auth")
jest.mock("@/lib/prisma", () => ({ prisma: {} }))

const query = { userId: "someone-else", department: "Legal" }

describe("buildReportsWhereClause", () => {
  it("pins a regular user to their own records, ignoring the params they pass", () => {
    const where = buildReportsWhereClause(
      { user: { id: "self", role: UserRole.user } },
      query,
    )
    expect(where.userId).toBe("self")
    expect(where.user).toBeUndefined()
  })

  // Managers are org-wide on purpose. They used to be hard-scoped to their own
  // department while the employee picker offered the whole org, so any
  // cross-department pick 403'd and took the summary cards down with it.
  it.each([UserRole.manager, UserRole.admin, UserRole.superadmin])(
    "lets %s report on any employee",
    (role) => {
      const where = buildReportsWhereClause({ user: { id: "self", role } }, query)
      expect(where.userId).toBe("someone-else")
    },
  )

  it.each([UserRole.manager, UserRole.admin, UserRole.superadmin])(
    "lets %s report on any department",
    (role) => {
      const where = buildReportsWhereClause(
        { user: { id: "self", role } },
        { department: "Legal" },
      )
      expect(where.user).toEqual({ department: "Legal" })
    },
  )

  it("leaves the scope open when no userId or department is given", () => {
    const where = buildReportsWhereClause(
      { user: { id: "self", role: UserRole.manager } },
      { startDate: "2026-08-01", endDate: "2026-08-19" },
    )
    expect(where.userId).toBeUndefined()
    expect(where.user).toBeUndefined()
    expect(where.date).toEqual({
      gte: new Date("2026-08-01"),
      lte: new Date("2026-08-19"),
    })
  })
})
