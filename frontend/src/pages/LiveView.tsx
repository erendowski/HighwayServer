import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useTelemetry } from '../contexts/TelemetryContext'
import VideoPlayer from '../components/VideoPlayer'
import AnomalyAlert from '../components/AnomalyAlert'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

const TURKEY_CENTER: [number, number] = [39.9, 32.8]
const ZOOM = 6

// Araç başına sabit rastgele konum (sayfa boyunca değişmez)
const vehicleOffsets = new Map<string, [number, number]>()
function getOffset(vehicleId: string): [number, number] {
  if (!vehicleOffsets.has(vehicleId)) {
    vehicleOffsets.set(vehicleId, [
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 8,
    ])
  }
  return vehicleOffsets.get(vehicleId)!
}

export default function LiveView() {
  const { messages } = useTelemetry()
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<L.Map | null>(null)
  const selectedMarkerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    const container = mapRef.current
    const map = L.map(container).setView(TURKEY_CENTER, ZOOM)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    L.marker(TURKEY_CENTER)
      .addTo(map)
      .bindPopup('Türkiye Merkezi')

    leafletRef.current = map

    // Container boyutu hazır olduğunda (ve değiştiğinde) Leaflet'e bildir
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)

    return () => {
      observer.disconnect()
      map.remove()
      leafletRef.current = null
    }
  }, [])

  const handleAnomalySelect = useCallback((vehicleId: string, vehicleClass: string, speed: number) => {
    if (!leafletRef.current) return

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove()
      selectedMarkerRef.current = null
    }

    const [latOff, lngOff] = getOffset(vehicleId)
    const lat = TURKEY_CENTER[0] + latOff
    const lng = TURKEY_CENTER[1] + lngOff

    const marker = L.marker([lat, lng])
      .addTo(leafletRef.current)
      .bindPopup(`<b>${vehicleId}</b><br>${vehicleClass}<br>${speed.toFixed(1)} km/h`)
      .openPopup()

    selectedMarkerRef.current = marker
    leafletRef.current.flyTo([lat, lng], 9)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VideoPlayer />

        {/* VideoPlayer ile aynı kart yapısı: header + aspect-video içerik */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex items-center px-4 py-2 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300">Harita</h2>
          </div>
          <div ref={mapRef} className="aspect-video w-full" />
        </div>
      </div>

      <AnomalyAlert messages={messages} onVehicleSelect={handleAnomalySelect} />
    </div>
  )
}
