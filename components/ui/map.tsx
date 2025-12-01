"use client"

import dynamic from 'next/dynamic'

// Dynamically import Leaflet components to avoid SSR issues
const DynamicMap = dynamic(() => import('./leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted rounded-lg flex items-center justify-center">
      <div className="text-sm text-muted-foreground">Memuat peta...</div>
    </div>
  ),
})

interface MapProps {
  latitude: number
  longitude: number
  address?: string
  className?: string
  draggable?: boolean
  onLocationChange?: (lat: number, lng: number) => void
  radius?: number
  centerLatitude?: number
  centerLongitude?: number
}

export function Map({
  latitude,
  longitude,
  address,
  className = "h-64 w-full",
  draggable = false,
  onLocationChange,
  radius,
  centerLatitude,
  centerLongitude
}: MapProps) {
  return (
    <div className={className}>
      <DynamicMap
        latitude={latitude}
        longitude={longitude}
        address={address}
        draggable={draggable}
        onLocationChange={onLocationChange}
        radius={radius}
        centerLatitude={centerLatitude}
        centerLongitude={centerLongitude}
      />
    </div>
  )
}
