import { create } from 'zustand';
import type { AnomalySeverity } from '../types/contracts';

export interface Toast {
  id: number;
  title: string;
  message: string;
  severity: AnomalySeverity;
}

const AUTO_DISMISS_MS = 6_000;
const MAX_TOASTS = 4;

interface ToastStoreState {
  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let _counter = 0;

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  pushToast: (t) => {
    const id = ++_counter;
    set((state) => ({
      toasts: [{ ...t, id }, ...state.toasts].slice(0, MAX_TOASTS),
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(x => x.id !== id) }));
    }, AUTO_DISMISS_MS);
  },

  dismiss: (id) => set((state) => ({
    toasts: state.toasts.filter(x => x.id !== id),
  })),
}));
