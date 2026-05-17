import { create } from 'zustand';

interface StreamStoreState {
  ready:  boolean;
  path:   string;
  since:  string | null;
  setStatus: (ready: boolean, path: string, since: string) => void;
}

export const useStreamStore = create<StreamStoreState>((set) => ({
  ready:  false,
  path:   'highway',
  since:  null,
  setStatus: (ready, path, since) => set({ ready, path, since }),
}));
