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
}

export function Map({ latitude, longitude, address, className = "h-64 w-full" }: MapProps) {
  return (
    <div className={className}>
      <DynamicMap latitude={latitude} longitude={longitude} address={address} />
    </div>
  )
}
