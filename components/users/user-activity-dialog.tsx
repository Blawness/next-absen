"use client"

import { useEffect, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Activity, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"

interface ActivityLog {
    id: string
    action: string
    resourceType: string
    resourceId: string
    details: Record<string, unknown>
    createdAt: string
}

interface UserActivityDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userId: string
    userName: string
}

export function UserActivityDialog({
    open,
    onOpenChange,
    userId,
    userName
}: UserActivityDialogProps) {
    const [activities, setActivities] = useState<ActivityLog[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [offset, setOffset] = useState(0)
    const limit = 20

    const loadActivities = useCallback(async (currentOffset: number) => {
        setIsLoading(true)
        try {
            const response = await fetch(
                `/api/users/${userId}/activity?limit=${limit}&offset=${currentOffset}`
            )
            if (response.ok) {
                const data = await response.json()
                if (currentOffset === 0) {
                    setActivities(data.activities)
                } else {
                    setActivities(prev => [...prev, ...data.activities])
                }
                setHasMore(data.pagination.hasMore)
                setOffset(currentOffset)
            }
        } catch (error) {
            console.error('Error loading activities:', error)
        } finally {
            setIsLoading(false)
        }
    }, [userId, limit])

    useEffect(() => {
        if (open) {
            loadActivities(0)
        } else {
            // Reset when dialog closes
            setActivities([])
            setOffset(0)
        }
    }, [open, loadActivities])

    const loadMore = () => {
        loadActivities(offset + limit)
    }

    const getActionLabel = (action: string): string => {
        const labels: Record<string, string> = {
            'LOGIN': 'Logged in',
            'LOGOUT': 'Logged out',
            'CHECK_IN': 'Checked in',
            'CHECK_OUT': 'Checked out',
            'CREATE_USER': 'Created user',
            'UPDATE_USER': 'Updated user',
            'DELETE_USER': 'Deleted user',
            'ACTIVATE_USER': 'Activated user',
            'DEACTIVATE_USER': 'Deactivated user',
            'RESET_PASSWORD': 'Reset password',
            'UPDATE_PROFILE': 'Updated profile',
            'EXPORT_USERS': 'Exported users',
            'VIEW_REPORT': 'Viewed report',
            'EXPORT_REPORT': 'Exported report'
        }
        return labels[action] || action
    }

    const getActionColor = (action: string): string => {
        if (action.includes('DELETE') || action.includes('DEACTIVATE')) return 'text-red-400'
        if (action.includes('CREATE') || action.includes('ACTIVATE')) return 'text-green-400'
        if (action.includes('UPDATE') || action.includes('RESET')) return 'text-yellow-400'
        return 'text-blue-400'
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-gray-900/95 backdrop-blur-md border-white/10 max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Log
                    </DialogTitle>
                    <DialogDescription className="text-white/70">
                        Activity history for <span className="font-semibold text-white">{userName}</span>
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[500px] pr-4">
                    {isLoading && activities.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-white/60">
                            <Activity className="h-12 w-12 mb-2" />
                            <p>No activity found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activities.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="relative pl-6 pb-3 border-l-2 border-white/10 last:border-l-0"
                                >
                                    {/* Timeline dot */}
                                    <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />

                                    <div className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className={`font-medium ${getActionColor(activity.action)}`}>
                                                    {getActionLabel(activity.action)}
                                                </p>
                                                {activity.details && Object.keys(activity.details).length > 0 && (
                                                    <div className="mt-1 text-xs text-white/60 space-y-1">
                                                        {Object.entries(activity.details).map(([key, value]) => (
                                                            <div key={key}>
                                                                <span className="text-white/40">{key}:</span>{' '}
                                                                <span>{String(value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1 text-xs text-white/60">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(activity.createdAt), 'MMM dd, yyyy')}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(activity.createdAt), 'HH:mm:ss')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {hasMore && (
                                <div className="flex justify-center pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={loadMore}
                                        disabled={isLoading}
                                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            'Load More'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
