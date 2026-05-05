"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { id } from "date-fns/locale"

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

const SCOPE_LABELS: Record<string, string> = {
  "attendance:readwrite": "Read + Auto Check-in",
  "attendance:read": "Read Only",
  "attendance:auto-checkin": "Auto Check-in Only",
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
        {keys.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              Belum ada API key.
            </TableCell>
          </TableRow>
        )}
        {keys.map((key) => (
          <TableRow key={key.id}>
            <TableCell className="font-mono text-sm">{key.prefix}...</TableCell>
            <TableCell>{key.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {SCOPE_LABELS[key.scope] ?? key.scope}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {key.lastUsedAt
                ? format(new Date(key.lastUsedAt), "dd MMM yyyy HH:mm", { locale: id })
                : "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(new Date(key.createdAt), "dd MMM yyyy", { locale: id })}
            </TableCell>
            <TableCell className="text-right">
              <Switch
                checked={key.isActive}
                onCheckedChange={(checked) => onToggleActive(key.id, checked)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
