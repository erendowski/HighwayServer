# Baseline Report — 2026-05-08

---

## 1. Repository Structure

```
HighwayServer/                     ← solution root / .NET project root
├── HighwayServer.csproj
├── HighwayServer.sln
├── Program.cs
├── Dockerfile
├── docker-compose.yml
├── appsettings.json
├── appsettings.Development.json
├── .env.example
├── Onemli                         ← Turkish ops-notes file (no extension)
│
├── Controllers/
│   └── HistoryController.cs
├── Hubs/
│   └── TelemetryHub.cs
├── Models/
│   └── TelemetryMessage.cs
├── Services/
│   ├── InfluxService.cs
│   ├── MockTelemetryService.cs
│   └── MqttBackgroundService.cs
│
├── client/                        ← OLDER frontend (no routing, not used by Dockerfile)
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── components/  (DetectionTable, SpeedChart, StatCard, VideoPlayer)
│       ├── hooks/       (useSignalR.ts, useMockSignalR.ts)
│       └── types/       (TelemetryMessage.ts)
│
├── frontend/                      ← CURRENT frontend (used by Dockerfile)
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── contexts/    (TelemetryContext.tsx)
│       ├── components/  (AnomalyAlert, DetectionTable, MapView, SpeedChart,
│       │                  StatCard*, VehicleDetailModal, VehicleTypeChart, VideoPlayer)
│       ├── hooks/       (useSignalR.ts, useMockSignalR.ts*)
│       ├── pages/       (Dashboard.tsx, LiveView.tsx)
│       └── types/       (TelemetryMessage.ts)
│
├── nginx/
│   └── default.conf
└── wwwroot/                       ← built frontend output (committed)
    └── assets/
```

`*` = file exists but is not imported/used anywhere in the `frontend/` source.

**Package manifests found:**
- `HighwayServer.csproj`
- `client/package.json`
- `frontend/package.json`
- `docker-compose.yml`
- `Dockerfile`

No `requirements.txt` and no Python source files exist (see §4).

---

## 2. Backend

### 2.1 Projects & dependencies

**Project:** `HighwayServer.csproj`
- Target framework: `net8.0`
- Nullable: enabled, ImplicitUsings: enabled
- Root namespace: `HighwayServer`

| NuGet Package | Version |
|---|---|
| `MQTTnet` | `4.3.7.1207` |
| `InfluxDB.Client` | `4.18.0` |

No Swashbuckle / OpenAPI, no Serilog, no auth middleware packages.

### 2.2 Program.cs / DI registrations

```csharp
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddSingleton<InfluxService>();
builder.Services.AddHostedService<MqttBackgroundService>();
builder.Services.AddHostedService<MockTelemetryService>();
```

Middleware pipeline: `UseCors → UseDefaultFiles → UseStaticFiles → MapControllers → MapHub<TelemetryHub>("/telemetryHub") → MapFallbackToFile("index.html")`

No authentication/authorization middleware. No Swagger. No health-check endpoints.

### 2.3 Existing MQTT code

**File:** `Services/MqttBackgroundService.cs`

- Connects to broker via TCP (host/port from config, no TLS, no credentials)
- Subscribes to exactly **one topic filter:** `highway/detections/#`
- On every received message: deserializes to `TelemetryMessage`, then fans out to both `InfluxService.WriteAsync` and `_hub.Clients.All.SendAsync("telemetry", msg)` in parallel
- Reconnect loop: `while(!cancelled)` → `ConnectAsync → SubscribeAsync → Delay(Infinite)` → on exception wait 5 s and retry
- No LWT configuration, no retained-message handling, no QoS specification (defaults to QoS 0)
- MQTTnet 4.x API (`MqttFactory`, `IMqttClient`, `MqttClientOptionsBuilder`)

No MQTT publish capability exists anywhere in the backend.

### 2.4 SignalR Hubs

**File:** `Hubs/TelemetryHub.cs`

```csharp
public class TelemetryHub : Hub { }
```

The class is empty — there are no client-callable hub methods. The server only pushes:

