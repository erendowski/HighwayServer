import { useState, useMemo } from 'react';
import {
  Car, Truck, Bus, Bike,
  Activity, CircleDot, CircleOff,
  AlertTriangle,
} from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import type { VehicleState, VehicleStatus, AnomalySeverity } from '../types/contracts';
import { SEVERITY_BADGE } from '../lib/anomalyImpact';

// ── Icon helpers ─────────────────────────────────────────────────────────────

const CLASS_ICONS: Record<string, React.ReactNode> = {
  car:        <Car   size={16} />,
  van:        <Truck size={16} />,
  bus:        <Bus   size={16} />,
  motorcycle: <Bike  size={16} />,
  truck:      <Truck size={16} />,
};

const STATUS_ICON: Record<VehicleStatus, React.ReactNode> = {
  active: <Activity   size={12} className="text-green-600" />,
  stale:  <CircleDot  size={12} className="text-gray-400" />,
  lost:   <CircleOff  size={12} className="text-red-500"   />,
};

const STATUS_ORDER: Record<VehicleStatus, number> = { active: 0, stale: 1, lost: 2 };

type SortKey = 'status' | 'speed' | 'age';

function relativeTime(epochMs: number) {
  const s = Math.floor((Date.now() - epochMs) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function topAnomaly(v: VehicleState): AnomalySeverity | null {
  if (v.anomalies.length === 0) return null;
  const order: AnomalySeverity[] = ['critical', 'high', 'medium', 'low'];
  for (const sev of order) {
    if (v.anomalies.some(a => a.severity === sev)) return sev;
  }
  return null;
}

// ── Row component — stable key prevents re-mount ─────────────────────────────

function VehicleRow({ v }: { v: VehicleState }) {
  const sev = topAnomaly(v);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors
        ${v.status === 'stale' ? 'opacity-60' : ''}
        ${v.status === 'lost'
          ? 'border-gray-100 bg-gray-50'
          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
        }`}
    >
      {/* Class icon */}
      <span className="text-gray-600 shrink-0">
        {CLASS_ICONS[v.classLabel] ?? <Car size={16} />}
      </span>

      {/* Track ID + class */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold text-gray-900">#{v.trackId}</span>
          <span className="text-xs text-gray-500 capitalize">{v.classLabel}</span>
        </div>

        {v.status === 'lost' && (
          <span className="text-xs text-gray-400">{relativeTime(v.lastSeenAt)}</span>
        )}
      </div>

      {/* Speed */}
      {v.status !== 'lost' && (
        <span className="text-xs font-mono font-semibold text-emerald-600 shrink-0">
          {v.speedKmh.toFixed(0)} km/h
        </span>
      )}

      {/* Top anomaly badge */}
      {sev && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 flex items-center gap-1 ${SEVERITY_BADGE[sev]}`}>
          <AlertTriangle size={10} />
          {sev}
        </span>
      )}

      {/* Status badge */}
      <span className="shrink-0 flex items-center gap-1">
        {STATUS_ICON[v.status]}
      </span>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  sensorId: string;
  className?: string;
}

export default function ActiveTracksPanel({ sensorId, className = '' }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  // IMPORTANT: do NOT use `?? {}` inside the selector — it creates a new
  // object on every call which breaks useSyncExternalStore snapshot caching
  // and triggers an infinite render loop.
  const vehicleMap = useVehicleStore(s => s.vehicles[sensorId]);

  const list = useMemo(() => {
    const arr = Object.values(vehicleMap ?? {});
    return arr.sort((a, b) => {
      if (sortKey === 'status') {
        const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (sd !== 0) return sd;
        return b.speedKmh - a.speedKmh;
      }
      if (sortKey === 'speed') return b.speedKmh - a.speedKmh;
      return a.firstSeenAt - b.firstSeenAt;
    });
  }, [vehicleMap, sortKey]);

  const counts = useMemo(() => {
    const c = { active: 0, stale: 0, lost: 0 };
    for (const v of Object.values(vehicleMap ?? {})) c[v.status]++;
    return c;
  }, [vehicleMap]);

  return (
    <div className={`flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-gray-900">Active Tracks</h2>
        </div>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="text-xs bg-white border border-gray-300 text-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          <option value="status">Sort: Status</option>
          <option value="speed">Sort: Speed</option>
          <option value="age">Sort: Age</option>
        </select>
      </div>

      {/* Counts */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 text-xs shrink-0">
        <span className="text-green-600 font-semibold">Active: {counts.active}</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">Stale: {counts.stale}</span>
        <span className="text-gray-400">·</span>
        <span className="text-red-500">Lost: {counts.lost}</span>
      </div>

      {/* List — React key={trackId} ensures stable DOM nodes */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {list.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No vehicles tracked</p>
        ) : (
          list.map(v => <VehicleRow key={v.trackId} v={v} />)
        )}
      </div>
    </div>
  );
}
