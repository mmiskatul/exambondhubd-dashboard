'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Search, Globe, ArrowRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { setNotificationsCount } from '@/store/slices/uiSlice';
import { fetchApi, logoutAdmin } from '@/lib/api';

export function Navbar() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const unreadCount = useAppSelector((state) => state.ui.unreadNotificationsCount);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // The badge reflects the real broadcast count from the API. It used to come
  // from a hardcoded 3 in the ui slice, so the dot was always on.
  useEffect(() => {
    let cancelled = false;

    fetchApi('/notifications/admin/history?limit=50').then((res) => {
      if (cancelled) return;
      const rows = Array.isArray(res.data) ? res.data : res.data?.items || [];
      dispatch(setNotificationsCount(res.success ? rows.length : 0));
    });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // Real broadcast history, straight from the database.
  useEffect(() => {
    if (!isNotifOpen) return;

    let cancelled = false;
    setLoadingNotifs(true);

    fetchApi('/notifications/admin/history?limit=5').then((res) => {
      if (cancelled) return;
      const rows = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setNotifications(res.success ? rows : []);
      setLoadingNotifs(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isNotifOpen]);

  async function handleSignOut() {
    dispatch(logout());
    await logoutAdmin();
    window.location.href = '/login';
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="flex items-center gap-3 w-96 bg-slate-100/80 rounded-lg px-3 py-2 border border-slate-200/80 focus-within:border-emerald-500 focus-within:bg-white transition-all">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search exams, subjects, questions (Bangla/English)..."
          className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
          <Globe className="w-3.5 h-3.5" />
          <span>EN / বাংলা</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 space-y-3 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 uppercase">Push Notifications</span>
                <Link
                  href="/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-0.5"
                >
                  Send New <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {loadingNotifs ? (
                  <p className="text-[11px] text-slate-400 py-4 text-center">Loading…</p>
                ) : notifications.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-4 text-center">
                    No notifications have been sent yet.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{n.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-semibold text-slate-800 block leading-tight">
                {user?.name || 'Admin User'}
              </span>
              <span className="text-[11px] text-slate-500">{user?.role || 'SUPER_ADMIN'}</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
