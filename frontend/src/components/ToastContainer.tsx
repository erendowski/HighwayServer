import { AlertTriangle, OctagonAlert, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import type { AnomalySeverity } from '../types/contracts';

const SEV_STYLE: Record<AnomalySeverity, string> = {
  critical: 'border-red-200 bg-red-50 text-red-800',
  high:     'border-orange-200 bg-orange-50 text-orange-800',
  medium:   'border-amber-200 bg-amber-50 text-amber-800',
  low:      'border-gray-200 bg-white text-gray-700',
};

export default function ToastContainer() {
  const toasts  = useToastStore(s => s.toasts);
  const dismiss = useToastStore(s => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 right-3 z-9998 flex flex-col gap-2 w-72 max-w-[90vw] pointer-events-none">
      {toasts.map(t => {
        const Icon = t.severity === 'critical' ? OctagonAlert : AlertTriangle;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border shadow-lg backdrop-blur p-3 flex items-start gap-2 ${SEV_STYLE[t.severity]}`}
          >
            <Icon size={16} className={`shrink-0 mt-0.5 ${t.severity === 'critical' ? 'animate-pulse' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
              <p className="text-xs opacity-80 mt-0.5 leading-snug">{t.message}</p>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Kapat"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
