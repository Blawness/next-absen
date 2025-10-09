// Location service utilities for GPS tracking

export interface LocationData {
  latitude: number
  longitude: number
  address?: string
  accuracy: number
  timestamp: Date
  altitude?: number
  heading?: number
  speed?: number
}

export interface GeofenceConfig {
  center: {
    latitude: number
    longitude: number
  }
  radius: number // in meters
  tolerance: number // accuracy tolerance
}

export interface LocationService {
  getCurrentPosition(): Promise<LocationData>
  validateLocation(location: LocationData, config: GeofenceConfig): boolean
  reverseGeocode(lat: number, lng: number): Promise<string>
  calculateDistance(loc1: { latitude: number; longitude: number }, loc2: { latitude: number; longitude: number }): number
}

// Haversine formula for calculating distance between two GPS coordinates
export function calculateDistance(
  loc1: { latitude: number; longitude: number },
  loc2: { latitude: number; longitude: number }
): number {
  // Safety check for undefined/null parameters
  if (!loc1 || !loc2 || typeof loc1.latitude !== 'number' || typeof loc1.longitude !== 'number' ||
      typeof loc2.latitude !== 'number' || typeof loc2.longitude !== 'number') {
    throw new Error('Invalid location parameters for distance calculation')
  }

  const R = 6371e3 // Earth's radius in meters
  const φ1 = (loc1.latitude * Math.PI) / 180
  const φ2 = (loc2.latitude * Math.PI) / 180
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

// Validate location against geofence
export function validateLocation(
  location: LocationData,
  config: GeofenceConfig
): boolean {
  // Safety checks
  if (!location || !config || !config.center) {
    return false
  }

  const distance = calculateDistance(
    location,
    config.center
  )

  return distance <= config.radius && location.accuracy <= config.tolerance
}

// Get current position using HTML5 Geolocation API
export function getCurrentPosition(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000, // 5 minutes
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        }

        resolve(locationData)
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('User denied the request for Geolocation'))
            break
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable'))
            break
          case error.TIMEOUT:
            reject(new Error('The request to get user location timed out'))
            break
          default:
            reject(new Error('An unknown error occurred'))
            break
        }
      },
      options
    )
  })
}

// Reverse geocoding using Google Maps API
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      throw new Error('Google Maps API key not configured')
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }

    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address
    } else {
      throw new Error('No address found for the given coordinates')
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  }
}

// Watch position for continuous location updates
export function watchPosition(
  callback: (location: LocationData) => void,
  errorCallback?: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser')
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000, // 1 minute
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp),
        altitude: position.coords.altitude || undefined,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined,
      }
      callback(locationData)
    },
    errorCallback || ((error) => console.error('Geolocation error:', error)),
    options
  )
}

// Clear position watch
export function clearWatch(watchId: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId)
  }
}
