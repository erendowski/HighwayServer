import { create } from 'zustand';
import type { VehicleEventPayload, CommandResponsePayload } from '../types/contracts';

const MAX_EVENTS = 200;

interface EventsStoreState {
  vehicleEvents: VehicleEventPayload[];       // enter + exit, newest first
  commandResponses: CommandResponsePayload[];
  addVehicleEvent: (evt: VehicleEventPayload) => void;
  addCommandResponse: (resp: CommandResponsePayload) => void;
}

export const useEventsStore = create<EventsStoreState>((set) => ({
  vehicleEvents: [],
  commandResponses: [],

  addVehicleEvent: (evt) => set((state) => ({
    vehicleEvents: [evt, ...state.vehicleEvents].slice(0, MAX_EVENTS),
  })),

  addCommandResponse: (resp) => set((state) => ({
    commandResponses: [resp, ...state.commandResponses].slice(0, MAX_EVENTS),
  })),
}));
