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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Settings, Bell, Shield, Clock, MapPin } from "lucide-react"
import { motion } from "framer-motion"
import { NAVIGATION } from "@/lib/constants"
import { SettingsSkeleton } from "@/components/ui/data-table/data-table-skeleton"
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
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSettings = (section: keyof SystemSettings, field: string, value: unknown) => {
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
    return <SettingsSkeleton />
  }

  if (!session || session.user.role !== UserRole.admin) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-8">
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.SETTINGS}
        </h1>
        <p className="text-white/80 text-lg">
          Kelola pengaturan sistem dan konfigurasi aplikasi
        </p>
      </motion.div>

      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 glass-nav p-1">
            <TabsTrigger value="general" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
              <Settings className="h-4 w-4" />
              Umum
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
              <MapPin className="h-4 w-4" />
              Lokasi
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
              <Bell className="h-4 w-4" />
              Notifikasi
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
              <Shield className="h-4 w-4" />
              Keamanan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Clock className="h-5 w-5" />
                    Jam Kerja
                  </CardTitle>
                  <CardDescription className="text-white/70">
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
                    variant="glass"
                    value={settings?.businessHours.startTime || "08:00"}
                    onChange={(e) => updateSettings('businessHours', 'startTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-white">Jam Selesai Kerja</Label>
                  <Input
                    id="endTime"
                    type="time"
                    variant="glass"
                    value={settings?.businessHours.endTime || "17:00"}
                    onChange={(e) => updateSettings('businessHours', 'endTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkInDeadline" className="text-white">Batas Waktu Check-in</Label>
                  <Input
                    id="checkInDeadline"
                    type="time"
                    variant="glass"
                    value={settings?.businessHours.checkInDeadline || "09:00"}
                    onChange={(e) => updateSettings('businessHours', 'checkInDeadline', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gracePeriod" className="text-white">Grace Period (menit)</Label>
                  <Input
                    id="gracePeriod"
                    type="number"
                    min="0"
                    max="60"
                    variant="glass"
                    value={settings?.businessHours.gracePeriodMinutes || 15}
                    onChange={(e) => updateSettings('businessHours', 'gracePeriodMinutes', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="location" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MapPin className="h-5 w-5" />
                    Pengaturan Lokasi
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Konfigurasi GPS tracking dan geofencing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="officeLat" className="text-white">Latitude Kantor</Label>
                      <Input
                        id="officeLat"
                        type="number"
                        step="0.000001"
                        variant="glass"
                        value={settings?.location.officeLatitude || ""}
                        onChange={(e) => updateSettings('location', 'officeLatitude', parseFloat(e.target.value))}
                        placeholder="Contoh: -6.123456"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="officeLng" className="text-white">Longitude Kantor</Label>
                      <Input
                        id="officeLng"
                        type="number"
                        step="0.000001"
                        variant="glass"
                        value={settings?.location.officeLongitude || ""}
                        onChange={(e) => updateSettings('location', 'officeLongitude', parseFloat(e.target.value))}
                        placeholder="Contoh: 106.123456"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="geofenceRadius" className="text-white">Radius Geofence (meter)</Label>
                      <Input
                        id="geofenceRadius"
                        type="number"
                        min="50"
                        max="1000"
                        variant="glass"
                        value={settings?.location.geofenceRadius || 100}
                        onChange={(e) => updateSettings('location', 'geofenceRadius', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Wajibkan Lokasi GPS</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings?.location.requireLocation || false}
                          onCheckedChange={(checked) => updateSettings('location', 'requireLocation', checked)}
                        />
                        <span className="text-sm text-white/80">
                          {settings?.location.requireLocation ? "Ya" : "Tidak"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Bell className="h-5 w-5" />
                    Pengaturan Notifikasi
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Kelola pengiriman notifikasi dan email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="space-y-0.5">
                        <Label className="text-white">Notifikasi Email</Label>
                        <p className="text-sm text-white/70">
                          Aktifkan pengiriman notifikasi melalui email
                        </p>
                      </div>
                      <Switch
                        checked={settings?.notifications.emailNotifications || false}
                        onCheckedChange={(checked) => updateSettings('notifications', 'emailNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="space-y-0.5">
                        <Label className="text-white">Pengingat Check-in Terlambat</Label>
                        <p className="text-sm text-white/70">
                          Kirim pengingat jika belum check-in setelah batas waktu
                        </p>
                      </div>
                      <Switch
                        checked={settings?.notifications.lateCheckinReminders || false}
                        onCheckedChange={(checked) => updateSettings('notifications', 'lateCheckinReminders', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="space-y-0.5">
                        <Label className="text-white">Email Ringkasan Harian</Label>
                        <p className="text-sm text-white/70">
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
            </motion.div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="h-5 w-5" />
                    Pengaturan Keamanan
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Konfigurasi keamanan dan autentikasi sistem
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout" className="text-white">Timeout Session (jam)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        min="1"
                        max="72"
                        variant="glass"
                        value={settings?.security.sessionTimeout || 24}
                        onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxLoginAttempts" className="text-white">Maksimal Percobaan Login</Label>
                      <Input
                        id="maxLoginAttempts"
                        type="number"
                        min="3"
                        max="10"
                        variant="glass"
                        value={settings?.security.maxLoginAttempts || 5}
                        onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="passwordExpiry" className="text-white">Kedaluwarsa Password (hari)</Label>
                      <Input
                        id="passwordExpiry"
                        type="number"
                        min="30"
                        max="365"
                        variant="glass"
                        value={settings?.security.passwordExpiryDays || 90}
                        onChange={(e) => updateSettings('security', 'passwordExpiryDays', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Wajibkan Password Kuat</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings?.security.requireStrongPassword || false}
                          onCheckedChange={(checked) => updateSettings('security', 'requireStrongPassword', checked)}
                        />
                        <span className="text-sm text-white/80">
                          {settings?.security.requireStrongPassword ? "Ya" : "Tidak"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <motion.div
        className="flex justify-end"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <Button variant="glass" onClick={saveSettings} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Pengaturan
        </Button>
      </motion.div>
    </div>
  )
}
