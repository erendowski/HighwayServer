import { useSensorsStore } from '../store/sensorsStore'
import { useTracksStore } from '../store/tracksStore'
import { useVehicleStore } from '../store/vehicleStore'
import { useAnomalyStore } from '../store/anomalyStore'
import { useConnectionStore } from '../store/connectionStore'

const SENSOR_ID = 'jetson01'
const NOW = new Date().toISOString()

const CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'van']
const ANOMALY_TYPES = ['STOPPED_VEHICLE', 'UNDERSPEED', 'OVERSPEED', 'SUDDEN_BRAKE', 'WRONG_WAY'] as const
const SEVERITIES    = ['low', 'medium', 'high', 'critical'] as const

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max))
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length)]
}

export function seedMockData() {
  // 1. Connection
  useConnectionStore.getState().setConnected(true)

  // 2. Sensors
  useSensorsStore.getState().setSensors([
    {
      sensorId: SENSOR_ID,
      status: 'online',
      lastStatusAt: NOW,
      lastHeartbeatAt: NOW,
      lastSeenAt: NOW,
      meta: {
        sensorId: SENSOR_ID,
        device: { hostname: 'jetson-orin-01', platform: 'linux' },
        capabilities: {
          detections: true, eventsEnterExit: true,
          commands: true, stats: true, heartbeat: true,
        },
        tsUtc: NOW,
      },
      lastStats: {
        sensorId: SENSOR_ID,
        fps: parseFloat(rand(24, 30).toFixed(1)),
        queueSize: randInt(0, 3),
        mqttConnected: true,
        published: randInt(1000, 5000),
        dropped: randInt(0, 10),
        eventsPublished: randInt(50, 200),
        tracksConfirmed: randInt(10, 30),
        tracksLost: randInt(0, 5),
        tracksTentative: randInt(0, 3),
        tracksActiveTotal: randInt(5, 12),
        tsUtc: NOW,
      },
    },
    {
      sensorId: 'jetson02',
      status: 'offline',
      lastStatusAt: NOW,
      lastHeartbeatAt: NOW,
      lastSeenAt: NOW,
      meta: null,
      lastStats: null,
    },
  ])

  // 3. Tracks
  const tracks = Array.from({ length: 8 }, (_, i) => ({
    sensorId: SENSOR_ID,
    trackId: i + 1,
    vehicleClass: pick(CLASSES),
    confidence: parseFloat(rand(0.7, 0.99).toFixed(2)),
    bbox: [
      randInt(0, 800), randInt(0, 400),
      randInt(60, 180), randInt(40, 100),
    ] as [number, number, number, number],
    firstSeenAt: new Date(Date.now() - randInt(5000, 60000)).toISOString(),
    lastSeenAt: NOW,
    trackState: 'active' as const,
  }))
  useTracksStore.getState().setTracks(SENSOR_ID, tracks)

  // 4. Vehicles (with speed history)
  const now = Date.now()
  tracks.forEach(t => {
    const baseSpeed = rand(40, 130)
    const history = Array.from({ length: 20 }, (_, i) => ({
      t: now - (20 - i) * 1500,
      v: parseFloat((baseSpeed + rand(-10, 10)).toFixed(1)),
    }))

    useVehicleStore.setState(state => {
      const sensor = state.vehicles[SENSOR_ID] ?? {}
      return {
        vehicles: {
          ...state.vehicles,
          [SENSOR_ID]: {
            ...sensor,
            [t.trackId]: {
              trackId: t.trackId,
              sensorId: SENSOR_ID,
              classLabel: t.vehicleClass,
              speedKmh: parseFloat(baseSpeed.toFixed(1)),
              lastSpeedKmh: parseFloat((baseSpeed - rand(-5, 5)).toFixed(1)),
              bbox: t.bbox,
              firstSeenAt: now - randInt(5000, 60000),
              lastSeenAt: now,
              status: 'active' as const,
              speedHistory: history,
              anomalies: [],
            },
          },
        },
      }
    })
  })

  // 5. Anomalies
  const anomalyPayloads = [
    { trackId: 1, vehicleClass: 'truck',      anomalyType: 'STOPPED_VEHICLE' as const, severity: 'high'     as const, speedKmh: 0,   delta: undefined },
    { trackId: 3, vehicleClass: 'car',         anomalyType: 'OVERSPEED'       as const, severity: 'medium'   as const, speedKmh: 158, delta: undefined },
    { trackId: 5, vehicleClass: 'bus',         anomalyType: 'SUDDEN_BRAKE'    as const, severity: 'critical' as const, speedKmh: 28,  delta: -62 },
    { trackId: 7, vehicleClass: 'motorcycle',  anomalyType: 'WRONG_WAY'       as const, severity: 'critical' as const, speedKmh: 88,  delta: undefined },
    { trackId: 2, vehicleClass: 'van',         anomalyType: 'UNDERSPEED'      as const, severity: 'low'      as const, speedKmh: 18,  delta: undefined },
  ]

  anomalyPayloads.forEach(p => {
    useAnomalyStore.getState().addAnomaly({
      sensorId: SENSOR_ID,
      confidence: parseFloat(rand(0.75, 0.99).toFixed(2)),
      tsUtc: new Date(Date.now() - randInt(0, 120000)).toISOString(),
      ...p,
    })
  })

  console.info('[mock] Stores seeded with mock data for sensor:', SENSOR_ID)
}

export function clearMockData() {
  useSensorsStore.setState({ sensors: {} })
  useTracksStore.setState({ tracks: {} })
  useVehicleStore.setState({ vehicles: {} })
  useAnomalyStore.setState({ feed: [] })
  useConnectionStore.getState().setConnected(false)
  console.info('[mock] Stores cleared')
}
