import { useEffect, useState } from 'react';
import type { TelemetryMessage } from '../types/TelemetryMessage';

const MAX_MESSAGES = 100;
const INTERVAL_MS = 1000;
const CLASSES = ['car', 'truck', 'bus', 'motorcycle'];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateMock(): TelemetryMessage {
  return {
    vehicleId: `V${Math.floor(randomBetween(100, 999))}`,
    trackId: Math.floor(randomBetween(1, 5)),
    class: CLASSES[Math.floor(randomBetween(0, CLASSES.length))],
    speed: +randomBetween(20, 140).toFixed(1),
    timestamp: new Date().toISOString(),
  };
}

export function useSignalR() {
  const [messages, setMessages] = useState<TelemetryMessage[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setMessages(prev => [generateMock(), ...prev].slice(0, MAX_MESSAGES));
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return { messages, connected: true };
}
