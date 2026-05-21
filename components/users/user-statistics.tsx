"use client"

import { useEffect, useState } from "react"
import { Users, UserCheck, UserX, TrendingUp, Sparkles } from "lucide-react"

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

const DEPT_COLORS = [
    "from-emerald-500 to-teal-500",
    "from-sky-500 to-blue-500",
    "from-violet-500 to-purple-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-cyan-500 to-sky-500",
]

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
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                        <div className="flex justify-between items-start mb-3">
                            <div className="h-3 w-20 bg-white/10 rounded" />
                            <div className="h-8 w-8 bg-white/10 rounded-xl" />
                        </div>
                        <div className="h-8 w-14 bg-white/10 rounded mb-2" />
                        <div className="h-1.5 w-full bg-white/10 rounded-full" />
                    </div>
                ))}
            </div>
        )
    }

    if (!stats) return null

    const activePercent = stats.overview.total > 0
        ? Math.round((stats.overview.active / stats.overview.total) * 100)
        : 0
    const inactivePercent = stats.overview.total > 0
        ? Math.round((stats.overview.inactive / stats.overview.total) * 100)
        : 0
    const loginPercent = stats.overview.total > 0
        ? Math.round((stats.overview.recentLogins / stats.overview.total) * 100)
        : 0

    const statCards = [
        {
            label: "Total Pengguna",
            value: stats.overview.total,
            sub: "terdaftar",
            icon: Users,
            iconBg: "bg-white/10",
            iconColor: "text-white",
            bar: 100,
            barColor: "from-white/40 to-white/20",
        },
        {
            label: "Aktif",
            value: stats.overview.active,
            sub: `${activePercent}% dari total`,
            icon: UserCheck,
            iconBg: "bg-emerald-500/20",
            iconColor: "text-emerald-400",
            bar: activePercent,
            barColor: "from-emerald-500 to-teal-400",
        },
        {
            label: "Nonaktif",
            value: stats.overview.inactive,
            sub: `${inactivePercent}% dari total`,
            icon: UserX,
            iconBg: "bg-rose-500/20",
            iconColor: "text-rose-400",
            bar: inactivePercent,
            barColor: "from-rose-500 to-pink-400",
        },
        {
            label: "Login Bulan Ini",
            value: stats.overview.recentLogins,
            sub: `${loginPercent}% pengguna aktif`,
            icon: TrendingUp,
            iconBg: "bg-sky-500/20",
            iconColor: "text-sky-400",
            bar: loginPercent,
            barColor: "from-sky-500 to-blue-400",
        },
        {
            label: "User Baru",
            value: stats.overview.newThisMonth,
            sub: "bulan ini",
            icon: Sparkles,
            iconBg: "bg-amber-500/20",
            iconColor: "text-amber-400",
            bar: stats.overview.total > 0 ? Math.min(100, Math.round((stats.overview.newThisMonth / stats.overview.total) * 100)) : 0,
            barColor: "from-amber-500 to-orange-400",
        },
    ]

    return (
        <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                {statCards.map((card, index) => (
                    <div
                        key={card.label}
                        className={`glass-card rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-200 ${index > 0 ? `animate-fade-up anim-delay-${index * 100}` : "animate-fade-up"}`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <span className="text-xs font-medium text-white/60 uppercase tracking-wide leading-tight">
                                {card.label}
                            </span>
                            <div className={`${card.iconBg} p-2 rounded-xl flex-shrink-0`}>
                                <card.icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1 tabular-nums">
                            {card.value}
                        </div>
                        <p className="text-xs text-white/50 mb-3">{card.sub}</p>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${card.barColor} rounded-full transition-all duration-700`}
                                style={{ width: `${card.bar}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {stats.departmentBreakdown.length > 0 && (
                <div className="animate-fade-up anim-delay-500 glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-semibold text-white/90">Distribusi Departemen</span>
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs text-white/40">{stats.departmentBreakdown.length} dept</span>
                    </div>
                    <div className="space-y-2.5">
                        {stats.departmentBreakdown.map((dept, index) => {
                            const pct = stats.overview.total > 0
                                ? (dept.count / stats.overview.total) * 100
                                : 0
                            const colorClass = DEPT_COLORS[index % DEPT_COLORS.length]
                            return (
                                <div key={dept.department} className="group">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 bg-gradient-to-r ${colorClass}`} />
                                            <span className="text-sm text-white/75 truncate">{dept.department || "Tidak ada"}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-white/90 ml-2 tabular-nums flex-shrink-0">
                                            {dept.count}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-700 opacity-70 group-hover:opacity-100`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
