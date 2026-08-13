import { z } from "zod/v4"
import { NextRequest } from "next/server"
import { HttpError } from "./errors"

export async function parseBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new HttpError("Invalid JSON body", 400)
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    const message = firstIssue?.message ?? "Validation failed"
    throw new HttpError(message, 400)
  }

  return result.data
}

export function parseSearchParams(
  request: NextRequest,
  keys: string[]
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const key of keys) {
    result[key] = request.nextUrl.searchParams.get(key) ?? undefined
  }
  return result
}

const gpsLatSchema = z.number().min(-90).max(90)
const gpsLngSchema = z.number().min(-180).max(180)
const gpsAccuracySchema = z.number().min(1).max(5000)

export const checkInSchema = z.object({
  latitude: gpsLatSchema,
  longitude: gpsLngSchema,
  accuracy: gpsAccuracySchema,
  address: z.string(),
})

export const checkOutSchema = z.object({
  latitude: gpsLatSchema,
  longitude: gpsLngSchema,
  accuracy: gpsAccuracySchema,
  address: z.string(),
})

export const autoCheckInSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  latitude: gpsLatSchema,
  longitude: gpsLngSchema,
  accuracy: gpsAccuracySchema,
  notes: z.string().max(500).optional(),
})

export const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["superadmin", "admin", "manager", "user"]).default("user"),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
})

export const userUpdateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email("Invalid email format"),
  role: z.enum(["superadmin", "admin", "manager", "user"]),
  // Password changes go through /api/users/[id]/reset-password, NOT here.
  // Allowing it on the generic update endpoint bypassed the dedicated
  // RESET_PASSWORD audit log action.
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
})

export const bulkActionSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
  action: z.enum(["activate", "deactivate"]),
})

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
  // department/position are intentionally NOT here — they're
  // managed by admins via the Users page. Allowing self-edit lets
  // a user "move" themselves to another department and (after
  // re-login) access that department's data.
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

export const passwordResetSchema = z.object({
  newPassword: z.string().min(6).optional(),
  // The password-reset dialog uses `customPassword`; accept either name
  // for backwards compatibility.
  customPassword: z.string().min(6).optional(),
  sendEmail: z.boolean().optional(),
})

export const apiKeyCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scope: z
    .enum(["attendance:readwrite", "attendance:read", "attendance:auto-checkin"])
    .optional(),
})

export const apiKeyUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scope: z
    .enum(["attendance:readwrite", "attendance:read", "attendance:auto-checkin"])
    .optional(),
  isActive: z.boolean().optional(),
})

export const attendanceCreateSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  date: z.string().min(1, "Date is required"),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  status: z.enum(["present", "late", "absent", "half_day"]).optional(),
  notes: z.string().max(500).optional(),
})

export const attendanceUpdateSchema = z.object({
  id: z.string().min(1, "Record ID is required"),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  status: z.enum(["present", "late", "absent", "half_day"]).optional(),
  notes: z.string().max(500).nullable().optional(),
}).refine(
  (data) => data.checkInTime !== undefined || data.checkOutTime !== undefined || data.status !== undefined || data.notes !== undefined,
  { message: "At least one field to update is required" }
)

export const attendanceDeleteSchema = z.object({
  id: z.string().min(1, "Record ID is required"),
})
