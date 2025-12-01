"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { motion } from "framer-motion"
import { Clock } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NAVIGATION } from "@/lib/constants"
import { UserRole } from "@prisma/client"

interface ActivityLog {
    id: string
    userId: string
    action: string
    resourceType: string
    resourceId: string
    details: Record<string, unknown>
    createdAt: string
    user: {
        name: string
        email: string
        avatarUrl: string | null
    }
}

export default function ActivityLogsPage() {
    const { data: session, status } = useSession()
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [filterAction, setFilterAction] = useState<string>("all")

    const fetchLogs = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20"
            })

            if (filterAction !== "all") {
                params.append("action", filterAction)
            }

            const response = await fetch(`/api/activity-logs?${params.toString()}`)
            if (response.ok) {
                const data = await response.json()
                setLogs(data.activities)
                setTotalPages(data.pagination.pages)
            }
        } catch (error) {
            console.error("Error fetching logs:", error)
        } finally {
            setIsLoading(false)
        }
    }, [page, filterAction])

    useEffect(() => {
        if (status === "loading") return

        if (status === "unauthenticated" || !session) {
            redirect("/auth/signin")
            return
        }

        if (session.user.role !== UserRole.admin) {
            redirect("/dashboard")
            return
        }

        fetchLogs()
    }, [status, session, fetchLogs])

    const getActionColor = (action: string) => {
        if (action.includes("DELETE") || action.includes("DEACTIVATE")) return "bg-red-500/20 text-red-400 border-red-500/30"
        if (action.includes("CREATE") || action.includes("ACTIVATE")) return "bg-green-500/20 text-green-400 border-green-500/30"
        if (action.includes("UPDATE") || action.includes("RESET")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    }

    const formatAction = (action: string) => {
        return action.replace(/_/g, " ")
    }

    if (status === "loading") {
        return <div className="p-8 text-center text-white">Loading...</div>
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
                        {NAVIGATION.ACTIVITY_LOG}
                    </h1>
                    <p className="text-white/80 text-lg">
                        Pantau semua aktivitas sistem
                    </p>
                </div>
            </motion.div>

            <Card className="glass-card border-white/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold text-white">
                        Riwayat Aktivitas
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <Select value={filterAction} onValueChange={setFilterAction}>
                            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Filter Aksi" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-white/10 text-white">
                                <SelectItem value="all">Semua Aksi</SelectItem>
                                <SelectItem value="LOGIN">Login</SelectItem>
                                <SelectItem value="LOGOUT">Logout</SelectItem>
                                <SelectItem value="CREATE_USER">Create User</SelectItem>
                                <SelectItem value="UPDATE_USER">Update User</SelectItem>
                                <SelectItem value="UPDATE_SETTINGS">Update Settings</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="text-center py-8 text-white/60">Memuat data...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-8 text-white/60">Tidak ada aktivitas ditemukan</div>
                        ) : (
                            <div className="space-y-4">
                                {logs.map((log) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-start space-x-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                    >
                                        <Avatar className="h-10 w-10 border border-white/20">
                                            <AvatarImage src={log.user.avatarUrl || undefined} />
                                            <AvatarFallback className="bg-blue-600 text-white">
                                                {log.user.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-semibold text-white">{log.user.name}</span>
                                                    <span className="text-white/40 text-sm">•</span>
                                                    <span className="text-white/60 text-sm">{log.user.email}</span>
                                                </div>
                                                <div className="flex items-center text-white/40 text-sm">
                                                    <Clock className="mr-1 h-3 w-3" />
                                                    {format(new Date(log.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2 mt-1">
                                                <Badge variant="outline" className={`${getActionColor(log.action)}`}>
                                                    {formatAction(log.action)}
                                                </Badge>
                                                <span className="text-white/80 text-sm">
                                                    {log.resourceType}
                                                </span>
                                            </div>

                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <div className="mt-2 text-sm text-white/50 bg-black/20 p-2 rounded">
                                                    <pre className="whitespace-pre-wrap font-mono text-xs">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="flex items-center justify-between pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                                Previous
                            </Button>
                            <span className="text-white/60 text-sm">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isLoading}
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
