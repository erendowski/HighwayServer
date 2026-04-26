import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LiveView from './pages/LiveView'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center gap-6">
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

      <main className="p-4">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/live" element={<LiveView />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}
