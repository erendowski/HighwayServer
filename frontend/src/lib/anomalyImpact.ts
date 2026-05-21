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

export interface AnomalyImpactTr {
  title:          string;
  impact:         string;
  recommendation: string;
}

/** Turkish copy for the live-view adverse-conditions panel. */
export const ANOMALY_TR: Record<string, AnomalyImpactTr> = {
  STOPPED_VEHICLE: {
    title:          'Duran araç',
    impact:         'Yüksek arkadan çarpma riski; takip eden trafikte ani şerit değişikliklerine yol açar.',
    recommendation: 'Yol devriyesi yönlendirin; üst akıştaki sürücüleri uyarın.',
  },
  WRONG_WAY: {
    title:          'Ters yön sürüş',
    impact:         'Aşırı kafa kafaya çarpışma riski; en ölümcül olaylardan biri.',
    recommendation: 'Acil müdahale ekibi yönlendirin; girişi kapatın.',
  },
  LANE_VIOLATION: {
    title:          'Şerit ihlali',
    impact:         'Araç şerit dışında; yandan çarpışma riski.',
    recommendation: 'İzleyin; ısrarcıysa uyarı verin.',
  },
  POSSIBLE_ACCIDENT: {
    title:          'Olası kaza',
    impact:         'Yakın mesafede birden fazla duran araç — çarpışma/arıza kümesi.',
    recommendation: 'Acil müdahale ekibi yönlendirin.',
  },
  SUDDEN_BRAKE: {
    title:          'Ani fren',
    impact:         'Olası engel veya kıl payı kaza işareti.',
    recommendation: 'Üst akışta olay olup olmadığını kontrol edin.',
  },
  OVERSPEED: {
    title:          'Hız aşımı',
    impact:         'Tepki süresini kısaltır, fren mesafesini uzatır.',
    recommendation: 'Denetim için kaydedin.',
  },
  UNDERSPEED: {
    title:          'Düşük hız',
    impact:         'Hız farkı sollama ve şerit değişikliği riskini artırır.',
    recommendation: 'İzleyin; sağ şeridi önerin.',
  },
};

export const SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  low:      'bg-gray-50 text-gray-700 border-gray-200',
  medium:   'bg-amber-50 text-amber-800 border-amber-200',
  high:     'bg-red-50 text-red-800 border-red-200',
  critical: 'bg-red-100 text-red-900 border-red-300',
};

export const SEVERITY_BADGE: Record<AnomalySeverity, string> = {
  low:      'bg-gray-200 text-gray-700',
  medium:   'bg-amber-200 text-amber-800',
  high:     'bg-red-200 text-red-800',
  critical: 'bg-red-600 text-white animate-pulse',
};
