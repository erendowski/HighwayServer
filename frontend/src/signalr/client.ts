import * as signalR from '@microsoft/signalr';
import { useSensorsStore } from '../store/sensorsStore';
import { useTracksStore } from '../store/tracksStore';
import { useDetectionsStore } from '../store/detectionsStore';
import { useEventsStore } from '../store/eventsStore';
import { useConnectionStore } from '../store/connectionStore';
import type {
  SensorState,
  SensorStatusPayload,
  SensorMetaPayload,
  StatsPayload,
  DetectionsUpdatedPayload,
  VehicleEventPayload,
  CommandResponsePayload,
  HeartbeatPayload,
} from '../types/contracts';

const HUB_URL = `${import.meta.env.VITE_API_URL ?? ''}/telemetryHub`;

let _connection: signalR.HubConnection | null = null;

export function getConnection(): signalR.HubConnection {
  if (_connection) return _connection;

  _connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  const sensors    = useSensorsStore.getState();
  const tracks     = useTracksStore.getState();
  const detections = useDetectionsStore.getState();
  const events     = useEventsStore.getState();

  // ── Event handlers ──────────────────────────────────────────────────────────

  _connection.on('InitialState', (data: { sensors: SensorState[] }) => {
    sensors.setSensors(data.sensors ?? []);
  });

  _connection.on('SensorStatusChanged', (p: SensorStatusPayload) => {
    sensors.updateStatus(p.sensorId, p.status, p.tsUtc);
    if (p.status === 'offline') tracks.clearSensor(p.sensorId);
  });

  _connection.on('SensorMetaUpdated', (p: SensorMetaPayload) => {
    sensors.updateMeta(p.sensorId, p, p.tsUtc);
  });

  _connection.on('SensorStatsUpdated', (p: StatsPayload) => {
    sensors.updateStats(p.sensorId, p);
  });

  _connection.on('DetectionsUpdated', (p: DetectionsUpdatedPayload) => {
    detections.updateDetections(p);
    p.objects.forEach(obj => {
      tracks.upsertTrack({
        sensorId:    p.sensorId,
        trackId:     obj.trackId,
        vehicleClass: obj.vehicleClass,
        confidence:  obj.confidence,
        bbox:        obj.bbox,
        firstSeenAt: p.tsUtc,
        lastSeenAt:  p.tsUtc,
        trackState:  obj.trackState,
      });
    });
  });

  _connection.on('VehicleEntered', (p: VehicleEventPayload) => {
    events.addVehicleEvent({ ...p, eventType: 'enter' });
  });

  _connection.on('VehicleExited', (p: VehicleEventPayload) => {
    events.addVehicleEvent({ ...p, eventType: 'exit' });
    tracks.removeTrack(p.sensorId, p.trackId);
  });

  _connection.on('HeartbeatReceived', (p: HeartbeatPayload) => {
    sensors.updateHeartbeat(p.sensorId, p.tsUtc);
  });

  _connection.on('CommandResponseReceived', (p: CommandResponsePayload) => {
    events.addCommandResponse(p);
  });

  // ── Connection state logging ────────────────────────────────────────────────

  _connection.onreconnecting(() => {
    console.warn('[SignalR] Reconnecting...');
    useConnectionStore.getState().setConnected(false);
  });
  _connection.onreconnected(() => {
    console.info('[SignalR] Reconnected');
    useConnectionStore.getState().setConnected(true);
  });
  _connection.onclose(() => {
    console.warn('[SignalR] Connection closed');
    useConnectionStore.getState().setConnected(false);
  });

  return _connection;
}

export async function startConnection(): Promise<void> {
  const conn = getConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start();
    useConnectionStore.getState().setConnected(true);
    console.info('[SignalR] Connected to', HUB_URL);
  }
}

export async function stopConnection(): Promise<void> {
  if (_connection) {
    await _connection.stop();
    _connection = null;
  }
}
