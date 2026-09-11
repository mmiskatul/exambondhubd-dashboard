'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Copy, CheckCircle2, Trash2, UserPlus, Ban, TimerReset, Shield } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useDeleteFlow } from '@/hooks/useDeleteFlow';

const ROLE_HELP: Record<string, string> = {
  ADMIN: 'Everything except issuing access and deleting portals',
  QUESTION_EDITOR: 'Add and edit questions, subjects and papers',
  QUESTION_REVIEWER: 'Review and approve submitted questions',
  SUPPORT: 'Read-only: view accounts and payments',
};

const DURATIONS = [
  { hours: 4, label: '4 hours' },
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '1 week' },
];

export default function AccessControlPage() {
  const toast = useToast();

  const [passes, setPasses] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({ role: 'QUESTION_EDITOR', expiresInHours: 24, note: '' });
  const [justIssued, setJustIssued] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const deleteFlow = useDeleteFlow((type, text) =>
    type === 'success' ? toast.success(text) : toast.error(text),
  );

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);

    const [passRes, roleRes] = await Promise.all([
      fetchApi('/users/admin/temporary'),
      fetchApi('/users/admin/temporary/roles'),
    ]);

    setPasses(passRes.success && Array.isArray(passRes.data) ? passRes.data : []);

    const list = roleRes.success && Array.isArray(roleRes.data) ? roleRes.data : [];
    setRoles(list);
    if (list.length && !list.includes(form.role)) setForm((f) => ({ ...f, role: list[0] }));

    setLoading(false);
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setIssuing(true);

    const res = await fetchApi('/users/admin/temporary', {
      method: 'POST',
      body: JSON.stringify(form),
    });

    setIssuing(false);

    if (res.success) {
      // Shown once — the password is hashed and never retrievable again.
      setJustIssued(res.data.credentials);
      setForm((f) => ({ ...f, note: '' }));
      toast.success(res.data?.message || 'Temporary access created.');
      loadAll();
    } else {
      toast.error(res.message || 'Could not create the access.');
    }
  }

  async function revokePass(p: any) {
    const res = await fetchApi(`/users/admin/temporary/${p.id}/revoke`, {
      method: 'PATCH',
      body: '{}',
    });
    if (res.success) {
      toast.success(res.data?.message || 'Access revoked.');
      loadAll();
    } else {
      toast.error(res.message || 'Could not revoke that access.');
    }
  }

  async function extendPass(p: any, hours: number) {
    const res = await fetchApi(`/users/admin/temporary/${p.id}/extend`, {
      method: 'PATCH',
      body: JSON.stringify({ hours }),
    });
    if (res.success) {
      toast.success(res.data?.message || 'Access extended.');
      loadAll();
    } else {
      toast.error(res.message || 'Could not extend that access.');
    }
  }

  function confirmDeletePass(p: any) {
    deleteFlow.request({
      title: `Delete the access for ${p.email}?`,
      description: 'The record is removed entirely. Revoke instead if you want to keep the trail.',
      details: [
        { label: 'Email', value: p.email },
        { label: 'Role', value: p.role.replace(/_/g, ' ') },
        { label: 'State', value: p.state },
        {
          label: 'Last sign-in',
          value: p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleString() : 'Never used',
        },
      ],
      confirmText: 'Delete Record',
      endpoint: `/users/admin/temporary/${p.id}`,
      onSuccess: () => loadAll(),
    });
  }

  const activePasses = passes.filter((p) => p.state === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Access Control</h1>
          <p className="text-sm text-slate-500">
            Issue time-limited console logins for people who need short-term access, with a
            restricted role and an expiry you control.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
          <Shield className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">
            <strong className="text-slate-800">{activePasses}</strong> active of {passes.length}{' '}
            issued
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Issue Temporary Access</h2>
                <p className="text-xs text-slate-500">
                  Generates an email and password you can hand over
                </p>
              </div>
            </div>

            <form onSubmit={handleIssue} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">
                  What can they do?
                </label>
                <div className="space-y-2">
                  {roles.map((r) => (
                    <label
                      key={r}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        form.role === r
                          ? 'bg-emerald-50 border-emerald-400'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        checked={form.role === r}
                        onChange={() => setForm({ ...form, role: r })}
                        className="mt-0.5 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-900">
                          {r.replace(/_/g, ' ')}
                        </span>
                        <span className="block text-[11px] text-slate-500 leading-relaxed">
                          {ROLE_HELP[r] || 'Restricted console access'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">How long?</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.hours}
                      type="button"
                      onClick={() => setForm({ ...form, expiresInHours: d.hours })}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                        form.expiresInHours === d.hours
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">
                  Who is it for?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahim — freelance question editor"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  A label for your own reference. Optional.
                </p>
              </div>

              <button
                type="submit"
                disabled={issuing || roles.length === 0}
                className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> {issuing ? 'Creating…' : 'Create Login'}
              </button>
            </form>
          </div>

          {/* Shown exactly once. */}
          {justIssued && (
            <div className="bg-slate-900 rounded-2xl border border-emerald-700 p-5 shadow-lg space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-400">Credentials ready</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Copy them now — the password is not stored and cannot be shown again.
                  </p>
                </div>
                <button
                  onClick={() => setJustIssued(null)}
                  className="text-slate-500 hover:text-white text-xs shrink-0"
                >
                  ✕
                </button>
              </div>

              {[
                { label: 'Email', value: justIssued.email },
                { label: 'Password', value: justIssued.password },
              ].map((f) => (
                <div key={f.label} className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{f.label}</span>
                  <div className="flex items-center gap-2 bg-slate-800 rounded-xl border border-slate-700 p-2.5">
                    <code className="flex-1 min-w-0 text-xs font-mono text-emerald-300 break-all">
                      {f.value}
                    </code>
                    <button
                      onClick={() => copy(f.value, f.label)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 shrink-0"
                      title={`Copy ${f.label.toLowerCase()}`}
                    >
                      {copiedId === f.label ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  copy(
                    `ExamBondhuBD admin console\nEmail: ${justIssued.email}\nPassword: ${justIssued.password}\nValid until: ${new Date(justIssued.expiresAt).toLocaleString()}`,
                    'both',
                  )
                }
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedId === 'both' ? 'Copied!' : 'Copy both to share'}
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                Expires {new Date(justIssued.expiresAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Issued passes */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Issued Logins</h3>
            <p className="text-xs text-slate-500">
              {activePasses} active of {passes.length} total
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <p className="py-12 text-center text-xs text-slate-400">Loading…</p>
            ) : passes.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400">
                No temporary logins issued yet. Create one on the left to share access with someone.
              </p>
            ) : (
              passes.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono font-bold text-slate-900 break-all">
                        {p.email}
                      </code>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.state === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.state === 'EXPIRED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {p.state}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {p.role.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1">
                      {p.note ? `${p.note} · ` : ''}
                      {p.state === 'ACTIVE'
                        ? `${p.hoursRemaining}h left — until ${new Date(p.expiresAt).toLocaleString()}`
                        : `Ended ${new Date(p.expiresAt).toLocaleString()}`}
                      {p.lastLoginAt
                        ? ` · last used ${new Date(p.lastLoginAt).toLocaleString()}`
                        : ' · never used'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => extendPass(p, 24)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center gap-1"
                      title="Give another day"
                    >
                      <TimerReset className="w-3.5 h-3.5" /> +1 day
                    </button>

                    {p.state === 'ACTIVE' && (
                      <button
                        onClick={() => revokePass(p)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-amber-700 hover:bg-amber-50 flex items-center gap-1"
                        title="End access now"
                      >
                        <Ban className="w-3.5 h-3.5" /> Revoke
                      </button>
                    )}

                    <button
                      onClick={() => confirmDeletePass(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete this record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmModal {...deleteFlow.modalProps} />
    </div>
  );
}
