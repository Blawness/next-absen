import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/settings - Retrieve system settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
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
    const parsedSettings = {
      businessHours: settings.businessHours as any,
      location: settings.location as any,
      notifications: settings.notifications as any,
      security: settings.security as any
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

    if (!session || session.user.role !== UserRole.ADMIN) {
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
