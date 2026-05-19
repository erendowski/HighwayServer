import { useEffect, useRef, useState } from 'react';
import { Radio, Video, VideoOff } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const HLS_URL  = `${BASE_URL}/hls/highway/index.m3u8`;

type ConnState = 'connecting' | 'playing' | 'error';

export default function VideoPlayer() {
  const videoRef              = useRef<HTMLVideoElement>(null);
  const hlsRef                = useRef<unknown>(null);
  const [state, setState]     = useState<ConnState>('connecting');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;

    const loadHls = async () => {
      const Hls = (await import('hls.js')).default;

      if (destroyed) return;

      if (Hls.isSupported()) {
        const hls = new Hls({ liveSyncDurationCount: 1, liveMaxLatencyDurationCount: 3 });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!destroyed) { setState('playing'); video.play().catch(() => {}); }
        });

        hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal: boolean }) => {
          if (data.fatal && !destroyed) setState('error');
        });

        hls.loadSource(HLS_URL);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = HLS_URL;
        video.addEventListener('loadedmetadata', () => {
          if (!destroyed) { setState('playing'); video.play().catch(() => {}); }
        });
        video.addEventListener('error', () => {
          if (!destroyed) setState('error');
        });
      } else {
        setState('error');
      }
    };

    loadHls();

    return () => {
      destroyed = true;
      if (hlsRef.current) {
        (hlsRef.current as { destroy: () => void }).destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <Video size={20} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-white">Kamera — Canlı</h2>
        </div>
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

      {/* Video area */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />

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
