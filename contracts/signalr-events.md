# SignalR Events

Single source of truth for all SignalR push events on `/telemetryHub`.

All events flow Server→Client only. Clients have no callable hub methods in the current design.

| Event Name | Direction | Payload Shape | When Emitted |
|---|---|---|---|
| `SensorStatusChanged` | Server→Client | `{sensorId, status, tsUtc}` | `highway/sensors/<id>/status` received |
| `SensorMetaUpdated` | Server→Client | `{sensorId, device, capabilities, tsUtc}` | `highway/sensors/<id>/meta` received |
| `SensorStatsUpdated` | Server→Client | full stats payload | `highway/telemetry/<id>/stats` received (~1 Hz) |
| `DetectionsUpdated` | Server→Client | `{sensorId, frameId, fps, objects[]}` | `highway/telemetry/<id>/detections` received; max 10 Hz |
| `VehicleEntered` | Server→Client | `{sensorId, trackId, class, tsUtc}` | `highway/events/<id>/vehicle/enter` received |
| `VehicleExited` | Server→Client | `{sensorId, trackId, class, tsUtc}` | `highway/events/<id>/vehicle/exit` received |
| `HeartbeatReceived` | Server→Client | `{sensorId, alive, tsUtc}` | `highway/sensors/<id>/heartbeat` received |
| `CommandResponseReceived` | Server→Client | full command response payload | `highway/commands/<id>/response` received |
