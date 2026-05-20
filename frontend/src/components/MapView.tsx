import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Flame } from 'lucide-react';
import { useActiveTracks } from '../store/selectors';
import { useVehicleStore } from '../store/vehicleStore';
import { computeDensity } from '../lib/trafficDensity';
import {
  pointOnRoad, liveTrafficHeat, anomalyHeat, heatColor, type HeatPoint,
} from '../lib/heatmap';
import { api } from '../api/rest';
import type { TrackState, AnomalyRecord } from '../types/contracts';

type HeatMode = 'off' | 'live' | 'anomaly';

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

const LANE_OFFSET = 0.00018; // şerit ayrımı için hatta dik küçük kayma
                             // (yol hattı sabitleri lib/heatmap.ts içinde)

// Aracı yol hattına hizala: bbox'ın yatay merkezi hat boyunca ilerleme oranı olur,
// dikey konum ise hangi şeritte olduğunu (hatta dik küçük offset) belirler.
function trackPosition(
  lat: number,
  lng: number,
  track: TrackState,
  fallbacks: React.MutableRefObject<Map<number, number>>,
): [number, number] {
  const [bx, by, bw, bh] = track.bbox;
  let progress: number;
  let laneSign = 1;

  if (bw > 0 && bh > 0) {
    progress = (bx + bw / 2) / 1920;            // 0..1 yol boyunca
    laneSign = (by + bh / 2) / 1080 < 0.5 ? 1 : -1; // üst yarı = bir şerit, alt yarı = diğer
  } else {
    // Geçerli bbox yoksa: trackId başına sabit progress (render'da değişmesin)
    if (!fallbacks.current.has(track.trackId)) {
      fallbacks.current.set(track.trackId, Math.random());
    }
    progress = fallbacks.current.get(track.trackId)!;
    laneSign = track.trackId % 2 === 0 ? 1 : -1;
  }

  const [pLat, pLng] = pointOnRoad(lat, lng, progress);
  // Hatta dik (yaklaşık kuzey-güney) küçük şerit offseti
  return [pLat + laneSign * LANE_OFFSET, pLng];
}

// Seçilen araç değişince haritayı oraya kaydır.
function MapPanner({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 0.7 });
  }, [position, map]);
  return null;
}

// Ctrl + mouse tekerleği ile zoom. Ctrl basılı değilken sayfa normal kayar.
function CtrlScrollZoom() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;          // sadece Ctrl basılıyken zoom
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      map.setZoom(map.getZoom() + delta);
    }
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [map]);
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
  const fallbacks = useRef(new Map<number, number>());

  const vehicleMap = useVehicleStore(s => s.vehicles[sensorId]);
  const density = useMemo(
    () => computeDensity(Object.values(vehicleMap ?? {})),
    [vehicleMap],
  );

  // ── Isı haritası ───────────────────────────────────────────────────────────
  const [heatMode, setHeatMode] = useState<HeatMode>('off');
  const [anomalyHistory, setAnomalyHistory] = useState<AnomalyRecord[]>([]);

  // Anomali modu seçilince son 24 saatin anomalilerini çek.
  useEffect(() => {
    if (heatMode !== 'anomaly') return;
    let cancelled = false;
    const from = new Date(Date.now() - 24 * 3600_000).toISOString();
    api.getAnomalies(sensorId, from)
      .then(data => { if (!cancelled) setAnomalyHistory(data); })
      .catch(() => { if (!cancelled) setAnomalyHistory([]); });
    return () => { cancelled = true; };
  }, [heatMode, sensorId]);

  const heatPoints: HeatPoint[] = useMemo(() => {
    if (heatMode === 'live')
      return liveTrafficHeat(lat, lng, Object.values(vehicleMap ?? {}));
    if (heatMode === 'anomaly')
      return anomalyHeat(lat, lng, anomalyHistory);
    return [];
  }, [heatMode, lat, lng, vehicleMap, anomalyHistory]);

  // Yol hattının iki ucu (polyline çizimi için).
  const roadLine: [number, number][] = [
    pointOnRoad(lat, lng, 0),
    pointOnRoad(lat, lng, 1),
  ];

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
          {/* Isı haritası toggle */}
          <div className="flex items-center rounded-lg overflow-hidden border border-slate-600 text-xs">
            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 flex items-center gap-1">
              <Flame size={11} />
            </span>
            {([
              ['off', 'Kapalı'],
              ['live', 'Canlı'],
              ['anomaly', 'Anomali'],
            ] as [HeatMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setHeatMode(mode)}
                className={`px-2 py-0.5 transition-colors ${
                  heatMode === mode
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
          zoom={15}
          scrollWheelZoom={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          <MapPanner position={selectedPos} />
          <CtrlScrollZoom />

          {/* Isı haritası katmanı (canlı trafik veya anomali geçmişi) */}
          {heatMode !== 'off' && heatPoints.map((p, i) => {
            const color = heatColor(p.weight);
            return (
              <CircleMarker
                key={`heat-${i}`}
                center={[p.lat, p.lng]}
                radius={18 + p.weight * 22}
                pathOptions={{
                  fillColor: color, color, weight: 0,
                  fillOpacity: 0.12 + p.weight * 0.18,
                }}
                interactive={false}
              />
            );
          })}
          {heatMode !== 'off' && heatPoints.map((p, i) => {
            const color = heatColor(p.weight);
            return (
              <CircleMarker
                key={`heat-core-${i}`}
                center={[p.lat, p.lng]}
                radius={8 + p.weight * 10}
                pathOptions={{
                  fillColor: color, color, weight: 0,
                  fillOpacity: 0.25 + p.weight * 0.35,
                }}
                interactive={false}
              />
            );
          })}

          {/* Yol hattı */}
          <Polyline
            positions={roadLine}
            pathOptions={{ color: '#475569', weight: 8, opacity: 0.7, lineCap: 'round' }}
          />
          <Polyline
            positions={roadLine}
            pathOptions={{ color: '#fbbf24', weight: 1.5, opacity: 0.8, dashArray: '8 10' }}
          />

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

        {/* Zoom ipucu */}
        <div className="absolute bottom-2 right-2 z-1000 text-[10px] text-slate-300 bg-slate-900/70 px-2 py-1 rounded pointer-events-none">
          Ctrl + tekerlek ile yakınlaştır
        </div>

        {/* Isı haritası göstergesi */}
        {heatMode !== 'off' && (
          <div className="absolute bottom-2 left-2 z-1000 text-[10px] bg-slate-900/80 px-2 py-1.5 rounded pointer-events-none space-y-1">
            <div className="text-slate-300 font-semibold">
              {heatMode === 'live' ? 'Canlı trafik yoğunluğu' : 'Anomali yoğunluğu (24s)'}
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />
              az
              <span className="inline-block w-2.5 h-2.5 rounded-full ml-1" style={{ background: '#f59e0b' }} />
              orta
              <span className="inline-block w-2.5 h-2.5 rounded-full ml-1" style={{ background: '#ef4444' }} />
              çok
            </div>
            {heatMode === 'anomaly' && heatPoints.length === 0 && (
              <div className="text-slate-500">Son 24 saatte anomali yok</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
