import { create } from 'zustand';
import type { SensorState, SensorMetaPayload, StatsPayload } from '../types/contracts';

interface SensorsStoreState {
  sensors: Record<string, SensorState>;
  setSensors: (sensors: SensorState[]) => void;
  updateStatus: (sensorId: string, status: 'online' | 'offline' | 'unknown', tsUtc: string) => void;
  updateMeta: (sensorId: string, meta: SensorMetaPayload, tsUtc: string) => void;
  updateStats: (sensorId: string, stats: StatsPayload) => void;
  updateHeartbeat: (sensorId: string, tsUtc: string) => void;
}

function defaultSensor(sensorId: string): SensorState {
  const now = new Date().toISOString();
  return {
    sensorId,
    status: 'unknown',
    lastStatusAt: now,
    lastHeartbeatAt: now,
    lastSeenAt: now,
    meta: null,
    lastStats: null,
  };
}

export const useSensorsStore = create<SensorsStoreState>((set) => ({
  sensors: {},

  setSensors: (list) => set(() => ({
    sensors: Object.fromEntries(list.map(s => [s.sensorId, s])),
  })),

  updateStatus: (sensorId, status, tsUtc) => set((state) => ({
    sensors: {
      ...state.sensors,
      [sensorId]: {
        ...(state.sensors[sensorId] ?? defaultSensor(sensorId)),
        status,
        lastStatusAt: tsUtc,
        lastSeenAt: tsUtc,
      },
    },
  })),

  updateMeta: (sensorId, meta, tsUtc) => set((state) => ({
    sensors: {
      ...state.sensors,
      [sensorId]: {
        ...(state.sensors[sensorId] ?? defaultSensor(sensorId)),
        meta,
        lastSeenAt: tsUtc,
      },
    },
  })),

  updateStats: (sensorId, stats) => set((state) => ({
    sensors: {
      ...state.sensors,
      [sensorId]: {
        ...(state.sensors[sensorId] ?? defaultSensor(sensorId)),
        lastStats: stats,
        lastSeenAt: stats.tsUtc,
      },
    },
  })),

  updateHeartbeat: (sensorId, tsUtc) => set((state) => ({
    sensors: {
      ...state.sensors,
      [sensorId]: {
        ...(state.sensors[sensorId] ?? defaultSensor(sensorId)),
        lastHeartbeatAt: tsUtc,
        lastSeenAt: tsUtc,
      },
    },
  })),
}));
