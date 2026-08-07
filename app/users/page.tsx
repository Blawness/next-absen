"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Download } from "lucide-react"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { UsersSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { NAVIGATION } from "@/lib/constants"
import { UserRole } from "@prisma/client"
import { UserStatistics } from "@/components/users/user-statistics"
import { UserActivityDialog } from "@/components/users/user-activity-dialog"
import { UserFormDialog, type UserFormData } from "@/components/users/user-form-dialog"

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

export default function UsersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

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
      router.push("/auth/signin")
      return
    }

    if (session.user.role !== UserRole.admin && session.user.role !== UserRole.superadmin) {
      router.push("/dashboard")
      return
    }

    loadUsers(statusFilter)
    loadDepartments()
  }, [status, session, statusFilter, router])

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

    // Validate password
    if (!editingUser || formData.password) {
      if (formData.password !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Password tidak cocok' })
        return
      }

      if (formData.password.length < 8) {
        setMessage({ type: 'error', text: 'Password minimal 8 karakter' })
        return
      }
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

  if (!session || (session.user.role !== UserRole.admin && session.user.role !== UserRole.superadmin)) {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="space-y-8">
      <div
        className="flex items-center justify-between animate-fade-down"
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
      </div>

      {/* Statistics Dashboard */}
      <UserStatistics />

      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}



      {/* Users Table */}
      <div
        className="animate-fade-up anim-delay-200"
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
          departments={departments}
          onFilterChange={(filters) => {
            setStatusFilter(filters.status)
          }}
          onEdit={handleEditUser}
          onToggleStatus={(user) => handleToggleStatus(user.id, user.isActive)}
          onViewActivity={handleViewActivity}
          onBulkDelete={(ids) => handleBulkAction('delete', ids)}
        />
      </div>


      {/* User Form Dialog */}
      <UserFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingUser={editingUser}
        departments={departments}
        isSubmitting={isSubmitting}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleSubmit}
        onToggleStatus={handleToggleStatus}
      />



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
