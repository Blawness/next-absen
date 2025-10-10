import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
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

    // For now, return coordinates as address since we're using Leaflet
    // In a production app, you might want to use a different geocoding service
    // like OpenStreetMap Nominatim API or a paid service

    const address = `Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`

    return NextResponse.json({
      address: address,
      latitude: latitude,
      longitude: longitude,
    })

  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
