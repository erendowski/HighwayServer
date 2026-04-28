export interface TelemetryMessage {
  vehicleId: string;
  trackId: number;
  class: string;
  speed: number;
  timestamp: string;
  snapshotUrl?: string | null;
}
