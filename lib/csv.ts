export function convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return ""
    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(",")
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header]
            const stringValue = value === null || value === undefined ? "" : String(value)
            const escapedValue = stringValue.replace(/"/g, '""')
            if (escapedValue.includes(",") || escapedValue.includes("\n") || escapedValue.includes('"')) {
                return `"${escapedValue}"`
            }
            return escapedValue
        }).join(",")
    })
    return [csvHeaders, ...csvRows].join("\n")
}
