'use client'

import { useMemo } from 'react'
import Map, { NavigationControl, ScaleControl, FullscreenControl } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

type MapViewProps = {
  height?: number | string
  initialViewState?: {
    longitude?: number
    latitude?: number
    zoom?: number
  }
  className?: string
}

export default function MapView(props: MapViewProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
  const styleUrl = 'mapbox://styles/mapbox/streets-v12'

  const initial = useMemo(() => ({
    longitude: props.initialViewState?.longitude ?? 116.397389,
    latitude: props.initialViewState?.latitude ?? 39.908722,
    zoom: props.initialViewState?.zoom ?? 10
  }), [props.initialViewState])

  return (
    <div
      className={props.className}
      style={{
        height: props.height ?? 480,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
      }}
    >
      <Map
        mapboxAccessToken={token}
        mapStyle={styleUrl}
        initialViewState={initial}
        reuseMaps
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <ScaleControl position="bottom-left" />
      </Map>
    </div>
  )
}


