import type { AnomalyType, AnomalySeverity } from '../types/contracts';

export interface AnomalyImpactInfo {
  severity:       AnomalySeverity;
  title:          string;
  impact:         string;
  recommendation: string;
}

export const ANOMALY_IMPACT: Record<AnomalyType, AnomalyImpactInfo> = {
  STOPPED: {
    severity:       'critical',
    title:          'Stopped vehicle on highway',
    impact:         'High rear-end collision risk. Forces sudden lane changes in following traffic, increases congestion shockwaves.',
    recommendation: 'Dispatch highway patrol; warn upstream drivers via VMS.',
  },
  SLOW: {
    severity:       'medium',
    title:          'Slow-moving vehicle',
    impact:         'Speed differential >40 km/h with mean traffic increases overtaking maneuvers and lane-change collision risk.',
    recommendation: 'Monitor; advise driver to use right lane if persistent.',
  },
  FAST: {
    severity:       'high',
    title:          'Speeding',
    impact:         'Reduced reaction time and longer braking distance; raises severity of any potential collision.',
    recommendation: 'Log for enforcement; flag plate if ALPR available.',
  },
  EXTREME_FAST: {
    severity:       'critical',
    title:          'Reckless speeding',
    impact:         'Loss-of-control risk on curves; multi-vehicle collision potential. Severely endangers other road users.',
    recommendation: 'Immediate enforcement alert.',
  },
  SUDDEN_BRAKE: {
    severity:       'high',
    title:          'Hard braking event',
    impact:         'Indicates possible obstacle or near-miss. Following vehicles may not have safe stopping distance.',
    recommendation: 'Check for upstream incident; review camera footage.',
  },
  SUDDEN_ACCEL: {
    severity:       'medium',
    title:          'Aggressive acceleration',
    impact:         'Associated with aggressive driving patterns; predictive indicator for further violations.',
    recommendation: 'Flag track for sustained monitoring.',
  },
  WRONG_DIRECTION: {
    severity:       'critical',
    title:          'Wrong-way driving',
    impact:         'Extreme head-on collision risk. One of the highest-fatality highway events.',
    recommendation: 'Immediate emergency dispatch; close upstream entry if possible.',
  },
  GHOST: {
    severity:       'low',
    title:          'Possible tracking artifact',
    impact:         'Telemetry inconsistency; not a real driving event. May indicate occlusion or ID switch.',
    recommendation: 'No action; review tracker logs if frequent.',
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
