import { useState } from 'react';
import {
  AlertTriangle, OctagonAlert, Snail, Zap, ParkingCircle,
  Car, Truck, Bus, Bike,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { useAnomalyStore, type AnomalyFeedItem } from '../store/anomalyStore';
import { ANOMALY_IMPACT, SEVERITY_COLORS, SEVERITY_BADGE } from '../lib/anomalyImpact';
import type { AnomalyType } from '../types/contracts';

// ── Icon helpers ─────────────────────────────────────────────────────────────

const CLASS_ICONS: Record<string, React.ReactNode> = {
  car:        <Car   size={14} />,
  van:        <Truck size={14} />,
  bus:        <Bus   size={14} />,
  motorcycle: <Bike  size={14} />,
  truck:      <Truck size={14} />,
};

const ANOMALY_ICONS: Record<AnomalyType, React.ReactNode> = {
  STOPPED_VEHICLE:   <ParkingCircle size={14} className="text-purple-400" />,
  WRONG_WAY:         <OctagonAlert  size={14} className="text-red-600"    />,
  LANE_VIOLATION:    <AlertTriangle size={14} className="text-amber-400"  />,
  POSSIBLE_ACCIDENT: <OctagonAlert  size={14} className="text-red-500"    />,
  SUDDEN_BRAKE:      <AlertTriangle size={14} className="text-orange-400" />,
  OVERSPEED:         <Zap           size={14} className="text-red-400"    />,
  UNDERSPEED:        <Snail         size={14} className="text-amber-400"  />,
};

function relativeTime(epochMs: number) {
  const s = Math.floor((Date.now() - epochMs) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Single feed entry ─────────────────────────────────────────────────────────

function AnomalyEntry({ item, onLocate }: { item: AnomalyFeedItem; onLocate?: (trackId: number) => void }) {
  const [expanded, setExpanded] = useState(true);
  const info = ANOMALY_IMPACT[item.anomalyType];

  return (
    <div className={`rounded-xl border p-3 space-y-2 transition-colors ${SEVERITY_COLORS[item.severity]}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-slate-300 shrink-0">
          {CLASS_ICONS[item.vehicleClass] ?? <Car size={14} />}
        </span>
        <span className="text-xs font-mono font-semibold text-white">#{item.trackId}</span>
        <span className="text-xs text-slate-400 capitalize">{item.vehicleClass}</span>

        <span className="flex items-center gap-1 ml-1">
          {ANOMALY_ICONS[item.anomalyType]}
          <span className="text-xs font-semibold text-white">{info.title}</span>
        </span>

        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-semibold ${SEVERITY_BADGE[item.severity]}`}>
          {item.severity}
        </span>

        <span className="text-xs text-slate-500">{relativeTime(item.receivedAt)}</span>

        {onLocate && (
          <button
            onClick={() => onLocate(item.trackId)}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors ml-1"
          >
            Locate
          </button>
        )}

        <button
          onClick={() => setExpanded(e => !e)}
          className="text-slate-400 hover:text-slate-200 transition-colors shrink-0"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Speed + delta */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>Speed: <span className="font-mono text-white">{item.speedKmh.toFixed(0)} km/h</span></span>
        {item.delta !== undefined && item.delta !== null && (
          <span>
            Delta: <span className={`font-mono ${item.delta < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)} km/h/s
            </span>
          </span>
        )}
      </div>

      {/* Collapsible impact + recommendation */}
      {expanded && (
        <div className="space-y-1.5 text-xs border-t border-white/10 pt-2">
          <p className="text-slate-300">
            <span className="font-semibold text-slate-200">Impact: </span>
            {info.impact}
          </p>
          <p className="text-slate-300">
            <span className="font-semibold text-amber-400">Action: </span>
            {info.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Feed panel ────────────────────────────────────────────────────────────────

interface Props {
  className?: string;
  onLocateTrack?: (trackId: number) => void;
}

export default function AnomalyFeed({ className = '', onLocateTrack }: Props) {
  const feed = useAnomalyStore(s => s.feed);

  return (
    <div className={`flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <OctagonAlert size={20} className="text-red-400" />
          <h2 className="text-sm font-semibold text-white">Anomaly Feed</h2>
        </div>
        <span className="text-xs text-slate-500">{feed.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {feed.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">No anomalies detected</p>
        ) : (
          feed.map(item => (
            <AnomalyEntry key={item.id} item={item} onLocate={onLocateTrack} />
          ))
        )}
      </div>
    </div>
  );
}
