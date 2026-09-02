import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// User roles as constants

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Hash passwords
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Demo users data
  const demoUsers = [
    {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin Demo',
      role: 'admin' as const,
      department: 'IT',
      position: 'System Administrator',
      phone: '+62-812-3456-7890',
      isActive: true,
    },
    {
      email: 'superadmin@demo.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'superadmin' as const,
      department: 'IT',
      position: 'Super Administrator',
      phone: '+62-811-0000-0000',
      isActive: true,
    },
  ]

  // Create users
  for (const userData of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    })
    console.log(`✅ Created/Updated user: ${user.name} (${user.email}) - Role: ${user.role}`)
  }

  // Seed default SystemSettings so the geofence / business-hours checks
  // have a sensible baseline out of the box. Admins can edit these in
  // the Settings page; this seed only runs if no settings row exists.
  const existingSettings = await prisma.systemSettings.findFirst()
  if (!existingSettings) {
    await prisma.systemSettings.create({
      data: {
        businessHours: {
          startTime: '08:00',
          endTime: '17:00',
          checkInDeadline: '09:00',
          gracePeriodMinutes: 15,
        },
        location: {
          officeLatitude: null,
          officeLongitude: null,
          geofenceRadius: 100,
          requireLocation: false, // disabled by default until admin configures office
        },
        notifications: {
          emailNotifications: false,
          lateCheckinReminders: false,
          dailySummaryEmail: false,
        },
        security: {
          sessionTimeout: 24,
          maxLoginAttempts: 5,
          passwordExpiryDays: 90,
          requireStrongPassword: false,
        },
      },
    })
    console.log('✅ Created default SystemSettings (location verification disabled until office is configured)')
  }

  // Create some activity logs for demo purposes
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } })

  if (adminUser) {
    await prisma.activityLog.createMany({
      data: [
        {
          userId: adminUser.id,
          action: 'LOGIN',
          resourceType: 'auth',
          details: { ip: '192.168.1.100', userAgent: 'Demo Browser' },
        },
      ],
      skipDuplicates: true,
    })
    console.log('✅ Created activity logs for demo admin')
  }

  console.log('🎉 Seeding completed successfully!')
  console.log('\n📋 Demo Accounts:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  demoUsers.forEach(user => {
    console.log(`Email: ${user.email}`)
    console.log(`Password: password123`)
    console.log(`Role: ${user.role}`)
    console.log(`Department: ${user.department}`)
    console.log(`Position: ${user.position}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  })
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
