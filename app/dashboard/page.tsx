"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Map } from "@/components/ui/map"
import { DashboardSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { Clock, MapPin, Calendar, TrendingUp, Loader2, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { STATUS_LABELS, TIME_LABELS, MESSAGES, NAVIGATION } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"
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

interface LastLocationData {
  checkInAddress: string | null
  checkOutAddress: string | null
  checkInLatitude: number | null
  checkInLongitude: number | null
  checkOutLatitude: number | null
  checkOutLongitude: number | null
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [todayAttendance, setTodayAttendance] = useState<AttendanceData | null>(null)
  const [lastLocation, setLastLocation] = useState<LastLocationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Helper function to format address display
  const formatAddress = (address?: string) => {
    if (!address) return null

    // If address starts with "Koordinat:", extract the coordinates part
    if (address.startsWith('Koordinat:')) {
      const coordsMatch = address.match(/Koordinat:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
      if (coordsMatch) {
        return `${coordsMatch[1]}, ${coordsMatch[2]}`
      }
    }

    return address
  }

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated" || !session) {
      redirect("/auth/signin")
      return
    }

    // Load today's attendance data and last location
    loadTodayAttendance()
    loadLastLocation()
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

  const loadLastLocation = async () => {
    try {
      const response = await fetch('/api/attendance/history?limit=1&offset=0')
      if (response.ok) {
        const history = await response.json()
        if (history && history.length > 0) {
          const lastRecord = history[0]
          setLastLocation({
            checkInAddress: lastRecord.checkInAddress,
            checkOutAddress: lastRecord.checkOutAddress,
            checkInLatitude: lastRecord.checkInLatitude ? Number(lastRecord.checkInLatitude) : null,
            checkInLongitude: lastRecord.checkInLongitude ? Number(lastRecord.checkInLongitude) : null,
            checkOutLatitude: lastRecord.checkOutLatitude ? Number(lastRecord.checkOutLatitude) : null,
            checkOutLongitude: lastRecord.checkOutLongitude ? Number(lastRecord.checkOutLongitude) : null,
          })
        }
      }
    } catch (error) {
      console.error('Error loading last location:', error)
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
      } catch {
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
        await loadTodayAttendance()
        await loadLastLocation() // Refresh last location after check-in
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
      } catch {
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
        await loadTodayAttendance()
        await loadLastLocation() // Refresh last location after check-out
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
    return <DashboardSkeleton />
  }

  if (!session) {
    redirect("/auth/signin")
  }

  const canCheckIn = !todayAttendance?.checkInTime
  const canCheckOut = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime
  const hasCheckedOut = todayAttendance?.checkOutTime !== null

  return (
    <div className="space-y-8">
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.DASHBOARD}
        </h1>
        <p className="text-white/80 text-lg">
          Selamat datang kembali, {session.user.name}
        </p>
      </motion.div>

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Today's Status */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card variant="glass" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-white">
                Status Hari Ini
              </CardTitle>
              <Clock className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {todayAttendance ? (
                  <Badge
                    variant={todayAttendance.status === AttendanceStatus.present ? "default" :
                            todayAttendance.status === AttendanceStatus.late ? "destructive" : "secondary"}
                    className="text-sm"
                  >
                    {STATUS_LABELS[todayAttendance.status]}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-sm">Belum ada data</Badge>
                )}
              </div>
              <p className="text-xs text-white/60">
                {todayAttendance?.checkInTime && `Check-in: ${format(todayAttendance.checkInTime, 'HH:mm')}`}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card variant="glass" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-white">
                {TIME_LABELS.WORK_HOURS} Hari Ini
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {todayAttendance?.workHours ? `${todayAttendance.workHours.toFixed(1)}j` : "0j"}
              </div>
              <p className="text-xs text-white/60">
                {todayAttendance?.checkOutTime ? "Sudah check-out" : "Belum check-out"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card variant="glass" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-white">
                {TIME_LABELS.THIS_WEEK}
              </CardTitle>
              <Calendar className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                -/5
              </div>
              <p className="text-xs text-white/60">
                Hari kerja minggu ini
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card variant="glass" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-white">
                Rata-rata {TIME_LABELS.WORK_HOURS}
              </CardTitle>
              <MapPin className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                -j
              </div>
              <p className="text-xs text-white/60">
                Per hari minggu ini
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">Aksi Cepat</CardTitle>
              <CardDescription className="text-white/70">
                Check-in atau check-out dengan sekali klik
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="h-5 w-5" />
                Lokasi Terakhir
              </CardTitle>
              <CardDescription className="text-white/70">
                {lastLocation ?
                  "Lokasi check-in atau check-out terakhir Anda" :
                  "Belum ada data lokasi tersimpan"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastLocation ? (
                <div className="space-y-4">
                  {/* Show map for the most recent location (check-out if available, otherwise check-in) */}
                  {lastLocation.checkOutLatitude && lastLocation.checkOutLongitude ? (
                    <Map
                      latitude={lastLocation.checkOutLatitude}
                      longitude={lastLocation.checkOutLongitude}
                      address={lastLocation.checkOutAddress || undefined}
                      className="aspect-video w-full rounded-lg"
                    />
                  ) : lastLocation.checkInLatitude && lastLocation.checkInLongitude ? (
                    <Map
                      latitude={lastLocation.checkInLatitude}
                      longitude={lastLocation.checkInLongitude}
                      address={lastLocation.checkInAddress || undefined}
                      className="aspect-video w-full rounded-lg"
                    />
                  ) : null}

                  <div className="text-sm text-white/80 space-y-1">
                    <p>Peta menunjukkan lokasi check-in atau check-out terakhir Anda</p>
                    {lastLocation.checkInAddress && (
                      <p>Check-in: {formatAddress(lastLocation.checkInAddress)}</p>
                    )}
                    {lastLocation.checkOutAddress && (
                      <p>Check-out: {formatAddress(lastLocation.checkOutAddress)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-white/5 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-white/40 mx-auto mb-2" />
                    <p className="text-sm text-white/60">
                      Belum ada data lokasi tersimpan
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">Aktivitas Terbaru</CardTitle>
            <CardDescription className="text-white/70">
              Riwayat absensi terbaru Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAttendance ? (
                <>
                  {todayAttendance.checkInTime && (
                    <div className="flex items-center space-x-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Check-in berhasil</p>
                        <p className="text-xs text-white/70">
                          {format(todayAttendance.checkInTime, 'dd MMM yyyy HH:mm', { locale: id })}
                        </p>
                        {todayAttendance.checkInAddress && (
                          <p className="text-xs text-white/60">
                            📍 {formatAddress(todayAttendance.checkInAddress)}
                          </p>
                        )}
                      </div>
                      <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Check-in</Badge>
                    </div>
                  )}

                  {todayAttendance.checkOutTime && (
                    <div className="flex items-center space-x-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Check-out berhasil</p>
                        <p className="text-xs text-white/70">
                          {format(todayAttendance.checkOutTime, 'dd MMM yyyy HH:mm', { locale: id })}
                        </p>
                        {todayAttendance.checkOutAddress && (
                          <p className="text-xs text-white/60">
                            📍 {formatAddress(todayAttendance.checkOutAddress)}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">Check-out</Badge>
                    </div>
                  )}

                  {!todayAttendance.checkInTime && !todayAttendance.checkOutTime && (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60">Belum ada aktivitas hari ini</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">Memuat data aktivitas...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
