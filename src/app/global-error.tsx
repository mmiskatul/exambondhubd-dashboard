'use client';

import { useEffect } from 'react';

/**
 * Catches an error in the root layout itself (rare — the layout only mounts
 * providers, doesn't fetch data) — error.tsx can't cover this case because
 * it renders inside the layout, so this replaces <html>/<body> entirely
 * when it fires.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root layout error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'white',
              maxWidth: 420,
              width: '100%',
              padding: 32,
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              The console failed to load
            </h1>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Something broke before the page could even render. Try again, or reload the tab.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 16,
                padding: '10px 20px',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
