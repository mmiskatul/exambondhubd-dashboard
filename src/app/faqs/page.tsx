'use client';

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Save,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useDeleteFlow } from '@/hooks/useDeleteFlow';

interface Faq {
  id: string;
  questionBn: string;
  questionEn?: string | null;
  answerBn: string;
  answerEn?: string | null;
  category?: string | null;
  sortOrder: number;
  isPublished: boolean;
}

const EMPTY = {
  questionBn: '',
  questionEn: '',
  answerBn: '',
  answerEn: '',
  category: '',
  isPublished: true,
};

export default function FaqsPage() {
  const toast = useToast();
  const deleteFlow = useDeleteFlow((type, text) =>
    type === 'success' ? toast.success(text) : toast.error(text),
  );

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    // The admin list, so unpublished drafts are visible here but not in the app.
    const res = await fetchApi<Faq[]>('/faqs/all');
    if (res.success && Array.isArray(res.data)) setFaqs(res.data);
    else toast.error(res.message || 'Could not load the FAQs.');
    setLoading(false);
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function startEdit(faq: Faq) {
    setEditingId(faq.id);
    setForm({
      questionBn: faq.questionBn,
      questionEn: faq.questionEn || '',
      answerBn: faq.answerBn,
      answerEn: faq.answerEn || '',
      category: faq.category || '',
      isPublished: faq.isPublished,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.questionBn.trim()) {
      toast.error('A Bangla question is required.');
      return;
    }
    if (!form.answerBn.trim()) {
      toast.error('A Bangla answer is required.');
      return;
    }

    setSaving(true);
    const res = editingId
      ? await fetchApi(`/faqs/${editingId}`, { method: 'PATCH', body: JSON.stringify(form) })
      : await fetchApi('/faqs', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);

    if (!res.success) {
      toast.error(res.message || 'Could not save this FAQ.');
      return;
    }

    toast.success(editingId ? 'FAQ updated. It is live in the app.' : 'FAQ added. It is live in the app.');
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY });
    load();
  }

  async function togglePublished(faq: Faq) {
    setBusyId(faq.id);
    // Optimistic, reverted below if the request fails.
    setFaqs((prev) =>
      prev.map((f) => (f.id === faq.id ? { ...f, isPublished: !f.isPublished } : f)),
    );

    const res = await fetchApi(`/faqs/${faq.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublished: !faq.isPublished }),
    });
    setBusyId(null);

    if (!res.success) {
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, isPublished: faq.isPublished } : f)),
      );
      toast.error(res.message || 'Could not change visibility.');
      return;
    }

    toast.success(faq.isPublished ? 'Hidden from the app.' : 'Now visible in the app.');
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= faqs.length) return;

    const next = [...faqs];
    [next[index], next[target]] = [next[target], next[index]];
    setFaqs(next);

    const res = await fetchApi('/faqs/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids: next.map((f) => f.id) }),
    });

    if (!res.success) {
      toast.error(res.message || 'Could not save the new order.');
      load();
    }
  }

  function remove(faq: Faq) {
    deleteFlow.request({
      title: 'Delete this FAQ?',
      description: 'It is removed from the dashboard and disappears from the app immediately.',
      details: [
        { label: 'Question', value: faq.questionBn },
        { label: 'Category', value: faq.category || '—' },
        { label: 'Currently', value: faq.isPublished ? 'Visible in the app' : 'Hidden' },
      ],
      warning: 'To take it off the app without losing the text, hide it with the eye icon instead.',
      confirmText: 'Delete FAQ',
      endpoint: `/faqs/${faq.id}`,
      onSuccess: () => setFaqs((prev) => prev.filter((f) => f.id !== faq.id)),
    });
  }

  const publishedCount = faqs.filter((f) => f.isPublished).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle size={20} className="text-emerald-600" />
            Help &amp; FAQ
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Shown on the app&apos;s profile screen. {publishedCount} of {faqs.length} published.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={startCreate}
            className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5"
          >
            <Plus size={14} />
            Add FAQ
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {editingId ? 'Edit FAQ' : 'New FAQ'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                প্রশ্ন (Bangla) <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.questionBn}
                onChange={(e) => setForm({ ...form, questionBn: e.target.value })}
                placeholder="নেগেটিভ মার্কিং কীভাবে হিসাব করা হয়?"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Question (English)
              </label>
              <input
                value={form.questionEn}
                onChange={(e) => setForm({ ...form, questionEn: e.target.value })}
                placeholder="How is negative marking calculated?"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                উত্তর (Bangla) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={form.answerBn}
                onChange={(e) => setForm({ ...form, answerBn: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Answer (English)</label>
              <textarea
                value={form.answerEn}
                onChange={(e) => setForm({ ...form, answerEn: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Exams, Payments, Content…"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Visible in the app
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save size={14} />
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add FAQ'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-10 text-center">Loading…</div>
      ) : faqs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <HelpCircle size={28} className="text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 mt-3">No FAQs yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Anything you add here appears on the app&apos;s profile screen straight away.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              className={`bg-white border rounded-xl p-4 shadow-sm ${
                faq.isPublished ? 'border-slate-200' : 'border-amber-200 bg-amber-50/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-0.5">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-25"
                    title="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === faqs.length - 1}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-25"
                    title="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {faq.category && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 rounded">
                        {faq.category}
                      </span>
                    )}
                    {!faq.isPublished && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 rounded">
                        Hidden from app
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-slate-900 mt-1.5">{faq.questionBn}</p>
                  {faq.questionEn && (
                    <p className="text-xs text-slate-500">{faq.questionEn}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{faq.answerBn}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePublished(faq)}
                    disabled={busyId === faq.id}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-40"
                    title={faq.isPublished ? 'Hide from the app' : 'Show in the app'}
                  >
                    {faq.isPublished ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    onClick={() => startEdit(faq)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(faq)}
                    disabled={busyId === faq.id}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal {...deleteFlow.modalProps} />
    </div>
  );
}
