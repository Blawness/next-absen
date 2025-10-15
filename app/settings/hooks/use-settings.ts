"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"
import { SystemSettings, Message } from "../types"

export const useSettings = () => {
  const { data: session, status } = useSession()

  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

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

    loadSettings()
  }, [status, session, loadSettings])

  const saveSettings = useCallback(async () => {
    if (!settings) return

    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Gagal menyimpan pengaturan' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' })
    } finally {
      setIsSaving(false)
    }
  }, [settings])

  const updateSettings = useCallback((section: keyof SystemSettings, field: string, value: unknown) => {
    setSettings(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }
    })
  }, [])

  return {
    // State
    settings,
    isLoading,
    isSaving,
    message,

    // Actions
    loadSettings,
    saveSettings,
    updateSettings,
    setMessage
  }
}
