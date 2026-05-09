import { create } from 'zustand';
import type { TrackState } from '../types/contracts';

interface TracksStoreState {
  // Outer key = sensorId, inner key = trackId.
  tracks: Record<string, Record<number, TrackState>>;
  setTracks: (sensorId: string, tracks: TrackState[]) => void;
  upsertTrack: (track: TrackState) => void;
  removeTrack: (sensorId: string, trackId: number) => void;
  clearSensor: (sensorId: string) => void;
}

export const useTracksStore = create<TracksStoreState>((set) => ({
  tracks: {},

  setTracks: (sensorId, list) => set((state) => ({
    tracks: {
      ...state.tracks,
      [sensorId]: Object.fromEntries(list.map(t => [t.trackId, t])),
    },
  })),

  upsertTrack: (track) => set((state) => {
    const sensor = state.tracks[track.sensorId] ?? {};
    return {
      tracks: {
        ...state.tracks,
        [track.sensorId]: { ...sensor, [track.trackId]: track },
      },
    };
  }),

  removeTrack: (sensorId, trackId) => set((state) => {
    const sensor = { ...(state.tracks[sensorId] ?? {}) };
    delete sensor[trackId];
    return { tracks: { ...state.tracks, [sensorId]: sensor } };
  }),

  clearSensor: (sensorId) => set((state) => ({
    tracks: { ...state.tracks, [sensorId]: {} },
  })),
}));
