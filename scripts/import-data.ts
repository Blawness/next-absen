/**
 * scripts/import-data.ts
 *
 * Imports a JSON export produced by GET /api/superadmin/export into the
 * current database. Idempotent — re-running with the same file is a no-op
 * for already-imported rows.
 *
 * Usage:
 *   tsx scripts/import-data.ts <path-to-export.json> [--dry-run]
 *
 * Intended to be run in the NEW app's environment (e.g. PostgreSQL).
 * The Prisma schema is expected to match the source app's `prisma/schema.prisma`
 * (or be a strict superset — extra fields in the destination schema are fine,
 * the importer only sets fields that exist in the source row).
 *
 * Notes on assumptions:
 *   - The Prisma schema defines the same models with the same scalar fields.
 *   - Source IDs (UUIDs) are preserved as primary keys; if a row with that ID
 *     already exists, it is skipped (NOT updated).
 *   - The `User.password` field already contains a bcrypt hash; do not re-hash
 *     on import.
 *   - `ApiKey.key` already contains a bcrypt hash; plaintext is not recoverable.
 *     The import preserves the prefix + metadata so the new app can audit which
 *     keys were active, but `validateApiKey` will not accept the original
 *     plaintext unless the new app uses the same hash. Re-issue active keys.
 *   - `persistedSessionTokens` are NOT in the export by design.
 */

import { PrismaClient, Prisma } from "@prisma/client"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const prisma = new PrismaClient()

const SUPPORTED_VERSION = "1.0"
const EXPECTED_SOURCE_APP = "next-absen"

interface ExportMeta {
  version: string
  exportedAt: string
  sourceApp: string
  exportedBy: { userId: string; email: string; role: string }
  counts: Record<string, number>
  excluded: Record<string, string>
  notes: string[]
}

interface ExportPayload {
  meta: ExportMeta
  data: {
    users: Prisma.UserCreateInput[]
    absensiRecords: Prisma.AbsensiRecordCreateInput[]
    activityLogs: Prisma.ActivityLogCreateInput[]
    settings: Prisma.SettingCreateInput[]
    systemSettings: Prisma.SystemSettingsCreateInput[]
    apiKeys: Prisma.ApiKeyCreateInput[]
  }
}

type TableName = keyof ExportPayload["data"]

interface StepResult {
  table: TableName
  created: number
  skipped: number
  failed: number
}

function parseArgs() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const filePath = args.find((a) => !a.startsWith("--"))
  return { filePath, dryRun }
}

function validatePayload(payload: unknown): asserts payload is ExportPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Export file is not a JSON object")
  }
  const p = payload as Partial<ExportPayload>
  if (!p.meta || typeof p.meta !== "object") {
    throw new Error("Export is missing the `meta` block")
  }
  if (p.meta.version !== SUPPORTED_VERSION) {
    throw new Error(
      `Unsupported export version: ${String(p.meta.version)}. ` +
        `This importer supports version ${SUPPORTED_VERSION}.`
    )
  }
  if (p.meta.sourceApp !== EXPECTED_SOURCE_APP) {
    console.warn(
      `⚠️  Unexpected sourceApp: ${String(p.meta.sourceApp)} (expected ${EXPECTED_SOURCE_APP}). Continuing.`
    )
  }
  if (!p.data || typeof p.data !== "object") {
    throw new Error("Export is missing the `data` block")
  }
}

async function importTable<T extends TableName>(
  table: T,
  rows: ExportPayload["data"][T] | undefined,
  exists: (row: any) => Promise<boolean>,
  create: (row: any) => Promise<unknown>,
  dryRun: boolean
): Promise<StepResult> {
  if (!rows || rows.length === 0) {
    return { table, created: 0, skipped: 0, failed: 0 }
  }

  let created = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    try {
      if (await exists(row)) {
        skipped++
        continue
      }
      if (!dryRun) {
        await create(row)
      }
      created++
    } catch (err) {
      failed++
      // Print the first failure in detail; subsequent failures are summarized.
      if (failed === 1) {
        console.error(`   ❌ First failure on ${table}:`, err instanceof Error ? err.message : err)
      }
    }
  }

  return { table, created, skipped, failed }
}

