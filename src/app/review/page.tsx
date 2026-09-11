'use client';

import React, { useState, useEffect } from 'react';
import { CheckSquare, CheckCircle, XCircle, Send, AlertCircle, Eye } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function QuestionReviewPage() {
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  useEffect(() => {
    loadPendingQuestions();
  }, []);

  async function loadPendingQuestions() {
    setLoading(true);
    const res = await fetchApi('/questions/admin/all?status=PENDING_REVIEW');
    if (res.success && res.data) {
      setPendingQuestions(res.data.items || []);
    } else {
      setPendingQuestions([]);
    }
    setLoading(false);
  }

  async function handleReviewAction(questionId: string, action: 'APPROVE' | 'REJECT' | 'PUBLISH') {
    const res = await fetchApi(`/questions/${questionId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, notes: rejectionNotes }),
    });

    setRejectModalId(null);
    setRejectionNotes('');
    loadPendingQuestions();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Question Review & Approval Queue</h1>
        <p className="text-sm text-slate-500">
          Enforce editorial quality control before questions are published to student mobile applications.
        </p>
      </div>

      {/* Review Queue List */}
      <div className="space-y-4">
        {pendingQuestions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">Review Queue is Clear</h3>
            <p className="text-xs text-slate-500 mt-1">All submitted questions have been reviewed and processed.</p>
          </div>
        ) : (
          pendingQuestions.map((q) => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                    PENDING REVIEW
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                    {q.subject?.titleEn}
                  </span>
                </div>
                <span className="text-xs text-slate-400">Source: {q.sourceType}</span>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">{q.questionEn}</h3>
                {q.questionBn && <p className="text-sm text-slate-700 mt-1">{q.questionBn}</p>}
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3">
                {q.options?.map((opt: any) => (
                  <div
                    key={opt.optionKey}
                    className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                      opt.isCorrect ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200'
                    }`}>
                      {opt.optionKey}
                    </span>
                    <span>{opt.textEn}</span>
                    {opt.isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setRejectModalId(q.id)}
                  className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Reject with Notes
                </button>
                <button
                  onClick={() => handleReviewAction(q.id, 'PUBLISH')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Approve & Publish
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rejection Notes Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Add Rejection Reason</h3>
            <textarea
              rows={3}
              placeholder="Specify the issue (e.g. incorrect answer marked, typo, duplicate)..."
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalId(null)}
                className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewAction(rejectModalId, 'REJECT')}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
