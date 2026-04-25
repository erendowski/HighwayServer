import { useSignalR } from './hooks/useSignalR'
import StatCard from './components/StatCard'
import SpeedChart from './components/SpeedChart'
import DetectionTable from './components/DetectionTable'
import VideoPlayer from './components/VideoPlayer'

export default function App() {
  const { messages } = useSignalR()
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Highway Dashboard</h1>
      <StatCard messages={messages} />
      <SpeedChart messages={messages} />
      <DetectionTable messages={messages} />
      <VideoPlayer />
    </div>
  )
}