"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { FormToggleRow } from "@/components/ui/form-field"
import { Switch } from "@/components/ui/switch"
import { Loader2, UserPlus, UserCog } from "lucide-react"
import { UserRole } from "@prisma/client"
import { ROLE_OPTIONS } from "@/lib/role-config"

export interface UserFormData {
  name: string
  email: string
  department: string
  position: string
  role: UserRole
  password: string
  confirmPassword: string
}

export interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingUser:
    | {
        id: string
        name: string
        email: string
        department: string | null
        position: string | null
        role: UserRole
        isActive: boolean
      }
    | null
  departments: string[]
  isSubmitting: boolean
  formData: UserFormData
  onFormDataChange: (data: UserFormData) => void
  onSubmit: (e: React.FormEvent) => void
  onToggleStatus?: (userId: string, currentStatus: boolean) => void
}

export function UserFormDialog({
  open,
  onOpenChange,
  editingUser,
  departments,
  isSubmitting,
  formData,
  onFormDataChange,
  onSubmit,
  onToggleStatus,
}: UserFormDialogProps) {
  const isEdit = Boolean(editingUser)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? (
              <>
                <UserCog className="h-5 w-5 text-sky-400" />
                Edit User
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 text-emerald-400" />
                Tambah User Baru
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui informasi user"
              : "Buat user baru dengan informasi lengkap"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nama Lengkap" htmlFor="name" required>
                <Input
                  id="name"
                  variant="glass"
                  value={formData.name}
                  onChange={(e) =>
                    onFormDataChange({ ...formData, name: e.target.value })
                  }
                  required
                />
              </FormField>
              <FormField label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  variant="glass"
                  value={formData.email}
                  onChange={(e) =>
                    onFormDataChange({ ...formData, email: e.target.value })
                  }
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Departemen" htmlFor="department">
                <Select
                  value={formData.department}
                  onValueChange={(value) =>
                    onFormDataChange({ ...formData, department: value })
                  }
                >
                  <SelectTrigger id="department" variant="glass">
                    <SelectValue placeholder="Pilih departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Posisi" htmlFor="position">
                <Input
                  id="position"
                  variant="glass"
                  value={formData.position}
                  onChange={(e) =>
                    onFormDataChange({ ...formData, position: e.target.value })
                  }
                />
              </FormField>
            </div>

            <FormField label="Role" htmlFor="role" required>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  onFormDataChange({ ...formData, role: value })
                }
              >
                <SelectTrigger id="role" variant="glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={
                  isEdit
                    ? "Password Baru (opsional)"
                    : "Password"
                }
                htmlFor="password"
                hint={isEdit ? "Kosongkan jika tidak ingin mengubah" : undefined}
                required={!isEdit}
              >
                <Input
                  id="password"
                  type="password"
                  variant="glass"
                  value={formData.password}
                  onChange={(e) =>
                    onFormDataChange({ ...formData, password: e.target.value })
                  }
                  required={!isEdit}
                  minLength={8}
                />
              </FormField>
              <FormField
                label="Konfirmasi Password"
                htmlFor="confirmPassword"
                required={!isEdit}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  variant="glass"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    onFormDataChange({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required={!isEdit}
                  minLength={8}
                />
              </FormField>
            </div>

            {isEdit && editingUser && onToggleStatus && (
              <div className="pt-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/45">
                  Aksi Tambahan
                </p>
                <FormToggleRow
                  title={
                    editingUser.isActive
                      ? "Nonaktifkan user ini"
                      : "Aktifkan user ini"
                  }
                  description={
                    editingUser.isActive
                      ? "User tidak akan bisa login sementara waktu"
                      : "User akan dapat login kembali ke sistem"
                  }
                >
                  <Switch
                    checked={editingUser.isActive}
                    onCheckedChange={() =>
                      onToggleStatus(editingUser.id, editingUser.isActive)
                    }
                  />
                </FormToggleRow>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="glass">
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Perbarui" : "Buat User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
