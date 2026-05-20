import * as signalR from '@microsoft/signalr';
import { useSensorsStore } from '../store/sensorsStore';
import { useTracksStore } from '../store/tracksStore';
import { useDetectionsStore } from '../store/detectionsStore';
import { useEventsStore } from '../store/eventsStore';
import { useConnectionStore } from '../store/connectionStore';
import { useVehicleStore } from '../store/vehicleStore';
import { useAnomalyStore } from '../store/anomalyStore';
import { useStreamStore } from '../store/streamStore';
import { useToastStore } from '../store/toastStore';
import { ANOMALY_TR } from '../lib/anomalyImpact';
import type {
  SensorState,
  SensorStatusPayload,
  SensorMetaPayload,
  StatsPayload,
  DetectionsUpdatedPayload,
  VehicleEventPayload,
  CommandResponsePayload,
  HeartbeatPayload,
  AnomalyDetectedPayload,
  StreamStatusPayload,
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

    const vehicles = useVehicleStore.getState();
    p.objects.forEach(obj => {
      // Update legacy tracks store (map, table display)
      tracks.upsertTrack({
        sensorId:     p.sensorId,
        trackId:      obj.trackId,
        vehicleClass: obj.vehicleClass,
        confidence:   obj.confidence,
        bbox:         obj.bbox,
        firstSeenAt:  p.tsUtc,
        lastSeenAt:   p.tsUtc,
        trackState:   obj.trackState,
      });

      // Update rich vehicle store (speed history, anomalies, status)
      if (obj.speedKmh !== undefined) {
        vehicles.upsertVehicle(p.sensorId, obj.trackId, {
          classLabel: obj.vehicleClass,
          speedKmh:   obj.speedKmh,
          bbox:       obj.bbox,
        });
      }
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

  // ── New events ──────────────────────────────────────────────────────────────

  _connection.on('anomalydetected', (p: AnomalyDetectedPayload) => {
    // Add to global feed
    useAnomalyStore.getState().addAnomaly(p);

    // Also push into vehicle's own anomaly list
    useVehicleStore.getState().addAnomaly(p.sensorId, p.trackId, {
      type:        p.anomalyType,
      severity:    p.severity,
      speedKmh:    p.speedKmh,
      delta:       p.delta,
      detectedAt:  Date.now(),
    });

    // Hafif ekran içi bildirim — sadece yüksek/kritik önemde (gürültüyü azalt).
    if (p.severity === 'critical' || p.severity === 'high') {
      const tr = ANOMALY_TR[p.anomalyType];
      const title = tr?.title ?? p.anomalyType;
      useToastStore.getState().pushToast({
        title: `${title} — #${p.trackId}`,
        message: `${p.sensorId} • ${p.vehicleClass} • ${p.speedKmh.toFixed(0)} km/h`,
        severity: p.severity,
      });
    }
  });

  _connection.on('streamstatuschanged', (p: StreamStatusPayload) => {
    useStreamStore.getState().setStatus(p.ready, p.path, p.since);
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
