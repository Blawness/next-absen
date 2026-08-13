import { prisma } from "./prisma"
import { calculateDistance, type LocationData } from "./location"
import { HttpError } from "./errors"

export interface GeofenceConfig {
  center: { latitude: number; longitude: number } | null
  radius: number
  requireLocation: boolean
}

export interface GeofenceCheckResult {
  config: GeofenceConfig
  withinGeofence: boolean | null
  distance: number | null
}

const DEFAULT_RADIUS_METERS = 100

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/**
 * Read the geofence configuration from SystemSettings.location.
 * Returns null center if the office coordinates aren't configured.
 *
 * NOTE: We intentionally do NOT fall back to creating a default
 * SystemSettings row here. Settings must be explicitly configured
 * by an admin via the Settings page.
 */
export async function getGeofenceConfig(): Promise<GeofenceConfig> {
  const settings = await prisma.systemSettings.findFirst()
  const raw = (settings?.location ?? null) as Record<string, unknown> | null

  const lat = raw ? asNumber(raw.officeLatitude) : null
  const lng = raw ? asNumber(raw.officeLongitude) : null
  const radius = raw ? asNumber(raw.geofenceRadius) : null
  const requireLocation = raw?.requireLocation !== false

  return {
    center: lat != null && lng != null ? { latitude: lat, longitude: lng } : null,
    radius: radius ?? DEFAULT_RADIUS_METERS,
    requireLocation,
  }
}

/**
 * Validate a user location against the configured office geofence.
 *
 * Behaviour:
 *  - If no office is configured and `requireLocation` is false → `withinGeofence = null` (skipped)
 *  - If no office is configured and `requireLocation` is true → throws 500 (admin must configure)
 *  - If office is configured → returns whether the user is within `radius + accuracy` meters
 */
export async function validateGeofence(location: LocationData): Promise<GeofenceCheckResult> {
  const config = await getGeofenceConfig()

  if (!config.center) {
    if (config.requireLocation) {
      throw new HttpError(
        "Verifikasi lokasi diaktifkan tetapi lokasi kantor belum dikonfigurasi. Hubungi administrator.",
        500
      )
    }
    return { config, withinGeofence: null, distance: null }
  }

  const distance = calculateDistance(
    { latitude: location.latitude, longitude: location.longitude },
    config.center
  )
  // Effective radius: configured radius + GPS accuracy tolerance.
  // Without this, a user with 50m accuracy at the edge of the radius gets
  // a false positive just outside the fence.
  const effectiveRadius = config.radius + Math.max(0, location.accuracy)
  return {
    config,
    distance,
    withinGeofence: distance <= effectiveRadius,
  }
}
