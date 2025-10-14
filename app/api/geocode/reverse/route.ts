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

    // Use OpenStreetMap Nominatim API for reverse geocoding (free, no API key required)
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
