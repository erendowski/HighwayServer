import { useSignalR } from './hooks/useSignalR';
import StatCard from './components/StatCard';
import SpeedChart from './components/SpeedChart';
import DetectionTable from './components/DetectionTable';
import VideoPlayer from './components/VideoPlayer';

export default function App() {
  const { messages, connected } = useSignalR();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🛣️</span>
          <h1 className="text-base font-semibold tracking-wide">Highway Server — Telemetri Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-slate-400">{connected ? 'Bağlı' : 'Bağlantı kesildi'}</span>
        </div>
      </header>

      {/* Main */}
      <main className="p-4 md:p-6 space-y-4">
        {/* Stat Cards */}
        <StatCard messages={messages} />

        {/* Middle row: video + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VideoPlayer />
          <SpeedChart messages={messages} />
        </div>

        {/* Detection Table */}
        <DetectionTable messages={messages} />
      </main>
    </div>
  );
}
