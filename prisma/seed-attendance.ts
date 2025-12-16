import { PrismaClient, AttendanceStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to create a date at a specific time
function createDateTime(baseDate: Date, hours: number, minutes: number): Date {
    const date = new Date(baseDate)
    date.setHours(hours, minutes, 0, 0)
    return date
}

// Helper function to calculate work hours between two times
function calculateWorkHours(checkIn: Date, checkOut: Date): number {
    const diffMs = checkOut.getTime() - checkIn.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    return Math.round(diffHours * 100) / 100
}

// Helper function to calculate late minutes (office starts at 08:00)
function calculateLateMinutes(checkInTime: Date): number {
    const officeStartHour = 8
    const officeStartMinute = 0
    const checkInHour = checkInTime.getHours()
    const checkInMinute = checkInTime.getMinutes()

    if (checkInHour > officeStartHour || (checkInHour === officeStartHour && checkInMinute > officeStartMinute)) {
        return (checkInHour - officeStartHour) * 60 + (checkInMinute - officeStartMinute)
    }
    return 0
}

// Helper function to calculate overtime (office ends at 17:00, 8 hours work day)
function calculateOvertime(workHours: number): number {
    const standardWorkHours = 8
    if (workHours > standardWorkHours) {
        return Math.round((workHours - standardWorkHours) * 100) / 100
    }
    return 0
}

// Dummy office location (Jakarta area)
const officeLocation = {
    latitude: -6.2088,
    longitude: 106.8456,
    address: 'Jl. Sudirman No. 1, Jakarta Pusat, DKI Jakarta',
    accuracy: 10.5,
}

async function main() {
    console.log('🌱 Seeding attendance data for 1 week...')

    // Get 5 users with different departments and roles
    const users = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'asc' },
    })

    if (users.length < 5) {
        console.error('❌ Not enough users in the database. Please run the main seed first.')
        console.log('Run: npx prisma db seed')
        process.exit(1)
    }

    console.log('\n📋 Selected Employees for Attendance Seeding:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} - ${user.department} (${user.role})`)
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Calculate dates for the last 7 days (1 week)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekDates: Date[] = []
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        weekDates.push(date)
    }

    console.log('📅 Attendance Week:')
    weekDates.forEach(date => {
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
        const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        console.log(`   ${dayName}, ${dateStr}`)
    })
    console.log('')

    // Attendance patterns for each user (varied scenarios)
    // User 0: Admin - Always on time, full attendance
    // User 1: Manager - Mostly on time, sometimes early
    // User 2: Employee 1 - Sometimes late, one absent day
    // User 3: Employee 2 - Mixed pattern, half day once
    // User 4: Employee 3 - Often late, but full attendance

    const attendancePatterns = [
        // Admin (IT) - Excellent attendance, always on time
        [
            { checkIn: [7, 50], checkOut: [17, 15], status: 'present' as AttendanceStatus },
            { checkIn: [7, 55], checkOut: [17, 30], status: 'present' as AttendanceStatus },
            { checkIn: [7, 45], checkOut: [17, 10], status: 'present' as AttendanceStatus },
            { checkIn: [7, 58], checkOut: [18, 0], status: 'present' as AttendanceStatus },
            { checkIn: [7, 52], checkOut: [17, 20], status: 'present' as AttendanceStatus },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Sabtu' },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Minggu' },
        ],
        // Manager (HR) - Good attendance, sometimes works overtime
        [
            { checkIn: [7, 30], checkOut: [18, 30], status: 'present' as AttendanceStatus },
            { checkIn: [7, 45], checkOut: [19, 0], status: 'present' as AttendanceStatus },
            { checkIn: [7, 55], checkOut: [17, 30], status: 'present' as AttendanceStatus },
            { checkIn: [8, 0], checkOut: [17, 0], status: 'present' as AttendanceStatus },
            { checkIn: [7, 40], checkOut: [18, 15], status: 'present' as AttendanceStatus },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Sabtu' },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Minggu' },
        ],
        // Employee 1 (Finance) - Sometimes late, one absent day (sick)
        [
            { checkIn: [8, 5], checkOut: [17, 10], status: 'late' as AttendanceStatus },
            { checkIn: [7, 58], checkOut: [17, 0], status: 'present' as AttendanceStatus },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Sakit - izin dokter' },
            { checkIn: [8, 15], checkOut: [17, 20], status: 'late' as AttendanceStatus },
            { checkIn: [7, 55], checkOut: [17, 5], status: 'present' as AttendanceStatus },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Sabtu' },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Minggu' },
        ],
        // Employee 2 (Legal) - Mixed pattern, half day once
        [
            { checkIn: [7, 50], checkOut: [17, 0], status: 'present' as AttendanceStatus },
            { checkIn: [8, 10], checkOut: [17, 15], status: 'late' as AttendanceStatus },
            { checkIn: [7, 55], checkOut: [17, 0], status: 'present' as AttendanceStatus },
            { checkIn: [8, 0], checkOut: [12, 30], status: 'half_day' as AttendanceStatus, notes: 'Izin keperluan keluarga' },
            { checkIn: [7, 45], checkOut: [17, 10], status: 'present' as AttendanceStatus },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Sabtu' },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Minggu' },
        ],
        // Employee 3 (Operational) - Field worker, varied times
        [
            { checkIn: [8, 20], checkOut: [18, 0], status: 'late' as AttendanceStatus, notes: 'Macet di jalan' },
            { checkIn: [7, 30], checkOut: [17, 45], status: 'present' as AttendanceStatus },
            { checkIn: [8, 5], checkOut: [17, 30], status: 'late' as AttendanceStatus },
            { checkIn: [7, 55], checkOut: [19, 0], status: 'present' as AttendanceStatus, notes: 'Lembur survey lapangan' },
            { checkIn: [8, 10], checkOut: [17, 15], status: 'late' as AttendanceStatus },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Sabtu' },
            { checkIn: null, checkOut: null, status: 'absent' as AttendanceStatus, notes: 'Weekend - Minggu' },
        ],
    ]

    let createdCount = 0
    let skippedCount = 0

    for (let userIndex = 0; userIndex < users.length; userIndex++) {
        const user = users[userIndex]
        const patterns = attendancePatterns[userIndex]

        console.log(`\n👤 Processing attendance for: ${user.name} (${user.department})`)

        for (let dayIndex = 0; dayIndex < weekDates.length; dayIndex++) {
            const date = weekDates[dayIndex]
            const pattern = patterns[dayIndex]

            // Check if attendance already exists for this user and date
            const existingRecord = await prisma.absensiRecord.findUnique({
                where: {
                    userId_date: {
                        userId: user.id,
                        date: date,
                    },
                },
            })

            if (existingRecord) {
                skippedCount++
                continue
            }

            let checkInTime: Date | null = null
            let checkOutTime: Date | null = null
            let workHours: number | null = null
            let overtimeHours = 0
            let lateMinutes = 0

            if (pattern.checkIn && pattern.checkOut) {
                checkInTime = createDateTime(date, pattern.checkIn[0], pattern.checkIn[1])
                checkOutTime = createDateTime(date, pattern.checkOut[0], pattern.checkOut[1])
                workHours = calculateWorkHours(checkInTime, checkOutTime)
                lateMinutes = calculateLateMinutes(checkInTime)
                overtimeHours = calculateOvertime(workHours)
            }

            // Add some small random variation to location coordinates
            const latVariation = (Math.random() - 0.5) * 0.0001
            const lngVariation = (Math.random() - 0.5) * 0.0001

            await prisma.absensiRecord.create({
                data: {
                    userId: user.id,
                    date: date,
                    checkInTime: checkInTime,
                    checkOutTime: checkOutTime,
                    checkInLatitude: checkInTime ? officeLocation.latitude + latVariation : null,
                    checkInLongitude: checkInTime ? officeLocation.longitude + lngVariation : null,
                    checkInAddress: checkInTime ? officeLocation.address : null,
                    checkInAccuracy: checkInTime ? officeLocation.accuracy : null,
                    checkOutLatitude: checkOutTime ? officeLocation.latitude + latVariation : null,
                    checkOutLongitude: checkOutTime ? officeLocation.longitude + lngVariation : null,
                    checkOutAddress: checkOutTime ? officeLocation.address : null,
                    checkOutAccuracy: checkOutTime ? officeLocation.accuracy : null,
                    workHours: workHours,
                    overtimeHours: overtimeHours,
                    lateMinutes: lateMinutes,
                    status: pattern.status,
                    notes: pattern.notes || null,
                },
            })

            createdCount++

            const dateStr = date.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })
            const statusEmoji =
                pattern.status === 'present'
                    ? '✅'
                    : pattern.status === 'late'
                        ? '⏰'
                        : pattern.status === 'half_day'
                            ? '🌓'
                            : '❌'
            console.log(`   ${statusEmoji} ${dateStr}: ${pattern.status}`)
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🎉 Attendance seeding completed!`)
    console.log(`   ✅ Created: ${createdCount} records`)
    console.log(`   ⏭️  Skipped: ${skippedCount} records (already exist)`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Display summary
    console.log('\n📊 Attendance Summary:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    for (const user of users) {
        const records = await prisma.absensiRecord.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: weekDates[0],
                    lte: weekDates[weekDates.length - 1],
                },
            },
        })

        const presentCount = records.filter(r => r.status === 'present').length
        const lateCount = records.filter(r => r.status === 'late').length
        const absentCount = records.filter(r => r.status === 'absent').length
        const halfDayCount = records.filter(r => r.status === 'half_day').length
        const totalWorkHours = records.reduce((sum, r) => sum + (Number(r.workHours) || 0), 0)
        const totalOvertime = records.reduce((sum, r) => sum + (Number(r.overtimeHours) || 0), 0)

        console.log(`\n${user.name} (${user.department} - ${user.role}):`)
        console.log(`   Hadir: ${presentCount} | Terlambat: ${lateCount} | Absen: ${absentCount} | Half Day: ${halfDayCount}`)
        console.log(`   Total Jam Kerja: ${totalWorkHours.toFixed(2)} jam | Lembur: ${totalOvertime.toFixed(2)} jam`)
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding attendance data:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
