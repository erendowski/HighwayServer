import { useMemo, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { TelemetryMessage } from '../types/TelemetryMessage'

const CAMERA: [number, number] = [39.9334, 32.8597]

interface Props {
  messages: TelemetryMessage[]
}

export default function MapView({ messages }: Props) {
  const offsetCache = useRef(new Map<string, [number, number]>())

  const vehiclesWithPos = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ msg: TelemetryMessage; pos: [number, number] }> = []
    for (let i = messages.length - 1; i >= 0 && seen.size < 10; i--) {
      const m = messages[i]
      if (!seen.has(m.vehicleId)) {
        seen.add(m.vehicleId)
        if (!offsetCache.current.has(m.vehicleId)) {
          offsetCache.current.set(m.vehicleId, [
            (Math.random() - 0.5) * 0.002,
            (Math.random() - 0.5) * 0.002,
          ])
        }
        const [latOff, lngOff] = offsetCache.current.get(m.vehicleId)!
        result.push({ msg: m, pos: [CAMERA[0] + latOff, CAMERA[1] + lngOff] })
      }
    }
    return result
  }, [messages])

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300">Araç Haritası</h2>
      </div>
      <div className="relative aspect-video w-full">
        <MapContainer
          center={CAMERA}
          zoom={13}
          scrollWheelZoom={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <CircleMarker
            center={CAMERA}
            radius={10}
            pathOptions={{ fillColor: '#ef4444', color: '#b91c1c', weight: 2, fillOpacity: 0.9 }}
          >
            <Popup>📷 Kamera Noktası</Popup>
          </CircleMarker>
          {vehiclesWithPos.map(({ msg, pos }) => (
            <CircleMarker
              key={msg.vehicleId}
              center={pos}
              radius={7}
              pathOptions={{ fillColor: '#3b82f6', color: '#1d4ed8', weight: 2, fillOpacity: 0.85 }}
            >
              <Popup>
                <b>{msg.vehicleId}</b><br />{msg.class}<br />{msg.speed.toFixed(1)} km/h
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
