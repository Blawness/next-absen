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
const gpsAccuracySchema = z.number().min(0)

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
  role: z.enum(["admin", "manager", "user"]).default("user"),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
})

export const userUpdateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email("Invalid email format"),
  role: z.enum(["admin", "manager", "user"]),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
})

export const bulkActionSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
  action: z.enum(["activate", "deactivate"]),
})

export const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

export const passwordResetSchema = z.object({
  newPassword: z.string().min(6).optional(),
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
