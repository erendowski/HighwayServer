import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import VideoPlayer from '../components/VideoPlayer'

// Fix default marker icons broken by Vite asset hashing
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

const TURKEY_CENTER: [number, number] = [39.9, 32.8]
const ZOOM = 6

export default function LiveView() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    const map = L.map(mapRef.current).setView(TURKEY_CENTER, ZOOM)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    L.marker(TURKEY_CENTER)
      .addTo(map)
      .bindPopup('Türkiye Merkezi')

    leafletRef.current = map

    return () => {
      map.remove()
      leafletRef.current = null
    }
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <VideoPlayer />

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-300">Harita</h2>
        </div>
        <div ref={mapRef} className="flex-1 min-h-100" />
      </div>
    </div>
  )
}
