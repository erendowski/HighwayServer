import { useEffect, useState } from 'react';
import { startConnection, stopConnection } from '../signalr/client';

export function useSignalRConnection() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    startConnection()
      .then(() => { if (!cancelled) setConnected(true); })
      .catch(err => {
        if (!cancelled) setError(String(err));
        console.error('[SignalR] Failed to connect:', err);
      });

    return () => {
      cancelled = true;
      stopConnection();
    };
  }, []);

  return { connected, error };
}
