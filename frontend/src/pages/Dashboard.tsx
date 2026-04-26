import { useSignalR } from '../hooks/useSignalR'
import VehicleTypeChart from '../components/VehicleTypeChart'
import SpeedChart from '../components/SpeedChart'
import DetectionTable from '../components/DetectionTable'

export default function Dashboard() {
  const { messages, connected } = useSignalR()

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
          <p className="text-xs text-slate-400 mb-2">SignalR</p>
          <span
            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
              connected
                ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                : 'bg-red-600/20 text-red-400 border border-red-600/40'
            }`}
          >
            {connected ? 'Bağlı' : 'Bağlı Değil'}
          </span>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-2">Bağlantılar</p>
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              MQTT Aktif
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              InfluxDB Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Middle: table + vehicle type counts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetectionTable messages={messages} />
        <VehicleTypeChart messages={messages} />
      </div>

      {/* Bottom: compact speed chart */}
      <SpeedChart messages={messages} height={150} />
    </div>
  )
}
