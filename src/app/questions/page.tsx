'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, Plus, Eye, Edit2, Trash2, CheckCircle2, AlertCircle, BookOpen, GraduationCap, Calendar } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useDeleteFlow } from '@/hooks/useDeleteFlow';

export default function QuestionsBankPage() {
  const searchParams = useSearchParams();
  const initialExamId = searchParams.get('examId') || '';

  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [portals, setPortals] = useState<any[]>([]);
  const [portalSubjects, setPortalSubjects] = useState<any[]>([]);

  // Filter states
  const [selectedExam, setSelectedExam] = useState(initialExamId);
  const [selectedPortal, setSelectedPortal] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Add Question Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    examId: initialExamId,
    portalKey: '',
    unitKey: '',
    subjectId: '',
    year: 2024,
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
    loadFilters();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [
    selectedExam,
    selectedPortal,
    selectedUnit,
    selectedSubject,
    selectedYear,
    selectedDifficulty,
    search,
  ]);

  // Units ship with the portals payload, so ক/খ/গ/ঘ label instantly instead of
  // costing a request per portal change.
  const filterUnits: any[] = portals.find((p) => p.key === selectedPortal)?.units || [];
  const formUnits: any[] = portals.find((p) => p.key === newQuestion.portalKey)?.units || [];

  function selectPortalFilter(nextKey: string) {
    if (nextKey === selectedPortal) return;
    setSelectedPortal(nextKey);
    setSelectedUnit('');
    setSelectedSubject('');
  }

  // Drop a unit that does not belong to the loaded portal.
  useEffect(() => {
    if (!selectedUnit || filterUnits.length === 0) return;
    if (!filterUnits.some((u) => u.key === selectedUnit)) setSelectedUnit('');
  }, [filterUnits, selectedUnit]);

  // The subject list in the add form follows the chosen portal's syllabus.
  useEffect(() => {
    if (!newQuestion.portalKey) {
      setPortalSubjects([]);
      return;
    }

    fetchApi(
      `/portals/${encodeURIComponent(newQuestion.portalKey)}/subjects` +
        (newQuestion.unitKey ? `?unitKey=${encodeURIComponent(newQuestion.unitKey)}` : ''),
    ).then((res) => {
      const rows = res.success && Array.isArray(res.data) ? res.data : [];
      setPortalSubjects(rows);
      setNewQuestion((prev) =>
        rows.some((r: any) => r.id === prev.subjectId)
          ? prev
          : { ...prev, subjectId: rows[0]?.id || '' },
      );
    });
  }, [newQuestion.portalKey]);

  async function loadFilters() {
    const [examsRes, portalsRes] = await Promise.all([
      fetchApi('/exams/admin/all'),
      fetchApi('/categories/portals'),
    ]);
    if (examsRes.success && examsRes.data) {
      setExams(examsRes.data);
    }
    if (portalsRes.success && portalsRes.data) {
      const flat = [...(portalsRes.data.university || []), ...(portalsRes.data.jobs || [])];
      setPortals(flat);
      setNewQuestion((prev) => ({ ...prev, portalKey: prev.portalKey || flat[0]?.key || '' }));
    }
  }

  async function loadQuestions() {
    setLoading(true);
    let url = '/questions/admin/all?limit=50';
    if (selectedExam) url += `&examId=${selectedExam}`;
    else if (selectedPortal) {
      url += `&portalKey=${encodeURIComponent(selectedPortal)}`;
      if (selectedUnit) url += `&unitKey=${encodeURIComponent(selectedUnit)}`;
    }
    if (selectedSubject) url += `&subjectId=${selectedSubject}`;
    if (selectedYear) url += `&year=${selectedYear}`;
    if (selectedDifficulty) url += `&difficulty=${selectedDifficulty}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetchApi(url);
    if (res.success && res.data) {
      setQuestions(res.data.items || []);
    } else {
      setQuestions([]);
    }
    setLoading(false);
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (formUnits.length > 0 && !newQuestion.unitKey) {
      toast.error('This exam portal is split into units — choose which one this question belongs to.');
      return;
    }

    const res = await fetchApi('/questions', {
      method: 'POST',
      body: JSON.stringify({
        ...newQuestion,
        unitKey: newQuestion.unitKey || undefined,
        year: Number(newQuestion.year),
      }),
    });

    if (res.success) {
      setIsModalOpen(false);
      toast.success('Question added to the question bank.');
      loadQuestions();
    } else {
      toast.error(res.message || 'Failed to add the question.');
    }
  }

  const deleteFlow = useDeleteFlow((type, text) =>
    type === 'success' ? toast.success(text) : toast.error(text),
  );

  function handleDeleteQuestion(q: any) {
    const text = (q.questionBn || q.questionEn || '').slice(0, 90);

    deleteFlow.request({
      title: 'Delete this MCQ permanently?',
      description:
        'The question, its options, and any bookmarks or mistake records pointing at it are removed.',
      details: [
        { label: 'Portal', value: q.portal?.titleEn || q.portal?.key || 'Unassigned' },
        { label: 'Admission unit', value: q.unit?.titleBn || q.unit?.titleEn || '—' },
        { label: 'Subject', value: q.subject?.titleEn || '—' },
        { label: 'Chapter', value: q.topic?.titleEn || 'Unassigned' },
        { label: 'Exam year', value: q.year || '—' },
        { label: 'Difficulty', value: q.difficulty || '—' },
      ],
      warning: text ? `"${text}${text.length >= 90 ? '…' : ''}"` : undefined,
      confirmText: 'Delete MCQ',
      endpoint: `/questions/${q.id}`,
      onSuccess: () => loadQuestions(),
    });
  }

  return (
    <div className="space-y-6">

      <ConfirmModal {...deleteFlow.modalProps} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Question Bank & Past Year Papers</h1>
          <p className="text-sm text-slate-500">
            Comprehensive verified repository of examination MCQs organized by Exam, Subject, and Year.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/import"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
          >
            Bulk Import CSV/Excel
          </a>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Single MCQ
          </button>
        </div>
      </div>

      {/* Multi-Level Filtering Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Portal Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase">Filter by Portal</label>
            <select
              value={selectedPortal}
              onChange={(e) => selectPortalFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="">All Portals</option>
              {portals.map((p) => (
                <option key={p.key} value={p.key}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Unit Filter — only for portals that have units */}
          {filterUnits.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase">Filter by Unit</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
              >
                <option value="">All Units</option>
                {filterUnits.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.titleBn}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Exam Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase">Filter by Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="">All Examinations</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.titleEn}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase">Filter by Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="">All Years</option>
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase">Filter by Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.titleEn}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase">Search Keyword</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search MCQ text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {(selectedExam || selectedPortal || selectedUnit || selectedSubject || selectedYear || selectedDifficulty || search) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400">Active Filters:</span>
            <button
              onClick={() => {
                setSelectedExam('');
                setSelectedSubject('');
                setSelectedYear('');
                setSelectedDifficulty('');
                setSearch('');
              }}
              className="text-emerald-600 font-bold hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading verified MCQs...</div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Questions Found</h3>
            <p className="text-xs text-slate-400">Try adjusting your filters or click "Add Single MCQ" to add questions.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        #{idx + 1}
                      </span>
                      {q.subject && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                          {q.subject.titleEn}
                        </span>
                      )}
                      {q.year && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                          {q.year}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px]">
                        {q.difficulty}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug pt-1">
                      {q.questionBn || q.questionEn}
                    </h3>
                    {q.questionBn && q.questionEn && (
                      <p className="text-xs text-slate-500 font-sans">{q.questionEn}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleDeleteQuestion(q)}
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* MCQ Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  {q.options?.map((opt: any) => (
                    <div
                      key={opt.id || opt.optionKey}
                      className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${
                        opt.isCorrect
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                          opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {opt.optionKey}
                      </span>
                      <span className="flex-1">{opt.textBn || opt.textEn}</span>
                      {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {(q.explanationBn || q.explanationEn) && (
                  <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs text-amber-900 space-y-0.5">
                    <span className="font-bold block text-[11px] text-amber-800 uppercase">ব্যাখ্যা / Explanation:</span>
                    <p>{q.explanationBn || q.explanationEn}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Single MCQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Add Question to Question Bank</h2>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Exam Portal <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    value={newQuestion.portalKey}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        portalKey: e.target.value,
                        unitKey: '',
                        examId: '',
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="" disabled>Select a portal</option>
                    {portals.map((p) => (
                      <option key={p.key} value={p.key}>{p.icon} {p.title}</option>
                    ))}
                  </select>
                </div>

                {formUnits.length > 0 && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Admission Unit <span className="text-rose-600">*</span>
                    </label>
                    <select
                      required
                      value={newQuestion.unitKey}
                      onChange={(e) => setNewQuestion({ ...newQuestion, unitKey: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    >
                      <option value="" disabled>Select a unit</option>
                      {formUnits.map((u) => (
                        <option key={u.key} value={u.key}>
                          {u.titleBn} — {u.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Model Test (optional)
                  </label>
                  <select
                    value={newQuestion.examId}
                    onChange={(e) => setNewQuestion({ ...newQuestion, examId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Question bank only</option>
                    {exams
                      .filter((ex) => ex.portal?.key === newQuestion.portalKey)
                      .map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.titleEn}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subject</label>
                  <select
                    required
                    value={newQuestion.subjectId}
                    onChange={(e) => setNewQuestion({ ...newQuestion, subjectId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {portalSubjects.length === 0 ? (
                      <option value="">No subjects attached to this portal</option>
                    ) : (
                      portalSubjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.titleEn}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Exam Year</label>
                  <select
                    required
                    value={newQuestion.year}
                    onChange={(e) => setNewQuestion({ ...newQuestion, year: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer"
                  >
                    {Array.from({ length: 2026 - 1971 + 1 }, (_, i) => 2026 - i).map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Question Text (Bangla)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. 'চর্যাপদ' কোন ছন্দে রচিত?"
                  value={newQuestion.questionBn}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionBn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Question Text (English Translation)</label>
                <textarea
                  rows={1}
                  placeholder="e.g. In which meter was 'Charyapada' composed?"
                  value={newQuestion.questionEn}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionEn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 block">MCQ Options (Select the correct radio button)</span>
                {newQuestion.options.map((opt, idx) => (
                  <div key={opt.optionKey} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={() => {
                        const updated = newQuestion.options.map((o, i) => ({
                          ...o,
                          isCorrect: i === idx,
                        }));
                        setNewQuestion({ ...newQuestion, options: updated });
                      }}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-slate-700 w-4">{opt.optionKey}.</span>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${opt.optionKey} Text (Bangla or English)`}
                      value={opt.textBn}
                      onChange={(e) => {
                        const updated = [...newQuestion.options];
                        updated[idx].textBn = e.target.value;
                        updated[idx].textEn = e.target.value;
                        setNewQuestion({ ...newQuestion, options: updated });
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Explanation / Solution (Bangla)</label>
                <textarea
                  rows={2}
                  placeholder="Provide authoritative explanation for students..."
                  value={newQuestion.explanationBn}
                  onChange={(e) => setNewQuestion({ ...newQuestion, explanationBn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                />
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
                  Save Question to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
