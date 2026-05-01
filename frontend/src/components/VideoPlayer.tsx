import { useEffect, useRef, useState } from 'react';

const WHEP_URL = import.meta.env.VITE_API_URL + '/whep/stream/whep';

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'playing' | 'error'>('connecting');

  useEffect(() => {
    let pc: RTCPeerConnection;

    async function startWhep() {
      try {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        pcRef.current = pc;

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (ev) => {
          if (videoRef.current && ev.streams[0]) {
            videoRef.current.srcObject = ev.streams[0];
            setStatus('playing');
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const response = await fetch(WHEP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        });

        if (!response.ok) throw new Error(`WHEP ${response.status}: ${response.statusText}`);

        const answerSdp = await response.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bağlantı hatası');
        setStatus('error');
      }
    }

    startWhep();

    return () => {
      pcRef.current?.close();
    };
  }, []);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300">Kamera 1 — Canlı</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            status === 'playing'
              ? 'bg-green-900 text-green-300'
              : status === 'error'
              ? 'bg-red-900 text-red-300'
              : 'bg-yellow-900 text-yellow-300'
          }`}
        >
          {status === 'playing' ? 'Yayında' : status === 'error' ? 'Hata' : 'Bağlanıyor'}
        </span>
      </div>
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
        {status !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
            {status === 'error' ? (
              <>
                <span className="text-4xl">⚠️</span>
                <span className="text-sm">{error}</span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 border-2 border-slate-500 border-t-sky-400 rounded-full animate-spin" />
                <span className="text-sm">Stream bekleniyor...</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
