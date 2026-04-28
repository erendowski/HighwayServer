import { useState } from 'react'
import { useTelemetry } from '../contexts/TelemetryContext'
import VehicleTypeChart from '../components/VehicleTypeChart'
import SpeedChart from '../components/SpeedChart'
import DetectionTable from '../components/DetectionTable'
import VehicleDetailModal from '../components/VehicleDetailModal'
import AnomalyAlert from '../components/AnomalyAlert'
import type { TelemetryMessage } from '../types/TelemetryMessage'

export default function Dashboard() {
  const { messages, connected } = useTelemetry()
  const [selectedVehicle, setSelectedVehicle] = useState<TelemetryMessage | null>(null)

  const uniqueVehicles = new Set(messages.map(m => m.vehicleId)).size
  const avgSpeed =
    messages.length > 0
      ? Math.round(messages.reduce((sum, m) => sum + m.speed, 0) / messages.length)
      : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Top summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Toplam Araç</p>
          <p className="text-3xl font-bold">{uniqueVehicles}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Ort. Hız</p>
          <p className="text-3xl font-bold">
            {avgSpeed} <span className="text-base font-normal text-slate-400">km/h</span>
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-2">SignalR Durum</p>
          <span
            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
              connected
                ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                : 'bg-red-600/20 text-red-400 border border-red-600/40'
            }`}
          >
            {connected ? '🟢 Bağlı' : '🔴 Bağlantı Kesik'}
          </span>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-2">Sistem Durumu</p>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-green-400">🟢 MQTT Aktif</span>
            <span className="text-xs text-green-400">🟢 InfluxDB Aktif</span>
          </div>
        </div>
      </div>

      {/* Middle: detections table + vehicle type chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetectionTable messages={messages} onSelect={setSelectedVehicle} />
        <VehicleTypeChart messages={messages} />
      </div>

      {/* Bottom: anomaly alert + compact speed chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnomalyAlert messages={messages} />
        <SpeedChart messages={messages} height={150} />
      </div>

      <VehicleDetailModal message={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
    </div>
  )
}
