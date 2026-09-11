'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Search,
  Filter,
  Check,
  FileQuestion,
  HelpCircle,
  Sparkles,
  Layers,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useDeleteFlow } from '@/hooks/useDeleteFlow';

export default function ExamPaperDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const portalKey = typeof params?.key === 'string' ? decodeURIComponent(params.key) : '';
  const examYear = typeof params?.year === 'string' ? params.year : '';
  // Carried through from the hub so this paper stays inside one admission unit.
  const unitKey = searchParams.get('unit') || '';
  const unitQuery = unitKey ? `&unitKey=${encodeURIComponent(unitKey)}` : '';
  const [unitLabel, setUnitLabel] = useState('');
  const scopeLabel = unitLabel ? `${portalKey} ${unitLabel}` : portalKey;

  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  // Centered Confirm Dialog States
  const toast = useToast();

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  // How many MCQs were saved without leaving the dialog.
  const [addedThisSession, setAddedThisSession] = useState(0);
  const questionFormRef = useRef<HTMLFormElement>(null);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    subjectId: '',
    year: Number(examYear) || 2024,
    difficulty: 'MEDIUM',
    questionEn: '',
    questionBn: '',
    explanationEn: '',
    explanationBn: '',
    options: [
      { optionKey: 'A', textEn: '', textBn: '', isCorrect: true },
      { optionKey: 'B', textEn: '', textBn: '', isCorrect: false },
      { optionKey: 'C', textEn: '', textBn: '', isCorrect: false },
      { optionKey: 'D', textEn: '', textBn: '', isCorrect: false },
    ],
  });

  useEffect(() => {
    if (portalKey) loadSubjects();
  }, [portalKey, unitKey]);

  // The unit label comes from the portals payload the page already needs, so
  // the heading never renders without it for a beat.
  useEffect(() => {
    if (!portalKey || !unitKey) {
      setUnitLabel('');
      return;
    }

    // Show the raw key immediately, then upgrade to the Bangla name.
    setUnitLabel(unitKey);

    fetchApi('/categories/portals').then((res) => {
      if (!res.success || !res.data) return;
      const all = [...(res.data.university || []), ...(res.data.jobs || [])];
      const match = all
        .find((p: any) => p.key === portalKey)
        ?.units?.find((u: any) => u.key === unitKey);
      if (match) setUnitLabel(match.titleBn);
    });
  }, [portalKey, unitKey]);

  useEffect(() => {
    if (portalKey && examYear) {
      loadPaperQuestions();
    }
  }, [portalKey, unitKey, examYear, selectedSubject, selectedDifficulty, search]);

  async function loadSubjects() {
    // Only the subjects attached to this exact scope — a DU ক unit paper never
    // offers a subject that belongs solely to another unit or portal.
    const res = await fetchApi(
      `/portals/${encodeURIComponent(portalKey)}/subjects` +
        (unitKey ? `?unitKey=${encodeURIComponent(unitKey)}` : ''),
    );
    if (res.success && res.data) {
      setSubjects(res.data);
      if (res.data.length > 0) {
        setFormData((prev) => ({ ...prev, subjectId: prev.subjectId || res.data[0].id }));
      }
    } else {
      setSubjects([]);
    }
  }

  async function loadPaperQuestions() {
    setLoading(true);
    let url = `/questions/admin/all?year=${examYear}&portalKey=${encodeURIComponent(portalKey)}${unitQuery}&limit=100`;
    if (selectedSubject) url += `&subjectId=${selectedSubject}`;
    if (selectedDifficulty) url += `&difficulty=${selectedDifficulty}`;

    const res = await fetchApi(url);
    if (res.success && res.data) {
      setQuestions(res.data.items || []);
    } else {
      setQuestions([]);
    }
    setLoading(false);
  }

  function handleOpenCreate() {
    setEditingQuestion(null);
    setAddedThisSession(0);
    setFormData({
      subjectId: subjects[0]?.id || '',
      year: Number(examYear) || 2024,
      difficulty: 'MEDIUM',
      questionEn: '',
      questionBn: '',
      explanationEn: '',
      explanationBn: '',
      options: [
        { optionKey: 'A', textEn: '', textBn: '', isCorrect: true },
        { optionKey: 'B', textEn: '', textBn: '', isCorrect: false },
        { optionKey: 'C', textEn: '', textBn: '', isCorrect: false },
        { optionKey: 'D', textEn: '', textBn: '', isCorrect: false },
      ],
    });
    setIsModalOpen(true);
  }

  function handleOpenEdit(q: any) {
    setEditingQuestion(q);
    setFormData({
      subjectId: q.subjectId || q.subject?.id || subjects[0]?.id || '',
      year: q.year || Number(examYear),
      difficulty: q.difficulty || 'MEDIUM',
      questionEn: q.questionEn || '',
      questionBn: q.questionBn || '',
      explanationEn: q.explanationEn || '',
      explanationBn: q.explanationBn || '',
      options: q.options?.map((opt: any) => ({
        optionKey: opt.optionKey,
        textEn: opt.textEn || '',
        textBn: opt.textBn || opt.textEn || '',
        isCorrect: opt.isCorrect,
      })) || [
        { optionKey: 'A', textEn: '', textBn: '', isCorrect: true },
        { optionKey: 'B', textEn: '', textBn: '', isCorrect: false },
        { optionKey: 'C', textEn: '', textBn: '', isCorrect: false },
        { optionKey: 'D', textEn: '', textBn: '', isCorrect: false },
      ],
    });
    setIsModalOpen(true);
  }

  /**
   * Saves one MCQ. With `keepOpen` the dialog stays put and only the question
   * fields clear, so a whole paper can be entered in one sitting without
   * re-picking the subject every time.
   */
  async function saveQuestion(keepOpen: boolean) {
    setSavingQuestion(true);

    const payload = JSON.stringify({
      ...formData,
      portalKey,
      unitKey: unitKey || undefined,
      year: Number(formData.year),
    });

    const res = editingQuestion
      ? await fetchApi(`/questions/${editingQuestion.id}`, { method: 'PATCH', body: payload })
      : await fetchApi('/questions', { method: 'POST', body: payload });

    setSavingQuestion(false);

    if (!res.success) {
      toast.error(res.message || 'Failed to save the question.');
      return;
    }

    if (editingQuestion) {
      setIsModalOpen(false);
      toast.success('Question updated.');
      loadPaperQuestions();
      return;
    }

    const added = addedThisSession + 1;
    setAddedThisSession(added);

    if (keepOpen) {
      // Subject, chapter, year and difficulty carry over to the next one.
      setFormData((prev) => ({
        ...prev,
        questionEn: '',
        questionBn: '',
        explanationEn: '',
        explanationBn: '',
        options: [
          { optionKey: 'A', textEn: '', textBn: '', isCorrect: true },
          { optionKey: 'B', textEn: '', textBn: '', isCorrect: false },
          { optionKey: 'C', textEn: '', textBn: '', isCorrect: false },
          { optionKey: 'D', textEn: '', textBn: '', isCorrect: false },
        ],
      }));
      toast.success(`Saved. ${added} question${added === 1 ? '' : 's'} added to this paper.`);
      loadPaperQuestions();
      return;
    }

    setIsModalOpen(false);
    toast.success(
      added > 1
        ? `${added} questions added to ${scopeLabel} (${examYear}).`
        : `Question added to ${scopeLabel} (${examYear}).`,
    );
    loadPaperQuestions();
  }

  function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    saveQuestion(false);
  }

  const deleteFlow = useDeleteFlow((type, text) =>
    type === 'success' ? toast.success(text) : toast.error(text),
  );

  function requestDeleteQuestion(q: any) {
    const preview = (q.questionBn || q.questionEn || '').slice(0, 90);

    deleteFlow.request({
      title: 'Delete this MCQ?',
      description:
        'The question and its options are permanently removed from this paper. No other portal or year is touched.',
      details: [
        { label: 'Exam portal', value: portalKey },
        { label: 'Admission unit', value: unitLabel || 'All units' },
        { label: 'Paper year', value: examYear },
        { label: 'Subject', value: q.subject?.titleEn || '—' },
        { label: 'Chapter', value: q.topic?.titleEn || 'Unassigned' },
        { label: 'Difficulty', value: q.difficulty || '—' },
      ],
      warning: preview ? `"${preview}${preview.length >= 90 ? '…' : ''}"` : undefined,
      confirmText: 'Delete MCQ',
      endpoint: `/questions/${q.id}`,
      onSuccess: () => setQuestions((prev) => prev.filter((row) => row.id !== q.id)),
    });
  }

  function requestClearPaper() {
    deleteFlow.request({
      title: `Clear the whole ${examYear} ${scopeLabel} paper?`,
      description:
        'Every question stored for this portal and year is permanently deleted, along with its options.',
      details: [
        { label: 'Exam portal', value: portalKey },
        { label: 'Admission unit', value: unitLabel || 'All units' },
        { label: 'Paper year', value: examYear },
        { label: 'Questions to delete', value: questions.length, danger: questions.length > 0 },
        { label: 'Other units / portals', value: 'Untouched' },
      ],
      warning:
        questions.length > 0
          ? `${questions.length} question(s) will be destroyed. This cannot be undone.`
          : 'This paper is already empty.',
      confirmPhrase: questions.length >= 10 ? String(examYear) : undefined,
      confirmText: 'Clear Paper',
      endpoint: `/questions/admin/clear-paper?portalKey=${encodeURIComponent(portalKey)}&year=${examYear}${unitQuery}`,
      onSuccess: () => loadPaperQuestions(),
    });
  }

  // Filter questions client-side for immediate search text matching
  const filteredQuestions = questions.filter((q) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.questionEn?.toLowerCase().includes(s) ||
      q.questionBn?.toLowerCase().includes(s) ||
      q.subject?.titleEn?.toLowerCase().includes(s) ||
      q.options?.some((o: any) => o.textEn?.toLowerCase().includes(s) || o.textBn?.toLowerCase().includes(s))
    );
  });

  return (
    <div className="w-full space-y-6 pb-16">

      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/portals"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Exam Portals
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900">
              {scopeLabel} — {examYear} Question Paper
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {filteredQuestions.length} MCQs
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Dedicated past paper question bank management for {portalKey} ({examYear} Examination)
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {questions.length > 0 && (
            <button
              onClick={() => requestClearPaper()}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All {examYear} MCQs
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" /> Add MCQ to {examYear}
          </button>
        </div>
      </div>

      {/* Filter & Search Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions or options in this paper..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
          />
        </div>

        {/* Subject Filter */}
        <div>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titleEn} ({s.titleBn})
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
      </div>

      {/* Question Cards Feed */}
      {loading ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
          Loading {examYear} question paper...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
            <FileQuestion className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Questions Found for {examYear} Paper</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no questions recorded in this specific paper. Click below to add the first question.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add First Question to {examYear} Paper
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-slate-300 transition-all space-y-4"
            >
              {/* Question Card Top Meta */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                    {q.subject?.titleEn || 'General'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      q.difficulty === 'EASY'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : q.difficulty === 'HARD'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {q.difficulty || 'MEDIUM'}
                  </span>
                </div>

                {/* Edit & Delete Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="Edit Question"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => requestDeleteQuestion(q)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{q.questionEn}</h3>
                {q.questionBn && (
                  <p className="text-xs text-slate-700 font-medium font-sans leading-relaxed">{q.questionBn}</p>
                )}
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {q.options?.map((opt: any) => {
                  const isCorrect = opt.isCorrect;
                  return (
                    <div
                      key={opt.optionKey}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                        isCorrect
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {opt.optionKey}
                        </span>
                        <span>{opt.textBn || opt.textEn}</span>
                      </div>
                      {isCorrect && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation Box */}
              {(q.explanationBn || q.explanationEn) && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600" /> Solution & Textbook Explanation:
                  </span>
                  <p className="font-sans leading-relaxed">{q.explanationBn || q.explanationEn}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingQuestion ? 'Edit Question' : `Add Question to ${portalKey} (${examYear})`}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form
              ref={questionFormRef}
              onSubmit={handleSaveQuestion}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wider">
                    Subject / বিষয় *
                  </label>
                  <select
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="" disabled>
                      Select Subject
                    </option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id} className="text-slate-900 font-semibold py-1">
                        {s.titleEn} ({s.titleBn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wider">
                    Difficulty Level *
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wider">
                  Question (English) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Which organelle is known as the powerhouse of the cell?"
                  value={formData.questionEn}
                  onChange={(e) => setFormData({ ...formData, questionEn: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wider">
                  Question (Bangla) / প্রশ্ন
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. কোষের শক্তিঘর বা পাওয়ার হাউস কাকে বলা হয়?"
                  value={formData.questionBn}
                  onChange={(e) => setFormData({ ...formData, questionBn: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">
                  MCQ Options (Select the Radio Button of the Correct Answer) *
                </span>
                {formData.options.map((opt, idx) => (
                  <div key={opt.optionKey} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={() => {
                        const updated = formData.options.map((o, i) => ({ ...o, isCorrect: i === idx }));
                        setFormData({ ...formData, options: updated });
                      }}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-900 w-5">{opt.optionKey}.</span>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${opt.optionKey} Text (উত্তর)`}
                      value={opt.textBn}
                      onChange={(e) => {
                        const updated = [...formData.options];
                        updated[idx].textBn = e.target.value;
                        updated[idx].textEn = e.target.value;
                        setFormData({ ...formData, options: updated });
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wider">
                  Explanation (Bangla) / বিস্তারিত ব্যাখ্যা
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide authoritative textbook explanation..."
                  value={formData.explanationBn}
                  onChange={(e) => setFormData({ ...formData, explanationBn: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  {addedThisSession > 0 ? 'Done' : 'Cancel'}
                </button>

                {!editingQuestion && (
                  <button
                    type="button"
                    disabled={savingQuestion}
                    onClick={() => {
                      // Reuse the form's own validation before saving.
                      if (!questionFormRef.current?.reportValidity()) return;
                      saveQuestion(true);
                    }}
                    className="px-5 py-2.5 bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    {savingQuestion ? 'Saving…' : 'Save & Add Another'}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {savingQuestion
                    ? 'Saving…'
                    : editingQuestion
                      ? 'Update Question'
                      : 'Save & Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal {...deleteFlow.modalProps} />
    </div>
  );
}
