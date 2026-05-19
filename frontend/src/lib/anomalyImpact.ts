import type { AnomalyType, AnomalySeverity } from '../types/contracts';

export interface AnomalyImpactInfo {
  severity:       AnomalySeverity;
  title:          string;
  impact:         string;
  recommendation: string;
}

export const ANOMALY_IMPACT: Record<AnomalyType, AnomalyImpactInfo> = {
  STOPPED_VEHICLE: {
    severity:       'critical',
    title:          'Stopped vehicle on highway',
    impact:         'High rear-end collision risk. Forces sudden lane changes in following traffic.',
    recommendation: 'Dispatch highway patrol; warn upstream drivers via VMS.',
  },
  WRONG_WAY: {
    severity:       'critical',
    title:          'Wrong-way driving',
    impact:         'Extreme head-on collision risk. One of the highest-fatality highway events.',
    recommendation: 'Immediate emergency dispatch; close upstream entry if possible.',
  },
  LANE_VIOLATION: {
    severity:       'medium',
    title:          'Lane violation',
    impact:         'Vehicle outside designated lane boundaries; risk of sideswipe collisions.',
    recommendation: 'Monitor; issue warning if persistent.',
  },
  POSSIBLE_ACCIDENT: {
    severity:       'critical',
    title:          'Possible accident',
    impact:         'Multiple stopped vehicles in close proximity — collision or breakdown cluster.',
    recommendation: 'Immediate emergency dispatch; review camera footage.',
  },
  SUDDEN_BRAKE: {
    severity:       'high',
    title:          'Hard braking event',
    impact:         'Indicates possible obstacle or near-miss. Following vehicles may not have safe stopping distance.',
    recommendation: 'Check for upstream incident; review camera footage.',
  },
  OVERSPEED: {
    severity:       'high',
    title:          'Speed limit exceeded',
    impact:         'Reduced reaction time and longer braking distance; raises collision severity.',
    recommendation: 'Log for enforcement; flag plate if ALPR available.',
  },
  UNDERSPEED: {
    severity:       'medium',
    title:          'Minimum speed violation',
    impact:         'Speed differential with mean traffic increases overtaking maneuvers and lane-change risk.',
    recommendation: 'Monitor; advise driver to use right lane if persistent.',
  },
};

export const SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  low:      'bg-slate-700/60 text-slate-300 border-slate-600',
  medium:   'bg-amber-900/60 text-amber-300 border-amber-700',
  high:     'bg-red-900/60 text-red-300 border-red-700',
  critical: 'bg-red-950/80 text-red-200 border-red-600',
};

export const SEVERITY_BADGE: Record<AnomalySeverity, string> = {
  low:      'bg-slate-600 text-slate-200',
  medium:   'bg-amber-700 text-amber-100',
  high:     'bg-red-700 text-red-100',
  critical: 'bg-red-600 text-white animate-pulse',
};
