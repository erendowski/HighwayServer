# REST Endpoints

Single source of truth for all HTTP API endpoints.

| Method | Path | Query Params | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/sensors` | — | `SensorState[]` | Live from in-memory store |
| GET | `/api/sensors/{id}` | — | `SensorState` | 404 if unknown |
| GET | `/api/sensors/{id}/tracks/active` | — | `TrackState[]` | Live active tracks |
| GET | `/api/sensors/{id}/history/detections` | `from`, `to`, `class` | `DetectionRecord[]` | From InfluxDB |
| GET | `/api/sensors/{id}/history/stats` | `from`, `to` | `StatsRecord[]` | From InfluxDB |
| GET | `/api/sensors/{id}/events` | `from`, `to` | `VehicleEventRecord[]` | From InfluxDB |
| POST | `/api/sensors/{id}/commands` | — | `CommandAck` | Publishes to Jetson; waits for response up to 10 s |
| GET | `/health` | — | 200 OK | Health probe for Docker |
