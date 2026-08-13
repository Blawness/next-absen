"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Map } from "@/components/ui/map"
import { DashboardSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { Clock, MapPin, Calendar, TrendingUp, Loader2, CheckCircle, RefreshCw, AlertTriangle } from "lucide-react"
import { STATUS_LABELS, TIME_LABELS, MESSAGES, NAVIGATION } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"
import { getCurrentPosition, calculateDistance } from "@/lib/location"
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns"
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

interface WeekStats {
  daysAttended: number
  businessDays: number
  avgWorkHours: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [todayAttendance, setTodayAttendance] = useState<AttendanceData | null>(null)
  const [lastLocation, setLastLocation] = useState<LastLocationData | null>(null)
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number
    longitude: number
    address: string
  } | null>(null)
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [isReloadingLocation, setIsReloadingLocation] = useState(false)
  // Guards the auto-GPS-fetch so it doesn't fire more than once.
  const initialGpsFetchRef = useRef(false)

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

  // Compute weekly stats from a list of attendance records (newest first).
  const computeWeekStats = (records: AttendanceData[]): WeekStats => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const inWeek = records.filter(r => {
      const d = new Date(r.date)
      return isWithinInterval(d, { start: weekStart, end: weekEnd })
    })

    const daysAttended = inWeek.filter(r => r.checkInTime != null).length

    // Count business days in the current week (Mon-Fri).
    let businessDays = 0
    const cursor = new Date(weekStart)
    while (cursor <= weekEnd) {
      const day = cursor.getDay()
      if (day !== 0 && day !== 6) businessDays++
      cursor.setDate(cursor.getDate() + 1)
    }

    const workHoursValues = inWeek
      .map(r => (r.workHours == null ? null : Number(r.workHours)))
      .filter((v): v is number => v != null)
    const avgWorkHours = workHoursValues.length > 0
      ? workHoursValues.reduce((a, b) => a + b, 0) / workHoursValues.length
      : 0

    return { daysAttended, businessDays, avgWorkHours }
  }

  // Redirect to signin if unauthenticated. Wrapped to keep the call sites tidy.
  const requireAuth = useCallback(() => {
    if (status === "loading") return false
    if (status === "unauthenticated" || !session) {
      router.push("/auth/signin")
      return false
    }
    return true
  }, [status, session, router])

  useEffect(() => {
    if (!requireAuth()) return

    const controller = new AbortController()
    Promise.all([
      loadTodayAttendance(controller.signal),
      loadWeekAndLastLocation(controller.signal),
    ])
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id])

  const loadTodayAttendance = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/attendance/today', { signal })
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
        setLoadError(null)
      } else {
        setLoadError("Gagal memuat data absensi hari ini")
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error loading today attendance:', error)
      setLoadError("Gagal memuat data absensi hari ini")
    } finally {
      setIsLoading(false)
    }
  }

  const loadWeekAndLastLocation = async (signal?: AbortSignal) => {
    try {
      // 14 records covers the longest possible week window + some buffer.
      const response = await fetch('/api/attendance/history?limit=14&offset=0', { signal })
      if (!response.ok) {
        setLoadError("Gagal memuat data minggu ini")
        return
      }
      const history = await response.json() as AttendanceData[]

      // Weekly stats (days attended, avg work hours)
      const normalized = history.map(h => ({
        ...h,
        date: new Date(h.date),
      }))
      setWeekStats(computeWeekStats(normalized))

      // Last location is the most recent record (history is sorted desc).
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error loading week/last location:', error)
      setLoadError("Gagal memuat data minggu ini")
    }
  }

  const handleReloadLocation = async () => {
    setIsReloadingLocation(true)
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

      setCurrentLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        address: address
      })
      setGpsLocation({
        latitude: position.latitude,
        longitude: position.longitude
      })
    } catch (error) {
      console.error('Error reloading location:', error)
      setMessage({ type: 'error', text: 'Gagal memuat lokasi terkini' })
    } finally {
      setIsReloadingLocation(false)
    }
  }

  // Auto-fetch GPS once on mount so the user sees their current location
  // without having to click the reload button (BUG-FIX H6).
  useEffect(() => {
    if (status === "loading") return
    if (!session) return
    if (initialGpsFetchRef.current) return
    initialGpsFetchRef.current = true
    void handleReloadLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id])

  const handleLocationChange = async (lat: number, lng: number) => {
    if (!currentLocation || !gpsLocation) return

    // Validate distance from GPS location (max 100m)
    const distance = calculateDistance(
      { latitude: lat, longitude: lng },
      { latitude: gpsLocation.latitude, longitude: gpsLocation.longitude }
    )

    if (distance > 100) {
      setMessage({ type: 'error', text: 'Lokasi tidak boleh lebih dari 100m dari titik GPS asli' })
      // Snap marker back to GPS origin (BUG-FIX M2). Previously the marker
      // stayed at the invalid position until the user reloaded location.
      setCurrentLocation({
        ...currentLocation,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        address: currentLocation.address,
      })
      return
    }

    // Update coordinates immediately
    setCurrentLocation({
      ...currentLocation,
      latitude: lat,
      longitude: lng,
    })

    // Update address in background
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
      if (response.ok) {
        const addressData = await response.json()
        setCurrentLocation(prev => prev ? {
          ...prev,
          address: addressData.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        } : null)
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error)
    }
  }

  const handleCheckIn = async () => {
    setIsCheckingIn(true)
    setMessage(null)

    try {
      let lat: number, lng: number, acc: number, addr: string

      if (currentLocation) {
        lat = currentLocation.latitude
        lng = currentLocation.longitude
        addr = currentLocation.address
        // When user dragged the pin, surface the drag distance as the
        // accuracy so the server knows this is a manually-corrected point.
        // A user at the edge of the 100m radius could otherwise claim 10m.
        acc = gpsLocation
          ? Math.max(10, Math.round(calculateDistance(
              { latitude: lat, longitude: lng },
              { latitude: gpsLocation.latitude, longitude: gpsLocation.longitude }
            )))
          : 10
      } else {
        const position = await getCurrentPosition()
        lat = position.latitude
        lng = position.longitude
        acc = position.accuracy

        try {
          const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
          if (response.ok) {
            const addressData = await response.json()
            addr = addressData.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          } else {
            addr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          }
        } catch {
          addr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }
      }

      const checkInResponse = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          address: addr,
          accuracy: acc,
        }),
      })

      const data = await checkInResponse.json()

      if (checkInResponse.ok) {
        setMessage({ type: 'success', text: MESSAGES.CHECK_IN_SUCCESS })
        await loadTodayAttendance()
        await loadWeekAndLastLocation()
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
      let lat: number, lng: number, acc: number, addr: string

      if (currentLocation) {
        lat = currentLocation.latitude
        lng = currentLocation.longitude
        addr = currentLocation.address
        acc = gpsLocation
          ? Math.max(10, Math.round(calculateDistance(
              { latitude: lat, longitude: lng },
              { latitude: gpsLocation.latitude, longitude: gpsLocation.longitude }
            )))
          : 10
      } else {
        const position = await getCurrentPosition()
        lat = position.latitude
        lng = position.longitude
        acc = position.accuracy

        try {
          const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
          if (response.ok) {
            const addressData = await response.json()
            addr = addressData.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          } else {
            addr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          }
        } catch {
          addr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }
      }

      const checkOutResponse = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          address: addr,
          accuracy: acc,
        }),
      })

      const data = await checkOutResponse.json()

      if (checkOutResponse.ok) {
        setMessage({ type: 'success', text: MESSAGES.CHECK_OUT_SUCCESS })
        await loadTodayAttendance()
        await loadWeekAndLastLocation()
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
    // Effect above already pushed to signin; render nothing in the meantime.
    return null
  }

  const canCheckIn = !todayAttendance?.checkInTime
  const canCheckOut = todayAttendance?.checkInTime != null && todayAttendance?.checkOutTime == null
  const isCheckedOut = todayAttendance?.checkOutTime != null

  return (
    <div className="space-y-8">
      <div
        className="space-y-2 animate-fade-down"
      >
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.DASHBOARD}
        </h1>
        <p className="text-white/80 text-lg">
          Selamat datang kembali, {session.user.name}
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Load Error Banner (BUG-FIX H5) */}
      {loadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Today's Status */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="animate-fade-up anim-delay-100">
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
                {todayAttendance?.lateMinutes != null && todayAttendance.lateMinutes > 0 &&
                  ` (terlambat ${todayAttendance.lateMinutes}m)`}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-up anim-delay-200">
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
                {isCheckedOut ? "Sudah check-out" : "Belum check-out"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-up anim-delay-300">
          <Card variant="glass" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-white">
                {TIME_LABELS.THIS_WEEK}
              </CardTitle>
              <Calendar className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {/* BUG-FIX C1: real count instead of "-/5" */}
                {weekStats
                  ? `${weekStats.daysAttended}/${weekStats.businessDays}`
                  : "…"}
              </div>
              <p className="text-xs text-white/60">
                Hari kerja minggu ini
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-up anim-delay-400">
          <Card variant="glass" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-white">
                Rata-rata {TIME_LABELS.WORK_HOURS}
              </CardTitle>
              <MapPin className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {/* BUG-FIX C1: real avg instead of "-j" */}
                {weekStats && weekStats.avgWorkHours > 0
                  ? `${weekStats.avgWorkHours.toFixed(1)}j`
                  : "…"}
              </div>
              <p className="text-xs text-white/60">
                Per hari minggu ini
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="animate-slide-left anim-delay-500">
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
                    {isCheckedOut ? "Sudah Check-out" : "Check Out"}
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
        </div>

        <div className="animate-fade-up anim-delay-600">
          <Card variant="glass">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-white">
                  <MapPin className="h-5 w-5" />
                  {currentLocation ? "Lokasi Terkini" : "Lokasi Terakhir"}
                </CardTitle>
                <CardDescription className="text-white/70">
                  {currentLocation ?
                    "Posisi Anda saat ini (Manual)" :
                    (lastLocation ?
                      "Lokasi check-in atau check-out terakhir Anda" :
                      "Belum ada data lokasi tersimpan")
                  }
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 shrink-0"
                onClick={handleReloadLocation}
                disabled={isReloadingLocation}
                title="Reload Lokasi"
              >
                <RefreshCw className={`h-4 w-4 ${isReloadingLocation ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {currentLocation ? (
                <div className="space-y-4">
                  {/* BUG-FIX M4: removed key prop so React reconciles instead
                      of recreating the Leaflet instance on every prop change. */}
                  <Map
                    latitude={currentLocation.latitude}
                    longitude={currentLocation.longitude}
                    address={currentLocation.address}
                    className="aspect-video w-full rounded-lg"
                    draggable={true}
                    onLocationChange={handleLocationChange}
                    radius={100}
                    centerLatitude={gpsLocation?.latitude}
                    centerLongitude={gpsLocation?.longitude}
                  />
                  <div className="text-sm text-white/80 space-y-1">
                    <p>Geser pin untuk menyesuaikan lokasi (Radius 100m)</p>
                    <p>Lokasi: {formatAddress(currentLocation.address)}</p>
                  </div>
                </div>
              ) : lastLocation ? (
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
        </div>
      </div>

      {/* Today's Activity (BUG-FIX M1: renamed from "Aktivitas Terbaru" which
          implied multi-day history but only ever showed today) */}
      <div className="animate-fade-up anim-delay-700">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">Aktivitas Hari Ini</CardTitle>
            <CardDescription className="text-white/70">
              Check-in dan check-out Anda hari ini
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
                          {todayAttendance.lateMinutes != null && todayAttendance.lateMinutes > 0 &&
                            ` · terlambat ${todayAttendance.lateMinutes}m`
                          }
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
      </div>
    </div>
  )
}
