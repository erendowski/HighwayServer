import { create } from 'zustand';
import type { VehicleState, Anomaly, SpeedSample, VehicleStatus } from '../types/contracts';

const SPEED_HISTORY_MS = 30_000;
const MAX_ANOMALIES    = 5;
const STALE_MS         = 3_000;
const LOST_MS          = 15_000;

interface VehicleStoreState {
  // sensorId → trackId → VehicleState
  vehicles: Record<string, Record<number, VehicleState>>;
  upsertVehicle: (
    sensorId: string,
    trackId:  number,
    update: { classLabel: string; speedKmh: number; bbox?: [number, number, number, number] }
  ) => void;
  addAnomaly:    (sensorId: string, trackId: number, anomaly: Anomaly) => void;
  tickStatuses:  () => void;
}

export const useVehicleStore = create<VehicleStoreState>((set) => ({
  vehicles: {},

  upsertVehicle: (sensorId, trackId, update) => set((state) => {
    const now     = Date.now();
    const sensor  = state.vehicles[sensorId] ?? {};
    const existing = sensor[trackId];
    const cutoff  = now - SPEED_HISTORY_MS;

    const newSample: SpeedSample = { t: now, v: update.speedKmh };
    const history: SpeedSample[] = [
      ...(existing?.speedHistory ?? []).filter(s => s.t > cutoff),
      newSample,
    ];

    const vehicle: VehicleState = {
      trackId,
      sensorId,
      classLabel:    update.classLabel,
      speedKmh:      update.speedKmh,
      lastSpeedKmh:  existing?.speedKmh ?? update.speedKmh,
      bbox:          update.bbox ?? existing?.bbox,
      firstSeenAt:   existing?.firstSeenAt ?? now,
      lastSeenAt:    now,
      status:        'active',
      speedHistory:  history,
      anomalies:     existing?.anomalies ?? [],
    };

    return {
      vehicles: {
        ...state.vehicles,
        [sensorId]: { ...sensor, [trackId]: vehicle },
      },
    };
  }),

  addAnomaly: (sensorId, trackId, anomaly) => set((state) => {
    const sensor   = state.vehicles[sensorId] ?? {};
    const existing = sensor[trackId];
    if (!existing) return state;

    return {
      vehicles: {
        ...state.vehicles,
        [sensorId]: {
          ...sensor,
          [trackId]: {
            ...existing,
            anomalies: [anomaly, ...existing.anomalies].slice(0, MAX_ANOMALIES),
          },
        },
      },
    };
  }),

  tickStatuses: () => set((state) => {
    const now = Date.now();
    const next: Record<string, Record<number, VehicleState>> = {};

    for (const [sensorId, sensor] of Object.entries(state.vehicles)) {
      const updated: Record<number, VehicleState> = {};
      for (const [idStr, v] of Object.entries(sensor)) {
        const id  = Number(idStr);
        const age = now - v.lastSeenAt;

        let status: VehicleStatus = 'active';
        if (age > LOST_MS)       status = 'lost';
        else if (age > STALE_MS) status = 'stale';

        updated[id] = v.status !== status ? { ...v, status } : v;
      }
      next[sensorId] = updated;
    }

    return { vehicles: next };
  }),
}));

// Browser-only tick — runs once on module load
if (typeof window !== 'undefined') {
  setInterval(() => useVehicleStore.getState().tickStatuses(), 1_000);
}
