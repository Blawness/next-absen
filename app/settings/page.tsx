"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SettingsSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { motion } from "framer-motion"
import { Settings, Bell, Shield, MapPin } from "lucide-react"
import { NAVIGATION } from "@/lib/constants"
import { useSettings } from "./hooks/use-settings"
import { GeneralSettings } from "./components/general-settings"
import { LocationSettings } from "./components/location-settings"
import { NotificationsSettings } from "./components/notifications-settings"
import { SecuritySettings } from "./components/security-settings"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const {
    settings,
    isLoading,
    isSaving,
    message,
    saveSettings,
    updateSettings
  } = useSettings()

  if (status === "loading" || isLoading) {
    return <SettingsSkeleton />
  }

  if (!session || session.user.role !== "admin") {
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

          <TabsContent value="general">
            <GeneralSettings
              settings={settings}
              isSaving={isSaving}
              onUpdateSettings={updateSettings}
              onSave={saveSettings}
            />
          </TabsContent>

          <TabsContent value="location">
            <LocationSettings
              settings={settings}
              isSaving={isSaving}
              onUpdateSettings={updateSettings}
              onSave={saveSettings}
            />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsSettings
              settings={settings}
              isSaving={isSaving}
              onUpdateSettings={updateSettings}
              onSave={saveSettings}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettings
              settings={settings}
              isSaving={isSaving}
              onUpdateSettings={updateSettings}
              onSave={saveSettings}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
