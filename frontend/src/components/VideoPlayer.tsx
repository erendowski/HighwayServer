import { useEffect, useRef, useState, useCallback } from 'react';
import { Radio, Video, VideoOff } from 'lucide-react';

const BASE_URL    = import.meta.env.VITE_API_URL ?? '';
const WHEP_URL    = `${BASE_URL}/whep/highway/whep`;
const RECONNECT_DELAY_MS = 5_000;

type ConnState = 'idle' | 'connecting' | 'playing' | 'error';

export default function VideoPlayer() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const pcRef     = useRef<RTCPeerConnection | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<ConnState>('idle');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const stopPc = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (pcRef.current)    { pcRef.current.close(); pcRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
  }, []);

  const connect = useCallback(async () => {
    stopPc();
    setState('connecting');

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.ontrack = (ev) => {
        if (videoRef.current && ev.streams[0]) {
          videoRef.current.srcObject = ev.streams[0];
          setState('playing');
        }
      };

      // Sample RTT from stats
      const statsInterval = setInterval(async () => {
        if (!pcRef.current) { clearInterval(statsInterval); return; }
        const stats = await pcRef.current.getStats();
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded' &&
              report.currentRoundTripTime !== undefined) {
            setLatencyMs(Math.round(report.currentRoundTripTime * 1000));
          }
        });
      }, 3000);

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          clearInterval(statsInterval);
          setState('error');
          timerRef.current = setTimeout(() => {
            if (pcRef.current === pc) connect();
          }, RECONNECT_DELAY_MS);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(WHEP_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body:    offer.sdp,
      });

      if (!res.ok) throw new Error(`WHEP ${res.status}`);

      const sdp = await res.text();
      await pc.setRemoteDescription({ type: 'answer', sdp });
    } catch (err) {
      console.warn('[VideoPlayer] connect error:', err);
      setState('error');
      timerRef.current = setTimeout(() => connect(), RECONNECT_DELAY_MS);
    }
  }, [stopPc]);

  // Her zaman bağlanmayı dene — WHEP 404/error verirse idle'a düş, 5s sonra tekrar dene
  useEffect(() => {
    connect();
    return stopPc;
  }, [connect, stopPc]);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <Video size={20} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-white">Kamera — Canlı</h2>
        </div>
        <div className="flex items-center gap-2">
          {latencyMs !== null && state === 'playing' && (
            <span className="text-xs text-slate-400 font-mono">{latencyMs}ms</span>
          )}
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            state === 'playing'
              ? 'bg-red-700/80 text-white animate-pulse'
              : state === 'connecting'
              ? 'bg-yellow-900 text-yellow-300'
              : 'bg-slate-800 text-slate-400'
          }`}>
            <Radio size={10} />
            {state === 'playing' ? 'LIVE' : state === 'connecting' ? 'Connecting' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Video area */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />

        {/* Overlay when not playing */}
        {state !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
            {state === 'connecting' ? (
              <>
                <div className="w-6 h-6 border-2 border-slate-500 border-t-sky-400 rounded-full animate-spin" />
                <span className="text-sm">Connecting to stream...</span>
              </>
            ) : (
              <>
                <VideoOff size={40} className="text-slate-600" />
                <span className="text-sm">Waiting for Jetson stream...</span>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Radio size={12} className="animate-pulse text-sky-500" />
                  <span>highway path</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
