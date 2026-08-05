import { UserRole } from "@prisma/client"

// Permission definitions
export enum Permission {
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Attendance Management
  ABSENSI_CREATE = 'absensi:create',
  ABSENSI_READ = 'absensi:read',
  ABSENSI_UPDATE = 'absensi:update',
  ABSENSI_DELETE = 'absensi:delete',
  ABSENSI_MANAGE = 'absensi:manage',

  // Reports
  REPORT_READ = 'report:read',
  REPORT_EXPORT = 'report:export',

  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update'
}

// Role permissions mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  superadmin: Object.values(Permission),
  admin: Object.values(Permission).filter(p => p !== Permission.ABSENSI_MANAGE),
  manager: [
    Permission.USER_READ,
    Permission.ABSENSI_CREATE,
    Permission.ABSENSI_READ,
    Permission.ABSENSI_UPDATE,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.SETTINGS_READ
  ],
  user: [
    Permission.ABSENSI_CREATE,
    Permission.ABSENSI_READ,
    Permission.REPORT_READ
  ]
}

// Check if user has specific permission
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return rolePermissions[userRole].includes(permission)
}

// Check if user can access resource
export function canAccess(userRole: UserRole, resource: string, action: string): boolean {
  const permission = `${resource}:${action}` as Permission
  return hasPermission(userRole, permission)
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role]
}

// Check if user is admin
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.admin || role === UserRole.superadmin
}

// Check if user is manager or admin
export function isManagerOrAdmin(role: UserRole): boolean {
  return role === UserRole.manager || role === UserRole.admin || role === UserRole.superadmin
}

// Check if user can manage users
export function canManageUsers(role: UserRole): boolean {
  return role === UserRole.admin || role === UserRole.superadmin
}

// Check if user can export reports
export function canExportReports(role: UserRole): boolean {
  return hasPermission(role, Permission.REPORT_EXPORT)
}

// Role hierarchy rank. A caller can only assign a role with rank <= their own.
// This prevents a regular admin from minting superadmins (BUG-007 — privilege escalation).
const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.user]: 0,
  [UserRole.manager]: 1,
  [UserRole.admin]: 2,
  [UserRole.superadmin]: 3,
}

/**
 * Check if `caller` is allowed to assign `target` to another user.
 *
 * Rules:
 * - A caller can never assign a role higher than their own.
 * - Only superadmins can create or promote other superadmins.
 * - Admins can create/promote admin/manager/user.
 *
 * @example
 *   canAssignRole(UserRole.admin, UserRole.superadmin) // false
 *   canAssignRole(UserRole.admin, UserRole.admin)      // true
 *   canAssignRole(UserRole.superadmin, UserRole.superadmin) // true
 */
export function canAssignRole(caller: UserRole, target: UserRole): boolean {
  const callerRank = ROLE_RANK[caller] ?? -1
  const targetRank = ROLE_RANK[target] ?? -1
  return callerRank >= targetRank
}
