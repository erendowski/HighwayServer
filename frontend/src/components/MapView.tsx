import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { TelemetryMessage } from '../types/TelemetryMessage'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

interface Props {
  messages: TelemetryMessage[]
  cameraLat: number
  cameraLng: number
}

export default function MapView({ messages, cameraLat, cameraLng }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const vehicleLayerRef = useRef<L.LayerGroup | null>(null)
  const offsetCache = useRef(new Map<string, [number, number]>())

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current).setView([cameraLat, cameraLng], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    L.circleMarker([cameraLat, cameraLng], {
      radius: 10,
      fillColor: '#ef4444',
      color: '#b91c1c',
      weight: 2,
      fillOpacity: 0.9,
    })
      .addTo(map)
      .bindPopup('📷 Kamera')

    const vehicleLayer = L.layerGroup().addTo(map)
    vehicleLayerRef.current = vehicleLayer
    mapRef.current = map

    // absolute inset-0 container'ın boyutunu Leaflet'e bildirmek için
    setTimeout(() => map.invalidateSize(), 50)

    return () => {
      map.remove()
      mapRef.current = null
      vehicleLayerRef.current = null
    }
  }, [cameraLat, cameraLng])

  useEffect(() => {
    if (!vehicleLayerRef.current) return

    vehicleLayerRef.current.clearLayers()

    const seen = new Set<string>()
    const recentVehicles: TelemetryMessage[] = []
    for (let i = messages.length - 1; i >= 0 && seen.size < 10; i--) {
      const m = messages[i]
      if (!seen.has(m.vehicleId)) {
        seen.add(m.vehicleId)
        recentVehicles.push(m)
      }
    }

    recentVehicles.forEach(m => {
      if (!offsetCache.current.has(m.vehicleId)) {
        offsetCache.current.set(m.vehicleId, [
          (Math.random() - 0.5) * 0.002,
          (Math.random() - 0.5) * 0.002,
        ])
      }
      const [latOff, lngOff] = offsetCache.current.get(m.vehicleId)!

      L.circleMarker([cameraLat + latOff, cameraLng + lngOff], {
        radius: 7,
        fillColor: '#3b82f6',
        color: '#1d4ed8',
        weight: 2,
        fillOpacity: 0.85,
      })
        .addTo(vehicleLayerRef.current!)
        .bindPopup(`<b>${m.vehicleId}</b><br>${m.class}<br>${m.speed.toFixed(1)} km/h`)
    })
  }, [messages, cameraLat, cameraLng])

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300">Araç Haritası</h2>
      </div>
      {/* aspect-video wrapper — harita bu kutunun içini doldurur, büyüyemez */}
      <div className="relative aspect-video w-full">
        <div ref={mapContainerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
