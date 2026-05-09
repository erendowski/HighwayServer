import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useActiveTracks } from '../store/selectors';

interface VehicleTypeChartProps {
  sensorId: string;
}

const VEHICLE_CLASSES = ['car', 'van', 'bus', 'motorcycle', 'drone', 'plane'] as const;

const BAR_COLORS: Record<string, string> = {
  car: '#38bdf8',
  van: '#3b82f6',
  bus: '#4ade80',
  motorcycle: '#c084fc',
  drone: '#a855f7',
  plane: '#06b6d4',
};

export default function VehicleTypeChart({ sensorId }: VehicleTypeChartProps) {
  const tracks = useActiveTracks(sensorId);

  if (tracks.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center h-60">
        <span className="text-slate-500 text-sm">No data</span>
      </div>
    );
  }

  const data = VEHICLE_CLASSES.map(cls => ({
    name: cls,
    count: tracks.filter(t => t.vehicleClass === cls).length,
    color: BAR_COLORS[cls] ?? '#94a3b8',
  }));

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-60">
      <h2 className="text-sm font-semibold text-slate-300 p-4 border-b border-slate-700 shrink-0">
        Vehicle Classes — {sensorId}
      </h2>
      <div className="flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
              labelStyle={{ color: '#cbd5e1' }}
              itemStyle={{ color: '#94a3b8' }}
              formatter={(value) => [value, 'Tracks']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map(entry => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
