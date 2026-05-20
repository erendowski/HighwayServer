import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useActiveTracks } from '../store/selectors';
import { useVehicleStore } from '../store/vehicleStore';
import { computeDensity } from '../lib/trafficDensity';
import type { TrackState } from '../types/contracts';

interface MapViewProps {
  sensorId: string;
  lat?: number;
  lng?: number;
  selectedTrackId?: number | null;
  onTrackSelect?: (trackId: number) => void;
}

const CLASS_COLORS: Record<string, string> = {
  car:        '#22c55e',
  van:        '#3b82f6',
  bus:        '#f59e0b',
  motorcycle: '#ec4899',
  drone:      '#a855f7',
  plane:      '#06b6d4',
};

// bbox merkez koordinatını kamera çerçevesinden coğrafi konuma dönüştür.
function trackPosition(
  sensorLat: number,
  sensorLng: number,
  track: TrackState,
  fallbacks: React.MutableRefObject<Map<number, [number, number]>>,
): [number, number] {
  const [bx, by, bw, bh] = track.bbox;
  if (bw > 0 && bh > 0) {
    const cx = (bx + bw / 2) / 1920; // 0..1 yatay
    const cy = (by + bh / 2) / 1080; // 0..1 dikey
    return [sensorLat + (0.5 - cy) * 0.003, sensorLng + (cx - 0.5) * 0.004];
  }
  // Geçerli bbox yoksa: trackId başına sabit rastgele offset (yeniden render'da değişmesin)
  if (!fallbacks.current.has(track.trackId)) {
    fallbacks.current.set(track.trackId, [
      (Math.random() - 0.5) * 0.0018,
      (Math.random() - 0.5) * 0.0028,
    ]);
  }
  const [dLat, dLng] = fallbacks.current.get(track.trackId)!;
  return [sensorLat + dLat, sensorLng + dLng];
}

// Seçilen araç değişince haritayı oraya kaydır.
function MapPanner({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 0.7 });
  }, [position, map]);
  return null;
}

export default function MapView({
  sensorId,
  lat = 39.9334,
  lng = 32.8597,
  selectedTrackId,
  onTrackSelect,
}: MapViewProps) {
  const tracks   = useActiveTracks(sensorId);
  const center: [number, number] = [lat, lng];
  const fallbacks = useRef(new Map<number, [number, number]>());

  const vehicleMap = useVehicleStore(s => s.vehicles[sensorId]);
  const density = useMemo(
    () => computeDensity(Object.values(vehicleMap ?? {})),
    [vehicleMap],
  );

  const selectedTrack = selectedTrackId != null
    ? tracks.find(t => t.trackId === selectedTrackId) ?? null
    : null;
  const selectedPos = selectedTrack
    ? trackPosition(lat, lng, selectedTrack, fallbacks)
    : null;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-300">Araç Haritası — {sensorId}</h2>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${density.badgeClass}`}
            title={`${density.vehicleCount} araç • ort. ${density.avgSpeedKmh.toFixed(0)} km/h`}
          >
            Trafik: {density.label}
          </span>
          <span className="text-xs text-slate-400">{tracks.length} aktif</span>
        </div>
      </div>
      <div className="relative aspect-video w-full">
        <MapContainer
          key={sensorId}
          center={center}
          zoom={14}
          scrollWheelZoom={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          <MapPanner position={selectedPos} />

          {/* Kamera konumu */}
          <CircleMarker
            center={center}
            radius={10}
            pathOptions={{ fillColor: '#ef4444', color: '#b91c1c', weight: 2, fillOpacity: 0.9 }}
          >
            <Popup>📷 Kamera: {sensorId}</Popup>
          </CircleMarker>

          {/* Araç marker'ları */}
          {tracks.map(track => {
            const pos      = trackPosition(lat, lng, track, fallbacks);
            const color    = CLASS_COLORS[track.vehicleClass] ?? '#94a3b8';
            const selected = track.trackId === selectedTrackId;
            return (
              <CircleMarker
                key={track.trackId}
                center={pos}
                radius={selected ? 13 : 7}
                pathOptions={{
                  fillColor: color,
                  color:       selected ? '#ffffff' : color,
                  weight:      selected ? 3 : 1.5,
                  fillOpacity: selected ? 1 : 0.75,
                }}
                eventHandlers={{ click: () => onTrackSelect?.(track.trackId) }}
              >
                <Popup>
                  <b>Track #{track.trackId}</b><br />
                  {track.vehicleClass} — {(track.confidence * 100).toFixed(0)}%
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
