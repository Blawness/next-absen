import { z } from "zod"

export const periodSchema = z.enum(["weekly", "monthly"])
export const scopeSchema = z.enum(["org", "department", "user"])

export const kpiQuerySchema = z.object({
  period: periodSchema,
  scope: scopeSchema.optional(),
  department: z.string().optional(),
  userId: z.string().uuid().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
})

export const kpiResponseSchema = z.object({
  period: periodSchema,
  range: z.object({ start: z.string(), end: z.string() }),
  scope: scopeSchema,
  metrics: z.object({
    attendanceRate: z.number(),
    onTimeRate: z.number(),
    avgWorkHours: z.number(),
    totalOvertime: z.number(),
    lateCount: z.number(),
    absentCount: z.number(),
  }),
  timeseries: z.array(z.object({
    date: z.string(),
    attendanceRate: z.number(),
    onTimeRate: z.number(),
  })),
  trends: z.object({
    attendanceRate: z.object({ direction: z.enum(["up", "down", "neutral"]), change: z.number() }),
    onTimeRate: z.object({ direction: z.enum(["up", "down", "neutral"]), change: z.number() }),
    avgWorkHours: z.object({ direction: z.enum(["up", "down", "neutral"]), change: z.number() }),
    totalOvertime: z.object({ direction: z.enum(["up", "down", "neutral"]), change: z.number() }),
    lateCount: z.object({ direction: z.enum(["up", "down", "neutral"]), change: z.number() }),
    absentCount: z.object({ direction: z.enum(["up", "down", "neutral"]), change: z.number() }),
  })
})

export type PeriodType = z.infer<typeof periodSchema>
export type ScopeType = z.infer<typeof scopeSchema>
export type KpiQuery = z.infer<typeof kpiQuerySchema>
export type KpiResponse = z.infer<typeof kpiResponseSchema>



