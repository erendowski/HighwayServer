"""
Highway Mock Publisher
Simulates a Jetson sensor over MQTT using schema_version 1 payloads.
All 8 outbound topic families are published; command requests are handled.
"""

import json
import time
import threading
import random
import datetime
import uuid

import paho.mqtt.client as mqtt

# ── Configuration ──────────────────────────────────────────────────────────────
BROKER_HOST           = "localhost"
BROKER_PORT           = 1883
SENSOR_ID             = "jetson01"
USERNAME              = None        # set to string if EMQX auth is enabled
PASSWORD              = None

DETECTION_INTERVAL_S  = 0.1        # 10 Hz
STATS_INTERVAL_S      = 1.0        # 1 Hz
HEARTBEAT_INTERVAL_S  = 5.0
ENTER_EXIT_INTERVAL_S = 3.0        # random enter/exit events

# ── Derived topic strings ──────────────────────────────────────────────────────
T_DETECTIONS = f"highway/telemetry/{SENSOR_ID}/detections"
T_STATS      = f"highway/telemetry/{SENSOR_ID}/stats"
T_STATUS     = f"highway/sensors/{SENSOR_ID}/status"
T_META       = f"highway/sensors/{SENSOR_ID}/meta"
T_HEARTBEAT  = f"highway/sensors/{SENSOR_ID}/heartbeat"
T_ENTER      = f"highway/events/{SENSOR_ID}/vehicle/enter"
T_EXIT       = f"highway/events/{SENSOR_ID}/vehicle/exit"
T_CMD_REQ    = f"highway/commands/{SENSOR_ID}/request"
T_CMD_RESP   = f"highway/commands/{SENSOR_ID}/response"

VEHICLE_CLASSES = ["car", "van", "bus", "motorcycle", "drone", "plane"]

# ── Shared state ───────────────────────────────────────────────────────────────
_tracks_lock = threading.Lock()

# track_id → {track_id, class, confidence, bbox, track_state}
active_tracks: dict = {
    101: {"track_id": 101, "class": "car",        "confidence": 0.92, "bbox": [100, 200, 300, 180], "track_state": "active"},
    102: {"track_id": 102, "class": "van",        "confidence": 0.85, "bbox": [400, 150, 260, 160], "track_state": "active"},
    103: {"track_id": 103, "class": "motorcycle", "confidence": 0.78, "bbox": [600, 300, 180, 120], "track_state": "active"},
}

frame_id        = 1000
next_track_id   = 200
published_count = 0
events_count    = 0
stopped         = threading.Event()


