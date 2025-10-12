"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Clock,
  MapPin,
  CheckCircle,
  Loader2,
  History
} from "lucide-react"
import { STATUS_LABELS, TIME_LABELS, MESSAGES, NAVIGATION } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"
import { getCurrentPosition } from "@/lib/location"
import { format } from "date-fns"
import { AttendanceSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { id } from "date-fns/locale"
import { Map } from "@/components/ui/map"
import { motion } from "framer-motion"

interface AttendanceData {
  id: string
  date: Date
  checkInTime: Date | null
  checkOutTime: Date | null
  checkInLatitude: number | null
  checkInLongitude: number | null
  checkInAddress: string | null
  checkInAccuracy: number | null
  checkOutLatitude: number | null
  checkOutLongitude: number | null
  checkOutAddress: string | null
  checkOutAccuracy: number | null
  workHours: number | null
  overtimeHours: number | null
  lateMinutes: number | null
  status: AttendanceStatus
  notes: string | null
}

interface AttendanceHistoryData {
  id: string
  date: Date
  checkInTime: Date | null
  checkOutTime: Date | null
  checkInAddress: string | null
  checkOutAddress: string | null
  status: AttendanceStatus
}

export default function AttendancePage() {
  const { data: session, status } = useSession()
  const [todayAttendance, setTodayAttendance] = useState<AttendanceData | null>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    // Wait for session to be loaded
    if (status === "loading") {
      return
    }

    // If no session, redirect to signin
    if (status === "unauthenticated" || !session) {
      redirect("/auth/signin")
      return
    }

    // Load data when session is authenticated
    if (status === "authenticated" && session) {
      const loadData = async () => {
        try {
          await Promise.all([loadTodayAttendance(), loadAttendanceHistory()])
        } catch (error) {
          console.error('Error loading attendance data:', error)
        } finally {
          setIsLoading(false)
        }
      }

      loadData()
    }
  }, [status, session])

  const loadTodayAttendance = async () => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/attendance/today', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log('loadTodayAttendance - received data:', data)

        // Parse date strings back to Date objects and numeric strings to numbers
        const parsedData = data ? {
          ...data,
          date: data.date ? new Date(data.date) : null,
          checkInTime: data.checkInTime ? new Date(data.checkInTime) : null,
          checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null,
          createdAt: data.createdAt ? new Date(data.createdAt) : null,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
          // Parse numeric fields
          checkInLatitude: data.checkInLatitude ? Number(data.checkInLatitude) : null,
          checkInLongitude: data.checkInLongitude ? Number(data.checkInLongitude) : null,
          checkInAccuracy: data.checkInAccuracy ? Number(data.checkInAccuracy) : null,
          checkOutLatitude: data.checkOutLatitude ? Number(data.checkOutLatitude) : null,
          checkOutLongitude: data.checkOutLongitude ? Number(data.checkOutLongitude) : null,
          checkOutAccuracy: data.checkOutAccuracy ? Number(data.checkOutAccuracy) : null,
          workHours: data.workHours ? Number(data.workHours) : null,
          overtimeHours: data.overtimeHours ? Number(data.overtimeHours) : null,
          lateMinutes: data.lateMinutes ? Number(data.lateMinutes) : null,
        } : null

        console.log('loadTodayAttendance - parsed data:', parsedData)
        setTodayAttendance(parsedData)
      } else {
        console.error('Failed to fetch today attendance:', response.statusText)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout: Could not load today attendance')
      } else {
        console.error('Error loading today attendance:', error)
      }
    }
  }

  const loadAttendanceHistory = async () => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/attendance/history?limit=30', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const history: AttendanceHistoryData[] = await response.json()
        setAttendanceHistory(history)
      } else {
        console.error('Failed to fetch attendance history:', response.statusText)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout: Could not load attendance history')
      } else {
        console.error('Error loading attendance history:', error)
      }
    }
  }

  const handleCheckIn = async () => {
    setIsCheckingIn(true)
    setMessage(null)

    try {
      // Get current location directly
      const position = await getCurrentPosition()
      console.log('Check-in GPS data:', {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        timestamp: position.timestamp
      })

      // Get address using reverse geocoding (now returns coordinates as address)
      let address = ""
      try {
        const response = await fetch(`/api/geocode/reverse?lat=${position.latitude}&lng=${position.longitude}`)
        if (response.ok) {
          const addressData = await response.json()
          address = addressData.address || `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
        } else {
          console.warn('Reverse geocoding failed, using coordinates as address')
          address = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
        }
      } catch (error) {
        console.error('Error getting address, using coordinates as fallback:', error)
        address = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
      }

      // Perform check-in
      const checkInResponse = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: position.latitude,
          longitude: position.longitude,
          address: address,
          accuracy: position.accuracy,
        }),
      })

      const data = await checkInResponse.json()

      if (checkInResponse.ok) {
        setMessage({ type: 'success', text: MESSAGES.CHECK_IN_SUCCESS })
        setCurrentLocation({ latitude: position.latitude, longitude: position.longitude })
        await loadTodayAttendance()
        // Small delay to ensure state is properly updated
        await new Promise(resolve => setTimeout(resolve, 100))
        console.log('After check-in - todayAttendance:', todayAttendance)
      } else {
        setMessage({ type: 'error', text: data.error || MESSAGES.CHECK_IN_FAILED })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : MESSAGES.CHECK_IN_FAILED })
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    console.log('handleCheckOut called - current state:', {
      todayAttendance,
      canCheckIn,
      canCheckOut,
      hasCheckedOut
    })

    setIsCheckingOut(true)
    setMessage(null)

    try {
      // Get current location directly
      const position = await getCurrentPosition()
      console.log('Check-out GPS data:', {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        timestamp: position.timestamp
      })

      // Get address using reverse geocoding (now returns coordinates as address)
      let address = ""
      try {
        const response = await fetch(`/api/geocode/reverse?lat=${position.latitude}&lng=${position.longitude}`)
        if (response.ok) {
          const addressData = await response.json()
          address = addressData.address || `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
        } else {
          console.warn('Reverse geocoding failed, using coordinates as address')
          address = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
        }
      } catch (error) {
        console.error('Error getting address, using coordinates as fallback:', error)
        address = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
      }

      // Perform check-out
      console.log('Attempting checkout with data:', {
        latitude: position.latitude,
        longitude: position.longitude,
        address: address,
        accuracy: position.accuracy,
      })

      const checkOutResponse = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: position.latitude,
          longitude: position.longitude,
          address: address,
          accuracy: position.accuracy,
        }),
      })

      const data = await checkOutResponse.json()
      console.log('Checkout response:', data)

      if (checkOutResponse.ok) {
        setMessage({ type: 'success', text: MESSAGES.CHECK_OUT_SUCCESS })
        setCurrentLocation({ latitude: position.latitude, longitude: position.longitude })
        await loadTodayAttendance()
      } else {
        console.error('Checkout failed:', data.error)
        setMessage({ type: 'error', text: data.error || MESSAGES.CHECK_OUT_FAILED })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : MESSAGES.CHECK_OUT_FAILED })
    } finally {
      setIsCheckingOut(false)
    }
  }

  // Show loading while session is loading or data is loading
  if (status === "loading" || isLoading) {
    return <AttendanceSkeleton />
  }

  const canCheckIn = !todayAttendance?.checkInTime
  const canCheckOut = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime
  const hasCheckedOut = todayAttendance?.checkOutTime !== null

  console.log('Attendance state:', {
    todayAttendance,
    canCheckIn,
    canCheckOut,
    hasCheckedOut,
    checkInTime: todayAttendance?.checkInTime,
    checkOutTime: todayAttendance?.checkOutTime,
    checkInTimeType: typeof todayAttendance?.checkInTime,
    checkOutTimeType: typeof todayAttendance?.checkOutTime,
    checkInTimeValue: todayAttendance?.checkInTime,
    checkOutTimeValue: todayAttendance?.checkOutTime,
    checkInTimeTruthy: !!todayAttendance?.checkInTime,
    checkOutTimeFalsy: !todayAttendance?.checkOutTime
  })

  return (
    <div className="space-y-8">
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.ATTENDANCE}
        </h1>
        <p className="text-white/80 text-lg">
          Kelola absensi harian Anda dengan mudah
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">Aksi Absensi Hari Ini</CardTitle>
            <CardDescription className="text-white/70">
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="glass"
              size="lg"
              className="h-24 flex-col space-y-2"
              onClick={handleCheckIn}
              disabled={!canCheckIn || isCheckingIn}
            >
              {isCheckingIn && <Loader2 className="h-6 w-6 animate-spin" />}
              {!isCheckingIn && <CheckCircle className="h-6 w-6" />}
              <span className="font-semibold">
                {todayAttendance?.checkInTime ? "Sudah Check-in" : "Check In"}
              </span>
              <span className="text-sm opacity-80">
                {todayAttendance?.checkInTime ?
                  format(todayAttendance.checkInTime, "HH:mm") :
                  "Klik untuk absen masuk"
                }
              </span>
            </Button>

            <Button
              variant="glassOutline"
              size="lg"
              className="h-24 flex-col space-y-2"
              onClick={handleCheckOut}
              disabled={!canCheckOut || isCheckingOut}
            >
              {isCheckingOut && <Loader2 className="h-6 w-6 animate-spin" />}
              {!isCheckingOut && <CheckCircle className="h-6 w-6" />}
              <span className="font-semibold">
                {hasCheckedOut ? "Sudah Check-out" : "Check Out"}
              </span>
              <span className="text-sm opacity-80">
                {todayAttendance?.checkOutTime ?
                  format(todayAttendance.checkOutTime, "HH:mm") :
                  "Klik untuk absen pulang"
                }
              </span>
            </Button>
          </div>

          {message && (
            <Alert variant={message.type === 'success' ? 'default' : 'destructive'} className="mt-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        </Card>
      </motion.div>

      {/* Today's Status */}
      {todayAttendance && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5" />
                Status Hari Ini
              </CardTitle>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium">Status</p>
                <Badge
                  variant={todayAttendance.status === AttendanceStatus.present ? "default" : "secondary"}
                  className="mt-1"
                >
                  {STATUS_LABELS[todayAttendance.status]}
                </Badge>
              </div>

              <div className="text-center">
                <p className="text-sm font-medium">{TIME_LABELS.CHECK_IN_TIME}</p>
                <p className="text-sm text-muted-foreground">
                  {todayAttendance.checkInTime ?
                    format(todayAttendance.checkInTime, "HH:mm") :
                    "-"
                  }
                </p>
                {todayAttendance.checkInAddress && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {todayAttendance.checkInAddress}
                  </p>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm font-medium">{TIME_LABELS.CHECK_OUT_TIME}</p>
                <p className="text-sm text-muted-foreground">
                  {todayAttendance.checkOutTime ?
                    format(todayAttendance.checkOutTime, "HH:mm") :
                    "-"
                  }
                </p>
                {todayAttendance.checkOutAddress && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {todayAttendance.checkOutAddress}
                  </p>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm font-medium">{TIME_LABELS.WORK_HOURS}</p>
                <p className="text-sm text-muted-foreground">
                  {todayAttendance.workHours && typeof todayAttendance.workHours === 'number' ?
                    `${todayAttendance.workHours.toFixed(1)}j` :
                    "-"
                  }
                </p>
              </div>
            </div>
          </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Current Location Map */}
      {currentLocation && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="h-5 w-5" />
                Lokasi Terakhir
              </CardTitle>
              <CardDescription className="text-white/70">
                Peta menunjukkan lokasi check-in atau check-out terakhir Anda
              </CardDescription>
            </CardHeader>
          <CardContent>
            <Map
              latitude={currentLocation.latitude}
              longitude={currentLocation.longitude}
              className="h-64 w-full"
            />
            <div className="mt-4 text-sm text-white/80">
              <p>Koordinat: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</p>
            </div>
          </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Attendance History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <History className="h-5 w-5" />
              Riwayat Absensi
            </CardTitle>
            <CardDescription className="text-white/70">
              Data absensi 7 hari terakhir
            </CardDescription>
          </CardHeader>
        <CardContent>
          {attendanceHistory.length > 0 ? (
            <div className="space-y-3">
              {attendanceHistory.map((record, index) => (
                <div key={record.id || index} className="flex items-center justify-between p-3 border border-white/20 rounded-lg bg-white/5">
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {format(record.date, "EEE, d MMM", { locale: id })}
                    </p>
                    <div className="flex gap-4 text-sm text-white/70">
                      <span>
                        Masuk: {record.checkInTime ? format(record.checkInTime, "HH:mm") : "-"}
                      </span>
                      <span>
                        Pulang: {record.checkOutTime ? format(record.checkOutTime, "HH:mm") : "-"}
                      </span>
                    </div>
                    {(record.checkInAddress || record.checkOutAddress) && (
                      <div className="text-xs text-white/60 mt-1">
                        {record.checkInAddress && <span>📍 {record.checkInAddress}</span>}
                        {record.checkInAddress && record.checkOutAddress && <span> • </span>}
                        {record.checkOutAddress && <span>📍 {record.checkOutAddress}</span>}
                      </div>
                    )}
                  </div>
                  <Badge variant={record.status === AttendanceStatus.present ? "default" : "secondary"}>
                    {STATUS_LABELS[record.status]}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60">Belum ada data riwayat absensi</p>
            </div>
          )}
        </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
