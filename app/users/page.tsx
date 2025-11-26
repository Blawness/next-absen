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
import { Loader2, Plus, Download, Key, UserCheck, X } from "lucide-react"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { UsersSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { NAVIGATION } from "@/lib/constants"
import { UserRole } from "@prisma/client"
import { UserStatistics } from "@/components/users/user-statistics"
import { PasswordResetDialog } from "@/components/users/password-reset-dialog"
import { UserActivityDialog } from "@/components/users/user-activity-dialog"


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
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false)
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false)
  const [selectedUserForAction, setSelectedUserForAction] = useState<User | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
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

    loadUsers(statusFilter)
    loadDepartments()
  }, [status, session, statusFilter])

  const loadUsers = async (status: 'all' | 'active' | 'inactive' = 'active') => {
    try {
      const params = new URLSearchParams()
      if (status !== 'active') {
        params.append('status', status)
      }

      const url = `/api/users${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)

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
        loadUsers(statusFilter)
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
        loadUsers(statusFilter)

        // Update editingUser state if it exists to reflect changes in the modal
        if (editingUser && editingUser.id === userId) {
          setEditingUser({ ...editingUser, isActive: !currentStatus })
        }
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Gagal mengubah status user' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengubah status' })
    }
  }

  const handleExportUsers = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/users/export?format=csv')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setMessage({ type: 'success', text: 'Users exported successfully' })
      } else {
        setMessage({ type: 'error', text: 'Failed to export users' })
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred during export' })
    } finally {
      setIsExporting(false)
    }
  }

  const handlePasswordReset = (user: User) => {
    setSelectedUserForAction(user)
    setIsPasswordResetOpen(true)
  }

  const handleViewActivity = (user: User) => {
    setSelectedUserForAction(user)
    setIsActivityLogOpen(true)
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete', userIds: string[]) => {
    if (userIds.length === 0) return

    const confirmMessage = `Are you sure you want to ${action} ${userIds.length} user(s)?`
    if (!confirm(confirmMessage)) return

    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          userIds
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({
          type: 'success',
          text: `${data.successCount} user(s) ${action}d successfully`
        })
        loadUsers(statusFilter)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || `Failed to ${action} users` })
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' })
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
        <div className="flex gap-2">
          <Button
            onClick={handleExportUsers}
            variant="outline"
            disabled={isExporting}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
          <Button onClick={handleCreateUser} variant="glass">
            <Plus className="mr-2 h-4 w-4" />
            Tambah User
          </Button>
        </div>
      </motion.div>

      {/* Statistics Dashboard */}
      <UserStatistics />

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
          statusFilter={statusFilter}
          onFilterChange={(filters) => {
            setStatusFilter(filters.status)
          }}
          onEdit={handleEditUser}
          onToggleStatus={(user) => handleToggleStatus(user.id, user.isActive)}
          onPasswordReset={handlePasswordReset}
          onViewActivity={handleViewActivity}
          onBulkDelete={(ids) => handleBulkAction('delete', ids)}
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Departemen</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
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
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
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
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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

          {editingUser && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">User Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleToggleStatus(editingUser.id, editingUser.isActive)}
                  className={`w-full justify-start ${editingUser.isActive ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}
                >
                  {editingUser.isActive ? (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Nonaktifkan
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Aktifkan
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePasswordReset(editingUser)}
                  className="w-full justify-start border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Reset Password
                </Button>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      {selectedUserForAction && (
        <PasswordResetDialog
          open={isPasswordResetOpen}
          onOpenChange={setIsPasswordResetOpen}
          userId={selectedUserForAction.id}
          userName={selectedUserForAction.name}
          onSuccess={() => {
            setMessage({ type: 'success', text: 'Password reset successfully' })
          }}
        />
      )}

      {/* User Activity Dialog */}
      {selectedUserForAction && (
        <UserActivityDialog
          open={isActivityLogOpen}
          onOpenChange={setIsActivityLogOpen}
          userId={selectedUserForAction.id}
          userName={selectedUserForAction.name}
        />
      )}
    </div>
  )
}
