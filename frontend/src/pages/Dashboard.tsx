import { useState } from 'react'
import { Activity, Gauge, AlertTriangle, Radio } from 'lucide-react'
import { useSensorList, useActiveTracks, useIsConnected } from '../store/selectors'
import { useVehicleStore } from '../store/vehicleStore'
import { useAnomalyStore } from '../store/anomalyStore'
import { useStreamStore } from '../store/streamStore'
import VideoPlayer from '../components/VideoPlayer'
import DetectionTable from '../components/DetectionTable'
import FpsChart from '../components/FpsChart'
import VehicleTypeChart from '../components/VehicleTypeChart'
import AnomalyAlert from '../components/AnomalyAlert'
import VehicleDetailModal from '../components/VehicleDetailModal'
import ActiveTracksPanel from '../components/ActiveTracksPanel'
import AnomalyFeed from '../components/AnomalyFeed'

const CARD = 'rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur shadow-sm'

function KpiCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string
}) {
  return (
    <div className={`${CARD} p-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-2 text-slate-400 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const sensors      = useSensorList()
  const connected    = useIsConnected()
  const streamReady  = useStreamStore(s => s.ready)
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)

  const activeSensor = sensors.find(s => s.status === 'online') ?? sensors[0]
  const sensorId     = activeSensor?.sensorId ?? ''

  const tracks       = useActiveTracks(sensorId)
  const avgFps       = activeSensor?.lastStats?.fps ?? 0
  const onlineN      = sensors.filter(s => s.status === 'online').length

  const activeCount  = useVehicleStore(s => {
    const sv = s.vehicles[sensorId]
    return sv ? Object.values(sv).filter(v => v.status === 'active').length : 0
  })
  const anomalyCount = useAnomalyStore(s => s.feed.length)

  return (
    <div className="flex flex-col gap-4">

      {/* KPI strip — 4 cards */}
      <div className={`grid gap-3
        grid-cols-2
        lg:grid-cols-4`}>

        <KpiCard
          icon={<Activity size={14} />}
          label="Aktif Araç"
          value={activeCount || tracks.length}
        />

        <KpiCard
          icon={<Gauge size={14} />}
          label="İşlem FPS"
          value={avgFps > 0 ? avgFps.toFixed(1) : '—'}
          sub={avgFps > 0 ? 'fps' : undefined}
        />

        <KpiCard
          icon={<AlertTriangle size={14} />}
          label="Aktif Anomaliler"
          value={anomalyCount}
          sub={connected ? 'SignalR bağlı' : 'bağlantı yok'}
        />

        <KpiCard
          icon={<Radio size={14} className={streamReady ? 'text-red-400 animate-pulse' : ''} />}
          label="Stream Durumu"
          value={streamReady ? 'LIVE' : 'Offline'}
          sub={`${onlineN}/${sensors.length} sensör`}
        />
      </div>

      {/* Main grid */}
      <div className={`grid gap-4
        grid-cols-1
        md:grid-cols-2
        xl:grid-cols-12`}>

        {/* Live video — xl: 8 cols */}
        <div className="xl:col-span-8">
          <VideoPlayer />
        </div>

        {/* Active tracks panel — xl: 4 cols, 2 rows */}
        <div className="xl:col-span-4 xl:row-span-2">
          <ActiveTracksPanel sensorId={sensorId} className="h-full min-h-80" />
        </div>

        {/* Speed/FPS charts — xl: 8 cols */}
        <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`${CARD} overflow-hidden`}>
            <VehicleTypeChart sensorId={sensorId} />
          </div>
          <div className={`${CARD} overflow-hidden`}>
            {sensorId ? (
              <FpsChart sensorId={sensorId} height={150} />
            ) : (
              <div className="flex items-center justify-center h-36 text-slate-500 text-sm">
                Sensör bekleniyor...
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Anomaly feed — full width */}
      <AnomalyFeed className="max-h-96" />

      {/* Legacy detection table (keeps existing functionality) */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-slate-700/60">
          <h2 className="text-sm font-semibold text-white">Tespit Tablosu</h2>
        </div>
        <DetectionTable sensorId={sensorId} onRowClick={setSelectedTrackId} />
      </div>

      {/* Anomaly alerts for offline sensors */}
      <AnomalyAlert />

      <VehicleDetailModal
        sensorId={sensorId}
        trackId={selectedTrackId}
        onClose={() => setSelectedTrackId(null)}
      />
    </div>
  )
}
