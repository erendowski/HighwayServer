# MQTT Topics

Single source of truth for all MQTT topics used in the Highway telemetry pipeline.

| Topic | QoS | Retained | Direction | Publisher | Notes |
|---|---|---|---|---|---|
| `highway/telemetry/<sensor_id>/detections` | 0 | No | Jetson→Backend | Jetson | Active objects only; rate-limited |
| `highway/telemetry/<sensor_id>/stats` | 0 | No | Jetson→Backend | Jetson | ~1 Hz |
| `highway/sensors/<sensor_id>/status` | 1 | Yes | Jetson→Backend | Jetson / LWT | online or offline; also set as LWT |
| `highway/sensors/<sensor_id>/meta` | 1 | Yes | Jetson→Backend | Jetson | Published once after connect |
| `highway/sensors/<sensor_id>/heartbeat` | 0 | No | Jetson→Backend | Jetson | Every 5 s |
| `highway/events/<sensor_id>/vehicle/enter` | 1 | No | Jetson→Backend | Jetson | |
| `highway/events/<sensor_id>/vehicle/exit` | 1 | No | Jetson→Backend | Jetson | |
| `highway/commands/<sensor_id>/response` | 1 | No | Jetson→Backend | Jetson | Reply to a command |
| `highway/commands/<sensor_id>/request` | 1 | No | Backend→Jetson | Backend | Backend publishes; Jetson subscribes |
