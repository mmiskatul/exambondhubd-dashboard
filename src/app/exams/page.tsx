'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Sliders, Shield, BookOpen, Clock, CheckCircle, Eye, EyeOff, FileQuestion } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useDeleteFlow } from '@/hooks/useDeleteFlow';

export default function ExamsManagementPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [portals, setPortals] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const toast = useToast();
  const deleteFlow = useDeleteFlow((type, text) =>
    type === 'success' ? toast.success(text) : toast.error(text),
  );

  // Form state
  const [formData, setFormData] = useState({
    titleEn: '',
    titleBn: '',
    slug: '',
    categoryId: '',
    portalKey: '',
    unitKey: '',
    year: 2026,
    durationMinutes: 120,
    totalQuestions: 200,
    marksPerQuestion: 1.0,
    negativeMark: 0.5,
    passMarks: 110,
    isPremium: false,
    isPublished: true,
    blueprintItems: [
      { subjectId: '', questionCount: 35, marks: 1.0, negativeMarks: 0.5 },
      { subjectId: '', questionCount: 35, marks: 1.0, negativeMarks: 0.5 },
      { subjectId: '', questionCount: 30, marks: 1.0, negativeMarks: 0.5 },
    ],
  });

  useEffect(() => {
    loadData();
  }, []);

  // Units ride along with the portals payload — no extra request per change.
  const units: any[] = portals.find((p) => p.key === formData.portalKey)?.units || [];

  async function loadData() {
    const [examsRes, catsRes, subsRes, portalsRes] = await Promise.all([
      fetchApi('/exams/admin/all'),
      fetchApi('/categories'),
      fetchApi('/subjects'),  // owning exam is included on each row
      fetchApi('/categories/portals'),
    ]);

    if (examsRes.success && examsRes.data) setExams(examsRes.data);
    if (catsRes.success && catsRes.data) setCategories(catsRes.data);

    if (portalsRes.success && portalsRes.data) {
      const flat = [...(portalsRes.data.university || []), ...(portalsRes.data.jobs || [])];
      setPortals(flat);
      setFormData((prev) => ({ ...prev, portalKey: prev.portalKey || flat[0]?.key || '' }));
    }
    if (subsRes.success && subsRes.data) {
      setSubjects(subsRes.data);
      if (subsRes.data.length >= 3) {
        setFormData((prev) => ({
          ...prev,
          categoryId: catsRes.data?.[0]?.id || '',
          blueprintItems: [
            { subjectId: subsRes.data[0].id, questionCount: 35, marks: 1.0, negativeMarks: 0.5 },
            { subjectId: subsRes.data[1].id, questionCount: 35, marks: 1.0, negativeMarks: 0.5 },
            { subjectId: subsRes.data[2].id, questionCount: 30, marks: 1.0, negativeMarks: 0.5 },
          ],
        }));
      }
    }
  }

  // 1-Click Toggle Live App Visibility (Enable / Disable)
  async function togglePublishStatus(examId: string, currentPublished: boolean) {
    setTogglingId(examId);
    const res = await fetchApi(`/exams/${examId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublished: !currentPublished }),
    });
    setTogglingId(null);

    if (res.success) {
      setExams((prev) =>
        prev.map((e) => (e.id === examId ? { ...e, isPublished: !currentPublished } : e)),
      );
      toast.success(currentPublished ? 'Hidden from the app.' : 'Published to the app.');
    } else {
      toast.error(res.message || 'Failed to update the status.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...formData,
      slug: formData.slug || formData.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    };

    let res;
    if (editingExam) {
      res = await fetchApi(`/exams/${editingExam.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetchApi('/exams', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    if (res.success) {
      setIsModalOpen(false);
      setEditingExam(null);
      toast.success(editingExam ? 'Exam updated.' : `${payload.titleEn} created.`);
      loadData();
    } else {
      toast.error(res.message || 'Could not save the exam blueprint.');
    }
  }

  // The old handler fired the request and reloaded regardless of the result,
  // so a rejected delete looked exactly like a successful one.
  function handleDelete(exam: any) {
    const questions = exam._count?.questions || 0;
    const attempts = exam._count?.attempts || 0;

    deleteFlow.request({
      title: `Delete ${exam.titleEn}?`,
      description:
        'The exam and its blueprint are removed. Questions filed under it stay in the portal question bank.',
      details: [
        { label: 'Exam', value: exam.titleEn },
        { label: 'Portal', value: exam.portal?.titleEn || exam.portal?.key || 'Unassigned' },
        { label: 'Admission unit', value: exam.unit?.titleBn || exam.unit?.titleEn || 'Whole portal' },
        { label: 'Category', value: exam.category?.titleEn || '—' },
        { label: 'Questions attached', value: questions },
        { label: 'Student attempts', value: attempts, danger: attempts > 0 },
      ],
      warning:
        attempts > 0
          ? `${attempts} student attempt(s) and their results will be deleted with this exam.`
          : undefined,
      confirmPhrase: attempts > 0 ? 'DELETE' : undefined,
      confirmText: 'Delete Exam',
      endpoint: `/exams/${exam.id}`,
      onSuccess: () => loadData(),
    });
  }

  return (
    <div className="space-y-6">

      <ConfirmModal {...deleteFlow.modalProps} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exams & Blueprint Builder</h1>
          <p className="text-sm text-slate-500">
            Configure competitive examinations, subject weight distributions, passing criteria, and toggle live app availability.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingExam(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Create New Examination
        </button>
      </div>

      {/* Exams Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-6">Examination Title</th>
              <th className="py-3.5 px-6">Category & Year</th>
              <th className="py-3.5 px-6">Duration & Marks</th>
              <th className="py-3.5 px-6">Blueprint Subjects</th>
              <th className="py-3.5 px-6">App Status</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {exams.map((exam) => (
              <tr key={exam.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-4 px-6">
                  <div className="font-bold text-slate-900 text-sm">{exam.titleEn}</div>
                  <div className="text-xs text-slate-500 font-sans">{exam.titleBn}</div>
                </td>

                <td className="py-4 px-6">
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold text-slate-700 text-[11px]">
                    {exam.category?.titleEn || 'General'}
                  </span>
                  {exam.year && <span className="ml-1.5 text-slate-400 font-bold">({exam.year})</span>}
                </td>

                <td className="py-4 px-6">
                  <div className="font-semibold text-slate-800">
                    {exam.totalQuestions} MCQs • {exam.durationMinutes} Mins
                  </div>
                  <div className="text-[11px] text-slate-400">
                    +{exam.marksPerQuestion} / -{exam.negativeMark} marks
                  </div>
                </td>

                <td className="py-4 px-6">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {exam.blueprints?.map((bp: any, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        {bp.subject?.titleEn?.split(' ')[0]}: {bp.questionCount}Q
                      </span>
                    ))}
                  </div>
                </td>

                {/* 1-Click Live App Enable/Disable Toggle */}
                <td className="py-4 px-6">
                  <button
                    onClick={() => togglePublishStatus(exam.id, exam.isPublished)}
                    disabled={togglingId === exam.id}
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      exam.isPublished
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {exam.isPublished ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live in App
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-slate-400" />
                        Disabled (Hidden)
                      </>
                    )}
                  </button>
                </td>

                <td className="py-4 px-6 text-right space-x-2">
                  <Link
                    href={`/questions?examId=${exam.id}`}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                  >
                    <FileQuestion className="w-3.5 h-3.5" /> Questions
                  </Link>

                  <button
                    onClick={() => {
                      setEditingExam(exam);
                      setFormData({
                        titleEn: exam.titleEn,
                        titleBn: exam.titleBn || '',
                        slug: exam.slug,
                        categoryId: exam.categoryId,
                        portalKey: exam.portal?.key || '',
                        unitKey: exam.unit?.key || '',
                        year: exam.year || 2026,
                        durationMinutes: exam.durationMinutes,
                        totalQuestions: exam.totalQuestions,
                        marksPerQuestion: exam.marksPerQuestion,
                        negativeMark: exam.negativeMark,
                        passMarks: exam.passMarks || 110,
                        isPremium: exam.isPremium,
                        isPublished: exam.isPublished,
                        blueprintItems: exam.blueprints?.length > 0 ? exam.blueprints : formData.blueprintItems,
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded"
                    title="Edit Blueprint"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(exam)}
                    className="p-1.5 hover:bg-rose-50 text-rose-600 rounded"
                    title="Delete Exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Blueprint Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">
              {editingExam ? 'Edit Exam Blueprint' : 'Configure New Examination'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Title (English)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 47th BCS Preliminary Mock Test"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Title (Bangla)</label>
                  <input
                    type="text"
                    placeholder="e.g. ৪৭তম বিসিএস প্রিলিমিনারি মডেল টেস্ট"
                    value={formData.titleBn}
                    onChange={(e) => setFormData({ ...formData, titleBn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Exam Portal <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={formData.portalKey}
                  onChange={(e) =>
                    setFormData({ ...formData, portalKey: e.target.value, unitKey: '' })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="" disabled>
                    Select the portal this test belongs to
                  </option>
                  {portals.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.icon} {p.title} ({p.bn})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Questions added to this test are visible only inside this portal.
                </p>
              </div>

              {units.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Admission Unit</label>
                  <select
                    required
                    value={formData.unitKey}
                    onChange={(e) => setFormData({ ...formData, unitKey: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="" disabled>
                      Select a unit
                    </option>
                    {units.map((u) => (
                      <option key={u.key} value={u.key}>
                        {u.titleBn} — {u.titleEn}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    This portal is split into units, so the test belongs to exactly one of them.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.titleEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Blueprint Subject Weightage */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">Dynamic Subject Distribution Blueprint</span>
                  <span className="text-[11px] text-slate-500 font-medium">Authoritative Blueprint Engine</span>
                </div>

                {formData.blueprintItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={item.subjectId}
                      onChange={(e) => {
                        const updated = [...formData.blueprintItems];
                        updated[idx].subjectId = e.target.value;
                        setFormData({ ...formData, blueprintItems: updated });
                      }}
                      className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.titleEn}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="Questions"
                      value={item.questionCount}
                      onChange={(e) => {
                        const updated = [...formData.blueprintItems];
                        updated[idx].questionCount = Number(e.target.value);
                        setFormData({ ...formData, blueprintItems: updated });
                      }}
                      className="w-24 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <span className="text-[11px] text-slate-400 font-bold">MCQs</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show Live in Mobile App (Published)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  Save & Publish Blueprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
