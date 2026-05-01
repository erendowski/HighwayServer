import { useMemo } from 'react'
import type { TelemetryMessage } from '../types/TelemetryMessage'

interface Anomaly {
  type: 'speed' | 'density'
  label: string
  timestamp: string
}

interface Props {
  messages: TelemetryMessage[]
}

export default function AnomalyAlert({ messages }: Props) {
  const anomalies = useMemo<Anomaly[]>(() => {
    const list: Anomaly[] = []

    messages
      .filter(m => m.speed > 120)
      .forEach(m => {
        list.push({
          type: 'speed',
          label: `⚠️ Hız İhlali: ${m.vehicleId} ${m.speed.toFixed(1)} km/h`,
          timestamp: m.timestamp,
        })
      })

    const fiveSecondsAgo = Date.now() - 5_000
    const recentCount = messages.filter(
      m => new Date(m.timestamp).getTime() > fiveSecondsAgo,
    ).length
    if (recentCount > 5) {
      list.push({
        type: 'density',
        label: '🚨 Yüksek Trafik Yoğunluğu',
        timestamp: new Date().toISOString(),
      })
    }

    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }, [messages])

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-300">Anomali Uyarıları</h2>

      {anomalies.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          ✅ Normal Trafik Akışı
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {anomalies.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                  a.type === 'speed'
                    ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-600/40'
                    : 'bg-red-600/30 text-red-300 border border-red-600/40'
                }`}
              >
                {a.type === 'speed' ? 'HIZ' : 'YOĞUNLUK'}
              </span>
              <span className="text-sm text-slate-200">{a.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
