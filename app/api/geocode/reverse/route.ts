import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withErrorHandling } from "@/lib/errors"
import { rateLimit } from "@/lib/rate-limit"

// In-process cache: identical coordinates → cached address string.
// Coordinates are rounded to 5 decimals (~1.1m precision) so dragging a
// marker a few pixels doesn't bust the cache.
const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { address: string; expiresAt: number }>()

const geoKey = (lat: number, lng: number) =>
  `${lat.toFixed(5)},${lng.toFixed(5)}`

function getCached(lat: number, lng: number): string | null {
  const entry = cache.get(geoKey(lat, lng))
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(geoKey(lat, lng))
    return null
  }
  return entry.address
}

function setCached(lat: number, lng: number, address: string) {
  cache.set(geoKey(lat, lng), { address, expiresAt: Date.now() + CACHE_TTL_MS })
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  // Rate limit: 20 requests / minute / user. Drag-pinning can fire
  // several requests in a second, but a sustained burst above this
  // means a misbehaving client. Nominatim's policy is ~1 req/sec
  // sustained — we stay well under that.
  const limited = await rateLimit(request, {
    maxRequests: 20,
    windowMs: 60 * 1000,
    keyExtractor: () => `geocode:${session.user.id}`,
  })
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    )
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: "Invalid latitude or longitude" },
      { status: 400 }
    )
  }

  // Check cache first.
  const cached = getCached(latitude, longitude)
  if (cached !== null) {
    return NextResponse.json({
      address: cached,
      latitude,
      longitude,
      cached: true,
    })
  }

  let address: string

  try {
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'next-absen-app/1.0'
        }
      }
    )

    if (nominatimResponse.ok) {
      const nominatimData = await nominatimResponse.json()
      if (nominatimData && nominatimData.display_name) {
        address = nominatimData.display_name
      } else {
        throw new Error('No address found from Nominatim')
      }
    } else {
      throw new Error(`Nominatim API request failed with status: ${nominatimResponse.status}`)
    }
  } catch (nominatimError) {
    console.error('Nominatim reverse geocoding failed:', nominatimError)
    // Fallback to coordinates
    address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  }

  setCached(latitude, longitude, address)

  return NextResponse.json({
    address: address,
    latitude: latitude,
    longitude: longitude,
    cached: false,
  })

}, "reverse geocoding")
