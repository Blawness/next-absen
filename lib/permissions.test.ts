import { Permission, hasPermission, isAdmin, isManagerOrAdmin, canAssignRole } from "./permissions"
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

describe("canAssignRole (BUG-007 — privilege escalation guard)", () => {
  it("admin cannot create/promote a superadmin", () => {
    expect(canAssignRole(UserRole.admin, UserRole.superadmin)).toBe(false)
  })

  it("admin can assign admin, manager, or user", () => {
    expect(canAssignRole(UserRole.admin, UserRole.admin)).toBe(true)
    expect(canAssignRole(UserRole.admin, UserRole.manager)).toBe(true)
    expect(canAssignRole(UserRole.admin, UserRole.user)).toBe(true)
  })

  it("superadmin can assign any role", () => {
    expect(canAssignRole(UserRole.superadmin, UserRole.superadmin)).toBe(true)
    expect(canAssignRole(UserRole.superadmin, UserRole.admin)).toBe(true)
    expect(canAssignRole(UserRole.superadmin, UserRole.manager)).toBe(true)
    expect(canAssignRole(UserRole.superadmin, UserRole.user)).toBe(true)
  })

  it("manager can only assign manager or user", () => {
    expect(canAssignRole(UserRole.manager, UserRole.manager)).toBe(true)
    expect(canAssignRole(UserRole.manager, UserRole.user)).toBe(true)
    expect(canAssignRole(UserRole.manager, UserRole.admin)).toBe(false)
    expect(canAssignRole(UserRole.manager, UserRole.superadmin)).toBe(false)
  })

  it("user cannot assign anything above user", () => {
    expect(canAssignRole(UserRole.user, UserRole.user)).toBe(true)
    expect(canAssignRole(UserRole.user, UserRole.manager)).toBe(false)
  })
})
