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
      email: 'manager@demo.com',
      password: hashedPassword,
      name: 'Manager Demo',
      role: 'manager' as const,
      department: 'Human Resources',
      position: 'HR Manager',
      phone: '+62-811-2345-6789',
      isActive: true,
    },
    {
      email: 'user1@demo.com',
      password: hashedPassword,
      name: 'Employee One',
      role: 'user' as const,
      department: 'Finance',
      position: 'Accountant',
      phone: '+62-813-4567-8901',
      isActive: true,
    },
    {
      email: 'user2@demo.com',
      password: hashedPassword,
      name: 'Employee Two',
      role: 'user' as const,
      department: 'Marketing',
      position: 'Marketing Specialist',
      phone: '+62-814-5678-9012',
      isActive: true,
    },
    {
      email: 'user3@demo.com',
      password: hashedPassword,
      name: 'Employee Three',
      role: 'user' as const,
      department: 'Operations',
      position: 'Operations Coordinator',
      phone: '+62-815-6789-0123',
      isActive: true,
    },
    {
      email: 'user4@demo.com',
      password: hashedPassword,
      name: 'Employee Four',
      role: 'user' as const,
      department: 'Sales',
      position: 'Sales Representative',
      phone: '+62-816-7890-1234',
      isActive: true,
    },
    {
      email: 'manager2@demo.com',
      password: hashedPassword,
      name: 'Manager Two',
      role: 'manager' as const,
      department: 'Finance',
      position: 'Finance Manager',
      phone: '+62-817-8901-2345',
      isActive: true,
    },
    {
      email: 'user5@demo.com',
      password: hashedPassword,
      name: 'Employee Five',
      role: 'user' as const,
      department: 'IT',
      position: 'Software Developer',
      phone: '+62-818-9012-3456',
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

  // Create some activity logs for demo purposes
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } })
  const managerUser = await prisma.user.findUnique({ where: { email: 'manager@demo.com' } })

  if (adminUser) {
    await prisma.activityLog.createMany({
      data: [
        {
          userId: adminUser.id,
          action: 'LOGIN',
          resourceType: 'auth',
          details: { ip: '192.168.1.100', userAgent: 'Demo Browser' },
        },
        {
          userId: adminUser.id,
          action: 'CREATE_USER',
          resourceType: 'user',
          resourceId: managerUser?.id,
          details: { targetUser: 'manager@demo.com' },
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
