"""
Highway Mock Publisher
Simulates a Jetson sensor over MQTT using schema_version 1 payloads.
All 8 outbound topic families are published; command requests are handled.

Speed simulation:
  - Each track has speed_kmh that changes realistically over time.
  - Track 104 is a permanently stopped vehicle (acceptance criteria for STOPPED anomaly).
  - Set MAX_TRACKS=50 and INITIAL_TRACK_COUNT=10 for the 50-vehicle AC test.
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
ENTER_EXIT_INTERVAL_S = 3.0

MAX_TRACKS            = 50         # increase to 50 for acceptance criteria test
INITIAL_TRACK_COUNT   = 10         # how many tracks to start with

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

# ── Speed parameters per class (min, max, typical km/h) ───────────────────────
CLASS_SPEED: dict[str, tuple[float, float]] = {
    "car":        (60.0,  160.0),
    "van":        (50.0,  120.0),
    "bus":        (40.0,   90.0),
    "motorcycle": (70.0,  170.0),
    "drone":      (20.0,   80.0),
    "plane":      (80.0,  200.0),
}

# ── Shared state ───────────────────────────────────────────────────────────────
_tracks_lock = threading.Lock()

def _init_speed(cls: str) -> float:
    lo, hi = CLASS_SPEED.get(cls, (60.0, 120.0))
    return round(random.uniform(lo * 0.7, hi * 0.8), 1)

def _make_track(tid: int, cls: str, speed: float | None = None) -> dict:
    return {
        "track_id":    tid,
        "class":       cls,
        "confidence":  round(random.uniform(0.75, 0.98), 3),
        "bbox":        [
            random.randint(0,   700),
            random.randint(0,   400),
            random.randint(80,  300),
            random.randint(60,  200),
        ],
        "track_state": "active",
        "speed_kmh":   speed if speed is not None else _init_speed(cls),
    }

# Seed tracks: 101–110, with 104 being the permanently stopped vehicle
active_tracks: dict = {}

_base_tracks = [
    (101, "car",        90.0),
    (102, "van",        70.0),
    (103, "motorcycle", 115.0),
    (104, "car",          2.0),   # STOPPED scenario — always <= 5 km/h
    (105, "bus",         65.0),
    (106, "van",         80.0),
    (107, "car",        140.0),   # will trigger FAST
    (108, "motorcycle",  55.0),
    (109, "car",         95.0),
    (110, "drone",       35.0),
]

for _tid, _cls, _spd in _base_tracks[:INITIAL_TRACK_COUNT]:
    active_tracks[_tid] = _make_track(_tid, _cls, _spd)

frame_id        = 1000
next_track_id   = 200
published_count = 0
events_count    = 0
stopped         = threading.Event()


# ── Helpers ────────────────────────────────────────────────────────────────────
def ts_utc() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def jitter_bbox(bbox: list) -> list:
    return [max(0, x + random.randint(-5, 5)) for x in bbox]


def update_speed(track: dict) -> float:
    tid = track["track_id"]
    cls = track["class"]
    spd = track["speed_kmh"]

    # Track 104 is permanently stopped
    if tid == 104:
        return round(max(0.0, min(4.9, spd + random.uniform(-0.5, 0.5))), 1)

    lo, hi = CLASS_SPEED.get(cls, (60.0, 120.0))
    # Normal drift ±3 km/h per frame; occasional sudden events
    delta = random.uniform(-3.0, 3.0)
    if random.random() < 0.005:   # 0.5% chance sudden brake
        delta = random.uniform(-30.0, -20.0)
    elif random.random() < 0.005: # 0.5% chance sudden accel
        delta = random.uniform(20.0, 35.0)

    new_spd = max(0.0, spd + delta)
    # Soft-clamp towards class range
    if new_spd > hi:
        new_spd = hi + (new_spd - hi) * 0.5
    return round(new_spd, 1)


# ── MQTT callbacks ─────────────────────────────────────────────────────────────
def on_connect(client, userdata, connect_flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"[MQTT] Connection failed: {reason_code}")
        return

    print(f"[MQTT] Connected to {BROKER_HOST}:{BROKER_PORT}")

    client.publish(T_STATUS, json.dumps({
        "schema_version": 1,
        "sensor_id": SENSOR_ID,
        "status": "online",
        "ts_utc": ts_utc(),
    }), qos=1, retain=True)

    client.publish(T_META, json.dumps({
        "schema_version": 1,
        "sensor_id": SENSOR_ID,
        "ts_utc": ts_utc(),
        "device": {"hostname": "mock-jetson", "platform": "Linux-mock-aarch64"},
        "capabilities": {
            "detections": True,
            "events_enter_exit": True,
            "commands": True,
            "stats": True,
            "heartbeat": True,
        },
    }), qos=1, retain=True)
    print(f"[MQTT] Published status=online and meta")

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
            client.publish(T_CMD_RESP, json.dumps({
                "schema_version": 1,
                "sensor_id":      SENSOR_ID,
                "ts_utc":         ts_utc(),
                "correlation_id": correlation_id,
                "command":        command,
                "ok":             True,
                "message":        "accepted",
            }), qos=1)
            print(f"[CMD ] Responded: cmd={command} ok=True")

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
                t["bbox"]      = jitter_bbox(t["bbox"])
                t["speed_kmh"] = update_speed(t)
                objects.append({
                    "track_id":    t["track_id"],
                    "class":       t["class"],
                    "confidence":  round(t["confidence"], 3),
                    "bbox":        t["bbox"],
                    "track_state": t["track_state"],
                    "speed_kmh":   t["speed_kmh"],
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

        if frame_id % 100 == 0:
            print(f"[DET ] frame={frame_id} fps={fps} tracks={len(objects)}")

        time.sleep(DETECTION_INTERVAL_S)


def stats_loop(client):
    while not stopped.is_set():
        with _tracks_lock:
            n_tracks = len(active_tracks)

        fps = round(random.uniform(28.5, 30.5), 2)
        client.publish(T_STATS, json.dumps({
            "schema_version":      1,
            "sensor_id":           SENSOR_ID,
            "ts_utc":              ts_utc(),
            "fps":                 fps,
            "queue_size":          0,
            "mqtt_connected":      True,
            "published":           published_count,
            "dropped":             0,
            "events_published":    events_count,
            "tracks_confirmed":    n_tracks,
            "tracks_lost":         0,
            "tracks_tentative":    0,
            "tracks_active_total": n_tracks,
        }), qos=0)
        print(f"[STAT] fps={fps} tracks={n_tracks} published={published_count} events={events_count}")

        time.sleep(STATS_INTERVAL_S)


def heartbeat_loop(client):
    while not stopped.is_set():
        client.publish(T_HEARTBEAT, json.dumps({
            "schema_version": 1,
            "sensor_id": SENSOR_ID,
            "ts_utc":    ts_utc(),
            "alive":     True,
        }), qos=0)
        print(f"[HB  ] alive=True")
        time.sleep(HEARTBEAT_INTERVAL_S)


def enter_exit_loop(client):
    global next_track_id, events_count

    while not stopped.is_set():
        time.sleep(ENTER_EXIT_INTERVAL_S)

        with _tracks_lock:
            can_enter = len(active_tracks) < MAX_TRACKS
            # Never exit track 104 (stopped vehicle scenario)
            exitables = [k for k in active_tracks if k != 104]
            can_exit  = len(exitables) > 1

        if not can_enter and not can_exit:
            continue

        if can_enter and can_exit:
            action = random.choice(["enter", "exit"])
        elif can_enter:
            action = "enter"
        else:
            action = "exit"

        if action == "enter":
            tid = next_track_id
            next_track_id += 1
            cls = random.choice(VEHICLE_CLASSES)
            track = _make_track(tid, cls)
            with _tracks_lock:
                active_tracks[tid] = track

            client.publish(T_ENTER, json.dumps({
                "schema_version": 1,
                "sensor_id":  SENSOR_ID,
                "ts_utc":     ts_utc(),
                "frame_id":   frame_id,
                "object": {
                    "track_id":    tid,
                    "class":       cls,
                    "confidence":  track["confidence"],
                    "bbox":        track["bbox"],
                    "track_state": "enter",
                },
            }), qos=1)
            events_count += 1
            print(f"[EVT ] ENTER  track_id={tid} class={cls} speed={track['speed_kmh']}")

        else:
            with _tracks_lock:
                if not exitables:
                    continue
                tid   = random.choice(exitables)
                track = active_tracks.pop(tid)

            client.publish(T_EXIT, json.dumps({
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
            }), qos=1)
            events_count += 1
            print(f"[EVT ] EXIT   track_id={tid} class={track['class']}")


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("=" * 62)
    print("  Highway Mock Publisher")
    print(f"  Broker  : {BROKER_HOST}:{BROKER_PORT}")
    print(f"  Sensor  : {SENSOR_ID}")
    print(f"  Initial tracks: {INITIAL_TRACK_COUNT}  Max: {MAX_TRACKS}")
    print(f"  Track 104 = STOPPED scenario (speed always < 5 km/h)")
    print("=" * 62)

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
        time.sleep(0.3)

        client.publish(T_STATUS, json.dumps({
            "schema_version": 1,
            "sensor_id": SENSOR_ID,
            "status":    "offline",
            "ts_utc":    ts_utc(),
        }), qos=1, retain=True)
        time.sleep(0.5)

        client.loop_stop()
        client.disconnect()
        print("[MAIN] Disconnected. Bye!")


if __name__ == "__main__":
    main()