| Event name | Direction | Payload type |
|---|---|---|
| `telemetry` | server → all clients | `TelemetryMessage` |

### 2.5 Controllers & routes

| Controller | Route | Method | Query params | Returns |
|---|---|---|---|---|
| `HistoryController` | `GET /api/history` | GET | `from` (DateTime?), `to` (DateTime?), `vehicleId` (string?) | `List<TelemetryMessage>` |

Default time window when `from`/`to` are omitted: last 1 hour.

### 2.6 DTOs / Models

**File:** `Models/TelemetryMessage.cs`

```csharp
public class TelemetryMessage
{
    public string   VehicleId  { get; set; } = string.Empty;
    public string   Class      { get; set; } = string.Empty;
    public double   Speed      { get; set; }
    public DateTime Timestamp  { get; set; } = DateTime.UtcNow;
    public int      TrackId    { get; set; }
}
```

No `sensor_id`, no `schema_version`, no `ts_utc` with timezone offset, no detection count, no lane, no bounding box, no confidence score.

### 2.7 InfluxDB integration

**File:** `Services/InfluxService.cs`

Write path (called for every MQTT message):
- Measurement: `detections`
- Tags: `vehicleId`, `class`, `trackId`
- Field: `speed` (double)
- Timestamp precision: milliseconds

Query path (called by `HistoryController`):
- Flux query against the same measurement
- Pivots on `_field` to reconstruct `TelemetryMessage`
- Returns `List<TelemetryMessage>`

No stats, no sensor status, no event data is written to InfluxDB.

### 2.8 appsettings keys

**`appsettings.json`** (structure; secrets redacted where noted):

```json
{
  "Logging": { "LogLevel": { "Default": "...", "Microsoft.AspNetCore": "..." } },
  "AllowedHosts": "*",
  "Mqtt": {
    "Host": "emqx",
    "Port": 1883,
    "ClientId": "HighwayServer"
  },
  "InfluxDb": {
    "Url": "http://influxdb:8086",
    "Token": "[REDACTED]",
    "Org": "highway",
    "Bucket": "highway"
  },
  "Cors": {
    "Origins": ["http://localhost", "http://localhost:3000",
                "http://localhost:5173", "http://localhost:8080"]
  }
}
```

**`appsettings.Development.json`** overrides:
- `Logging.LogLevel.Default` → `Debug`
- `Logging.LogLevel.HighwayServer` → `Debug`
- `Mqtt.Host` → `localhost`
- `InfluxDb.Url` → `http://localhost:8086`

No `Username`/`Password` keys for MQTT; no TLS configuration.

---

## 3. Frontend

### 3.1 Dependencies

**Active frontend: `frontend/package.json`**

| Package | Version |
|---|---|
| `react` | `^19.2.5` |
| `react-dom` | `^19.2.5` |
| `react-router-dom` | `^7.14.2` |
| `@microsoft/signalr` | `^10.0.0` |
| `react-leaflet` | `^5.0.0` |
| `leaflet` | `^1.9.4` |
| `recharts` | `^3.8.1` |
| `tailwindcss` | `^4.2.4` |
| `@tailwindcss/vite` | `^4.2.4` |
| `@types/leaflet` | `^1.9.21` |
| `@types/react-router-dom` | `^5.3.3` |

Dev dependencies include `typescript ~6.0.2`, `vite ^8.0.10`, `@vitejs/plugin-react ^6.0.1`, `eslint ^10.2.1`.

Vite build output dir: `../wwwroot` (relative to `frontend/`).

**Older abandoned frontend: `client/package.json`** — same stack but missing `react-router-dom`, `react-leaflet`, `@types/react-router-dom`.

### 3.2 State management — what is currently used

**React Context** only. No zustand, redux, jotai, or recoil present.

Implementation:
- `contexts/TelemetryContext.tsx` — `createContext<TelemetryContextValue>` with `messages: TelemetryMessage[]` and `connected: boolean`
- `TelemetryProvider` wraps the app in `main.tsx` → `App.tsx`
- `useTelemetry()` hook consumed by `Dashboard` and `LiveView`
- State is populated by `useSignalR()` inside the provider

