import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

export class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function validateSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new HttpError("Unauthorized", 401)
  }

  return session
}

export async function getTodaysAttendance(userId: string) {
  const today = new Date()
  const startToday = startOfDay(today)
  const endToday = endOfDay(today)

  return await prisma.absensiRecord.findFirst({
    where: {
      userId: userId,
      date: {
        gte: startToday,
        lte: endToday,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}
