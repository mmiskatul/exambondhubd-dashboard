'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Send, Users } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function NotificationsBroadcastPage() {
  const [title, setTitle] = useState('');
  const toast = useToast();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  async function loadHistory() {
    setLoadingHistory(true);
    const res = await fetchApi('/notifications/admin/history?limit=20');
    setHistory(res.success && Array.isArray(res.data) ? res.data : []);
    setLoadingHistory(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);

    const res = await fetchApi('/notifications/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });

    setSending(false);
    if (res.success) {
      setTitle('');
      setBody('');
      toast.success(res.data?.message || res.message || 'Notification broadcast.');
      loadHistory();
    } else {
      toast.error(res.message || 'Could not broadcast the notification.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Push Notification Center</h1>
          <p className="text-sm text-slate-500">
            Send live push alerts, study streak reminders, and exam announcements directly to
            examinees&rsquo; mobile devices.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">
            Target: <strong className="text-slate-800">All active mobile users</strong>
          </span>
        </div>
      </div>

      {/* Compose on the left, what has already gone out on the right. */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Broadcast Push Notification</h2>
                <p className="text-xs text-slate-500">
                  Dispatched via Expo Push / Firebase Cloud Messaging
                </p>
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notification Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  placeholder="e.g. 46th BCS Full Mock Test is Live! 📢"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{title.length}/80</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Message Body
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={240}
                  placeholder="e.g. Test your preparation with our brand-new 200-question model test."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{body.length}/240</p>
              </div>

              <button
                type="submit"
                disabled={sending || !title.trim() || !body.trim()}
                className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Send className="w-4 h-4" /> {sending ? 'Dispatching…' : 'Send Broadcast'}
              </button>
            </form>
          </div>

          {/* Roughly how it lands on a phone. */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Preview on device
            </span>

            <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                P
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-300">ExamBondhuBD</span>
                  <span className="text-[10px] text-slate-500">now</span>
                </div>
                <p className="text-xs font-bold text-white mt-0.5 break-words">
                  {title || 'Your notification title'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed break-words">
                  {body || 'The message body appears here.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch history */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Recently Dispatched Push Notifications
              </h3>
              <p className="text-xs text-slate-500">Live records from the notifications table</p>
            </div>
            <span className="text-[11px] font-bold text-slate-400 shrink-0">
              {history.length} sent
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Title</th>
                  <th className="py-3 px-5">Message</th>
                  <th className="py-3 px-5 whitespace-nowrap">Sent At</th>
                  <th className="py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 text-xs">
                      Loading dispatch history…
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 text-xs">
                      No notifications have been broadcast yet. Use the form to send the first one.
                    </td>
                  </tr>
                ) : (
                  history.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="py-3 px-5 font-semibold text-slate-900">{n.title}</td>
                      <td className="py-3 px-5 text-slate-600 max-w-md">
                        <span className="line-clamp-2">{n.body}</span>
                      </td>
                      <td className="py-3 px-5 text-slate-500 whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 whitespace-nowrap">
                          DELIVERED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