### 3.3 Routes & pages

Router: `BrowserRouter` (react-router-dom v7) in `main.tsx`.

| Path | Component | Notes |
|---|---|---|
| `/` | redirect → `/dashboard` | |
| `/dashboard` | `pages/Dashboard.tsx` | Stats, charts, detections table, modal |
| `/live` | `pages/LiveView.tsx` | Video player, map, anomaly alerts |
| `*` | redirect → `/dashboard` | |

### 3.4 Telemetry-related components

| Component | Purpose |
|---|---|
| `DetectionTable` | Scrollable table of last N detections; row click opens `VehicleDetailModal` |
| `SpeedChart` | Recharts `LineChart` — last 30 messages plotted as speed over time |
| `VehicleTypeChart` | Recharts `BarChart` — count per class (car/truck/bus/motorcycle/semi-truck) |
| `AnomalyAlert` | Derives speed violations (>120 km/h) and density spikes (>5 in 5 s) |
| `VehicleDetailModal` | Modal overlay showing vehicleId, trackId, class, speed, timestamp, optional `snapshotUrl` |
| `MapView` | Leaflet map centred at `[39.9334, 32.8597]` (Ankara); last 10 unique vehicles plotted as blue `CircleMarker`s with random offsets from camera pin |
| `VideoPlayer` | WebRTC WHEP client connecting to `${VITE_API_URL}/whep/stream/whep` |
| `StatCard` | Per-class count grid — **exists in `frontend/src/components/` but is not imported anywhere in `frontend/`** (dead code) |

### 3.5 SignalR client setup

**File:** `frontend/src/hooks/useSignalR.ts`

```typescript
const HUB_URL = `${import.meta.env.VITE_API_URL ?? ''}/telemetryHub`;
// connects with withAutomaticReconnect(), LogLevel.Warning
connection.on('telemetry', (msg: TelemetryMessage) => { ... });
```

- Hub URL: relative `/telemetryHub` in production (VITE_API_URL is empty), `http://localhost/telemetryHub` in dev
- Listens to exactly one server-push event: `telemetry`
- Buffers max 100 messages (newest-first)
- No client-to-server hub method calls

**Also present (unused):** `frontend/src/hooks/useMockSignalR.ts` — exports a function also named `useSignalR` that generates fake data via `setInterval`. It is never imported in the frontend source tree.

### 3.6 REST client & endpoints

No dedicated REST client wrapper (no axios). The only direct `fetch` call in the entire frontend is in `VideoPlayer.tsx`:

```typescript
const response = await fetch(WHEP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: offer.sdp,
});
```

**`GET /api/history` is never called from the frontend.** The `HistoryController` is unreachable from the UI.

### 3.7 Existing types

**File:** `frontend/src/types/TelemetryMessage.ts`

```typescript
export interface TelemetryMessage {
  vehicleId: string;
  trackId: number;
  class: string;
  speed: number;
  timestamp: string;        // ISO 8601 string
  snapshotUrl?: string | null;
}
```

No other TypeScript type files exist in `frontend/src/types/`. No sensor, stats, event, or command types.

---

## 4. Mock Publisher

**No Python mock publisher exists in the repository.**

The `Onemli` notes file references `python mock_publisher.py` but there is no `mock_publisher.py` (or any `.py` source file) anywhere in the project tree.

What does exist is a C# `MockTelemetryService` (`Services/MockTelemetryService.cs`), registered as a `HostedService` — it runs inside the ASP.NET server process in **all environments** (no environment guard). Every second it generates a fake `TelemetryMessage` and calls `_hub.Clients.All.SendAsync("telemetry", ...)` directly, bypassing MQTT entirely.

Mock payload shape:
```
VehicleId: "V{100–999}"
TrackId:   1–4
Class:     "car" | "truck" | "bus" | "motorcycle"
Speed:     20–140 km/h (1 decimal)
Timestamp: DateTime.UtcNow (.NET DateTime, no timezone offset)
```

This does **not** match the Jetson target schema (no `schema_version`, no `sensor_id`, no `ts_utc` with offset, no topic routing). The mock also does not exercise the MQTT pipeline at all.

