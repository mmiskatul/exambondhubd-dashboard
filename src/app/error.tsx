'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Root error boundary — catches any uncaught render/runtime error in any
 * page or component that doesn't define its own error.tsx, so one bad
 * response (an unexpected null, a missing field) shows a recoverable card
 * instead of a blank crashed page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard render error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl border border-slate-200 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-rose-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
          <p className="text-xs text-slate-500 mt-1.5">
            This page hit an unexpected error. It's been logged — try again, or head back to the
            dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2 justify-center pt-2">
          <button
            onClick={reset}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try Again
          </button>
          <a
            href="/"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" /> Dashboard Home
          </a>
        </div>
      </div>
    </div>
  );
}
