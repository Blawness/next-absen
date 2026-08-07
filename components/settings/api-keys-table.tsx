"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DataTableEmptyState } from "@/components/ui/data-table/data-table-empty-state"
import { KeyRound } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface ApiKeyRow {
  id: string
  prefix: string
  name: string
  scope: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

interface ApiKeysTableProps {
  keys: ApiKeyRow[]
  onToggleActive: (id: string, isActive: boolean) => void
}

const SCOPE_LABELS: Record<string, { label: string; className: string }> = {
  "attendance:readwrite": {
    label: "Read + Auto Check-in",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  "attendance:read": {
    label: "Read Only",
    className: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  },
  "attendance:auto-checkin": {
    label: "Auto Check-in Only",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
}

const SCOPE_DEFAULT = {
  label: "—",
  className: "border-white/10 bg-white/5 text-white/65",
}

export function ApiKeysTable({ keys, onToggleActive }: ApiKeysTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Prefix</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Terakhir Digunakan</TableHead>
          <TableHead>Dibuat</TableHead>
          <TableHead className="text-right">Aktif</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.length === 0 ? (
          <TableEmpty colSpan={6}>
            <DataTableEmptyState
              icon={<KeyRound className="h-7 w-7" />}
              title="Belum ada API key"
              description="Buat API key pertama untuk integrasi dengan aplikasi eksternal."
            />
          </TableEmpty>
        ) : (
          keys.map((key) => {
            const scope = SCOPE_LABELS[key.scope] ?? SCOPE_DEFAULT
            return (
              <TableRow key={key.id}>
                <TableCell>
                  <code className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/80">
                    {key.prefix}…
                  </code>
                </TableCell>
                <TableCell className="font-medium text-white">
                  {key.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${scope.className}`}
                  >
                    {scope.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-white/65">
                  {key.lastUsedAt
                    ? format(new Date(key.lastUsedAt), "dd MMM yyyy HH:mm", {
                        locale: idLocale,
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-sm text-white/65">
                  {format(new Date(key.createdAt), "dd MMM yyyy", {
                    locale: idLocale,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={key.isActive}
                    onCheckedChange={(checked) => onToggleActive(key.id, checked)}
                    aria-label={`Toggle ${key.name}`}
                  />
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