---

## 5. Infra (Docker, Nginx, mediamtx)

### docker-compose.yml

| Service | Image | Ports (host:container) | Restart | Healthcheck |
|---|---|---|---|---|
| `highwayserver` | built from `Dockerfile` | (none exposed) | `unless-stopped` | None |
| `nginx` | `nginx:1.27-alpine` | `80:80` | `unless-stopped` | None |
| `emqx` | `emqx/emqx:5.8.2` | `1883:1883`, `18083:18083` | `unless-stopped` | None |
| `influxdb` | `influxdb:2.7-alpine` | `8086:8086` | `unless-stopped` | None |
| `mediamtx` | `bluenviron/mediamtx:latest` | `8554:8554`, `8889:8889`, `8189:8189/udp` | `unless-stopped` | None |

**No healthchecks are defined on any service.**

`depends_on` relationships:
- `highwayserver` → `emqx`, `influxdb` (no `condition: service_healthy`)
- `nginx` → `highwayserver`, `mediamtx` (no `condition: service_healthy`)

Network: single bridge network `highway-net`.

Volumes: `emqx-data`, `emqx-log`, `influxdb-data`, `influxdb-config`. No named volume for `highwayserver`.

**Environment variables for `highwayserver`** (keys shown, secrets from `.env`):
```
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
Mqtt__Host=emqx
Mqtt__Port=1883
Mqtt__ClientId=HighwayServer
InfluxDb__Url=http://influxdb:8086
InfluxDb__Token=${INFLUXDB_TOKEN}
InfluxDb__Org=${INFLUXDB_ORG}
InfluxDb__Bucket=${INFLUXDB_BUCKET}
```

**Environment variables for `emqx`:** Dashboard username/password from `${EMQX_DASHBOARD_*}`. No listener authentication configured.

**Environment variables for `influxdb`:** Full `DOCKER_INFLUXDB_INIT_*` setup block (user, password, token, org, bucket).

### Dockerfile

Multi-stage:
1. `node:22-alpine` — builds `frontend/` → `/wwwroot`  
2. `mcr.microsoft.com/dotnet/sdk:8.0` — restores and builds .NET project  
3. `mcr.microsoft.com/dotnet/aspnet:8.0` — final runtime image, copies wwwroot from stage 1 into `/app`

**Note:** The build stage copies `--from=frontend /wwwroot ./wwwroot` using a path that appears to assume the wwwroot lands at the SDK build root. The frontend Vite config outputs to `../wwwroot` relative to `frontend/` — under normal conditions this lands in the repo root, and the Dockerfile COPY step picks it up from there.

### Nginx (`nginx/default.conf`)

| Location | Upstream | WebSocket upgrade |
|---|---|---|
| `/telemetryHub` | `http://highwayserver:8080/telemetryHub` | Yes (3600 s timeout) |
| `/api/` | `http://highwayserver:8080/api/` | No |
| `/whep/` | `http://mediamtx:8889/whep/` | Yes (3600 s timeout) |
| `/` (catch-all) | `http://highwayserver:8080/` | No |

No SSL termination. No rate limiting. No basic auth.

### mediamtx

No mediamtx config file exists in the repository. The container runs with the default `bluenviron/mediamtx:latest` configuration. According to the `Onemli` notes, MediaMTX is configured on the Raspberry Pi host (outside this repo) with a `cam1` path that pulls RTSP from the Jetson at `rtsp://100.74.245.10:8554/stream`.

---

## 6. Gap Analysis

### Current MQTT subscription vs. target Jetson schema

The backend currently subscribes to one topic filter only: **`highway/detections/#`**. This topic does not exist in the target Jetson schema. Every target topic is new.

