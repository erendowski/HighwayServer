import type { TelemetryMessage } from '../types/TelemetryMessage';

const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'semi-truck'] as const;

const CLASS_ICONS: Record<string, string> = {
  car: '🚗',
  truck: '🚚',
  bus: '🚌',
  motorcycle: '🏍️',
  'semi-truck': '🚛',
};

interface StatCardProps {
  messages: TelemetryMessage[];
}

export default function StatCard({ messages }: StatCardProps) {
  const counts = VEHICLE_CLASSES.reduce<Record<string, number>>((acc, cls) => {
    acc[cls] = messages.filter(m => m.class === cls).length;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {VEHICLE_CLASSES.map(cls => (
        <div
          key={cls}
          className="bg-slate-800 rounded-xl p-4 flex flex-col items-center gap-2 border border-slate-700"
        >
          <span className="text-2xl">{CLASS_ICONS[cls]}</span>
          <span className="text-3xl font-bold text-white">{counts[cls]}</span>
          <span className="text-xs text-slate-400 capitalize">{cls}</span>
        </div>
      ))}
    </div>
  );
}
