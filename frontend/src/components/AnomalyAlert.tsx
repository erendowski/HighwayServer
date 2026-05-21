import { useSensorList } from '../store/selectors';

export default function AnomalyAlert() {
  const sensors = useSensorList();
  const offline = sensors.filter(s => s.status === 'offline');

  if (offline.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {offline.map(sensor => (
        <div
          key={sensor.sensorId}
          className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
        >
          ⚠ Sensor <span className="font-mono font-semibold">{sensor.sensorId}</span> is
          offline — last seen {new Date(sensor.lastSeenAt).toLocaleString()}
        </div>
      ))}
    </div>
  );
}
