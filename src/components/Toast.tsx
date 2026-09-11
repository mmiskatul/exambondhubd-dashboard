'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** Toasts a server response, picking the kind from `success`. */
  fromResponse: (
    res: { success: boolean; data?: any; message?: string },
    fallback?: { success?: string; error?: string },
  ) => boolean;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = { success: 3500, info: 4000, error: 6000 };

let nextId = 1;

const FLASH_KEY = 'exambondhubd_flash';

/**
 * Queues a message to be toasted after a full page navigation. Signing in
 * replaces the document, so the success toast has to survive that.
 */
export function flashToast(kind: ToastKind, message: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(FLASH_KEY, JSON.stringify({ kind, message }));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    if (!message) return;

    const id = nextId++;
    // Cap the stack so a burst of failures cannot bury the screen.
    setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS[kind]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
      fromResponse: (res, fallback) => {
        if (res?.success) {
          // Services put their own wording in data.message; fall back sensibly.
          push('success', res.data?.message || fallback?.success || res.message || 'Saved.');
          return true;
        }
        push('error', res?.message || fallback?.error || 'Something went wrong.');
        return false;
      },
      dismiss,
    }),
    [push, dismiss],
  );

  // Show anything queued before the last navigation, once.
  useEffect(() => {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);

    try {
      const { kind, message } = JSON.parse(raw);
      if (message) push(kind, message);
    } catch {
      // A malformed flash is not worth surfacing.
    }
  }, [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 w-[min(92vw,380px)]"
      role="region"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const STYLES: Record<ToastKind, { wrap: string; icon: string; Icon: typeof CheckCircle2 }> = {
  success: {
    wrap: 'bg-white border-emerald-200 shadow-emerald-900/5',
    icon: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Icon: CheckCircle2,
  },
  error: {
    wrap: 'bg-white border-rose-200 shadow-rose-900/5',
    icon: 'bg-rose-50 text-rose-600 border-rose-200',
    Icon: AlertCircle,
  },
  info: {
    wrap: 'bg-white border-slate-200 shadow-slate-900/5',
    icon: 'bg-slate-100 text-slate-600 border-slate-200',
    Icon: Info,
  },
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [shown, setShown] = useState(false);
  const { wrap, icon, Icon } = STYLES[toast.kind];

  // Mount first, then animate, so the transition actually runs.
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-3.5 shadow-lg transition-all duration-200 ${wrap} ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${icon}`}>
        <Icon className="w-4 h-4" />
      </div>

      <p className="text-xs font-semibold text-slate-800 leading-relaxed flex-1 pt-1.5 break-words">
        {toast.message}
      </p>

      <button
        onClick={() => onDismiss(toast.id)}
        className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
