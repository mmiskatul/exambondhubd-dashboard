'use client';

import { useCallback, useState } from 'react';
import { fetchApi } from '@/lib/api';
import type { ConfirmDetail } from '@/components/ConfirmModal';

export interface DeleteTarget {
  /** Modal heading, e.g. "Delete the 2024 DU paper?" */
  title: string;
  /** One sentence on what happens. */
  description: string;
  /** Counts and context so the admin sees exactly what is at stake. */
  details?: ConfirmDetail[];
  /** Red callout, e.g. "This also deletes 42 questions." */
  warning?: string;
  /** Require the admin to type this before the button enables. */
  confirmPhrase?: string;
  confirmText?: string;
  /** The DELETE endpoint to call. */
  endpoint: string;
  /** Sent instead of DELETE when the API expects something else. */
  method?: 'DELETE' | 'POST' | 'PATCH';
  body?: any;
  /**
   * Called only when the API confirms success. Use it to refresh the list.
   * Receives the parsed response so callers can read counts back.
   */
  onSuccess?: (res: { success: boolean; data: any; message?: string }) => void;
}

/**
 * One delete flow for the whole dashboard: confirm, call, surface the server's
 * reason on failure, and only refresh when the server actually said yes.
 *
 * The old handlers called `fetchApi(...)` and then reloaded unconditionally, so
 * a rejected delete looked identical to a successful one.
 */
export function useDeleteFlow(onMessage?: (type: 'success' | 'error', text: string) => void) {
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback((next: DeleteTarget) => {
    setError(null);
    setTarget(next);
  }, []);

  const cancel = useCallback(() => {
    if (loading) return;
    setTarget(null);
    setError(null);
  }, [loading]);

  const confirm = useCallback(async () => {
    if (!target) return;

    setLoading(true);
    setError(null);

    const res = await fetchApi(target.endpoint, {
      method: target.method || 'DELETE',
      ...(target.body ? { body: JSON.stringify(target.body) } : {}),
    });

    setLoading(false);

    if (res.success) {
      const text = res.data?.message || res.message || 'Deleted successfully.';
      setTarget(null);
      target.onSuccess?.(res);
      onMessage?.('success', text);
      return;
    }

    // Keep the modal open and show why, instead of silently doing nothing.
    const reason = res.message || 'The server rejected this delete.';
    setError(reason);
    onMessage?.('error', reason);
  }, [target, onMessage]);

  return {
    target,
    loading,
    error,
    request,
    cancel,
    confirm,
    /** Spread straight onto <ConfirmModal />. */
    modalProps: {
      isOpen: target !== null,
      title: target?.title || '',
      description: target?.description || '',
      details: target?.details,
      warning: target?.warning,
      confirmPhrase: target?.confirmPhrase,
      confirmText: target?.confirmText || 'Delete',
      isDestructive: true,
      isLoading: loading,
      error,
      onConfirm: confirm,
      onCancel: cancel,
    },
  };
}
