import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useEventsStore } from '../store/eventsStore';

interface VehicleTypeChartProps {
  sensorId: string;
}

const VEHICLE_CLASSES = ['car', 'van', 'truck', 'bus', 'motorcycle'] as const;

const BAR_COLORS: Record<string, string> = {
  car:        '#38bdf8',
  van:        '#3b82f6',
  truck:      '#60a5fa',
  bus:        '#4ade80',
  motorcycle: '#c084fc',
};

export default function VehicleTypeChart({ sensorId }: VehicleTypeChartProps) {
  const vehicleEvents = useEventsStore(s => s.vehicleEvents);
  const events = vehicleEvents.filter(e => e.sensorId === sensorId && e.eventType === 'enter');

  if (events.length === 0) {
    return (
      <div className="bg-white flex items-center justify-center h-60">
        <span className="text-gray-400 text-sm">No data</span>
      </div>
    );
  }

  const data = VEHICLE_CLASSES.map(cls => ({
    name: cls,
    count: events.filter(e => e.vehicleClass === cls).length,
    color: BAR_COLORS[cls] ?? '#94a3b8',
  }));

  return (
    <div className="bg-white flex flex-col h-60">
      <h2 className="text-sm font-semibold text-gray-700 p-4 border-b border-gray-200 shrink-0">
        Vehicle Classes — {sensorId}
      </h2>
      <div className="flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }}
              labelStyle={{ color: '#374151' }}
              itemStyle={{ color: '#6b7280' }}
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
