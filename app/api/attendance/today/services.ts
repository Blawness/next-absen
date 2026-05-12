import { validateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

import { HttpError } from "@/lib/errors"

export { HttpError }

export async function getTodaysAttendance(userId: string) {
  const today = new Date()
  const startToday = startOfDay(today)
  const endToday = endOfDay(today)

  // Optimization: Removed redundant orderBy since [userId, date] is unique
  return await prisma.absensiRecord.findFirst({
    where: {
      userId: userId,
      date: {
        gte: startToday,
        lte: endToday,
      },
    },
  })
}
