import axios from 'axios';
import type {
  SensorState, TrackState, CommandRequest, CommandAck,
  DetectionRecord, StatsRecord, VehicleEventRecord, AnomalyRecord,
} from '../types/contracts';

const BASE = import.meta.env.VITE_API_URL ?? '';

const http = axios.create({ baseURL: BASE });

export const api = {
  // Sensors
  getSensors: () =>
    http.get<SensorState[]>('/api/sensors').then(r => r.data),

  getSensor: (id: string) =>
    http.get<SensorState>(`/api/sensors/${id}`).then(r => r.data),

  getActiveTracks: (id: string) =>
    http.get<TrackState[]>(`/api/sensors/${id}/tracks/active`).then(r => r.data),

  // History
  getDetectionHistory: (id: string, from?: string, to?: string, vehicleClass?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (vehicleClass) params['class'] = vehicleClass;
    return http
      .get<DetectionRecord[]>(`/api/sensors/${id}/history/detections`, { params })
      .then(r => r.data);
  },

  getStatsHistory: (id: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return http
      .get<StatsRecord[]>(`/api/sensors/${id}/history/stats`, { params })
      .then(r => r.data);
  },

  getEvents: (id: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return http
      .get<VehicleEventRecord[]>(`/api/sensors/${id}/events`, { params })
      .then(r => r.data);
  },

  // Anomaly history — for the heatmap (historical anomaly density).
  getAnomalies: (id: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return http
      .get<AnomalyRecord[]>(`/api/sensors/${id}/history/anomalies`, { params })
      .then(r => r.data);
  },

  // Anomaly export — downloads a CSV (Excel) report for the last 24h.
  exportAnomalies: async (id: string) => {
    const res = await http.get(`/api/sensors/${id}/history/anomalies/export`, {
      responseType: 'blob',
    });
    const disposition = res.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename="?([^"]+)"?/);
    const fileName = match?.[1] ?? `anomaly-report_${id}.csv`;

    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Commands
  sendCommand: (sensorId: string, body: CommandRequest) =>
    http.post<CommandAck>(`/api/sensors/${sensorId}/commands`, body).then(r => r.data),
};
