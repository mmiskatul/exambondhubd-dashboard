'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  GraduationCap,
  UsersRound,
  Eye,
  Trash2,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MailCheck,
  Send,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useAppSelector } from '@/store';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useDeleteFlow } from '@/hooks/useDeleteFlow';

type Group = 'students' | 'staff' | 'all';

const GROUPS: { id: Group; label: string; hint: string; Icon: typeof GraduationCap }[] = [
  { id: 'students', label: 'Students', hint: 'Registered examinees', Icon: GraduationCap },
  { id: 'staff', label: 'Admins & Staff', hint: 'Console accounts', Icon: ShieldCheck },
  { id: 'all', label: 'Everyone', hint: 'Both together', Icon: UsersRound },
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ students: number; staff: number }>({ students: 0, staff: 0 });
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<Group>('students');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const toast = useToast();
  const router = useRouter();
  const deleteFlow = useDeleteFlow((type, text) =>
    type === 'success' ? toast.success(text) : toast.error(text),
  );
  // Your own row must not offer a Suspend button — that is a self-lockout.
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  useEffect(() => {
    // A new search or a different group starts from the first page again,
    // otherwise page 4 of students can land on an empty page of staff.
    setPage(1);
  }, [search, group]);

  useEffect(() => {
    loadUsers();
  }, [search, group, page]);

  useEffect(() => {
    loadCounts();
  }, []);

  async function loadCounts() {
    const [students, staff] = await Promise.all([
      fetchApi('/users/admin/all?group=students&limit=1'),
      fetchApi('/users/admin/all?group=staff&limit=1'),
    ]);
    setCounts({
      students: students.data?.total || 0,
      staff: staff.data?.total || 0,
    });
  }

  async function loadUsers() {
    setLoading(true);
    let url = `/users/admin/all?limit=${PAGE_SIZE}&page=${page}&group=${group}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetchApi(url);
    if (res.success && res.data) {
      setUsers(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } else {
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
      toast.error(res.message || 'Could not load the accounts.');
    }
    setLoading(false);
  }

  async function toggleStatus(user: any) {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setBusyId(user.id);

    const res = await fetchApi(`/users/admin/${user.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });

    setBusyId(null);

    // The old handler ignored the result and reloaded either way, so a refusal
    // looked identical to a success.
    if (res.success) {
      toast.success(res.data?.message || res.message || 'Account updated.');
      loadUsers();
      loadCounts();
    } else {
      toast.error(res.message || 'Could not change that account.');
    }
  }

  async function verifyEmailNow(user: any) {
    setBusyId(user.id);
    const res = await fetchApi(`/users/admin/${user.id}/verify-email`, { method: 'PATCH' });
    setBusyId(null);

    if (res.success) {
      toast.success(res.data?.message || res.message || 'Marked verified.');
      loadUsers();
    } else {
      toast.error(res.message || 'Could not verify this account.');
    }
  }

  async function resendVerification(user: any) {
    setBusyId(user.id);
    const res = await fetchApi(`/users/admin/${user.id}/resend-verification`, { method: 'POST' });
    setBusyId(null);

    if (res.success) {
      toast.success(res.data?.message || res.message || 'Verification email sent.');
    } else {
      toast.error(res.message || 'Could not resend the verification email.');
    }
  }

  function removeUser(user: any) {
    const label = user.name || user.email;
    const exams = user.profile?.completedExams || 0;
    const solved = user.profile?.questionsSolved || 0;

    deleteFlow.request({
      title: `Delete ${label}?`,
      description: 'The account and everything it owns is removed permanently. This cannot be undone.',
      details: [
        { label: 'Email', value: user.email },
        { label: 'Role', value: user.role },
        { label: 'Status', value: user.status },
        { label: 'Exams completed', value: exams, danger: exams > 0 },
        { label: 'Questions solved', value: solved, danger: solved > 0 },
      ],
      warning:
        'Their attempts, results, bookmarks, recorded mistakes, subscriptions and payment ' +
        'history all go with the account. This cannot be undone.',
      confirmPhrase: 'DELETE',
      confirmText: 'Delete account',
      endpoint: `/users/admin/${user.id}`,
      onSuccess: () => {
        setUsers((prev) => {
          const next = prev.filter((x) => x.id !== user.id);
          // Deleting the last row on a page would otherwise strand you on an
          // empty page.
          if (next.length === 0 && page > 1) setPage((n) => n - 1);
          else loadUsers();
          return next;
        });
        setTotal((n) => Math.max(0, n - 1));
      },
    });
  }

  // Keeps the pager short: first, last, and a window around the current page.
  const pageNumbers: (number | null)[] = [];
  for (let n = 1; n <= totalPages; n++) {
    const nearEdge = n === 1 || n === totalPages;
    const nearCurrent = Math.abs(n - page) <= 1;

    if (nearEdge || nearCurrent) {
      pageNumbers.push(n);
    } else if (pageNumbers[pageNumbers.length - 1] !== null) {
      pageNumbers.push(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student &amp; User Accounts</h1>
          <p className="text-sm text-slate-500">
            {group === 'staff'
              ? 'Console accounts: admins, editors and reviewers.'
              : 'Monitor registered examinees, accuracy statistics, study streaks, and subscription tiers.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {GROUPS.map((g) => {
          const isSelected = group === g.id;
          const count =
            g.id === 'students' ? counts.students
            : g.id === 'staff' ? counts.staff
            : counts.students + counts.staff;

          return (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              title={g.hint}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <g.Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
              {g.label}
              <span className={isSelected ? 'text-emerald-300' : 'text-slate-400'}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-6">User</th>
              <th className="py-3 px-6">Role</th>
              {group !== 'staff' && (
                <>
                  <th className="py-3 px-6">Exams / Solved</th>
                  <th className="py-3 px-6">Accuracy</th>
                  <th className="py-3 px-6">Study Streak</th>
                  <th className="py-3 px-6">Email</th>
                </>
              )}
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={group === 'staff' ? 4 : 8} className="py-10 text-center text-xs text-slate-400">
                  {search
                    ? 'No accounts match that search.'
                    : group === 'students'
                      ? 'No students have registered yet.'
                      : 'No accounts in this group.'}
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-6">
                  <div className="font-semibold text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="py-3.5 px-6">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      u.role === 'USER'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {u.role}
                  </span>
                  {u.id === currentUserId && (
                    <span className="ml-2 text-[10px] font-bold text-emerald-700">you</span>
                  )}
                </td>
                {group !== 'staff' && (
                  <>
                    <td className="py-3.5 px-6 text-xs text-slate-700">
                      <strong className="text-slate-900">{u.profile?.completedExams || 0}</strong>{' '}
                      exams /{' '}
                      <strong className="text-emerald-700">
                        {u.profile?.questionsSolved || 0}
                      </strong>{' '}
                      Qs
                    </td>
                    <td className="py-3.5 px-6 font-bold text-emerald-600">
                      {u.profile?.accuracy ? `${u.profile.accuracy}%` : '0%'}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-amber-600">
                      🔥 {u.profile?.studyStreak || 0} Days
                    </td>
                    <td className="py-3.5 px-6">
                      {u.emailVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <MailCheck size={12} /> Verified
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                            Unverified
                          </span>
                          <button
                            onClick={() => verifyEmailNow(u)}
                            disabled={busyId === u.id}
                            title="Mark this email verified"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-40"
                          >
                            <MailCheck size={13} />
                          </button>
                          <button
                            onClick={() => resendVerification(u)}
                            disabled={busyId === u.id}
                            title="Resend the verification code"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-40"
                          >
                            <Send size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </>
                )}
                <td className="py-3.5 px-6">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="py-3.5 px-6">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => router.push(`/users/${u.id}`)}
                      title="View this account and everything they have done"
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    >
                      <Eye size={15} />
                    </button>

                    {u.id === currentUserId ? (
                      <span
                        className="text-xs text-slate-400 px-2"
                        title="You cannot suspend or delete your own account"
                      >
                        —
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleStatus(u)}
                          disabled={busyId === u.id}
                          title={u.status === 'ACTIVE' ? 'Suspend this account' : 'Reactivate this account'}
                          className={`p-2 rounded-lg disabled:opacity-40 ${
                            u.status === 'ACTIVE'
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                        </button>

                        <button
                          onClick={() => removeUser(u)}
                          disabled={busyId === u.id}
                          title="Delete this account and all of its activity"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 0 && (
          <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500">
              Showing{' '}
              <strong className="text-slate-700">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </strong>{' '}
              of <strong className="text-slate-700">{total}</strong>
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((n) => Math.max(1, n - 1))}
                disabled={page === 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                title="Previous page"
              >
                <ChevronLeft size={15} />
              </button>

              {pageNumbers.map((n, i) =>
                n === null ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    disabled={loading}
                    className={`min-w-[30px] px-2 py-1 rounded-lg text-xs font-semibold border ${
                      n === page
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {n}
                  </button>
                ),
              )}

              <button
                onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                title="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal {...deleteFlow.modalProps} />
    </div>
  );
}
