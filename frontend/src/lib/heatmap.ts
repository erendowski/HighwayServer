import type { VehicleState, AnomalyRecord } from '../types/contracts';

export interface HeatPoint {
  lat: number;
  lng: number;
  weight: number; // 0..1 normalize edilmiş yoğunluk
}

// Yol hattı parametreleri — MapView ile aynı olmalı.
const ROAD_HALF_LNG = 0.0060;
const ROAD_HALF_LAT = 0.0011;

// progress (0..1) → yol hattı üzerinde coğrafi nokta.
export function pointOnRoad(lat: number, lng: number, progress: number): [number, number] {
  const t = progress * 2 - 1;
  return [lat + t * ROAD_HALF_LAT, lng + t * ROAD_HALF_LNG];
}

// trackId'yi deterministik bir progress'e çevirir (geçmiş anomalilerde bbox yok).
function trackProgress(trackId: number): number {
  // Basit hash → 0..1 arası dağılım
  const x = Math.sin(trackId * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Canlı araç konumlarından ısı noktaları (yol boyunca araç kümelenmesi).
export function liveTrafficHeat(
  lat: number, lng: number, vehicles: VehicleState[],
): HeatPoint[] {
  const present = vehicles.filter(v => v.status !== 'lost');
  if (present.length === 0) return [];

  // Yolu 20 dilime böl, her dilimdeki araç sayısını say.
  const BUCKETS = 20;
  const counts = new Array<number>(BUCKETS).fill(0);

  for (const v of present) {
    let progress: number;
    if (v.bbox && v.bbox[2] > 0 && v.bbox[3] > 0) {
      progress = (v.bbox[0] + v.bbox[2] / 2) / 1920;
    } else {
      progress = trackProgress(v.trackId);
    }
    progress = Math.min(0.999, Math.max(0, progress));
    counts[Math.floor(progress * BUCKETS)] += 1;
  }

  const max = Math.max(...counts, 1);
  const points: HeatPoint[] = [];
  for (let i = 0; i < BUCKETS; i++) {
    if (counts[i] === 0) continue;
    const [pLat, pLng] = pointOnRoad(lat, lng, (i + 0.5) / BUCKETS);
    points.push({ lat: pLat, lng: pLng, weight: counts[i] / max });
  }
  return points;
}

// Geçmiş anomali kayıtlarından ısı noktaları (kara nokta tespiti).
export function anomalyHeat(
  lat: number, lng: number, anomalies: AnomalyRecord[],
): HeatPoint[] {
  if (anomalies.length === 0) return [];

  const BUCKETS = 20;
  const counts = new Array<number>(BUCKETS).fill(0);

  for (const a of anomalies) {
    let progress = trackProgress(a.trackId);
    progress = Math.min(0.999, Math.max(0, progress));
    counts[Math.floor(progress * BUCKETS)] += 1;
  }

  const max = Math.max(...counts, 1);
  const points: HeatPoint[] = [];
  for (let i = 0; i < BUCKETS; i++) {
    if (counts[i] === 0) continue;
    const [pLat, pLng] = pointOnRoad(lat, lng, (i + 0.5) / BUCKETS);
    points.push({ lat: pLat, lng: pLng, weight: counts[i] / max });
  }
  return points;
}

// Ağırlığa göre renk (yeşil → sarı → kırmızı).
export function heatColor(weight: number): string {
  if (weight > 0.66) return '#ef4444'; // kırmızı
  if (weight > 0.33) return '#f59e0b'; // turuncu/sarı
  return '#22c55e';                     // yeşil
}
