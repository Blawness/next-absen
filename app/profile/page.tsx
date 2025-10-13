"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion } from "framer-motion"
import {
  User,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react"
import { FORM_LABELS, MESSAGES, VALIDATION_MESSAGES, NAVIGATION } from "@/lib/constants"
import { UserRole } from "@prisma/client"

interface UserProfile {
  id: string
  email: string
  name: string
  phone?: string | null
  department?: string | null
  position?: string | null
  avatarUrl?: string | null
  role: UserRole
  isActive: boolean
  lastLogin?: Date | null
  createdAt: Date
  updatedAt: Date
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    department: "",
    position: "",
  })

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      redirect("/auth/signin")
      return
    }

    loadProfile()
  }, [session, status])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          department: data.department || "",
          position: data.position || "",
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: MESSAGES.PROFILE_UPDATED })
        setIsEditing(false)
        await loadProfile()
      } else {
        setMessage({ type: 'error', text: data.error || MESSAGES.ERROR })
      }
    } catch {
      setMessage({ type: 'error', text: MESSAGES.ERROR })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: VALIDATION_MESSAGES.PASSWORD_MISMATCH })
      return
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: VALIDATION_MESSAGES.PASSWORD_TOO_SHORT })
      return
    }

    setIsChangingPassword(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: MESSAGES.PASSWORD_CHANGED })
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        setMessage({ type: 'error', text: data.error || MESSAGES.ERROR })
      }
    } catch {
      setMessage({ type: 'error', text: MESSAGES.ERROR })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        department: profile.department || "",
        position: profile.position || "",
      })
    }
    setIsEditing(false)
    setMessage(null)
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

  if (!session || !profile) {
    redirect("/auth/signin")
  }

  return (
    <div className="space-y-8 relative">
      {/* Floating Orbs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-orb" style={{ top: '20%', left: '15%', animationDelay: '0s' }}></div>
        <div className="floating-orb" style={{ top: '60%', right: '25%', animationDelay: '-4s' }}></div>
        <div className="floating-orb" style={{ bottom: '30%', left: '80%', animationDelay: '-8s' }}></div>
        <div className="floating-orb" style={{ top: '10%', right: '10%', animationDelay: '-2s', width: '60px', height: '60px' }}></div>
      </div>

      <motion.div
        className="space-y-2 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.PROFILE}
        </h1>
        <p className="text-white/80 text-lg">
          Kelola informasi profil dan pengaturan akun Anda
        </p>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList variant="glass" className="grid w-full grid-cols-2">
          <TabsTrigger variant="glass" value="profile">Informasi Profil</TabsTrigger>
          <TabsTrigger variant="glass" value="password">Ubah Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="h-5 w-5" />
                  Informasi Profil
                </CardTitle>
                <CardDescription className="text-white/70">
                  Kelola informasi pribadi dan kontak Anda
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg">
                <div className="relative">
                  <Avatar className="h-20 w-20 ring-2 ring-white/20">
                    <AvatarImage src={profile.avatarUrl || ""} alt={profile.name} />
                    <AvatarFallback className="text-lg bg-white/10 text-white">
                      {profile.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-white/20 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">{profile.name}</h3>
                  <p className="text-white/70">{profile.email}</p>
                  <p className="text-sm text-white/60">
                    {profile.department} • {profile.position}
                  </p>
                </div>
              </div>

              {/* Profile Form */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{FORM_LABELS.NAME}</Label>
                  <Input
                    id="name"
                    variant="glass"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{FORM_LABELS.EMAIL}</Label>
                  <Input
                    id="email"
                    variant="glass"
                    value={profile.email}
                    disabled
                    className="opacity-50"
                  />
                  <p className="text-xs text-white/60">
                    Email tidak dapat diubah
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{FORM_LABELS.PHONE}</Label>
                  <Input
                    id="phone"
                    variant="glass"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    disabled={!isEditing}
                    placeholder="+62-8xx-xxxx-xxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">{FORM_LABELS.DEPARTMENT}</Label>
                  <Input
                    id="department"
                    variant="glass"
                    value={formData.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">{FORM_LABELS.POSITION}</Label>
                  <Input
                    id="position"
                    variant="glass"
                    value={formData.position}
                    onChange={(e) => handleInputChange("position", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    variant="glass"
                    value={
                      profile.role === UserRole.admin ? "Admin" :
                      profile.role === UserRole.manager ? "Manager" : "Pengguna"
                    }
                    disabled
                    className="opacity-50"
                  />
                  <p className="text-xs text-white/60">
                    Role tidak dapat diubah
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!isEditing ? (
                  <Button variant="glass" onClick={() => setIsEditing(true)} className="px-6">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profil
                  </Button>
                ) : (
                  <>
                    <Button variant="glass" onClick={handleSaveProfile} disabled={isSaving} className="px-6">
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Menyimpan..." : "Simpan"}
                    </Button>
                    <Button variant="glassOutline" onClick={handleCancelEdit} className="px-6">
                      <X className="mr-2 h-4 w-4" />
                      Batal
                    </Button>
                  </>
                )}
              </div>

              {message && (
                <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="password">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-white">Ubah Password</CardTitle>
                <CardDescription className="text-white/70">
                  Pastikan password baru Anda kuat dan aman
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Saat Ini</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    variant="glass"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Masukkan password saat ini"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-white/70"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    variant="glass"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Minimal 8 karakter"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-white/70"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{FORM_LABELS.CONFIRM_PASSWORD}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    variant="glass"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Konfirmasi password baru"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-white/70"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                variant="glass"
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="w-full py-3"
              >
                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isChangingPassword ? "Mengubah Password..." : "Ubah Password"}
              </Button>

              {message && (
                <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Account Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">Informasi Akun</CardTitle>
            <CardDescription className="text-white/70">
              Informasi tambahan tentang akun Anda
            </CardDescription>
          </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Status Akun</Label>
              <p className="text-sm text-muted-foreground">
                {profile.isActive ? "Aktif" : "Tidak Aktif"}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Login Terakhir</Label>
              <p className="text-sm text-muted-foreground">
                {profile.lastLogin ?
                  new Date(profile.lastLogin).toLocaleString('id-ID') :
                  "Belum pernah login"
                }
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Dibuat Pada</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(profile.createdAt).toLocaleDateString('id-ID')}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Diperbarui Pada</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(profile.updatedAt).toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>
        </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
