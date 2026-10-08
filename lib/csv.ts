// Text that Excel / Sheets would evaluate as a formula when the file is
// opened (CSV injection). Names, notes and addresses are user-supplied.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/

function toCsvField(value: unknown): string {
    if (value === null || value === undefined) return ""
    let stringValue = String(value)
    // Only text is neutralised: a real number such as -6.2088 stays numeric.
    if (typeof value === "string" && FORMULA_TRIGGER.test(stringValue)) {
        stringValue = `'${stringValue}`
    }
    const escapedValue = stringValue.replace(/"/g, '""')
    if (/[",\n\r]/.test(escapedValue)) {
        return `"${escapedValue}"`
    }
    return escapedValue
}

/**
 * Rows to CSV. Columns come from `headers` when given — so an empty report
 * still gets its header line — otherwise from the first row's keys.
 */
export function convertToCSV(data: Record<string, unknown>[], headers?: string[]): string {
    if (!headers && data.length === 0) return ""
    const columns = headers ?? Object.keys(data[0])
    const csvHeaders = columns.map(toCsvField).join(",")
    const csvRows = data.map(row => columns.map(column => toCsvField(row[column])).join(","))
    return [csvHeaders, ...csvRows].join("\n")
}
