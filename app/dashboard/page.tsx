"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Map } from "@/components/ui/map"
import { Clock, MapPin, Calendar, TrendingUp, Loader2, CheckCircle } from "lucide-react"
import { STATUS_LABELS, TIME_LABELS, MESSAGES, NAVIGATION } from "@/lib/constants"
import { AttendanceStatus, UserRole } from "@prisma/client"
import { getCurrentPosition } from "@/lib/location"
import { format } from "date-fns"
import { id } from "date-fns/locale"

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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [todayAttendance, setTodayAttendance] = useState<AttendanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated" || !session) {
      redirect("/auth/signin")
      return
    }

    // Load today's attendance data
    loadTodayAttendance()
  }, [status, session])

  const loadTodayAttendance = async () => {
    try {
      const response = await fetch('/api/attendance/today')
      if (response.ok) {
        const data = await response.json()
        const parsedData = data ? {
          ...data,
          date: data.date ? new Date(data.date) : null,
          checkInTime: data.checkInTime ? new Date(data.checkInTime) : null,
          checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null,
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

        setTodayAttendance(parsedData)
      }
    } catch (error) {
      console.error('Error loading today attendance:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckIn = async () => {
    setIsCheckingIn(true)
    setMessage(null)

    try {
      const position = await getCurrentPosition()

      let address = ""
      try {
        const response = await fetch(`/api/geocode/reverse?lat=${position.latitude}&lng=${position.longitude}`)
        if (response.ok) {
          const addressData = await response.json()
          address = addressData.address || `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
        } else {
          address = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
        }
      } catch (error) {
        address = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
      }

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
    setIsCheckingOut(true)
    setMessage(null)

    try {
      const position = await getCurrentPosition()

      let address = ""
      try {
        const response = await fetch(`/api/geocode/reverse?lat=${position.latitude}&lng=${position.longitude}`)
        if (response.ok) {
          const addressData = await response.json()
          address = addressData.address || `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
        } else {
          address = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
        }
      } catch (error) {
        address = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
      }

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

      if (checkOutResponse.ok) {
        setMessage({ type: 'success', text: MESSAGES.CHECK_OUT_SUCCESS })
        setCurrentLocation({ latitude: position.latitude, longitude: position.longitude })
        await loadTodayAttendance()
      } else {
        setMessage({ type: 'error', text: data.error || MESSAGES.CHECK_OUT_FAILED })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : MESSAGES.CHECK_OUT_FAILED })
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
  const hasCheckedOut = todayAttendance?.checkOutTime !== null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{NAVIGATION.DASHBOARD}</h1>
        <p className="text-muted-foreground">
          Selamat datang kembali, {session.user.name}
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Today's Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Status Hari Ini
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayAttendance ? (
                <Badge
                  variant={todayAttendance.status === AttendanceStatus.present ? "default" :
                          todayAttendance.status === AttendanceStatus.late ? "destructive" : "secondary"}
                >
                  {STATUS_LABELS[todayAttendance.status]}
                </Badge>
              ) : (
                <Badge variant="secondary">Belum ada data</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {todayAttendance?.checkInTime && `Check-in: ${format(todayAttendance.checkInTime, 'HH:mm')}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {TIME_LABELS.WORK_HOURS} Hari Ini
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayAttendance?.workHours ? `${todayAttendance.workHours.toFixed(1)}j` : "0j"}
            </div>
            <p className="text-xs text-muted-foreground">
              {todayAttendance?.checkOutTime ? "Sudah check-out" : "Belum check-out"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {TIME_LABELS.THIS_WEEK}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              -/5
            </div>
            <p className="text-xs text-muted-foreground">
              Hari kerja minggu ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rata-rata {TIME_LABELS.WORK_HOURS}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              -j
            </div>
            <p className="text-xs text-muted-foreground">
              Per hari minggu ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>
              Check-in atau check-out dengan sekali klik
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                size="lg"
                className="h-20 flex-col space-y-2"
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
                variant="outline"
                size="lg"
                className="h-20 flex-col space-y-2"
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Lokasi Terakhir
            </CardTitle>
            <CardDescription>
              {currentLocation ?
                `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` :
                "Lokasi akan ditampilkan setelah check-in/out"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentLocation ? (
              <div className="space-y-2">
                <Map
                  latitude={currentLocation.latitude}
                  longitude={currentLocation.longitude}
                  className="aspect-video w-full"
                />
                <div className="text-sm text-muted-foreground">
                  <p>Koordinat: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</p>
                  {todayAttendance?.checkInAddress && (
                    <p>Check-in: {todayAttendance.checkInAddress}</p>
                  )}
                  {todayAttendance?.checkOutAddress && (
                    <p>Check-out: {todayAttendance.checkOutAddress}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Belum ada lokasi tersimpan
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terbaru</CardTitle>
          <CardDescription>
            Riwayat absensi terbaru Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayAttendance ? (
              <>
                {todayAttendance.checkInTime && (
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Check-in berhasil</p>
                      <p className="text-xs text-muted-foreground">
                        {format(todayAttendance.checkInTime, 'dd MMM yyyy HH:mm', { locale: id })}
                      </p>
                      {todayAttendance.checkInAddress && (
                        <p className="text-xs text-muted-foreground">
                          📍 {todayAttendance.checkInAddress}
                        </p>
                      )}
                    </div>
                    <Badge variant="default">Check-in</Badge>
                  </div>
                )}

                {todayAttendance.checkOutTime && (
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Check-out berhasil</p>
                      <p className="text-xs text-muted-foreground">
                        {format(todayAttendance.checkOutTime, 'dd MMM yyyy HH:mm', { locale: id })}
                      </p>
                      {todayAttendance.checkOutAddress && (
                        <p className="text-xs text-muted-foreground">
                          📍 {todayAttendance.checkOutAddress}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">Check-out</Badge>
                  </div>
                )}

                {!todayAttendance.checkInTime && !todayAttendance.checkOutTime && (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Belum ada aktivitas hari ini</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Memuat data aktivitas...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
