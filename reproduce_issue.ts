
function getMonday(d: Date): Date {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    const day = date.getUTCDay()
    const diff = (day === 0 ? -6 : 1) - day // adjust so Monday is first day, Sunday -> -6
    date.setUTCDate(date.getUTCDate() + diff)
    return date
}

function resolveRange(period: "weekly" | "monthly", today = new Date(), customStart?: string, customEnd?: string) {
    if (customStart || customEnd) {
        const start = customStart ? new Date(customStart) : today
        const end = customEnd ? new Date(customEnd) : today
        // Set end to end of day
        end.setUTCHours(23, 59, 59, 999)
        const clampedEnd = end > today ? today : end
        return { start, end: clampedEnd }
    }

    const now = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    if (period === "weekly") {
        const start = getMonday(now)
        const end = new Date(start)
        end.setUTCDate(start.getUTCDate() + 6)
        // Set end to end of day
        end.setUTCHours(23, 59, 59, 999)
        const clampedEnd = end > now ? now : end
        return { start, end: clampedEnd }
    }

    // monthly
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    // Set end to end of day
    end.setUTCHours(23, 59, 59, 999)
    const clampedEnd = end > now ? now : end
    return { start, end: clampedEnd }
}

// Test cases
const today = new Date("2023-10-04T12:00:00Z") // Wednesday
const range = resolveRange("weekly", today)
console.log("Weekly range (Wed):", range.start.toISOString(), range.end.toISOString())

const endOfRange = range.end
// Simulate a record on the last day of the range (Sunday)
// Start: Mon Oct 02. End: Sun Oct 08 23:59:59.999Z.
// Record on Sun Oct 08 12:00:00Z.
const recordDate = new Date("2023-10-08T12:00:00Z")
console.log("Record date:", recordDate.toISOString())
console.log("Is record <= end?", recordDate <= endOfRange)

// Test custom range
const customRange = resolveRange("weekly", today, "2023-10-01", "2023-10-01")
console.log("Custom range (single day):", customRange.start.toISOString(), customRange.end.toISOString())
const recordOnDay = new Date("2023-10-01T10:00:00Z")
console.log("Record on day <= end?", recordOnDay <= customRange.end)
