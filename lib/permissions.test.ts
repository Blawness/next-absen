import { Permission, hasPermission, isAdmin, isManagerOrAdmin } from "./permissions"
import { UserRole } from "@prisma/client"

describe("hasPermission", () => {
  it("grants all permissions to admin", () => {
    expect(hasPermission(UserRole.admin, Permission.USER_CREATE)).toBe(true)
    expect(hasPermission(UserRole.admin, Permission.SETTINGS_UPDATE)).toBe(true)
  })

  it("grants limited permissions to manager", () => {
    expect(hasPermission(UserRole.manager, Permission.USER_READ)).toBe(true)
    expect(hasPermission(UserRole.manager, Permission.USER_CREATE)).toBe(false)
    expect(hasPermission(UserRole.manager, Permission.SETTINGS_UPDATE)).toBe(false)
  })

  it("grants basic permissions to user", () => {
    expect(hasPermission(UserRole.user, Permission.ABSENSI_CREATE)).toBe(true)
    expect(hasPermission(UserRole.user, Permission.USER_READ)).toBe(false)
    expect(hasPermission(UserRole.user, Permission.SETTINGS_READ)).toBe(false)
  })
})

describe("isAdmin", () => {
  it("returns true for admin role", () => {
    expect(isAdmin(UserRole.admin)).toBe(true)
  })

  it("returns false for non-admin roles", () => {
    expect(isAdmin(UserRole.manager)).toBe(false)
    expect(isAdmin(UserRole.user)).toBe(false)
  })
})

describe("isManagerOrAdmin", () => {
  it("returns true for admin and manager", () => {
    expect(isManagerOrAdmin(UserRole.admin)).toBe(true)
    expect(isManagerOrAdmin(UserRole.manager)).toBe(true)
  })

  it("returns false for user", () => {
    expect(isManagerOrAdmin(UserRole.user)).toBe(false)
  })
})
