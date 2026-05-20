import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import LiveView from './pages/LiveView'
import { useSignalRConnection } from './hooks/useSignalRConnection'
import { useSensorsStore } from './store/sensorsStore'
import ToastContainer from './components/ToastContainer'

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, setDark] as const;
}

export default function App() {
  const { connected, error } = useSignalRConnection()
  const [dark, setDark] = useDarkMode()

  const liveSensorId = useSensorsStore(s => {
    const list = Object.values(s.sensors);
    return (list.find(x => x.status === 'online') ?? list[0])?.sensorId ?? 'jetson01';
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-950 text-white">
      <ToastContainer />
      <div style={{ position: 'fixed', top: 8, right: 48, fontSize: 11, color: connected ? 'lime' : 'red', zIndex: 9999 }}>
        {connected ? '● Live' : error ? '✕ Error' : '○ Connecting...'}
      </div>

      <nav className="shrink-0 bg-gray-900 border-b border-slate-700 px-6 py-3 flex items-center gap-6 z-40">
        <span className="text-lg font-bold text-white tracking-tight">Highway Monitor</span>

        <NavLink
          to="/"
          end
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
          to={`/live/${liveSensorId}`}
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

        <button
          onClick={() => setDark(d => !d)}
          className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
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
