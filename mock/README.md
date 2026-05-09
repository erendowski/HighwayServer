# Mock Publisher

Simulates a Jetson sensor over MQTT. Publishes all 8 topic families
using schema_version 1 payloads identical to the real Jetson pipeline.

## Setup

```bash
cd mock
pip install -r requirements.txt
```

## Run (broker on localhost)

```bash
python mock_publisher.py
```

## Run against RPi5 (replace IP)

```bash
# Edit BROKER_HOST at the top of mock_publisher.py, then:
python mock_publisher.py
```

## Topics published

See `contracts/mqtt-topics.md` for the full topic list and payload schemas.
