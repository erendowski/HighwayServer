import { useLatestDetections } from '../store/selectors';
import type { DetectedObject } from '../types/contracts';

interface DetectionOverlayProps {
  sensorId: string;
  videoWidth: number;
  videoHeight: number;
  nativeWidth?: number;
  nativeHeight?: number;
}

const CLASS_COLORS: Record<string, string> = {
  car:        '#22c55e',
  van:        '#3b82f6',
  bus:        '#f59e0b',
  motorcycle: '#ec4899',
  drone:      '#a855f7',
  plane:      '#06b6d4',
};

function classColor(cls: string): string {
  return CLASS_COLORS[cls] ?? '#ffffff';
}

export default function DetectionOverlay({
  sensorId,
  videoWidth,
  videoHeight,
  nativeWidth  = 1920,
  nativeHeight = 1080,
}: DetectionOverlayProps) {
  const detections = useLatestDetections(sensorId);
  const objects: DetectedObject[] = detections?.objects ?? [];

  const scaleX = videoWidth  / nativeWidth;
  const scaleY = videoHeight / nativeHeight;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: videoWidth,
        height: videoHeight,
        pointerEvents: 'none',
      }}
    >
      {objects.map(obj => {
        const x = obj.bbox[0] * scaleX;
        const y = obj.bbox[1] * scaleY;
        const w = obj.bbox[2] * scaleX;
        const h = obj.bbox[3] * scaleY;
        const color = classColor(obj.vehicleClass);
        const label = `${obj.vehicleClass} #${obj.trackId}`;
        const labelW = label.length * 6.5 + 8;

        return (
          <g key={obj.trackId}>
            {/* Bounding box */}
            <rect
              x={x} y={y} width={w} height={h}
              fill="none"
              stroke={color}
              strokeWidth="2"
              rx="3"
            />
            {/* Label background */}
            <rect
              x={x + 2}
              y={Math.max(0, y - 18)}
              width={labelW}
              height={16}
              fill={color}
              fillOpacity={0.3}
              rx="2"
            />
            {/* Label text */}
            <text
              x={x + 4}
              y={Math.max(12, y - 4)}
              fontSize={11}
              fill={color}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
