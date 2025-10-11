"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Settings, Users, Bell, Shield, Clock, MapPin } from "lucide-react"
import { MESSAGES, NAVIGATION } from "@/lib/constants"
import { UserRole } from "@prisma/client"

interface SystemSettings {
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

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated" || !session) {
      redirect("/auth/signin")
      return
    }

    // Check if user is admin
    if (session.user.role !== UserRole.admin) {
      redirect("/dashboard")
      return
    }

    loadSettings()
  }, [status, session])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Gagal menyimpan pengaturan' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSettings = (section: keyof SystemSettings, field: string, value: any) => {
    setSettings(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }
    })
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

  if (!session || session.user.role !== UserRole.admin) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{NAVIGATION.SETTINGS}</h1>
        <p className="text-muted-foreground">
          Kelola pengaturan sistem dan konfigurasi aplikasi
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Umum
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Lokasi
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifikasi
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Keamanan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Jam Kerja
              </CardTitle>
              <CardDescription>
                Konfigurasi jam kerja dan batas waktu absensi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Jam Mulai Kerja</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={settings?.businessHours.startTime || "08:00"}
                    onChange={(e) => updateSettings('businessHours', 'startTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Jam Selesai Kerja</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={settings?.businessHours.endTime || "17:00"}
                    onChange={(e) => updateSettings('businessHours', 'endTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkInDeadline">Batas Waktu Check-in</Label>
                  <Input
                    id="checkInDeadline"
                    type="time"
                    value={settings?.businessHours.checkInDeadline || "09:00"}
                    onChange={(e) => updateSettings('businessHours', 'checkInDeadline', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gracePeriod">Grace Period (menit)</Label>
                  <Input
                    id="gracePeriod"
                    type="number"
                    min="0"
                    max="60"
                    value={settings?.businessHours.gracePeriodMinutes || 15}
                    onChange={(e) => updateSettings('businessHours', 'gracePeriodMinutes', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pengaturan Lokasi
              </CardTitle>
              <CardDescription>
                Konfigurasi GPS tracking dan geofencing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="officeLat">Latitude Kantor</Label>
                  <Input
                    id="officeLat"
                    type="number"
                    step="0.000001"
                    value={settings?.location.officeLatitude || ""}
                    onChange={(e) => updateSettings('location', 'officeLatitude', parseFloat(e.target.value))}
                    placeholder="Contoh: -6.123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officeLng">Longitude Kantor</Label>
                  <Input
                    id="officeLng"
                    type="number"
                    step="0.000001"
                    value={settings?.location.officeLongitude || ""}
                    onChange={(e) => updateSettings('location', 'officeLongitude', parseFloat(e.target.value))}
                    placeholder="Contoh: 106.123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="geofenceRadius">Radius Geofence (meter)</Label>
                  <Input
                    id="geofenceRadius"
                    type="number"
                    min="50"
                    max="1000"
                    value={settings?.location.geofenceRadius || 100}
                    onChange={(e) => updateSettings('location', 'geofenceRadius', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wajibkan Lokasi GPS</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings?.location.requireLocation || false}
                      onCheckedChange={(checked) => updateSettings('location', 'requireLocation', checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {settings?.location.requireLocation ? "Ya" : "Tidak"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Pengaturan Notifikasi
              </CardTitle>
              <CardDescription>
                Kelola pengiriman notifikasi dan email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifikasi Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Aktifkan pengiriman notifikasi melalui email
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications.emailNotifications || false}
                    onCheckedChange={(checked) => updateSettings('notifications', 'emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Pengingat Check-in Terlambat</Label>
                    <p className="text-sm text-muted-foreground">
                      Kirim pengingat jika belum check-in setelah batas waktu
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications.lateCheckinReminders || false}
                    onCheckedChange={(checked) => updateSettings('notifications', 'lateCheckinReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Ringkasan Harian</Label>
                    <p className="text-sm text-muted-foreground">
                      Kirim ringkasan absensi harian ke admin
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications.dailySummaryEmail || false}
                    onCheckedChange={(checked) => updateSettings('notifications', 'dailySummaryEmail', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Pengaturan Keamanan
              </CardTitle>
              <CardDescription>
                Konfigurasi keamanan dan autentikasi sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Timeout Session (jam)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="1"
                    max="72"
                    value={settings?.security.sessionTimeout || 24}
                    onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Maksimal Percobaan Login</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    min="3"
                    max="10"
                    value={settings?.security.maxLoginAttempts || 5}
                    onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Kedaluwarsa Password (hari)</Label>
                  <Input
                    id="passwordExpiry"
                    type="number"
                    min="30"
                    max="365"
                    value={settings?.security.passwordExpiryDays || 90}
                    onChange={(e) => updateSettings('security', 'passwordExpiryDays', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wajibkan Password Kuat</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings?.security.requireStrongPassword || false}
                      onCheckedChange={(checked) => updateSettings('security', 'requireStrongPassword', checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {settings?.security.requireStrongPassword ? "Ya" : "Tidak"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  )
}
