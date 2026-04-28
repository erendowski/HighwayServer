import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LiveView from './pages/LiveView'
import { TelemetryProvider } from './contexts/TelemetryContext'

export default function App() {
  return (
    <TelemetryProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-gray-950 text-white">
        <nav className="shrink-0 bg-gray-900 border-b border-slate-700 px-6 py-3 flex items-center gap-6 z-40">
          <span className="text-lg font-bold text-white tracking-tight">Highway Monitor</span>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/live"
            className={({ isActive }) =>
              `text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            Canlı İzleme
          </NavLink>
        </nav>

        <main className="flex-1 min-h-0 overflow-y-auto p-4">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/live" element={<LiveView />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </TelemetryProvider>
  )
}
