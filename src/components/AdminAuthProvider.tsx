'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { useAppSelector } from '@/store';

/**
 * Client-side shell. Auth comes from the Redux store rather than a second
 * localStorage read, so there is a single source of truth: StoreProvider
 * restores the session, this component only reacts to it.
 *
 * Route protection itself is enforced by `src/middleware.ts` on the server;
 * this just avoids rendering the admin chrome before we know who is logged in.
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated && !isLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && isLoginPage) {
      router.replace('/');
    }
  }, [isInitialized, isAuthenticated, isLoginPage, router]);

  if (isLoginPage) {
    return <main className="min-h-screen bg-slate-900">{children}</main>;
  }

  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xs font-semibold flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          Verifying administrator credentials...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 min-h-0 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
