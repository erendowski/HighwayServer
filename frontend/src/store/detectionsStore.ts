import { create } from 'zustand';
import type { DetectionsUpdatedPayload } from '../types/contracts';

interface DetectionsStoreState {
  // Latest detection frame per sensor.
  latest: Record<string, DetectionsUpdatedPayload>;
  updateDetections: (payload: DetectionsUpdatedPayload) => void;
}

export const useDetectionsStore = create<DetectionsStoreState>((set) => ({
  latest: {},

  updateDetections: (payload) => set((state) => ({
    latest: { ...state.latest, [payload.sensorId]: payload },
  })),
}));