async function importData(filePath: string, dryRun: boolean) {
  const absolutePath = resolve(filePath)
  if (!existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`)
  }

  console.log(`📥 Loading export from: ${absolutePath}`)
  if (dryRun) console.log("🔍 DRY RUN — no writes will be performed")

  const raw = readFileSync(absolutePath, "utf-8")
  const payload: ExportPayload = JSON.parse(raw)
  validatePayload(payload)

  const { meta, data } = payload

  console.log(`\n📋 Export meta:`)
  console.log(`   version:    ${meta.version}`)
  console.log(`   exportedAt: ${meta.exportedAt}`)
  console.log(`   sourceApp:  ${meta.sourceApp}`)
  console.log(`   exportedBy: ${meta.exportedBy.email} (${meta.exportedBy.role})`)
  console.log(`\n📊 Counts:`)
  for (const [k, v] of Object.entries(meta.counts)) {
    console.log(`   ${k.padEnd(20)} ${v}`)
  }

  console.log(`\n⚠️  Reminder: API key plaintexts are NOT in the export (bcrypt is one-way).`)
  console.log(`   After import, regenerate any key that needs to stay active.\n`)

  // Insertion order matters: parents first.
  const steps: StepResult[] = []

  console.log("👤  users")
  steps.push(
    await importTable(
      "users",
      data.users,
      async (u) => (await prisma.user.findUnique({ where: { id: u.id } })) !== null,
      async (u) => {
        // Prisma's findMany returns flat objects; create accepts the same shape.
        // Cast through unknown so we don't need to enumerate every field.
        await prisma.user.create({ data: u as unknown as Prisma.UserUncheckedCreateInput })
      },
      dryRun
    )
  )

  console.log("📅  absensiRecords")
  steps.push(
    await importTable(
      "absensiRecords",
      data.absensiRecords,
      async (r) => (await prisma.absensiRecord.findUnique({ where: { id: r.id } })) !== null,
      async (r) => {
        await prisma.absensiRecord.create({
          data: r as unknown as Prisma.AbsensiRecordUncheckedCreateInput,
        })
      },
      dryRun
    )
  )

  console.log("📜  activityLogs")
  steps.push(
    await importTable(
      "activityLogs",
      data.activityLogs,
      async (l) => (await prisma.activityLog.findUnique({ where: { id: l.id } })) !== null,
      async (l) => {
        await prisma.activityLog.create({
          data: l as unknown as Prisma.ActivityLogUncheckedCreateInput,
        })
      },
      dryRun
    )
  )

  console.log("⚙️   settings")
  steps.push(
    await importTable(
      "settings",
      data.settings,
      async (s) => (await prisma.setting.findUnique({ where: { key: s.key } })) !== null,
      async (s) => {
        await prisma.setting.create({ data: s as unknown as Prisma.SettingUncheckedCreateInput })
      },
      dryRun
    )
  )

  console.log("🔧  systemSettings")
  steps.push(
    await importTable(
      "systemSettings",
      data.systemSettings,
      async (s) => (await prisma.systemSettings.findUnique({ where: { id: s.id } })) !== null,
      async (s) => {
        await prisma.systemSettings.create({
          data: s as unknown as Prisma.SystemSettingsUncheckedCreateInput,
        })
      },
      dryRun
    )
  )

  console.log("🔑  apiKeys")
  steps.push(
    await importTable(
      "apiKeys",
      data.apiKeys,
      async (k) => (await prisma.apiKey.findUnique({ where: { id: k.id } })) !== null,
      async (k) => {
        await prisma.apiKey.create({ data: k as unknown as Prisma.ApiKeyUncheckedCreateInput })
      },
      dryRun
    )
  )

  console.log(`\n${dryRun ? "🔍 Dry run" : "✅ Import"} summary:`)
  console.log(
    `   ${"table".padEnd(20)} ${"created".padStart(8)} ${"skipped".padStart(8)} ${"failed".padStart(8)}`
  )
  console.log(`   ${"-".repeat(48)}`)
  let totalCreated = 0,
    totalSkipped = 0,
    totalFailed = 0
  for (const s of steps) {
    console.log(
      `   ${s.table.padEnd(20)} ${String(s.created).padStart(8)} ${String(s.skipped).padStart(8)} ${String(s.failed).padStart(8)}`
    )
    totalCreated += s.created
    totalSkipped += s.skipped
    totalFailed += s.failed
  }
  console.log(`   ${"-".repeat(48)}`)
  console.log(
    `   ${"TOTAL".padEnd(20)} ${String(totalCreated).padStart(8)} ${String(totalSkipped).padStart(8)} ${String(totalFailed).padStart(8)}`
  )

  if (totalFailed > 0) {
    throw new Error(`${totalFailed} row(s) failed to import. See errors above.`)
  }
}

const { filePath, dryRun } = parseArgs()
if (!filePath) {
  console.error("Usage: tsx scripts/import-data.ts <path-to-export.json> [--dry-run]")
  process.exit(1)
}

importData(filePath, dryRun)
  .catch((e) => {
    console.error("\n❌ Import failed:", e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
