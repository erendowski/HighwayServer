import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Car, Truck, Bus, Bike, Plane, Send, ArrowLeft } from 'lucide-react';
import { useSensor, useActiveTracks } from '../store/selectors';
import VideoPlayer from '../components/VideoPlayer';
import MapView from '../components/MapView';
import VehicleDetailModal from '../components/VehicleDetailModal';

const CLASS_ICONS: Record<string, React.ReactNode> = {
  car:        <Car   size={24} />,
  van:        <Truck size={24} />,
  bus:        <Bus   size={24} />,
  motorcycle: <Bike  size={24} />,
  drone:      <Send  size={24} />,
  plane:      <Plane size={24} />,
};

const CLASS_COLORS: Record<string, string> = {
  car:        'border-green-600/40 bg-green-900/20',
  van:        'border-blue-600/40 bg-blue-900/20',
  bus:        'border-amber-600/40 bg-amber-900/20',
  motorcycle: 'border-pink-600/40 bg-pink-900/20',
  drone:      'border-purple-600/40 bg-purple-900/20',
  plane:      'border-cyan-600/40 bg-cyan-900/20',
};

function relativeTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  return s < 60 ? `${s}s önce` : `${Math.floor(s / 60)}dk önce`;
}

export default function LiveView() {
  const { sensorId }   = useParams<{ sensorId: string }>();
  const navigate       = useNavigate();
  const sensor         = useSensor(sensorId ?? '');
  const tracks         = useActiveTracks(sensorId ?? '');
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
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

      {/* Tespit edilen araçlar */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
          <h2 className="text-sm font-semibold text-white">Tespit Edilen Araçlar</h2>
          <span className="text-xs text-slate-400">{tracks.length} aktif</span>
        </div>

        {tracks.length === 0 ? (
          <p className="px-4 py-8 text-center text-slate-500 text-sm">
            Henüz araç tespiti yok
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 p-3">
            {tracks.map(track => {
              const isSelected = track.trackId === selectedTrackId;
              const colorCls   = CLASS_COLORS[track.vehicleClass] ?? 'border-slate-600/40 bg-slate-700/20';
              return (
                <button
                  key={track.trackId}
                  onClick={() => selectTrack(track.trackId)}
                  onDoubleClick={() => { setSelectedTrackId(track.trackId); setModalOpen(true); }}
                  title="Tek tıkla haritada göster • Çift tıkla detay"
                  className={`
                    flex flex-col items-center gap-1 p-3 rounded-xl border text-left
                    transition-all cursor-pointer
                    ${colorCls}
                    ${isSelected ? 'ring-2 ring-white/40 scale-105' : 'hover:scale-105'}
                  `}
                >
                  <span className="text-slate-200">
                    {CLASS_ICONS[track.vehicleClass] ?? <Car size={24} />}
                  </span>
                  <span className="text-xs font-mono text-white font-semibold">
                    #{track.trackId}
                  </span>
                  <span className="text-xs text-slate-300 capitalize">
                    {track.vehicleClass}
                  </span>
                  <span className="text-xs text-slate-400">
                    {(track.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-slate-500">
                    {relativeTime(track.lastSeenAt)}
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
