"use client"

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in Leaflet with Webpack
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LeafletMapProps {
  latitude: number
  longitude: number
  address?: string
  draggable?: boolean
  onLocationChange?: (lat: number, lng: number) => void
  radius?: number
  centerLatitude?: number
  centerLongitude?: number
}

export default function LeafletMap({
  latitude,
  longitude,
  address,
  draggable = false,
  onLocationChange,
  radius,
  centerLatitude,
  centerLongitude
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView([latitude, longitude], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
        circleRef.current = null
      }
    }
  }, []) // Init once

  // Update Marker and View
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Update or Create Marker
    if (markerRef.current) {
      const currentLatLng = markerRef.current.getLatLng()
      // Only update if position changed significantly to avoid loops during drag
      if (currentLatLng.lat !== latitude || currentLatLng.lng !== longitude) {
        markerRef.current.setLatLng([latitude, longitude])
        map.setView([latitude, longitude], map.getZoom())
      }
    } else {
      const marker = L.marker([latitude, longitude], { draggable })
        .addTo(map)
        .bindPopup(`Lokasi Anda: ${address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}`)
        .openPopup()

      markerRef.current = marker
    }

    // Update Marker Draggable state and Event Listeners
    if (markerRef.current) {
      if (draggable) {
        markerRef.current.dragging?.enable()
      } else {
        markerRef.current.dragging?.disable()
      }

      // Update popup content
      markerRef.current.setPopupContent(
        `Lokasi Anda: ${address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}`
      )

      // Manage dragend listener
      markerRef.current.off('dragend')
      if (draggable && onLocationChange) {
        markerRef.current.on('dragend', (event) => {
          const marker = event.target
          const position = marker.getLatLng()
          onLocationChange(position.lat, position.lng)
        })
      }
    }

    // Update or Create Circle
    if (radius) {
      const circleLat = centerLatitude ?? latitude
      const circleLng = centerLongitude ?? longitude

      if (circleRef.current) {
        circleRef.current.setLatLng([circleLat, circleLng])
        circleRef.current.setRadius(radius)
      } else {
        circleRef.current = L.circle([circleLat, circleLng], {
          radius: radius,
          color: 'blue',
          fillColor: '#30f',
          fillOpacity: 0.1,
        }).addTo(map)
      }
    } else if (circleRef.current) {
      circleRef.current.remove()
      circleRef.current = null
    }

  }, [latitude, longitude, address, draggable, onLocationChange, radius, centerLatitude, centerLongitude])

  return (
    <div className="h-full w-full rounded-lg">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