# ── Helpers ────────────────────────────────────────────────────────────────────
def ts_utc() -> str:
    """ISO 8601 UTC timestamp with +00:00 offset (matches DateTimeOffset on the server)."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def jitter_bbox(bbox: list) -> list:
    return [max(0, x + random.randint(-5, 5)) for x in bbox]


# ── MQTT callbacks ─────────────────────────────────────────────────────────────
def on_connect(client, userdata, connect_flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"[MQTT] Connection failed: {reason_code}")
        return

    print(f"[MQTT] Connected to {BROKER_HOST}:{BROKER_PORT}")

    # 1. Publish online status (retained)
    status_payload = json.dumps({
        "schema_version": 1,
        "sensor_id": SENSOR_ID,
        "status": "online",
        "ts_utc": ts_utc(),
    })
    client.publish(T_STATUS, status_payload, qos=1, retain=True)

    # 2. Publish sensor meta (retained, published once after connect)
    meta_payload = json.dumps({
        "schema_version": 1,
        "sensor_id": SENSOR_ID,
        "ts_utc": ts_utc(),
        "device": {
            "hostname": "mock-jetson",
            "platform": "Linux-mock-aarch64",
        },
        "capabilities": {
            "detections": True,
            "events_enter_exit": True,
            "commands": True,
            "stats": True,
            "heartbeat": True,
        },
    })
    client.publish(T_META, meta_payload, qos=1, retain=True)
    print(f"[MQTT] Published status=online and meta")

    # 3. Subscribe to command requests
    client.subscribe(T_CMD_REQ, qos=1)
    print(f"[MQTT] Subscribed to {T_CMD_REQ}")


def on_message(client, userdata, message):
    if message.topic != T_CMD_REQ:
        return
    try:
        req            = json.loads(message.payload.decode())
        correlation_id = req.get("correlation_id", str(uuid.uuid4()))
        command        = req.get("command", "unknown")
        print(f"[CMD ] Received cmd={command} correlation_id={correlation_id}")

        def _respond():
            time.sleep(0.5)
            resp = json.dumps({
                "schema_version": 1,
                "sensor_id":       SENSOR_ID,
                "ts_utc":          ts_utc(),
                "correlation_id":  correlation_id,
                "command":         command,
                "ok":              True,
                "message":         "accepted",
            })
            client.publish(T_CMD_RESP, resp, qos=1)
            print(f"[CMD ] Responded: cmd={command} ok=True correlation_id={correlation_id}")

        threading.Thread(target=_respond, daemon=True).start()
    except Exception as exc:
        print(f"[CMD ] Error handling command: {exc}")


# ── Publisher loops ────────────────────────────────────────────────────────────
def detection_loop(client):
    global frame_id, published_count

    while not stopped.is_set():
        frame_id += 1

        with _tracks_lock:
            objects = []
            for t in active_tracks.values():
                t["bbox"] = jitter_bbox(t["bbox"])
                objects.append({
                    "track_id":    t["track_id"],
                    "class":       t["class"],
                    "confidence":  round(t["confidence"], 3),
                    "bbox":        t["bbox"],
                    "track_state": t["track_state"],
                })

        fps = round(random.uniform(28.0, 30.5), 2)
        payload = json.dumps({
            "schema_version": 1,
            "sensor_id":  SENSOR_ID,
            "ts_utc":     ts_utc(),
            "frame_id":   frame_id,
            "fps":        fps,
            "objects":    objects,
        })
        client.publish(T_DETECTIONS, payload, qos=0)
        published_count += 1

        if frame_id % 50 == 0:
            print(f"[DET ] frame={frame_id} fps={fps} tracks={len(objects)}")

        time.sleep(DETECTION_INTERVAL_S)


def stats_loop(client):
    while not stopped.is_set():
        with _tracks_lock:
            n_tracks = len(active_tracks)

        fps = round(random.uniform(28.5, 30.5), 2)
        payload = json.dumps({
            "schema_version":     1,
            "sensor_id":          SENSOR_ID,
            "ts_utc":             ts_utc(),
            "fps":                fps,
            "queue_size":         0,
            "mqtt_connected":     True,
            "published":          published_count,
            "dropped":            0,
            "events_published":   events_count,
            "tracks_confirmed":   n_tracks,
            "tracks_lost":        0,
            "tracks_tentative":   0,
            "tracks_active_total": n_tracks,
        })
        client.publish(T_STATS, payload, qos=0)
        print(f"[STAT] fps={fps} tracks={n_tracks} published={published_count} events={events_count}")

        time.sleep(STATS_INTERVAL_S)


def heartbeat_loop(client):
    while not stopped.is_set():
        payload = json.dumps({
            "schema_version": 1,
            "sensor_id": SENSOR_ID,
            "ts_utc":    ts_utc(),
            "alive":     True,
        })
        client.publish(T_HEARTBEAT, payload, qos=0)
        print(f"[HB  ] alive=True")

        time.sleep(HEARTBEAT_INTERVAL_S)


def enter_exit_loop(client):
    global next_track_id, events_count

    while not stopped.is_set():
        time.sleep(ENTER_EXIT_INTERVAL_S)

        with _tracks_lock:
            can_enter = len(active_tracks) < 8
            can_exit  = len(active_tracks) > 1

        if not can_enter and not can_exit:
            continue

        if can_enter and can_exit:
            action = random.choice(["enter", "exit"])
        elif can_enter:
            action = "enter"
        else:
            action = "exit"

        if action == "enter":
            tid  = next_track_id
            next_track_id += 1
            cls  = random.choice(VEHICLE_CLASSES)
            bbox = [
                random.randint(0,   600),
                random.randint(0,   400),
                random.randint(100, 300),
                random.randint(80,  200),
            ]
            with _tracks_lock:
                active_tracks[tid] = {
                    "track_id":    tid,
                    "class":       cls,
                    "confidence":  0.0,
                    "bbox":        bbox,
                    "track_state": "active",
                }

            payload = json.dumps({
                "schema_version": 1,
                "sensor_id":  SENSOR_ID,
                "ts_utc":     ts_utc(),
                "frame_id":   frame_id,
                "object": {
                    "track_id":    tid,
                    "class":       cls,
                    "confidence":  0.0,
                    "bbox":        bbox,
                    "track_state": "enter",
                },
            })
            client.publish(T_ENTER, payload, qos=1)
            events_count += 1
            print(f"[EVT ] ENTER  track_id={tid} class={cls}")

        else:  # exit
            with _tracks_lock:
                if not active_tracks:
                    continue
                tid   = random.choice(list(active_tracks.keys()))
                track = active_tracks.pop(tid)

            payload = json.dumps({
                "schema_version": 1,
                "sensor_id":  SENSOR_ID,
                "ts_utc":     ts_utc(),
                "frame_id":   frame_id,
                "object": {
                    "track_id":    tid,
                    "class":       track["class"],
                    "confidence":  track["confidence"],
                    "bbox":        track["bbox"],
                    "track_state": "exit",
                },
            })
            client.publish(T_EXIT, payload, qos=1)
            events_count += 1
            print(f"[EVT ] EXIT   track_id={tid} class={track['class']}")


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("=" * 62)
    print("  Highway Mock Publisher")
    print(f"  Broker  : {BROKER_HOST}:{BROKER_PORT}")
    print(f"  Sensor  : {SENSOR_ID}")
    print("  Publishes:")
    for t in [T_DETECTIONS, T_STATS, T_STATUS, T_META, T_HEARTBEAT, T_ENTER, T_EXIT, T_CMD_RESP]:
        print(f"    → {t}")
    print(f"  Watches : {T_CMD_REQ}")
    print("=" * 62)

    # LWT — broker will publish this if we disconnect uncleanly
    lwt_payload = json.dumps({
        "schema_version": 1,
        "sensor_id": SENSOR_ID,
        "status":    "offline",
        "ts_utc":    ts_utc(),
    })

    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"mock-publisher-{SENSOR_ID}",
    )

    if USERNAME:
        client.username_pw_set(USERNAME, PASSWORD)

    client.will_set(T_STATUS, lwt_payload, qos=1, retain=True)
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_start()

    # Give on_connect a moment to fire before spawning loops
    time.sleep(1.0)

    threads = [detection_loop, stats_loop, heartbeat_loop, enter_exit_loop]
    for target in threads:
        threading.Thread(target=target, args=(client,), daemon=True).start()

    print("[MAIN] All loops started. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[MAIN] Shutting down...")
        stopped.set()
        time.sleep(0.3)  # let loops notice the stop event

        offline_payload = json.dumps({
            "schema_version": 1,
            "sensor_id": SENSOR_ID,
            "status":    "offline",
            "ts_utc":    ts_utc(),
        })
        client.publish(T_STATUS, offline_payload, qos=1, retain=True)
        time.sleep(0.5)  # let the publish flush

        client.loop_stop()
        client.disconnect()
        print("[MAIN] Disconnected. Bye!")


if __name__ == "__main__":
    main()