| Topic | Currently handled? | Notes |
|---|---|---|
| `highway/telemetry/<sensor_id>/detections` | **No** | New topic hierarchy. Backend subscribes to `highway/detections/#`, not `highway/telemetry/#`. |
| `highway/telemetry/<sensor_id>/stats` | **No** | No stats handling anywhere in backend or frontend. |
| `highway/sensors/<sensor_id>/status` | **No** | No sensor status model, handler, or SignalR event. |
| `highway/sensors/<sensor_id>/meta` | **No** | No sensor metadata model or handler. |
| `highway/sensors/<sensor_id>/heartbeat` | **No** | No heartbeat handling. |
| `highway/events/<sensor_id>/vehicle/enter` | **No** | No vehicle event model or handler. |
| `highway/events/<sensor_id>/vehicle/exit` | **No** | No vehicle event model or handler. |
| `highway/commands/<sensor_id>/response` | **No** | No command response handler. |
| `highway/commands/<sensor_id>/request` | **No** | Backend has no MQTT publish capability at all. |

**Summary:** 0 of 9 target topics are currently handled. The entire MQTT integration needs to be replaced, not extended.

Additionally, every target payload requires `schema_version: 1`, `sensor_id`, and `ts_utc` (ISO 8601 with UTC offset). None of these fields exist in the current `TelemetryMessage` model.

### Current mock publisher vs. target schema

The C# `MockTelemetryService` bypasses MQTT entirely and does not emit any of the target topics. It produces the legacy flat shape (`VehicleId`, `Class`, `Speed`, `Timestamp`, `TrackId`) with no `sensor_id` or `schema_version`.

---

## 7. Risks & Open Questions

1. **`client/` is a stale duplicate.** The `client/` directory is a predecessor of `frontend/` and is never referenced by the Dockerfile or any other tooling. It still has its own `node_modules`. Its `useSignalR.ts` hardcodes `http://localhost:5000/telemetryHub` and listens for event `ReceiveTelemetry` — both incorrect for the current server (port 8080, event `telemetry`). It will silently fail to connect. The directory should be removed before the refactor.

2. **`mock_publisher.py` is missing.** The `Onemli` ops-notes reference `python mock_publisher.py` for generating test data, but no such file exists in the repository. There is no Python publisher to test the new Jetson schema against. One will need to be created.

3. **`MockTelemetryService` runs in production with no guard.** It is registered unconditionally and pumps fake detections into SignalR at 1 Hz even when the real MQTT pipeline is active. This will mix real and synthetic data in the frontend. Needs an environment check or removal.

4. **`VideoPlayer` stream path mismatch.** The component connects to `${VITE_API_URL}/whep/stream/whep` (stream name `stream`), but the `Onemli` notes confirm MediaMTX is configured with path `cam1`. In production the URL resolves to `/whep/stream/whep`, which will return 404 from MediaMTX. The correct path is likely `/whep/cam1/whep`.

5. **No healthchecks → race condition on cold start.** `highwayserver` is declared `depends_on: [emqx, influxdb]` without `condition: service_healthy`. On first boot EMQX and InfluxDB may not be ready when the server starts, causing MQTT connection failures and InfluxDB write errors. The 5-second MQTT retry loop partially mitigates this but InfluxDB has no retry.

6. **`GET /api/history` is unreachable from the UI.** The history endpoint exists in the backend and writes to InfluxDB, but no frontend component or hook ever calls it. Historical data is inaccessible to users.

7. **Dead code in `frontend/`.** `frontend/src/components/StatCard.tsx` and `frontend/src/hooks/useMockSignalR.ts` are never imported. They should be removed to avoid confusion during the refactor.

8. **No mediamtx config in repository.** The MediaMTX service uses entirely default settings from the Docker image. The actual RTSP-pull configuration lives on the Raspberry Pi host outside this repo. This makes the camera pipeline non-reproducible from the repo alone.

9. **Complete model replacement required.** The `TelemetryMessage` class covers only one flat detection record. The refactor will need multiple new models: detection payloads, stats, sensor status, sensor meta, heartbeat, vehicle enter/exit events, and command request/response. Existing InfluxDB writes and SignalR events will all need updating.

10. **No MQTT publish path.** The backend has no mechanism to publish MQTT messages. The `highway/commands/<sensor_id>/request` topic (used to send commands to the Jetson) requires publish capability to be added to `MqttBackgroundService` or a new service.
