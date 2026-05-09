import { useState } from 'react'
import { useSensorList, useActiveTracks, useIsConnected } from '../store/selectors'
import VideoPlayer from '../components/VideoPlayer'
import DetectionTable from '../components/DetectionTable'
import FpsChart from '../components/FpsChart'
import VehicleTypeChart from '../components/VehicleTypeChart'
import AnomalyAlert from '../components/AnomalyAlert'
import VehicleDetailModal from '../components/VehicleDetailModal'

export default function Dashboard() {
  const sensors       = useSensorList()
  const connected     = useIsConnected()
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)

  const activeSensor = sensors.find(s => s.status === 'online') ?? sensors[0]
  const sensorId     = activeSensor?.sensorId ?? ''

  const tracks  = useActiveTracks(sensorId)
  const avgFps  = activeSensor?.lastStats?.fps ?? 0
  const onlineN = sensors.filter(s => s.status === 'online').length

  return (
    <div className="flex flex-col gap-4">

      {/* Üst özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Aktif Araç</p>
          <p className="text-3xl font-bold">{tracks.length}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">İşlem FPS</p>
          <p className="text-3xl font-bold">
            {avgFps > 0 ? avgFps.toFixed(1) : '—'}
            {avgFps > 0 && (
              <span className="text-base font-normal text-slate-400"> fps</span>
            )}
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
            {sensors.length === 0 ? (
              <span className="text-xs text-slate-500">Sensör bekleniyor...</span>
            ) : (
              <>
                <span className={`text-xs ${onlineN > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {onlineN > 0 ? '🟢' : '🔴'} {onlineN}/{sensors.length} Sensör
                </span>
                {activeSensor && (
                  <span className="text-xs text-slate-400 font-mono truncate">
                    {activeSensor.sensorId}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Canlı kamera + aktif tespit tablosu — aynı yükseklikte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* overflow-hidden + h-80: VideoPlayer'ı DetectionTable yüksekliğine (320px) kısıtlar */}
        <div className="h-80 overflow-hidden rounded-xl">
          <VideoPlayer />
        </div>
        <DetectionTable sensorId={sensorId} onRowClick={setSelectedTrackId} />
      </div>

      {/* Araç tipi grafiği + FPS grafiği */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VehicleTypeChart sensorId={sensorId} />
        {sensorId ? (
          <FpsChart sensorId={sensorId} height={150} />
        ) : (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-center text-slate-500 text-sm">
            Sensör bekleniyor...
          </div>
        )}
      </div>

      {/* Anomali uyarıları */}
      <AnomalyAlert />

      <VehicleDetailModal
        sensorId={sensorId}
        trackId={selectedTrackId}
        onClose={() => setSelectedTrackId(null)}
      />

    </div>
  )
}
