import { useTelemetry } from '../contexts/TelemetryContext'
import VideoPlayer from '../components/VideoPlayer'
import AnomalyAlert from '../components/AnomalyAlert'
import MapView from '../components/MapView'

export default function LiveView() {
  const { messages } = useTelemetry()

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VideoPlayer />
        <MapView messages={messages} />
      </div>
      <AnomalyAlert messages={messages} />
    </div>
  )
}
