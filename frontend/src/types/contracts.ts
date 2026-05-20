// ─── Base ─────────────────────────────────────────────────────────────────────

export interface BasePayload {
  schemaVersion: number;
  sensorId: string;
  tsUtc: string; // ISO 8601 with UTC offset
}

// ─── MQTT-originated payloads (arrive via SignalR events) ─────────────────────

export interface DetectedObject {
  trackId: number;
  /** matches "class" JSON field — renamed to avoid JS reserved word */
  vehicleClass: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, w, h
  trackState: 'active' | 'enter' | 'exit';
  speedKmh?: number;
}

export interface DetectionsUpdatedPayload {
  sensorId: string;
  frameId: number;
  fps: number;
  objects: DetectedObject[];
  tsUtc: string;
}

export interface StatsPayload {
  sensorId: string;
  fps: number;
  queueSize: number;
  mqttConnected: boolean;
  published: number;
  dropped: number;
  eventsPublished: number;
  tracksConfirmed: number;
  tracksLost: number;
  tracksTentative: number;
  tracksActiveTotal: number;
  tsUtc: string;
}

export interface SensorStatusPayload {
  sensorId: string;
  status: 'online' | 'offline' | 'unknown';
  tsUtc: string;
}

export interface DeviceInfo {
  hostname: string;
  platform: string;
}

export interface SensorCapabilities {
  detections: boolean;
  eventsEnterExit: boolean;
  commands: boolean;
  stats: boolean;
  heartbeat: boolean;
}

export interface SensorMetaPayload {
  sensorId: string;
  device: DeviceInfo;
  capabilities: SensorCapabilities;
  tsUtc: string;
}

export interface HeartbeatPayload {
  sensorId: string;
  alive: boolean;
  tsUtc: string;
}

export interface VehicleEventPayload {
  sensorId: string;
  trackId: number;
  vehicleClass: string;
  tsUtc: string;
  /** Stamped client-side from the SignalR event name (VehicleEntered / VehicleExited). */
  eventType?: 'enter' | 'exit';
}

export interface CommandResponsePayload {
  sensorId: string;
  correlationId: string;
  command: string;
  ok: boolean;
  message: string;
  tsUtc: string;
}

// ─── In-memory state shapes (from REST + SignalR InitialState) ────────────────

export interface TrackState {
  sensorId: string;
  trackId: number;
  vehicleClass: string;
  confidence: number;
  bbox: [number, number, number, number];
  firstSeenAt: string;
  lastSeenAt: string;
  trackState?: 'active' | 'enter' | 'exit';
}

export interface SensorState {
  sensorId: string;
  status: 'online' | 'offline' | 'unknown';
  lastStatusAt: string;
  lastHeartbeatAt: string;
  lastSeenAt: string;
  meta: SensorMetaPayload | null;
  lastStats: StatsPayload | null;
}

// ─── Anomaly types ────────────────────────────────────────────────────────────

export type AnomalyType =
  | 'STOPPED_VEHICLE' | 'WRONG_WAY' | 'LANE_VIOLATION' | 'POSSIBLE_ACCIDENT'
  | 'SUDDEN_BRAKE' | 'OVERSPEED' | 'UNDERSPEED'
  | (string & {}); // allow unknown types from Jetson without crashing

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  speedKmh: number;
  delta?: number;
  detectedAt: number; // epoch ms
}

export interface AnomalyDetectedPayload {
  sensorId: string;
  trackId: number;
  vehicleClass: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  speedKmh: number;
  delta?: number;
  confidence: number;
  tsUtc: string;
}

// ─── Stream status types ──────────────────────────────────────────────────────

export interface StreamStatusPayload {
  ready: boolean;
  path: string;
  since: string;
}

// ─── Vehicle store types ──────────────────────────────────────────────────────

export interface SpeedSample { t: number; v: number; }

export type VehicleStatus = 'active' | 'stale' | 'lost';

export interface VehicleState {
  trackId: number;
  sensorId: string;
  classLabel: string;
  speedKmh: number;
  lastSpeedKmh: number;
  bbox?: [number, number, number, number];
  firstSeenAt: number;  // epoch ms
  lastSeenAt: number;   // epoch ms
  status: VehicleStatus;
  speedHistory: SpeedSample[];
  anomalies: Anomaly[];
}

// ─── REST API types ───────────────────────────────────────────────────────────

export interface CommandRequest {
  command: string;
  parameters?: Record<string, unknown>;
}

export interface CommandAck {
  correlationId: string;
  sensorId: string;
  command: string;
  status: string;
  tsUtc: string;
}

export interface DetectionRecord {
  ts: string;
  sensorId: string;
  trackId: number;
  vehicleClass: string;
  trackState: string;
  confidence: number;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  frameId: number;
}

export interface StatsRecord {
  ts: string;
  sensorId: string;
  fps: number;
  tracksActiveTotal: number;
  published: number;
  dropped: number;
  queueSize: number;
}

export interface VehicleEventRecord {
  ts: string;
  sensorId: string;
  trackId: number;
  vehicleClass: string;
  eventType: string;
}

export interface AnomalyRecord {
  ts: string;
  sensorId: string;
  trackId: number;
  vehicleClass: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  speedKmh: number;
  delta?: number;
}
