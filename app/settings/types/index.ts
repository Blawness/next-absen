export interface SystemSettings {
  businessHours: {
    startTime: string
    endTime: string
    checkInDeadline: string
    gracePeriodMinutes: number
  }
  location: {
    officeLatitude: number
    officeLongitude: number
    geofenceRadius: number
    requireLocation: boolean
  }
  notifications: {
    emailNotifications: boolean
    lateCheckinReminders: boolean
    dailySummaryEmail: boolean
  }
  security: {
    sessionTimeout: number
    maxLoginAttempts: number
    passwordExpiryDays: number
    requireStrongPassword: boolean
  }
}

export interface Message {
  type: 'success' | 'error'
  text: string
}
