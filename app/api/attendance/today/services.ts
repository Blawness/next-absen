import { validateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getOfficeDayBounds } from "@/lib/office-time"
import { maybeSweepAutoCheckout } from "@/lib/auto-checkout"

import { HttpError } from "@/lib/errors"

export { HttpError }

export async function getTodaysAttendance(userId: string) {
  // Close any shift that ran past the configured limit before reading, so
  // the user never sees a stale "still checked in" state. Cheap and
  // throttled; see lib/auto-checkout.ts.
  await maybeSweepAutoCheckout()

  // "Today" is the office date (see lib/office-time.ts), whatever the
  // server's timezone.
  const { start, end } = getOfficeDayBounds()

  // Optimization: Removed redundant orderBy since [userId, date] is unique
  return await prisma.absensiRecord.findFirst({
    where: {
      userId: userId,
      date: {
        gte: start,
        lt: end,
      },
    },
  })
}
