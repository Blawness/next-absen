import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { HttpError, withErrorHandling } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

/**
 * GET /api/superadmin/export
 *
 * Full data export for migration to a new database (e.g. MySQL → PostgreSQL).
 * Superadmin-only. Returns a JSON attachment containing every persistent table.
 *
 * The output structure is self-describing (a `meta` block with version + counts +
 * notes) so the receiving application can validate compatibility before import.
 *
 * Tables intentionally EXCLUDED:
 *   - persistedSessionTokens — ephemeral; new app will re-issue sessions.
 *
 * Tables exported (in dependency order for re-insertion):
 *   - users
 *   - absensiRecords
 *   - activityLogs
 *   - settings
 *   - systemSettings
 *   - apiKeys
 *
 * Scalability note: this reads everything into memory before serializing.
 * For multi-million-row databases, switch to cursor/paginated reads +
 * NDJSON streaming. The current dataset size is fine for in-memory.
 */
const EXPORT_VERSION = "1.0"

export const GET = withErrorHandling(async (_request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new HttpError("Unauthorized", 401)
  }
  if (session.user.role !== UserRole.superadmin) {
    throw new HttpError("Forbidden — superadmin only", 403)
  }

  // Read all tables in parallel. They are independent queries (no joins needed
  // because the export is per-table; FK integrity is preserved by reusing IDs).
  const [users, absensiRecords, activityLogs, settings, systemSettings, apiKeys] =
    await Promise.all([
      prisma.user.findMany(),
      prisma.absensiRecord.findMany(),
      prisma.activityLog.findMany(),
      prisma.setting.findMany(),
      prisma.systemSettings.findMany(),
      prisma.apiKey.findMany(),
    ])

  const payload = {
    meta: {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      sourceApp: "next-absen",
      exportedBy: {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      counts: {
        users: users.length,
        absensiRecords: absensiRecords.length,
        activityLogs: activityLogs.length,
        settings: settings.length,
        systemSettings: systemSettings.length,
        apiKeys: apiKeys.length,
      },
      excluded: {
        persistedSessionTokens:
          "Ephemeral. New app will issue fresh sessions on first login.",
      },
      notes: [
        "All UUIDs are preserved so foreign keys remain valid after import.",
        "Prisma Decimal fields are serialized as strings to avoid precision loss.",
        "User passwords are bcrypt hashes (cost 12) and can be re-imported as-is.",
        "API key plaintext values are NOT recoverable (bcrypt is one-way). After import, any key that needs to remain active must be regenerated; the prefix and metadata are preserved so historical audit references stay meaningful.",
        "Insert in dependency order: users → absensiRecords / activityLogs / apiKeys → settings / systemSettings.",
      ],
    },
    data: {
      users,
      absensiRecords,
      activityLogs,
      settings,
      systemSettings,
      apiKeys,
    },
  }

  // Audit the export itself. The file contains sensitive data (password hashes,
  // emails, GPS coordinates), so logging the actor is required.
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "EXPORT_DATA",
      resourceType: "system",
      resourceId: "full",
      details: {
        counts: payload.meta.counts,
        exportVersion: EXPORT_VERSION,
        purpose: "migration",
      },
    },
  })

  const filename = `next-absen-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}, "exporting data")
