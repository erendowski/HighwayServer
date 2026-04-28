import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type { TelemetryMessage } from '../types/TelemetryMessage';

const MAX_MESSAGES = 100;
const HUB_URL = 'http://localhost:5000/telemetryHub';

export function useSignalR() {
  const [messages, setMessages] = useState<TelemetryMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('ReceiveTelemetry', (msg: TelemetryMessage) => {
      setMessages(prev => {
        const next = [msg, ...prev];
        return next.length > MAX_MESSAGES ? next.slice(0, MAX_MESSAGES) : next;
      });
    });

    connection.onclose(() => setConnected(false));
    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => setConnected(true));

    connection.start()
      .then(() => setConnected(true))
      .catch(err => console.error('SignalR connection error:', err));

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, []);

  return { messages, connected };
}
