"""Geçici test aracı: highway/anomalies/jetson01/detections topic'ine
birkaç gerçekçi anomali publish eder (Jetson'u taklit eder)."""
import json, time, datetime, uuid, random
import paho.mqtt.client as mqtt

SENSOR_ID = "jetson01"
TOPIC = f"highway/anomalies/{SENSOR_ID}/detections"

def ts(): return datetime.datetime.now(datetime.timezone.utc).isoformat()

SAMPLES = [
    ("STOPPED_VEHICLE", "critical", 104, "car",        2.1,  None),
    ("OVERSPEED",       "high",     107, "car",        158.4, None),
    ("SUDDEN_BRAKE",    "high",     103, "motorcycle", 64.0, -28.5),
    ("UNDERSPEED",      "medium",   110, "drone",      18.0,  None),
    ("OVERSPEED",       "high",     201, "motorcycle", 171.2, None),
    ("STOPPED_VEHICLE", "critical", 104, "car",        1.4,  None),
]

c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="anomaly-injector")
c.connect("localhost", 1883, 60)
c.loop_start()
time.sleep(1.0)

frame = 5000
for typ, sev, tid, cls, spd, decel in SAMPLES:
    frame += 7
    obj = {
        "type": typ, "severity": sev, "track_id": tid, "class_name": cls,
        "speed_kmh": spd, "duration_sec": round(random.uniform(2, 6), 1),
        "bbox": [random.randint(0,700), random.randint(0,400), 120, 90],
        "message": f"{typ} detected", "anomaly_id": str(uuid.uuid4()),
    }
    if decel is not None:
        obj["decel_kmh"] = decel
    payload = {
        "schema_version": 1, "sensor_id": SENSOR_ID, "ts_utc": ts(),
        "frame_id": frame, "anomalies": [obj],
    }
    c.publish(TOPIC, json.dumps(payload), qos=1)
    print(f"published {typ} track={tid} speed={spd}")
    time.sleep(0.4)

time.sleep(1.0)
c.loop_stop()
c.disconnect()
print("done")
