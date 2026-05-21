import type { VehicleState } from '../types/contracts';

export type DensityLevel = 'free' | 'light' | 'moderate' | 'heavy' | 'jam';

export interface TrafficDensity {
  level:       DensityLevel;
  label:       string;        // Turkish label
  vehicleCount: number;       // active + stale vehicles in frame
  avgSpeedKmh: number;        // mean speed of moving vehicles
  color:       string;        // tailwind text/border color hint
  badgeClass:  string;        // tailwind badge classes
}

const LEVELS: Record<DensityLevel, { label: string; color: string; badgeClass: string }> = {
  free:     { label: 'Akıcı',          color: '#22c55e', badgeClass: 'bg-green-100 text-green-700 border-green-200' },
  light:    { label: 'Hafif',          color: '#84cc16', badgeClass: 'bg-lime-100 text-lime-700 border-lime-200' },
  moderate: { label: 'Orta Yoğunluk',  color: '#f59e0b', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  heavy:    { label: 'Yoğun',          color: '#f97316', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200' },
  jam:      { label: 'Tıkalı',         color: '#ef4444', badgeClass: 'bg-red-100 text-red-700 border-red-200' },
};

/**
 * Estimates traffic density from the vehicles currently in the camera frame.
 * Combines vehicle count (volume) with average speed (flow): many vehicles
 * moving slowly indicates congestion even at moderate counts.
 */
export function computeDensity(vehicles: VehicleState[]): TrafficDensity {
  const present = vehicles.filter(v => v.status !== 'lost');
  const count   = present.length;

  const moving = present.filter(v => v.speedKmh > 3);
  const avgSpeed = moving.length > 0
    ? moving.reduce((sum, v) => sum + v.speedKmh, 0) / moving.length
    : 0;

  let level: DensityLevel;
  if (count === 0) {
    level = 'free';
  } else if (count <= 3) {
    level = avgSpeed < 25 ? 'light' : 'free';
  } else if (count <= 7) {
    level = avgSpeed < 25 ? 'moderate' : 'light';
  } else if (count <= 12) {
    level = avgSpeed < 20 ? 'heavy' : 'moderate';
  } else {
    level = avgSpeed < 15 ? 'jam' : 'heavy';
  }

  const meta = LEVELS[level];
  return {
    level,
    label:        meta.label,
    vehicleCount: count,
    avgSpeedKmh:  avgSpeed,
    color:        meta.color,
    badgeClass:   meta.badgeClass,
  };
}
