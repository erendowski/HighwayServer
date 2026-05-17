import { create } from 'zustand';
import type { AnomalyDetectedPayload } from '../types/contracts';

export interface AnomalyFeedItem extends AnomalyDetectedPayload {
  id: string;          // unique key for React list
  receivedAt: number;  // epoch ms
}

const MAX_FEED = 50;

interface AnomalyStoreState {
  feed: AnomalyFeedItem[];
  addAnomaly: (p: AnomalyDetectedPayload) => void;
}

let _counter = 0;

export const useAnomalyStore = create<AnomalyStoreState>((set) => ({
  feed: [],
  addAnomaly: (p) => set((state) => ({
    feed: [
      { ...p, id: `${++_counter}`, receivedAt: Date.now() },
      ...state.feed,
    ].slice(0, MAX_FEED),
  })),
}));
