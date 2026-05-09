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
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">
        Processing FPS — {sensorId}
      </h2>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={history} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="t"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 35]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            unit=" FPS"
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
            labelStyle={{ color: '#cbd5e1' }}
            itemStyle={{ color: '#22c55e' }}
          />
          <Line
            type="monotone"
            dataKey="fps"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
