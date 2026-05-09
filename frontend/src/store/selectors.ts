import { useShallow } from 'zustand/react/shallow';
import { useSensorsStore } from './sensorsStore';
import { useTracksStore } from './tracksStore';
import { useDetectionsStore } from './detectionsStore';
import { useEventsStore } from './eventsStore';
import { useConnectionStore } from './connectionStore';
import type {
  SensorState, TrackState,
  DetectionsUpdatedPayload, VehicleEventPayload,
} from '../types/contracts';

/** SignalR bağlantı durumu — client.ts tarafından güncellenir. */
export const useIsConnected = (): boolean =>
  useConnectionStore(s => s.connected);

/**
 * Returns all sensors as an array.
 * useShallow prevents infinite loop: Object.values() always returns a new
 * array reference, so without shallow comparison Zustand re-renders forever.
 */
export const useSensorList = (): SensorState[] =>
  useSensorsStore(useShallow(s => Object.values(s.sensors)));

/** Returns a single sensor; undefined if not found. Direct ref — no shallow needed. */
export const useSensor = (id: string): SensorState | undefined =>
  useSensorsStore(s => s.sensors[id]);

/**
 * Returns active tracks for a sensor as an array.
 * useShallow prevents infinite loop for the same reason as useSensorList.
 */
export const useActiveTracks = (sensorId: string): TrackState[] =>
  useTracksStore(useShallow(s => {
    const sensor = s.tracks[sensorId];
    return sensor ? Object.values(sensor) : [];
  }));

/** Returns the latest detection frame for a sensor. Direct ref — no shallow needed. */
export const useLatestDetections = (sensorId: string): DetectionsUpdatedPayload | undefined =>
  useDetectionsStore(s => s.latest[sensorId]);

/**
 * Returns vehicle events, optionally filtered by sensorId.
 * The filter() branch creates a new array, so useShallow is needed.
 */
export const useVehicleEvents = (sensorId?: string): VehicleEventPayload[] =>
  useEventsStore(useShallow(s =>
    sensorId
      ? s.vehicleEvents.filter(e => e.sensorId === sensorId)
      : s.vehicleEvents
  ));
