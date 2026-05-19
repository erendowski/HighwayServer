import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Car, Truck, Bus, Bike, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useSensor } from '../store/selectors';
import { useVehicleStore } from '../store/vehicleStore';
import type { AnomalySeverity } from '../types/contracts';
import VideoPlayer from '../components/VideoPlayer';
import MapView from '../components/MapView';
import VehicleDetailModal from '../components/VehicleDetailModal';

const CLASS_ICONS: Record<string, React.ReactNode> = {
  car:        <Car   size={24} />,
  van:        <Truck size={24} />,
  bus:        <Bus   size={24} />,
  motorcycle: <Bike  size={24} />,
  truck:      <Truck size={24} />,
};

const SEV_COLORS: Record<AnomalySeverity, string> = {
  critical: 'border-red-600/60 bg-red-900/30',
  high:     'border-orange-600/60 bg-orange-900/30',
  medium:   'border-amber-600/60 bg-amber-900/30',
  low:      'border-yellow-600/60 bg-yellow-900/20',
};

const SEV_BADGE: Record<AnomalySeverity, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high:     'bg-orange-500/20 text-orange-400',
  medium:   'bg-amber-500/20 text-amber-400',
  low:      'bg-yellow-500/20 text-yellow-400',
};

const SEV_ORDER: AnomalySeverity[] = ['critical', 'high', 'medium', 'low'];

export default function LiveView() {
  const { sensorId }   = useParams<{ sensorId: string }>();
  const navigate       = useNavigate();
  const sensor         = useSensor(sensorId ?? '');
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);

  const vehicleMap = useVehicleStore(s => s.vehicles[sensorId ?? '']);
  const anomalyVehicles = useMemo(() =>
    Object.values(vehicleMap ?? {})
      .filter(v => v.anomalies.length > 0 && v.status !== 'lost')
      .sort((a, b) => {
        const aTop = SEV_ORDER.indexOf(a.anomalies[0]?.severity as AnomalySeverity);
        const bTop = SEV_ORDER.indexOf(b.anomalies[0]?.severity as AnomalySeverity);
        return aTop - bTop;
      }),
    [vehicleMap]
  );
  const [modalOpen, setModalOpen]             = useState(false);

  if (!sensorId) return <div className="p-8 text-slate-400">Sensör bulunamadı</div>;

  const statusColor = sensor
    ? ({ online: 'text-green-400', offline: 'text-red-400', unknown: 'text-slate-400' } as Record<string, string>)[sensor.status]
    : 'text-slate-400';

  function selectTrack(trackId: number) {
    setSelectedTrackId(prev => (prev === trackId ? null : trackId));
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Başlık */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Geri
        </button>
        <h1 className="text-lg font-semibold text-white">
          Canlı İzleme — <span className="font-mono">{sensorId}</span>
        </h1>
        {sensor && (
          <span className={`text-xs font-semibold ${statusColor}`}>
            ● {sensor.status}
          </span>
        )}
      </div>

      {/* Kamera + Harita */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VideoPlayer />
        <MapView
          sensorId={sensorId}
          selectedTrackId={selectedTrackId}
          onTrackSelect={selectTrack}
        />
      </div>

      {/* Anomali araçlar */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-white">Anomali Araçlar</h2>
          </div>
          <span className="text-xs text-slate-400">{anomalyVehicles.length} araç</span>
        </div>

        {anomalyVehicles.length === 0 ? (
          <p className="px-4 py-8 text-center text-slate-500 text-sm">
            Şu anda anomali tespit edilmedi
          </p>
        ) : (
          <div className="overflow-y-auto max-h-72 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 p-3">
            {anomalyVehicles.map(v => {
              const isSelected = v.trackId === selectedTrackId;
              const topSev     = v.anomalies[0]?.severity as AnomalySeverity | undefined;
              const colorCls   = topSev ? SEV_COLORS[topSev] : 'border-slate-600/40 bg-slate-700/20';
              return (
                <button
                  key={v.trackId}
                  onClick={() => selectTrack(v.trackId)}
                  onDoubleClick={() => { setSelectedTrackId(v.trackId); setModalOpen(true); }}
                  title="Tek tıkla haritada göster • Çift tıkla detay"
                  className={`
                    flex flex-col items-center gap-1 p-3 rounded-xl border text-center
                    transition-all cursor-pointer
                    ${colorCls}
                    ${isSelected ? 'ring-2 ring-white/40 scale-105' : 'hover:scale-105'}
                  `}
                >
                  <span className="text-slate-200">
                    {CLASS_ICONS[v.classLabel] ?? <Car size={24} />}
                  </span>
                  <span className="text-xs font-mono text-white font-semibold">
                    #{v.trackId}
                  </span>
                  <span className="text-xs text-slate-300 capitalize">
                    {v.classLabel}
                  </span>
                  {topSev && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${SEV_BADGE[topSev]}`}>
                      <AlertTriangle size={9} />
                      {topSev}
                    </span>
                  )}
                  <span className="text-xs font-mono text-sky-300">
                    {v.speedKmh.toFixed(0)} km/h
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selectedTrackId !== null && (
          <div className="px-4 py-2 border-t border-slate-700/60 text-xs text-slate-400 flex items-center justify-between">
            <span>Track #{selectedTrackId} seçili</span>
            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(true)}
                className="text-sky-400 hover:text-sky-300 transition-colors"
              >
                Detay
              </button>
              <button
                onClick={() => setSelectedTrackId(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                Seçimi kaldır
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <VehicleDetailModal
          sensorId={sensorId}
          trackId={selectedTrackId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
