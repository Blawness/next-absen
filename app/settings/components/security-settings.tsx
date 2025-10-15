"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Shield, Save, Lock, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"
import { SystemSettings } from "../types"

interface SecuritySettingsProps {
  settings: SystemSettings | null
  isSaving: boolean
  onUpdateSettings: (section: keyof SystemSettings, field: string, value: unknown) => void
  onSave: () => void
}

export const SecuritySettings = ({ settings, isSaving, onUpdateSettings, onSave }: SecuritySettingsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5" />
            Pengaturan Keamanan
          </CardTitle>
          <CardDescription className="text-white/70">
            Konfigurasi kebijakan keamanan dan autentikasi sistem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout" className="text-white">Timeout Sesi (menit)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="15"
                max="480"
                variant="glass"
                value={settings?.security.sessionTimeout || 60}
                onChange={(e) => onUpdateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
              />
              <p className="text-xs text-white/60">Waktu sebelum sesi pengguna berakhir otomatis</p>
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
                onChange={(e) => onUpdateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
              />
              <p className="text-xs text-white/60">Jumlah percobaan login sebelum akun dikunci</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passwordExpiry" className="text-white">Kedaluwarsa Password (hari)</Label>
              <Input
                id="passwordExpiry"
                type="number"
                min="30"
                max="365"
                variant="glass"
                value={settings?.security.passwordExpiryDays || 90}
                onChange={(e) => onUpdateSettings('security', 'passwordExpiryDays', parseInt(e.target.value))}
              />
              <p className="text-xs text-white/60">Waktu sebelum password harus diganti</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-400" />
                    <Label htmlFor="requireStrongPassword" className="text-white font-medium">
                      Password Kuat
                    </Label>
                  </div>
                  <p className="text-sm text-white/60">
                    Wajibkan kombinasi huruf besar, kecil, angka, dan simbol
                  </p>
                </div>
                <Switch
                  id="requireStrongPassword"
                  checked={settings?.security.requireStrongPassword || false}
                  onCheckedChange={(checked) => onUpdateSettings('security', 'requireStrongPassword', checked)}
                  className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/20 [&>span]:bg-white [&>span]:shadow-lg [&>span]:border-2 [&>span]:border-white/30"
                />
              </div>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-300">Peringatan Keamanan</h4>
                <ul className="text-xs text-red-200 space-y-1">
                  <li>• Password kedaluwarsa akan memaksa reset password</li>
                  <li>• Session timeout yang pendek meningkatkan keamanan</li>
                  <li>• Password kuat mengurangi risiko kebocoran data</li>
                  <li>• Maksimal percobaan login mencegah brute force attacks</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100 hover:text-white"
            >
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Pengaturan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
