import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

interface BusinessHoursSettings {
  startTime: string
  endTime: string
  checkInDeadline: string
  gracePeriodMinutes: number
}

interface LocationSettings {
  officeLatitude: number
  officeLongitude: number
  geofenceRadius: number
  requireLocation: boolean
}

interface NotificationSettings {
  emailNotifications: boolean
  lateCheckinReminders: boolean
  dailySummaryEmail: boolean
}

interface SecuritySettings {
  sessionTimeout: number
  maxLoginAttempts: number
  passwordExpiryDays: number
  requireStrongPassword: boolean
}

interface SystemSettings {
  businessHours: BusinessHoursSettings
  location: LocationSettings
  notifications: NotificationSettings
  security: SecuritySettings
}

// GET /api/settings - Retrieve system settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Try to get existing settings, if none exist, return defaults
    const settings = await prisma.systemSettings.findFirst()

    if (!settings) {
      // Return default settings
      const defaultSettings = {
        businessHours: {
          startTime: "08:00",
          endTime: "17:00",
          checkInDeadline: "09:00",
          gracePeriodMinutes: 15
        },
        location: {
          officeLatitude: null,
          officeLongitude: null,
          geofenceRadius: 100,
          requireLocation: true
        },
        notifications: {
          emailNotifications: false,
          lateCheckinReminders: false,
          dailySummaryEmail: false
        },
        security: {
          sessionTimeout: 24,
          maxLoginAttempts: 5,
          passwordExpiryDays: 90,
          requireStrongPassword: false
        }
      }

      return NextResponse.json(defaultSettings)
    }

    // Parse the JSON settings from database
    const parsedSettings: SystemSettings = {
      businessHours: settings.businessHours as unknown as BusinessHoursSettings,
      location: settings.location as unknown as LocationSettings,
      notifications: settings.notifications as unknown as NotificationSettings,
      security: settings.security as unknown as SecuritySettings
    }

    return NextResponse.json(parsedSettings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Update system settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate the settings structure
    const { businessHours, location, notifications, security } = body

    if (!businessHours || !location || !notifications || !security) {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      )
    }

    // Check if settings already exist
    const existingSettings = await prisma.systemSettings.findFirst()

    if (existingSettings) {
      // Update existing settings
      const updatedSettings = await prisma.systemSettings.update({
        where: { id: existingSettings.id },
        data: {
          businessHours,
          location,
          notifications,
          security,
          updatedAt: new Date()
        }
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_SETTINGS",
          resourceType: "SYSTEM_SETTINGS",
          resourceId: updatedSettings.id,
          details: {
            updatedFields: Object.keys(body)
          }
        }
      })

      return NextResponse.json({
        message: 'Settings updated successfully',
        settings: {
          businessHours: updatedSettings.businessHours,
          location: updatedSettings.location,
          notifications: updatedSettings.notifications,
          security: updatedSettings.security
        }
      })
    } else {
      // Create new settings
      const newSettings = await prisma.systemSettings.create({
        data: {
          businessHours,
          location,
          notifications,
          security
        }
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_SETTINGS",
          resourceType: "SYSTEM_SETTINGS",
          resourceId: newSettings.id,
          details: {
            action: "INITIAL_SETUP"
          }
        }
      })

      return NextResponse.json({
        message: 'Settings created successfully',
        settings: {
          businessHours: newSettings.businessHours,
          location: newSettings.location,
          notifications: newSettings.notifications,
          security: newSettings.security
        }
      })
    }
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
