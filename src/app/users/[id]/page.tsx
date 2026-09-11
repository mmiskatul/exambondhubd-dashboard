'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  MailCheck,
  Send,
  Phone,
  Shield,
  Flame,
  Target,
  GraduationCap,
  Bookmark,
  AlertTriangle,
  CreditCard,
  Ban,
  CheckCircle2,
  Trash2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useDeleteFlow } from '@/hooks/useDeleteFlow';
import { useAppSelector } from '@/store';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const userId = typeof params?.id === 'string' ? params.id : '';

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // The signed-in admin's own id, so this page can hide self-suspend/delete —
  // the same source every other page reads (there is no client-readable
  // token/user cache to fall back on now that the session is an HttpOnly cookie).
  const currentUserId = useAppSelector((state) => state.auth.user?.id) ?? null;

  const deleteFlow = useDeleteFlow((type, text) =>
    type === 'success' ? toast.success(text) : toast.error(text),
  );

  useEffect(() => {
    load();
  }, [userId]);

  async function load() {
    if (!userId) return;
    setLoading(true);
    const res = await fetchApi(`/users/admin/${userId}`);
    if (res.success && res.data) setDetail(res.data);
    else toast.error(res.message || 'Could not load this user.');
    setLoading(false);
  }

  async function toggleStatus() {
    const next = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setBusy(true);
    const res = await fetchApi(`/users/admin/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);

    if (!res.success) {
      toast.error(res.message || 'Could not change the status.');
      return;
    }
    toast.success(res.message || 'Status updated.');
    load();
  }

  async function verifyEmailNow() {
    setBusy(true);
    const res = await fetchApi(`/users/admin/${userId}/verify-email`, { method: 'PATCH' });
    setBusy(false);

    if (!res.success) {
      toast.error(res.message || 'Could not verify this account.');
      return;
    }
    toast.success(res.data?.message || res.message || 'Marked verified.');
    load();
  }

  async function resendVerification() {
    setBusy(true);
    const res = await fetchApi(`/users/admin/${userId}/resend-verification`, { method: 'POST' });
    setBusy(false);

    if (!res.success) {
      toast.error(res.message || 'Could not resend the verification email.');
      return;
    }
    toast.success(res.data?.message || res.message || 'Verification email sent.');
  }

  function remove() {
    const label = user.name || user.email;

    deleteFlow.request({
      title: `Delete ${label}?`,
      description: 'The account and everything it owns is removed permanently. This cannot be undone.',
      details: [
        { label: 'Email', value: user.email },
        { label: 'Role', value: user.role },
        { label: 'Attempts', value: activity.totalAttempts, danger: activity.totalAttempts > 0 },
        { label: 'Bookmarks', value: activity.bookmarks, danger: activity.bookmarks > 0 },
        { label: 'Recorded mistakes', value: activity.mistakes, danger: activity.mistakes > 0 },
        {
          label: 'Subscriptions',
          value: user.subscriptions?.length || 0,
          danger: (user.subscriptions?.length || 0) > 0,
        },
        {
          label: 'Payments',
          value: user._count?.payments || 0,
          danger: (user._count?.payments || 0) > 0,
        },
      ],
      warning:
        'Their results, bookmarks, recorded mistakes, subscriptions and payment history all go ' +
        'with the account. This cannot be undone.',
      confirmPhrase: 'DELETE',
      confirmText: 'Delete account',
      endpoint: `/users/admin/${userId}`,
      onSuccess: () => router.push('/users'),
    });
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-400">Loading…</div>;
  }

  if (!detail) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => router.push('/users')}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Back to users
        </button>
        <p className="text-sm text-slate-500">This user could not be loaded.</p>
      </div>
    );
  }

  const { user, activity, examBreakdown, attempts, weakSubjects } = detail;
  const isSelf = user.id === currentUserId;
  const profile = user.profile || {};

  const stats = [
    { label: 'Tests taken', value: activity.totalAttempts, icon: GraduationCap },
    { label: 'Average score', value: `${activity.averagePercentage}%`, icon: Target },
    { label: 'Questions solved', value: profile.questionsSolved ?? 0, icon: TrendingUp },
    { label: 'Day streak', value: profile.studyStreak ?? 0, icon: Flame },
    { label: 'Bookmarks', value: activity.bookmarks, icon: Bookmark },
    { label: 'Recorded mistakes', value: activity.mistakes, icon: AlertTriangle },
  ];

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.push('/users')}
        className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
      >
        <ArrowLeft size={14} />
        Back to users
      </button>

      {/* Identity */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{user.name || 'Unnamed user'}</h1>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  user.role === 'USER'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {user.role}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  user.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {user.status}
              </span>
              {isSelf && <span className="text-[10px] font-bold text-emerald-700">you</span>}
            </div>

            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Mail size={12} className="text-slate-400" />
                {user.email}
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                    <MailCheck size={10} /> Verified
                  </span>
                ) : (
                  <>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                      Unverified
                    </span>
                    <button
                      onClick={verifyEmailNow}
                      disabled={busy}
                      title="Mark this email verified"
                      className="text-[10px] font-bold text-emerald-700 hover:underline disabled:opacity-40 flex items-center gap-0.5"
                    >
                      <MailCheck size={11} /> Verify
                    </button>
                    <button
                      onClick={resendVerification}
                      disabled={busy}
                      title="Resend the verification code"
                      className="text-[10px] font-bold text-indigo-700 hover:underline disabled:opacity-40 flex items-center gap-0.5"
                    >
                      <Send size={11} /> Resend
                    </button>
                  </>
                )}
              </div>
              {user.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone size={12} className="text-slate-400" />
                  {user.phone}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                Joined {new Date(user.createdAt).toLocaleDateString()}
                {user.lastLoginAt
                  ? ` · last seen ${new Date(user.lastLoginAt).toLocaleDateString()}`
                  : ' · never signed in'}
              </div>
              {user.isTemporary && (
                <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                  <Shield size={12} />
                  Temporary access
                  {user.accessExpiresAt
                    ? ` — expires ${new Date(user.accessExpiresAt).toLocaleString()}`
                    : ''}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSelf ? (
              <span className="text-xs text-slate-400">You cannot suspend or delete yourself</span>
            ) : (
              <>
                <button
                  onClick={toggleStatus}
                  disabled={busy}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 disabled:opacity-40 ${
                    user.status === 'ACTIVE'
                      ? 'text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100'
                      : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {user.status === 'ACTIVE' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                  {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </button>

                <button
                  onClick={remove}
                  disabled={busy}
                  className="px-3 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <s.icon size={15} className="text-emerald-600" />
            <p className="text-lg font-black text-slate-900 mt-1.5">{s.value}</p>
            <p className="text-[11px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-exam breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Exams taken</h2>
          <p className="text-xs text-slate-500">
            {examBreakdown.length === 0
              ? 'This user has not sat any exam yet.'
              : `${examBreakdown.length} exam${examBreakdown.length === 1 ? '' : 's'}, ${activity.totalAttempts} attempt${activity.totalAttempts === 1 ? '' : 's'} in total.`}
          </p>
        </div>

        {examBreakdown.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left py-2.5 px-5 font-semibold">Exam</th>
                <th className="text-left py-2.5 px-5 font-semibold">Attempts</th>
                <th className="text-left py-2.5 px-5 font-semibold">Best</th>
                <th className="text-left py-2.5 px-5 font-semibold">Latest</th>
                <th className="text-left py-2.5 px-5 font-semibold">Last taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {examBreakdown.map((e: any) => (
                <tr key={e.examId} className="hover:bg-slate-50/80">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-slate-900">{e.titleEn}</div>
                    <div className="text-xs text-slate-500">
                      {e.portal || '—'}
                      {e.unit ? ` · ${e.unit}` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-5 font-semibold text-slate-700">{e.attempts}</td>
                  <td className="py-3 px-5 font-bold text-emerald-600">
                    {Math.round(e.bestPercentage)}%
                  </td>
                  <td className="py-3 px-5 text-slate-700">
                    {e.lastPercentage === null ? '—' : `${Math.round(e.lastPercentage)}%`}
                  </td>
                  <td className="py-3 px-5 text-xs text-slate-500">
                    {e.lastAttemptAt ? new Date(e.lastAttemptAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attempt history */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Attempt history</h2>
            <p className="text-xs text-slate-500">Most recent 50.</p>
          </div>

          {attempts.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-slate-400">No attempts recorded.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {attempts.map((a: any) => (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      !a.completedAt
                        ? 'bg-amber-50 text-amber-700'
                        : a.percentage >= 50
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {a.completedAt ? `${Math.round(a.percentage)}%` : '—'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {a.exam?.titleEn || 'Deleted exam'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {a.completedAt
                        ? `${a.score}/${a.maxScore} · ${a.correctCount} right · ${a.wrongCount} wrong`
                        : a.status}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(a.completedAt || a.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Weak areas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900">Weakest subjects</h2>
            <p className="text-xs text-slate-500 mb-3">By recorded wrong answers.</p>

            {weakSubjects.length === 0 ? (
              <p className="text-xs text-slate-400">No mistakes recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {weakSubjects.map((w: any) => (
                  <div key={w.subject} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{w.subject}</span>
                    <span className="font-bold text-rose-600">{w.wrong} wrong</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billing */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard size={14} className="text-slate-400" />
              Subscriptions &amp; payments
            </h2>

            {user.subscriptions?.length === 0 && user.payments?.length === 0 ? (
              <p className="text-xs text-slate-400 mt-2">No billing history.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {user.subscriptions?.map((s: any) => (
                  <div key={s.id} className="text-xs border-b border-slate-100 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {s.plan?.nameEn || s.plan?.code || 'Plan'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {new Date(s.startsAt).toLocaleDateString()} →{' '}
                      {new Date(s.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {user.payments?.map((pmt: any) => (
                  <div key={pmt.id} className="text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-700">
                        ৳{pmt.amount} · {pmt.provider}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {new Date(pmt.createdAt).toLocaleDateString()} · {pmt.transactionId}
                      </p>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        pmt.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700'
                          : pmt.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {pmt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal {...deleteFlow.modalProps} />
    </div>
  );
}
