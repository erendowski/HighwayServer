import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LiveView from './pages/LiveView'
import { useSignalRConnection } from './hooks/useSignalRConnection'
import { useSensorsStore } from './store/sensorsStore'
import ToastContainer from './components/ToastContainer'

export default function App() {
  const { connected, error } = useSignalRConnection()

  const liveSensorId = useSensorsStore(s => {
    const list = Object.values(s.sensors);
    return (list.find(x => x.status === 'online') ?? list[0])?.sensorId ?? 'jetson01';
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#eef3ef] text-gray-900">
      <ToastContainer />
      <div style={{ position: 'fixed', top: 8, right: 16, fontSize: 11, color: connected ? '#16a34a' : '#dc2626', zIndex: 9999 }}>
        {connected ? '● Live' : error ? '✕ Error' : '○ Connecting...'}
      </div>

      <nav className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 z-40 shadow-sm">
        <span className="text-lg font-bold text-gray-900 tracking-tight">Highway Monitor</span>

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `text-sm px-3 py-1.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-emerald-600 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-emerald-50'
            }`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to={`/live/${liveSensorId}`}
          className={({ isActive }) =>
            `text-sm px-3 py-1.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-emerald-600 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-emerald-50'
            }`
          }
        >
          Canlı İzleme
        </NavLink>
      </nav>

      <main className="flex-1 min-h-0 overflow-y-auto p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live/:sensorId" element={<LiveView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
