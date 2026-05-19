import { useEffect, useRef, useState, useCallback } from 'react';
import { Radio, Video, VideoOff } from 'lucide-react';

const BASE_URL  = import.meta.env.VITE_API_URL ?? '';
const MJPEG_URL = `${BASE_URL}/mjpeg/stream`;
const RETRY_MS  = 4_000;

type ConnState = 'connecting' | 'playing' | 'error';

export default function VideoPlayer() {
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<ConnState>('connecting');
  const abortRef          = useRef<AbortController | null>(null);
  const retryRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetry = () => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
  };

  const connect = useCallback(async () => {
    clearRetry();
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState('connecting');

    try {
      const res = await fetch(MJPEG_URL, { signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      let buf = new Uint8Array(0);
      let firstFrame = true;

      const indexOf = (haystack: Uint8Array, needle: Uint8Array, from = 0): number => {
        outer: for (let i = from; i <= haystack.length - needle.length; i++) {
          for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) continue outer;
          }
          return i;
        }
        return -1;
      };

      const SOI = new Uint8Array([0xff, 0xd8]);
      const EOI = new Uint8Array([0xff, 0xd9]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const merged = new Uint8Array(buf.length + value.length);
        merged.set(buf);
        merged.set(value, buf.length);
        buf = merged;

        // extract all complete JPEG frames from buffer
        let soiIdx: number;
        while ((soiIdx = indexOf(buf, SOI)) !== -1) {
          const eoiIdx = indexOf(buf, EOI, soiIdx + 2);
          if (eoiIdx === -1) break;

          const jpeg = buf.slice(soiIdx, eoiIdx + 2);
          buf = buf.slice(eoiIdx + 2);

          const blob = new Blob([jpeg], { type: 'image/jpeg' });
          const url  = URL.createObjectURL(blob);
          const img  = new Image();

          await new Promise<void>((resolve) => {
            img.onload = () => {
              const canvas = canvasRef.current;
              if (canvas) {
                canvas.width  = img.width;
                canvas.height = img.height;
                canvas.getContext('2d')?.drawImage(img, 0, 0);
              }
              URL.revokeObjectURL(url);
              if (firstFrame) { setState('playing'); firstFrame = false; }
              resolve();
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
            img.src = url;
          });
        }

        // prevent unbounded buffer growth (keep last 512KB)
        if (buf.length > 512 * 1024) {
          const soiLast = indexOf(buf, SOI, buf.length - 256 * 1024);
          if (soiLast > 0) buf = buf.slice(soiLast);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setState('error');
      retryRef.current = setTimeout(connect, RETRY_MS);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearRetry();
      abortRef.current?.abort();
    };
  }, [connect]);

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
        <canvas
          ref={canvasRef}
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
