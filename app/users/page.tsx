"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { Loader2, Plus } from "lucide-react"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { UsersSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { NAVIGATION } from "@/lib/constants"
import { UserRole } from "@prisma/client"

interface User {
  id: string
  name: string
  email: string
  department: string | null
  position: string | null
  role: UserRole
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
}

interface UserFormData {
  name: string
  email: string
  department: string
  position: string
  role: UserRole
  password: string
  confirmPassword: string
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    department: "",
    position: "",
    role: UserRole.user,
    password: "",
    confirmPassword: ""
  })

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

    loadUsers()
    loadDepartments()
  }, [status, session])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.map((user: Omit<User, 'lastLogin' | 'createdAt'> & { lastLogin: string | null; createdAt: string }) => ({
          ...user,
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          createdAt: new Date(user.createdAt)
        })))
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/users/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }


  const handleCreateUser = () => {
    setEditingUser(null)
    setFormData({
      name: "",
      email: "",
      department: "",
      position: "",
      role: UserRole.user,
      password: "",
      confirmPassword: ""
    })
    setIsDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      department: user.department || "",
      position: user.position || "",
      role: user.role,
      password: "",
      confirmPassword: ""
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Password tidak cocok' })
      return
    }

    if (formData.password.length < 8) {
      setMessage({ type: 'error', text: 'Password minimal 8 karakter' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage({
          type: 'success',
          text: editingUser ? 'User berhasil diperbarui' : 'User berhasil dibuat'
        })
        setIsDialogOpen(false)
        loadUsers()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Gagal menyimpan user' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'User berhasil dihapus' })
        loadUsers()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Gagal menghapus user' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menghapus' })
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `User berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`
        })
        loadUsers()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Gagal mengubah status user' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengubah status' })
    }
  }

  if (status === "loading" || isLoading) {
    return <UsersSkeleton />
  }

  if (!session || session.user.role !== UserRole.admin) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-8">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
            {NAVIGATION.USERS}
          </h1>
          <p className="text-white/80 text-lg">
            Kelola pengguna sistem dan peran mereka
          </p>
        </div>
        <Button onClick={handleCreateUser} variant="glass">
          <Plus className="mr-2 h-4 w-4" />
          Tambah User
        </Button>
      </motion.div>

      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <AdvancedDataTable
          data={users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            department: user.department,
            position: user.position,
            role: user.role as "admin" | "manager" | "user",
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            avatarUrl: null
          }))}
          loading={isLoading}
          onEdit={handleEditUser}
          onDelete={(user) => handleDeleteUser(user.id)}
          onToggleStatus={(user) => handleToggleStatus(user.id, user.isActive)}
        />
      </motion.div>


      {/* User Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-gray-900/95 backdrop-blur-md border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingUser ? 'Edit User' : 'Tambah User Baru'}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {editingUser ? 'Perbarui informasi user' : 'Buat user baru dengan informasi lengkap'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Departemen</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Pilih Departemen" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10">
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept} className="text-white hover:bg-white/10 focus:bg-white/10">
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Posisi</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({...formData, role: value})}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10">
                  <SelectItem value={UserRole.user} className="text-white hover:bg-white/10 focus:bg-white/10">User</SelectItem>
                  <SelectItem value={UserRole.manager} className="text-white hover:bg-white/10 focus:bg-white/10">Manager</SelectItem>
                  <SelectItem value={UserRole.admin} className="text-white hover:bg-white/10 focus:bg-white/10">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!editingUser && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    required={!editingUser}
                    minLength={8}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} variant="glass">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUser ? 'Perbarui' : 'Buat User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
