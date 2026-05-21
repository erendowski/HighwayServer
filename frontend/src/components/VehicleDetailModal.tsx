import { useEffect } from 'react';
import { useActiveTracks } from '../store/selectors';

interface VehicleDetailModalProps {
  sensorId: string;
  trackId: number | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-mono">{value}</span>
    </div>
  );
}

export default function VehicleDetailModal({ sensorId, trackId, onClose }: VehicleDetailModalProps) {
  const tracks = useActiveTracks(sensorId);
  const track = trackId !== null ? (tracks.find(t => t.trackId === trackId) ?? null) : null;

  useEffect(() => {
    if (trackId === null) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [trackId, onClose]);

  if (trackId === null) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-md w-full mx-4 relative shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
        >
          ✕
        </button>

        {track ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🚘 Track #{track.trackId}
            </h2>
            <div className="space-y-3 mb-6">
              <Row label="Vehicle Class" value={track.vehicleClass} />
              <Row label="Confidence" value={`${(track.confidence * 100).toFixed(1)}%`} />
              <Row label="BBox X" value={String(track.bbox[0])} />
              <Row label="BBox Y" value={String(track.bbox[1])} />
              <Row label="BBox Width" value={String(track.bbox[2])} />
              <Row label="BBox Height" value={String(track.bbox[3])} />
              <Row label="First Seen" value={new Date(track.firstSeenAt).toLocaleString()} />
              <Row label="Last Seen" value={new Date(track.lastSeenAt).toLocaleString()} />
            </div>
            <div className="rounded-lg bg-gray-100 flex items-center justify-center h-40 text-gray-400 text-sm">
              Snapshot unavailable
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            Track #{trackId} is no longer active.
          </p>
        )}
      </div>
    </div>
  );
}
