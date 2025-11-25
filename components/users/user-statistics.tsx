"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Users, UserCheck, UserX, TrendingUp, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface UserStatistics {
    overview: {
        total: number
        active: number
        inactive: number
        recentLogins: number
        newThisMonth: number
    }
    departmentBreakdown: Array<{
        department: string
        count: number
    }>
    roleDistribution: Array<{
        role: string
        count: number
    }>
}

export function UserStatistics() {
    const [stats, setStats] = useState<UserStatistics | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadStatistics()
    }, [])

    const loadStatistics = async () => {
        try {
            const response = await fetch('/api/users/statistics')
            if (response.ok) {
                const data = await response.json()
                setStats(data)
            }
        } catch (error) {
            console.error('Error loading statistics:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="glass-card animate-pulse">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-20 bg-white/10 rounded" />
                            <div className="h-4 w-4 bg-white/10 rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-16 bg-white/10 rounded mb-1" />
                            <div className="h-3 w-24 bg-white/10 rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (!stats) return null

    const statCards = [
        {
            title: "Total Users",
            value: stats.overview.total,
            description: "All registered users",
            icon: Users,
            color: "text-blue-400"
        },
        {
            title: "Active Users",
            value: stats.overview.active,
            description: `${Math.round((stats.overview.active / stats.overview.total) * 100)}% of total`,
            icon: UserCheck,
            color: "text-green-400"
        },
        {
            title: "Inactive Users",
            value: stats.overview.inactive,
            description: `${Math.round((stats.overview.inactive / stats.overview.total) * 100)}% of total`,
            icon: UserX,
            color: "text-red-400"
        },
        {
            title: "Recent Logins",
            value: stats.overview.recentLogins,
            description: "Last 30 days",
            icon: TrendingUp,
            color: "text-purple-400"
        },
        {
            title: "New This Month",
            value: stats.overview.newThisMonth,
            description: "Users created",
            icon: Building2,
            color: "text-orange-400"
        }
    ]

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {statCards.map((card, index) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                        <Card className="glass-card hover:scale-105 transition-transform duration-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-white/80">
                                    {card.title}
                                </CardTitle>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{card.value}</div>
                                <p className="text-xs text-white/60 mt-1">
                                    {card.description}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Department Breakdown */}
            {stats.departmentBreakdown.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                >
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="text-white">Department Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {stats.departmentBreakdown.map((dept, index) => (
                                    <div key={dept.department} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor: `hsl(${(index * 360) / stats.departmentBreakdown.length}, 70%, 60%)`
                                                }}
                                            />
                                            <span className="text-sm text-white/80">{dept.department}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${(dept.count / stats.overview.total) * 100}%`
                                                    }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium text-white w-8 text-right">
                                                {dept.count}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    )
}
