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
  AlertCircle,
  Loader2,
  Calendar,
  Timer
} from "lucide-react"
import { STATUS_LABELS, TIME_LABELS, MESSAGES, NAVIGATION } from "@/lib/constants"
import { AttendanceStatus, UserRole } from "@prisma/client"
import { getCurrentPosition, validateLocation } from "@/lib/location"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface LocationData {
  latitude: number
  longitude: number
  address?: string
  accuracy: number
}

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

export default function AttendancePage() {
  const { data: session, status } = useSession()
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string>("")
  const [todayAttendance, setTodayAttendance] = useState<AttendanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Office location (default Jakarta)
  const officeLocation = {
    center: {
      latitude: -6.2088,
      longitude: 106.8456,
    },
    radius: 100, // 100 meters
    tolerance: 10 // 10 meters accuracy tolerance
  }

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      redirect("/auth/signin")
      return
    }

    loadTodayAttendance()
  }, [session, status])

  const loadTodayAttendance = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/attendance/today')
      if (response.ok) {
        const data = await response.json()
        setTodayAttendance(data)
      }
    } catch (error) {
      console.error('Error loading today attendance:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentLocation = async () => {
    setIsGettingLocation(true)
    setLocationError("")

    try {
      const position = await getCurrentPosition()
      setCurrentLocation(position)

      // Get address using reverse geocoding
      try {
        const response = await fetch(`/api/geocode/reverse?lat=${position.latitude}&lng=${position.longitude}`)
        if (response.ok) {
          const addressData = await response.json()
          setCurrentLocation(prev => prev ? { ...prev, address: addressData.address } : null)
        }
      } catch (error) {
        console.error('Error getting address:', error)
      }
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Gagal mendapatkan lokasi')
    } finally {
      setIsGettingLocation(false)
    }
  }

  const handleCheckIn = async () => {
    if (!currentLocation) {
      setLocationError("Dapatkan lokasi terlebih dahulu")
      return
    }

    // Validate location against office geofence
    const isValidLocation = validateLocation(currentLocation, officeLocation)
    if (!isValidLocation) {
      setLocationError(`Lokasi Anda (${currentLocation.accuracy.toFixed(1)}m akurasi) di luar radius kantor (${officeLocation.radius}m)`)
      return
    }

    setIsCheckingIn(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          address: currentLocation.address,
          accuracy: currentLocation.accuracy,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: MESSAGES.CHECK_IN_SUCCESS })
        await loadTodayAttendance()
      } else {
        setMessage({ type: 'error', text: data.error || MESSAGES.CHECK_IN_FAILED })
      }
    } catch (error) {
      setMessage({ type: 'error', text: MESSAGES.CHECK_IN_FAILED })
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    if (!currentLocation) {
      setLocationError("Dapatkan lokasi terlebih dahulu")
      return
    }

    // Validate location against office geofence
    const isValidLocation = validateLocation(currentLocation, officeLocation)
    if (!isValidLocation) {
      setLocationError(`Lokasi Anda (${currentLocation.accuracy.toFixed(1)}m akurasi) di luar radius kantor (${officeLocation.radius}m)`)
      return
    }

    setIsCheckingOut(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          address: currentLocation.address,
          accuracy: currentLocation.accuracy,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: MESSAGES.CHECK_OUT_SUCCESS })
        await loadTodayAttendance()
      } else {
        setMessage({ type: 'error', text: data.error || MESSAGES.CHECK_OUT_FAILED })
      }
    } catch (error) {
      setMessage({ type: 'error', text: MESSAGES.CHECK_OUT_FAILED })
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{MESSAGES.LOADING}</p>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect("/auth/signin")
  }

  const canCheckIn = !todayAttendance?.checkInTime
  const canCheckOut = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{NAVIGATION.ATTENDANCE}</h1>
        <p className="text-muted-foreground">
          Kelola absensi harian Anda dengan GPS tracking
        </p>
      </div>

      {/* Current Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Lokasi Saat Ini
          </CardTitle>
          <CardDescription>
            Pastikan GPS aktif untuk mendapatkan lokasi yang akurat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentLocation ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Klik tombol di bawah untuk mendapatkan lokasi Anda
              </p>
              <Button onClick={getCurrentLocation} disabled={isGettingLocation}>
                {isGettingLocation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isGettingLocation ? "Mendapatkan Lokasi..." : "Dapatkan Lokasi"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Koordinat</p>
                  <p className="text-sm text-muted-foreground">
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Akurasi</p>
                  <p className="text-sm text-muted-foreground">
                    {currentLocation.accuracy.toFixed(1)} meter
                  </p>
                </div>
              </div>

              {currentLocation.address && (
                <div>
                  <p className="text-sm font-medium">Alamat</p>
                  <p className="text-sm text-muted-foreground">
                    {currentLocation.address}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Perbarui Lokasi
                </Button>

                {currentLocation && !validateLocation(currentLocation, officeLocation) && (
                  <Badge variant="destructive">
                    Di Luar Area Kantor
                  </Badge>
                )}

                {currentLocation && validateLocation(currentLocation, officeLocation) && (
                  <Badge variant="default">
                    Dalam Area Kantor
                  </Badge>
                )}
              </div>
            </div>
          )}

          {locationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Today's Attendance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Status Absensi Hari Ini
          </CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAttendance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium">Status</p>
                  <Badge
                    variant={
                      todayAttendance.status === AttendanceStatus.present ? "default" :
                      todayAttendance.status === AttendanceStatus.late ? "destructive" : "secondary"
                    }
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
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium">{TIME_LABELS.CHECK_OUT_TIME}</p>
                  <p className="text-sm text-muted-foreground">
                    {todayAttendance.checkOutTime ?
                      format(todayAttendance.checkOutTime, "HH:mm") :
                      "-"
                    }
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium">{TIME_LABELS.WORK_HOURS}</p>
                  <p className="text-sm text-muted-foreground">
                    {todayAttendance.workHours ?
                      `${todayAttendance.workHours.toFixed(1)}j` :
                      "-"
                    }
                  </p>
                </div>
              </div>

              {todayAttendance.lateMinutes && todayAttendance.lateMinutes > 0 && (
                <Alert>
                  <Timer className="h-4 w-4" />
                  <AlertDescription>
                    Terlambat {todayAttendance.lateMinutes} menit dari jadwal masuk (08:00)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada data absensi hari ini</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in/Check-out Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Absensi</CardTitle>
          <CardDescription>
            Check-in di pagi hari dan check-out di sore hari
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              size="lg"
              className="h-20 flex-col space-y-2"
              onClick={handleCheckIn}
              disabled={!canCheckIn || !currentLocation || !validateLocation(currentLocation, officeLocation)}
            >
              {isCheckingIn && <Loader2 className="h-6 w-6 animate-spin" />}
              {!isCheckingIn && <CheckCircle className="h-6 w-6" />}
              <span>{todayAttendance?.checkInTime ? "Sudah Check-in" : "Check In"}</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-20 flex-col space-y-2"
              onClick={handleCheckOut}
              disabled={!canCheckOut || !currentLocation || !validateLocation(currentLocation, officeLocation)}
            >
              {isCheckingOut && <Loader2 className="h-6 w-6 animate-spin" />}
              {!isCheckingOut && <CheckCircle className="h-6 w-6" />}
              <span>{todayAttendance?.checkOutTime ? "Sudah Check-out" : "Check Out"}</span>
            </Button>
          </div>

          {message && (
            <Alert variant={message.type === 'success' ? 'default' : 'destructive'} className="mt-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            <p>• Check-in hanya dapat dilakukan antara 06:00 - 10:00</p>
            <p>• Check-out hanya dapat dilakukan setelah check-in</p>
            <p>• Pastikan lokasi Anda dalam radius 100m dari kantor</p>
            <p>• Akurasi GPS maksimal 10 meter untuk validasi</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Absensi Terbaru</CardTitle>
          <CardDescription>
            Data absensi 7 hari terakhir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Riwayat absensi akan ditampilkan di sini</p>
            <p className="text-sm text-muted-foreground mt-2">
              (Fitur ini akan diimplementasikan pada tahap berikutnya)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
