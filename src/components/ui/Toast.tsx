import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
}

type Show = (message: string, opts?: { tone?: Tone; action?: ToastItem['action']; duration?: number }) => void;

const ToastCtx = createContext<Show>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback<Show>(
    (message, opts = {}) => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-2), { id, message, tone: opts.tone ?? 'success', action: opts.action }]);
      window.setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 5000 : 2600));
    },
    [dismiss],
  );

  // A <dialog> opened with showModal() sits in the top layer above every z-index, hiding toasts
  // (e.g. an import error while a sheet is open). A manual popover is a top-layer element too;
  // re-showing it on each new toast puts it above whichever dialog is currently open.
  const layerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = layerRef.current as (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void }) | null;
    if (!el?.showPopover) return;
    try {
      if (items.length) {
        if (el.matches(':popover-open')) el.hidePopover?.();
        el.showPopover();
      } else if (el.matches(':popover-open')) el.hidePopover?.();
    } catch {
      /* unsupported: the z-index fallback still shows toasts outside dialogs */
    }
  }, [items]);

  const value = useMemo(() => show, [show]);
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="sr-only" role="status" aria-live="polite">
        {items[items.length - 1]?.message}
      </div>
      <div ref={layerRef} className="toasts" {...({ popover: 'manual' } as object)}>
        {items.map((t) => {
          const I = Icon[t.tone];
          return (
            <div key={t.id} className={`toast toast--${t.tone}`}>
              <I size={20} aria-hidden="true" />
              <span className="toast__msg">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
