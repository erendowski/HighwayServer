import { useEffect, useRef, useState, useCallback } from 'react';
import { Radio, Video, VideoOff } from 'lucide-react';

const BASE_URL  = import.meta.env.VITE_API_URL ?? '';
const MJPEG_URL = `${BASE_URL}/mjpeg/stream`;
const RETRY_MS  = 4_000;

type ConnState = 'connecting' | 'playing' | 'error';

const SOI = new Uint8Array([0xff, 0xd8]);
const EOI = new Uint8Array([0xff, 0xd9]);

function indexOf(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export default function VideoPlayer() {
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<ConnState>('connecting');
  const abortRef          = useRef<AbortController | null>(null);
  const retryRef          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawingRef        = useRef(false);

  const clearRetry = () => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
  };

  const connect = useCallback(async () => {
    clearRetry();
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState('connecting');
    drawingRef.current = false;

    try {
      const res = await fetch(MJPEG_URL, { signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      let buf = new Uint8Array(0);
      let firstFrame = true;

      // pending frame — yeni kare gelince eskisini drop et
      let pendingBitmap: ImageBitmap | null = null;

      const drawLoop = () => {
        if (ctrl.signal.aborted) return;
        if (pendingBitmap) {
          const canvas = canvasRef.current;
          if (canvas) {
            if (canvas.width !== pendingBitmap.width)  canvas.width  = pendingBitmap.width;
            if (canvas.height !== pendingBitmap.height) canvas.height = pendingBitmap.height;
            canvas.getContext('2d')?.drawImage(pendingBitmap, 0, 0);
          }
          pendingBitmap.close();
          pendingBitmap = null;
        }
        requestAnimationFrame(drawLoop);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // append chunk
        const merged = new Uint8Array(buf.length + value.length);
        merged.set(buf);
        merged.set(value, buf.length);
        buf = merged;

        // extract all complete JPEG frames, keep only the latest
        let soiIdx: number;
        while ((soiIdx = indexOf(buf, SOI)) !== -1) {
          const eoiIdx = indexOf(buf, EOI, soiIdx + 2);
          if (eoiIdx === -1) break;

          const jpeg = buf.slice(soiIdx, eoiIdx + 2);
          buf = buf.slice(eoiIdx + 2);

          // drop pending frame if decode is behind
          if (pendingBitmap) { pendingBitmap.close(); pendingBitmap = null; }

          try {
            const blob = new Blob([jpeg], { type: 'image/jpeg' });
            pendingBitmap = await createImageBitmap(blob);
          } catch {
            // corrupt frame — skip
          }

          if (firstFrame) {
            setState('playing');
            firstFrame = false;
            requestAnimationFrame(drawLoop);
          }
        }

        // prevent unbounded buffer growth
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
    <div className="h-full flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Video size={20} className="text-sky-500" />
          <h2 className="text-sm font-semibold text-gray-900">Kamera — Canlı</h2>
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
          state === 'playing'
            ? 'bg-red-600 text-white animate-pulse'
            : state === 'connecting'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          <Radio size={10} />
          {state === 'playing' ? 'LIVE' : state === 'connecting' ? 'Connecting' : 'Offline'}
        </span>
      </div>

      <div className="relative bg-black flex-1 min-h-0">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />

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
