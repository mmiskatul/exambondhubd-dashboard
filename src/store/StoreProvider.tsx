'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './index';
import { authRestored } from './slices/authSlice';
import { fetchCurrentAdmin } from '@/lib/api';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // The session lives in an HttpOnly cookie this code cannot read directly,
  // so asking the server who it belongs to is the only way to restore it.
  useEffect(() => {
    fetchCurrentAdmin().then((user) => {
      store.dispatch(authRestored(user));
    });
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
