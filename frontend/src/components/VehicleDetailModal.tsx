import { useEffect } from 'react'
import type { TelemetryMessage } from '../types/TelemetryMessage'

interface Props {
  message: TelemetryMessage | null
  onClose: () => void
}

const CLASS_EMOJIS: Record<string, string> = {
  car: '🚗',
  truck: '🚚',
  bus: '🚌',
  motorcycle: '🏍️',
  'semi-truck': '🚛',
}

export default function VehicleDetailModal({ message, onClose }: Props) {
  useEffect(() => {
    if (!message) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [message, onClose])

  if (!message) return null

  const emoji = CLASS_EMOJIS[message.class] ?? '🚘'

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-lg leading-none"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-white mb-4">
          {emoji} {message.vehicleId}
        </h2>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Track ID</span>
            <span className="text-white font-mono">{message.trackId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Sınıf</span>
            <span className="text-white">{emoji} {message.class}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Hız</span>
            <span className={`font-semibold ${message.speed > 120 ? 'text-red-400' : 'text-white'}`}>
              {message.speed.toFixed(1)} km/h
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Zaman</span>
            <span className="text-white">{new Date(message.timestamp).toLocaleString('tr-TR')}</span>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden bg-slate-700">
          {message.snapshotUrl ? (
            <img
              src={message.snapshotUrl}
              alt="Araç görüntüsü"
              className="w-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
              Görüntü henüz mevcut değil
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
