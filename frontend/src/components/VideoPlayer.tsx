import { useState, useCallback, useEffect, useRef } from 'react';
import { Radio, Video, VideoOff } from 'lucide-react';

const BASE_URL  = import.meta.env.VITE_API_URL ?? '';
const MJPEG_URL = `${BASE_URL}/mjpeg/highway/mjpeg`;

type ConnState = 'connecting' | 'playing' | 'error';

export default function VideoPlayer() {
  const [state, setState]     = useState<ConnState>('connecting');
  const imgRef                = useRef<HTMLImageElement>(null);
  const retryRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetry = () => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
  };

  const startStream = useCallback(() => {
    clearRetry();
    setState('connecting');
    if (imgRef.current) {
      // Cache-bust her yeniden denemede yeni bağlantı açar
      imgRef.current.src = `${MJPEG_URL}?t=${Date.now()}`;
    }
  }, []);

  useEffect(() => {
    startStream();
    return clearRetry;
  }, [startStream]);

  const handleLoad = () => setState('playing');

  const handleError = () => {
    setState('error');
    retryRef.current = setTimeout(startStream, 5_000);
  };

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
        <img
          ref={imgRef}
          onLoad={handleLoad}
          onError={handleError}
          alt="MJPEG stream"
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
