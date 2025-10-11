"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Search, Edit, Trash2, Users, Filter } from "lucide-react"
import { MESSAGES, NAVIGATION, ROLE_LABELS } from "@/lib/constants"
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
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedRole, setSelectedRole] = useState<string>("all")
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = selectedDepartment === "all" || user.department === selectedDepartment
    const matchesRole = selectedRole === "all" || user.role === selectedRole

    return matchesSearch && matchesDepartment && matchesRole
  })

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{NAVIGATION.USERS}</h1>
          <p className="text-muted-foreground">
            Kelola pengguna sistem dan peran mereka
          </p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah User
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter dan Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Semua Departemen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value={UserRole.admin}>Admin</SelectItem>
                <SelectItem value={UserRole.manager}>Manager</SelectItem>
                <SelectItem value={UserRole.user}>User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daftar Pengguna ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terakhir Login</TableHead>
                  <TableHead className="w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>{user.position || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        user.role === UserRole.admin ? "default" :
                        user.role === UserRole.manager ? "secondary" : "outline"
                      }>
                        {ROLE_LABELS[user.role.toUpperCase() as keyof typeof ROLE_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "destructive"}>
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? user.lastLogin.toLocaleDateString('id-ID') : 'Belum pernah login'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user.id, user.isActive)}
                        >
                          {user.isActive ? "❌" : "✅"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Tambah User Baru'}
            </DialogTitle>
            <DialogDescription>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.user}>User</SelectItem>
                  <SelectItem value={UserRole.manager}>Manager</SelectItem>
                  <SelectItem value={UserRole.admin}>Admin</SelectItem>
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
