import { useActiveTracks } from '../store/selectors';

interface DetectionTableProps {
  sensorId: string;
  onRowClick?: (trackId: number) => void;
}

function relativeTime(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

export default function DetectionTable({ sensorId, onRowClick }: DetectionTableProps) {
  const tracks = useActiveTracks(sensorId);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-80">
      <h2 className="text-sm font-semibold text-gray-700 p-4 border-b border-gray-200 shrink-0">
        Active Tracks — {sensorId}
      </h2>
      <div className="overflow-y-auto flex-1">
        {tracks.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">No active tracks</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase border-b border-gray-200">
                <th className="text-left px-4 py-2">Track ID</th>
                <th className="text-left px-4 py-2">Class</th>
                <th className="text-right px-4 py-2">Conf.</th>
                <th className="text-right px-4 py-2">BBox</th>
                <th className="text-right px-4 py-2">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map(track => (
                <tr
                  key={track.trackId}
                  className={`border-b border-gray-100 transition-colors ${
                    onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(track.trackId)}
                >
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs">{track.trackId}</td>
                  <td className="px-4 py-2 capitalize text-gray-800">{track.vehicleClass}</td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {(track.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-gray-500">
                    [{track.bbox.join(', ')}]
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-gray-500">
                    {relativeTime(track.lastSeenAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
