
import { PrismaClient, AttendanceStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding KPI data...')

    const admin = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } })
    if (!admin) {
        console.error('Admin user not found')
        return
    }

    const today = new Date()
    // Set to midnight UTC to avoid timezone issues with @db.Date
    const todayMidnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

    const startOfWeek = new Date(todayMidnight)
    const day = startOfWeek.getUTCDay()
    const diff = startOfWeek.getUTCDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    startOfWeek.setUTCDate(diff)

    // Create records for Mon, Tue, Wed...
    const daysToSeed = 5

    for (let i = 0; i < daysToSeed; i++) {
        const date = new Date(startOfWeek)
        date.setUTCDate(startOfWeek.getUTCDate() + i)

        // Skip if future
        if (date > todayMidnight) break

        // Delete existing to avoid upsert issues with dates
        await prisma.absensiRecord.deleteMany({
            where: {
                userId: admin.id,
                date: date,
            }
        })

        const checkIn = new Date(date)
        checkIn.setUTCHours(1, 0, 0, 0) // 8 AM WIB is 1 AM UTC

        const checkOut = new Date(date)
        checkOut.setUTCHours(10, 0, 0, 0) // 5 PM WIB is 10 AM UTC

        await prisma.absensiRecord.create({
            data: {
                userId: admin.id,
                date: date,
                checkInTime: checkIn,
                checkOutTime: checkOut,
                workHours: 9,
                status: AttendanceStatus.present,
                lateMinutes: 0,
                overtimeHours: 0,
            }
        })
        console.log(`Created record for ${date.toISOString().slice(0, 10)}`)
    }

    console.log('✅ KPI data seeded')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
