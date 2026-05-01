import type { TelemetryMessage } from '../types/TelemetryMessage';

interface DetectionTableProps {
  messages: TelemetryMessage[];
  onSelect?: (message: TelemetryMessage) => void;
}

const CLASS_COLORS: Record<string, string> = {
  car: 'bg-blue-900 text-blue-300',
  truck: 'bg-orange-900 text-orange-300',
  bus: 'bg-green-900 text-green-300',
  motorcycle: 'bg-purple-900 text-purple-300',
  'semi-truck': 'bg-red-900 text-red-300',
};

export default function DetectionTable({ messages, onSelect }: DetectionTableProps) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-80">
      <h2 className="text-sm font-semibold text-slate-300 p-4 border-b border-slate-700 shrink-0">
        Canlı Tespitler
      </h2>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
              <th className="text-left px-4 py-2">Vehicle ID</th>
              <th className="text-left px-4 py-2">Sınıf</th>
              <th className="text-right px-4 py-2">Hız</th>
              <th className="text-right px-4 py-2">Zaman</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m, i) => (
              <tr
                key={`${m.vehicleId}-${i}`}
                className="border-b border-slate-700/50 hover:bg-slate-600/50 transition-colors cursor-pointer"
                onClick={() => onSelect?.(m)}
              >
                <td className="px-4 py-2 text-slate-300 font-mono text-xs">{m.vehicleId}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      CLASS_COLORS[m.class] ?? 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {m.class}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-slate-200">{m.speed.toFixed(1)} km/h</td>
                <td className="px-4 py-2 text-right text-slate-400 text-xs">
                  {new Date(m.timestamp).toLocaleTimeString('tr-TR')}
                </td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Bekleniyor...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
