"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Calendar, TrendingUp } from "lucide-react"
import { STATUS_LABELS, TIME_LABELS, MESSAGES } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"

export default function DashboardPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{MESSAGES.LOADING}</p>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect("/auth/signin")
  }

  // Mock data untuk demonstrasi
  const todayAttendance = {
    status: AttendanceStatus.present,
    checkInTime: new Date("2024-01-15T08:00:00"),
    checkOutTime: null,
    workHours: 4.5,
    location: "Jl. Sudirman No. 123, Jakarta"
  }

  const stats = {
    thisMonth: {
      totalDays: 15,
      presentDays: 14,
      lateDays: 1,
      absentDays: 0,
      totalHours: 112
    },
    thisWeek: {
      presentDays: 5,
      totalHours: 40,
      averageHours: 8
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang kembali, {session.user.name}
        </p>
      </div>

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
              <Badge
                variant={todayAttendance.status === AttendanceStatus.present ? "default" :
                        todayAttendance.status === AttendanceStatus.late ? "destructive" : "secondary"}
              >
                {STATUS_LABELS[todayAttendance.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {todayAttendance.checkInTime && `Check-in: ${todayAttendance.checkInTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
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
              {todayAttendance.workHours?.toFixed(1) || 0}h
            </div>
            <p className="text-xs text-muted-foreground">
              {todayAttendance.checkOutTime ? "Sudah check-out" : "Belum check-out"}
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
              {stats.thisWeek.presentDays}/5
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
              {stats.thisWeek.averageHours}h
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
                disabled={!!todayAttendance.checkInTime}
              >
                <Clock className="h-6 w-6" />
                <span>{todayAttendance.checkInTime ? "Sudah Check-in" : "Check In"}</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-20 flex-col space-y-2"
                disabled={!todayAttendance.checkInTime || !!todayAttendance.checkOutTime}
              >
                <Clock className="h-6 w-6" />
                <span>{todayAttendance.checkOutTime ? "Sudah Check-out" : "Check Out"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lokasi Saat Ini</CardTitle>
            <CardDescription>
              {todayAttendance.location}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Peta lokasi akan ditampilkan di sini
                </p>
              </div>
            </div>
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
            {/* Mock recent activities */}
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Check-in berhasil</p>
                <p className="text-xs text-muted-foreground">
                  {todayAttendance.checkInTime?.toLocaleString('id-ID')}
                </p>
              </div>
              <Badge variant="secondary">Hadir</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
