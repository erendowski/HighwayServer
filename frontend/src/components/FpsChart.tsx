import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useSensor } from '../store/selectors';

interface FpsChartProps {
  sensorId: string;
  height?: number;
}

const MAX_POINTS = 60;

export default function FpsChart({ sensorId, height = 220 }: FpsChartProps) {
  const sensor = useSensor(sensorId);
  const [history, setHistory] = useState<{ t: string; fps: number }[]>([]);

  useEffect(() => {
    if (!sensor?.lastStats) return;
    const { fps, tsUtc } = sensor.lastStats;
    const t = new Date(tsUtc).toLocaleTimeString('tr-TR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    setHistory(prev => [...prev, { t, fps }].slice(-MAX_POINTS));
  }, [sensor?.lastStats]);

  return (
    <div className="bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        Processing FPS — {sensorId}
      </h2>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={history} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="t"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 35]}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            unit=" FPS"
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }}
            labelStyle={{ color: '#374151' }}
            itemStyle={{ color: '#16a34a' }}
          />
          <Line
            type="monotone"
            dataKey="fps"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
