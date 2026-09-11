'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  FileQuestion,
  ChevronDown,
  Calendar,
  BookOpen,
  Award,
  Users,
  TrendingUp,
  Target,
  Activity,
  X,
  Edit2,
  Layers,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useDeleteFlow } from '@/hooks/useDeleteFlow';

type Portal = {
  key: string;
  title: string;
  bn: string;
  icon?: string;
  badge?: string;
  color?: string;
  isEnabled?: boolean;
  units?: PortalUnit[];
  hasUnits?: boolean;
};

type PortalYear = {
  year: number;
  questionCount: number;
  durationMinutes: number;
  totalMarks: number;
  isConfigured: boolean;
};

type PortalUnit = {
  id: string;
  key: string;
  titleEn: string;
  titleBn: string;
  badge?: string | null;
  isEnabled?: boolean;
  // Absent on the bootstrap payload; filled in once the portal detail lands.
  questionCount?: number;
};

type PortalData = {
  units: PortalUnit[];
  unit: { key: string; titleEn: string; titleBn: string } | null;
  years: PortalYear[];
  subjects: any[];
  exams: any[];
  stats: {
    enrolledUsers: number;
    totalAttempts: number;
    totalQuestions: number;
    averageScore: number;
    passingRate: number;
  };
  recentSubmissions: any[];
};

const EMPTY_PORTAL_DATA: PortalData = {
  units: [],
  unit: null,
  years: [],
  subjects: [],
  exams: [],
  stats: { enrolledUsers: 0, totalAttempts: 0, totalQuestions: 0, averageScore: 0, passingRate: 0 },
  recentSubmissions: [],
};

/** One MCQ inside the batch form. */
function emptyQuestionItem() {
  return {
    questionBn: '',
    questionEn: '',
    explanationBn: '',
    explanationEn: '',
    error: '' as string,
    options: [
      { optionKey: 'A', textEn: '', textBn: '', isCorrect: true },
      { optionKey: 'B', textEn: '', textBn: '', isCorrect: false },
      { optionKey: 'C', textEn: '', textBn: '', isCorrect: false },
      { optionKey: 'D', textEn: '', textBn: '', isCorrect: false },
    ],
  };
}

type QuestionItem = ReturnType<typeof emptyQuestionItem>;

/**
 * Subject, chapter, year and difficulty are shared by every question in the
 * form, so a whole paper for one chapter is entered in a single pass.
 */
function emptyBatch(year: number, subjectId = '') {
  return {
    subjectId,
    topicId: '',
    year,
    difficulty: 'MEDIUM',
    items: [emptyQuestionItem()] as QuestionItem[],
  };
}

export default function ExamPortalManagerPage() {
  const [portals, setPortals] = useState<{ university: Portal[]; jobs: Portal[] }>({
    university: [],
    jobs: [],
  });
  const [selectedKey, setSelectedKey] = useState<string>('');
  // '' means "all units" — the portal as a whole.
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [activeTab, setActiveTab] =
    useState<'dashboard' | 'years' | 'subjects' | 'mocktests' | 'settings'>('dashboard');

  const [portalData, setPortalData] = useState<PortalData>(EMPTY_PORTAL_DATA);
  const [loading, setLoading] = useState(true);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const toast = useToast();

  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const questionFormRef = useRef<HTMLFormElement>(null);
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [batch, setBatch] = useState(emptyBatch(new Date().getFullYear()));
  const [newYear, setNewYear] = useState({
    year: new Date().getFullYear(),
    durationMinutes: 60,
    totalMarks: 100,
  });
  const [newMockTest, setNewMockTest] = useState({
    titleEn: '',
    titleBn: '',
    durationMinutes: 60,
    passMarks: 40,
    negativeMark: 0.25,
    marksPerQuestion: 1.0,
  });
  type MockBlueprintItem = {
    subjectId: string;
    topicId: string;
    questionCount: number;
    difficulty: 'ANY' | 'EASY' | 'MEDIUM' | 'HARD';
  };
  const [mockBlueprintItems, setMockBlueprintItems] = useState<MockBlueprintItem[]>([
    { subjectId: '', topicId: '', questionCount: 25, difficulty: 'ANY' },
  ]);
  // Copy a whole syllabus from another exam / unit.
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyFrom, setCopyFrom] = useState({ portalKey: '', unitKey: '' });
  // Chosen inside the add forms when the pill bar is on "All Units".
  const [formUnit, setFormUnit] = useState('');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  // New exam portal
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [newPortal, setNewPortal] = useState({
    key: '',
    titleEn: '',
    titleBn: '',
    icon: '',
    badge: '',
    group: 'UNIVERSITY' as 'UNIVERSITY' | 'JOBS',
  });

  // Unit create / rename
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<PortalUnit | null>(null);
  const [unitForm, setUnitForm] = useState({ key: '', titleEn: '', titleBn: '', badge: '' });

  // Subject create / rename
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [newSubject, setNewSubject] = useState({
    titleEn: '',
    titleBn: '',
    code: '',
    marks: '',
    // '' = attach to the whole portal (every unit inherits it).
    unitKey: '',
  });

  // Chapter create / rename
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [chapterSubject, setChapterSubject] = useState<any>(null);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [chapterForm, setChapterForm] = useState({ titleEn: '', titleBn: '' });

  const allPortals = [...(portals.university || []), ...(portals.jobs || [])];
  const selectedPortal = allPortals.find((p) => p.key === selectedKey);
  const isUniversity = portals.university?.some((p) => p.key === selectedKey);

  function notify(type: 'success' | 'error', text: string) {
    if (type === 'success') toast.success(text);
    else toast.error(text);
  }

  // Every destructive action on this page runs through one flow that shows the
  // real counts, waits for the API, and only refreshes when it actually worked.
  const deleteFlow = useDeleteFlow(notify);

  // The "attach existing" list is the global subject catalogue, so it has to
  // refresh whenever a subject is created, renamed or deleted.
  // Units live on the portals payload, so adding or renaming one refreshes it.
  const loadPortals = useCallback(async () => {
    const res = await fetchApi('/categories/portals');
    if (res.success && res.data) setPortals(res.data);
  }, []);

  const loadPortalDeepData = useCallback(async (key: string, unitKey = '') => {
    if (!key) return;
    setLoadingPortal(true);

    const query = unitKey ? `?unitKey=${encodeURIComponent(unitKey)}` : '';
    const res = await fetchApi(`/exams/portal/${encodeURIComponent(key)}${query}`);

    if (res.success && res.data) {
      setPortalData({ ...EMPTY_PORTAL_DATA, ...res.data });
    } else {
      setPortalData(EMPTY_PORTAL_DATA);
      notify('error', res.message || `Could not load ${key}.`);
    }

    setLoadingPortal(false);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);

      const portalsRes = await fetchApi('/categories/portals');

      if (portalsRes.success && portalsRes.data) {
        setPortals(portalsRes.data);
        const first = portalsRes.data.university?.[0] || portalsRes.data.jobs?.[0];
        if (first) setSelectedKey(first.key);
      }

      setLoading(false);
    }

    bootstrap();
  }, []);

  /**
   * Switching portal has to clear the unit in the SAME update. Doing it in an
   * effect left one render where the portal was already the new one while the
   * unit was still the old portal's — which fired a request for, say,
   * "Medical & Dental" + unit "KHA" and failed.
   *
   * Everything else scoped to the old portal is dropped here too, so no filter
   * or selection survives the switch.
   */
  function selectPortal(nextKey: string) {
    if (nextKey === selectedKey) return;

    setSelectedKey(nextKey);
    setSelectedUnit('');
    setFormUnit('');
    setExpandedSubjectId(null);
    setPortalData(EMPTY_PORTAL_DATA);
    setBatch((prev) => ({ ...prev, subjectId: '', topicId: '' }));
  }

  useEffect(() => {
    if (selectedKey) loadPortalDeepData(selectedKey, selectedUnit);
  }, [selectedKey, selectedUnit, loadPortalDeepData]);

  // If the loaded portal does not contain the selected unit (a stale link, or a
  // unit deleted in another tab), fall back to "all units" instead of looping
  // on a request the API will reject.
  useEffect(() => {
    if (!selectedUnit || !selectedPortal) return;
    const known = selectedPortal.units || [];
    if (known.length > 0 && !known.some((u) => u.key === selectedUnit)) setSelectedUnit('');
  }, [selectedPortal, selectedUnit]);

  // Keep the form pointed at a subject that belongs to this scope.
  useEffect(() => {
    setBatch((prev) => {
      const stillValid = portalData.subjects.some((s: any) => s.id === prev.subjectId);
      if (stillValid) return prev;
      return { ...prev, subjectId: portalData.subjects[0]?.id || '', topicId: '' };
    });
  }, [portalData.subjects]);

  // Appended to every scoped request so the API narrows to the same slice the
  // admin is looking at.
  const unitQuery = selectedUnit ? `unitKey=${encodeURIComponent(selectedUnit)}` : '';

  /**
   * Units come down with the portals list, so ক/খ/গ/ঘ label instantly on
   * switch. Live question counts arrive with the portal detail a moment later
   * and are merged in without blanking the labels.
   */
  const units: PortalUnit[] = (selectedPortal?.units || []).map((u) => ({
    ...u,
    questionCount:
      portalData.units.find((live) => live.key === u.key)?.questionCount ?? u.questionCount,
  }));
  const portalHasUnits = units.length > 0;
  const activeUnit = units.find((u) => u.key === selectedUnit) || null;

  /**
   * Where new content gets filed. While a unit is selected it follows the
   * filter; on "All Units" the admin picks one in the form, because a portal
   * with units must not hold anything at portal level.
   */
  const targetUnit = selectedUnit || formUnit;
  const needsUnitChoice = portalHasUnits && !selectedUnit;
  const canWrite = !portalHasUnits || Boolean(targetUnit);
  const scopeLabel = activeUnit
    ? `${selectedPortal?.title} ${activeUnit.titleBn}`
    : selectedPortal?.title || selectedKey;

  /**
   * The eye icon is the control: one click flips visibility and saves it, so
   * there is nothing to remember to press afterwards.
   */
  async function toggleVisibility() {
    if (!selectedPortal || togglingVisibility) return;

    const next = !selectedPortal.isEnabled;
    setTogglingVisibility(true);

    // Optimistic, so the icon responds immediately.
    updateSelectedField('isEnabled', next);

    const res = await fetchApi(`/portals/${encodeURIComponent(selectedKey)}`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled: next }),
    });

    setTogglingVisibility(false);

    if (res.success) {
      notify('success', res.data?.message || res.message || 'Visibility updated.');
    } else {
      // Put it back the way it was.
      updateSelectedField('isEnabled', !next);
      notify('error', res.message || 'Could not change visibility.');
    }
  }

  function updateSelectedField(field: string, value: any) {
    if (!selectedPortal) return;

    const section = isUniversity ? 'university' : 'jobs';
    setPortals({
      ...portals,
      [section]: portals[section].map((item) =>
        item.key === selectedKey ? { ...item, [field]: value } : item,
      ),
    });
  }


  async function handleCreatePortal(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetchApi('/portals/create', {
      method: 'POST',
      body: JSON.stringify(newPortal),
    });

    setSubmitting(false);

    if (!res.success) {
      notify('error', res.message || 'Could not create the exam portal.');
      return;
    }

    setIsPortalModalOpen(false);
    notify('success', `${newPortal.titleEn} added. It is now live in the app.`);

    // Reload the list, then jump straight to the new exam.
    const listed = await fetchApi('/categories/portals');
    if (listed.success && listed.data) setPortals(listed.data);
    selectPortal(newPortal.key.trim());
  }

  async function handleSaveUnit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = editingUnit
      ? await fetchApi(
          `/portals/${encodeURIComponent(selectedKey)}/units/${encodeURIComponent(editingUnit.key)}`,
          { method: 'PATCH', body: JSON.stringify(unitForm) },
        )
      : await fetchApi(`/portals/${encodeURIComponent(selectedKey)}/units`, {
          method: 'POST',
          body: JSON.stringify(unitForm),
        });

    setSubmitting(false);

    if (res.success) {
      setIsUnitModalOpen(false);
      setEditingUnit(null);
      notify(
        'success',
        editingUnit
          ? `Updated the ${unitForm.titleEn} unit.`
          : `Added ${unitForm.titleEn} to ${selectedPortal?.title}.`,
      );
      loadPortals();
      loadPortalDeepData(selectedKey, selectedUnit);
    } else {
      notify('error', res.message || 'Failed to save the unit.');
    }
  }

  function confirmDeleteUnit(unit: PortalUnit) {
    deleteFlow.request({
      title: `Delete the ${unit.titleBn} unit?`,
      description:
        'The unit is removed from this portal along with its own papers, syllabus and questions. Other units are untouched.',
      details: [
        { label: 'Exam portal', value: selectedPortal?.title || selectedKey },
        { label: 'Unit', value: `${unit.titleEn} (${unit.titleBn})` },
        {
          label: 'Questions in this unit',
          value: unit.questionCount ?? 0,
          danger: (unit.questionCount ?? 0) > 0,
        },
        { label: 'Other units', value: 'Untouched' },
      ],
      warning:
        (unit.questionCount ?? 0) > 0
          ? `${unit.questionCount} question(s) filed under ${unit.titleBn} will be destroyed.`
          : undefined,
      confirmPhrase: (unit.questionCount ?? 0) > 0 ? unit.key : undefined,
      confirmText: 'Delete Unit',
      endpoint:
        `/portals/${encodeURIComponent(selectedKey)}/units/${encodeURIComponent(unit.key)}` +
        ((unit.questionCount ?? 0) > 0 ? '?force=true' : ''),
      onSuccess: () => {
        if (selectedUnit === unit.key) setSelectedUnit('');
        loadPortals();
        loadPortalDeepData(selectedKey, selectedUnit === unit.key ? '' : selectedUnit);
      },
    });
  }

  async function handleSaveAll() {
    setSaving(true);

    const res = await fetchApi('/categories/portals', {
      method: 'POST',
      body: JSON.stringify(portals),
    });

    setSaving(false);

    if (res.success) {
      notify('success', `Saved. ${selectedPortal?.title} is live in the mobile app.`);
    } else {
      notify('error', res.message || 'Failed to save changes.');
    }
  }

  function updateQuestionItem(index: number, patch: Partial<QuestionItem>) {
    setBatch((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, ...patch, error: '' } : it)),
    }));
  }

  function addQuestionItem() {
    setBatch((prev) => ({ ...prev, items: [...prev.items, emptyQuestionItem()] }));
  }

  function removeQuestionItem(index: number) {
    setBatch((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  /**
   * Saves every question in the form against the shared subject / chapter /
   * year. Each is posted individually so one bad entry cannot discard the
   * rest — the ones that saved are removed and any failures stay on screen
   * with their reason attached.
   */
  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const results = await Promise.all(
      batch.items.map(async (item) => {
        const res = await fetchApi('/questions', {
          method: 'POST',
          body: JSON.stringify({
            subjectId: batch.subjectId,
            topicId: batch.topicId || undefined,
            year: Number(batch.year),
            difficulty: batch.difficulty,
            questionBn: item.questionBn,
            questionEn: item.questionEn || item.questionBn,
            explanationBn: item.explanationBn,
            explanationEn: item.explanationEn,
            options: item.options,
            portalKey: selectedKey,
            unitKey: targetUnit || undefined,
          }),
        });
        return { item, res };
      }),
    );

    setSubmitting(false);

    const failed = results.filter((r) => !r.res.success);
    const savedCount = results.length - failed.length;
    const wroteTo = units.find((u) => u.key === targetUnit);
    const scope = `${selectedPortal?.title}${wroteTo ? ` ${wroteTo.titleBn}` : ''}`;

    if (failed.length === 0) {
      setIsQuestionModalOpen(false);
      setBatch(emptyBatch(Number(batch.year), batch.subjectId));
      notify(
        'success',
        `${savedCount} question${savedCount === 1 ? '' : 's'} added to ${scope} (${batch.year}).`,
      );

      // Jump the filter to the unit just written to, so the new questions show.
      if (targetUnit && targetUnit !== selectedUnit) setSelectedUnit(targetUnit);
      else loadPortalDeepData(selectedKey, selectedUnit);
      return;
    }

    // Keep only what failed, each carrying its reason.
    setBatch((prev) => ({
      ...prev,
      items: failed.map((f) => ({
        ...f.item,
        error: f.res.message || 'Could not be saved.',
      })),
    }));

    if (savedCount > 0) {
      notify(
        'error',
        `${savedCount} saved, ${failed.length} could not be. Fix the ones below and save again.`,
      );
      loadPortalDeepData(selectedKey, selectedUnit);
    } else {
      notify('error', failed[0].res.message || 'None of the questions could be saved.');
    }
  }

  async function handleAddYear(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetchApi(`/portals/${encodeURIComponent(selectedKey)}/years`, {
      method: 'POST',
      body: JSON.stringify({ ...newYear, unitKey: targetUnit || undefined }),
    });

    setSubmitting(false);

    if (res.success) {
      setIsYearModalOpen(false);
      const wroteTo = units.find((u) => u.key === targetUnit);
      notify(
        'success',
        `${newYear.year} paper added to ${selectedPortal?.title}${wroteTo ? ` ${wroteTo.titleBn}` : ''}.`,
      );
      if (targetUnit && targetUnit !== selectedUnit) setSelectedUnit(targetUnit);
      else loadPortalDeepData(selectedKey, selectedUnit);
    } else {
      notify('error', res.message || 'Failed to add the year.');
    }
  }

  async function handleUpdateSubjectMarks(subjectId: string, raw: string) {
    const current = portalData.subjects.find((s: any) => s.id === subjectId);
    const next = raw.trim() === '' ? null : Number(raw);

    if ((current?.marks ?? null) === next) return;

    const res = await fetchApi(
      `/portals/${encodeURIComponent(selectedKey)}/subjects/${subjectId}`,
      { method: 'PATCH', body: JSON.stringify({ marks: next, unitKey: selectedUnit || undefined }) },
    );

    if (res.success) {
      notify('success', `Updated marks weight for ${current?.titleEn}.`);
      loadPortalDeepData(selectedKey, selectedUnit);
    } else {
      notify('error', res.message || 'Failed to update the marks weight.');
    }
  }

  function openEditSubject(sub: any) {
    // Remember the scope this row was listed under, so the dialog can tell an
    // edit-in-place from a move to another unit.
    setEditingSubject({ ...sub, scopeUnitKey: selectedUnit });
    setNewSubject({
      titleEn: sub.titleEn,
      titleBn: sub.titleBn || '',
      code: sub.code,
      marks: sub.marks ?? '',
      unitKey: selectedUnit,
    });
    setIsSubjectModalOpen(true);
  }

  /** Human name for a syllabus scope, used in the messages below. */
  function scopeName(unitKey: string) {
    const unit = units.find((u) => u.key === unitKey);
    return unit
      ? `${selectedPortal?.title} ${unit.titleBn}`
      : `${selectedPortal?.title}${portalHasUnits ? ' (all units)' : ''}`;
  }

  async function handleSaveSubject(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    // Subjects belong to one exam + unit, so creating one posts to that scope.
    // Editing only touches that subject's own record.
    const res = editingSubject
      ? await fetchApi(`/subjects/${editingSubject.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            titleEn: newSubject.titleEn,
            titleBn: newSubject.titleBn,
            code: newSubject.code,
          }),
        })
      : await fetchApi(`/portals/${encodeURIComponent(selectedKey)}/subjects`, {
          method: 'POST',
          body: JSON.stringify({
            titleEn: newSubject.titleEn,
            titleBn: newSubject.titleBn || newSubject.titleEn,
            code: newSubject.code || newSubject.titleEn,
            marks: newSubject.marks === '' ? null : Number(newSubject.marks),
            unitKey: newSubject.unitKey || undefined,
          }),
        });

    if (!res.success) {
      setSubmitting(false);
      notify('error', res.message || 'Failed to save the subject.');
      return;
    }

    // Marks live on the subject row; update them for an edit.
    if (editingSubject) {
      await fetchApi(
        `/portals/${encodeURIComponent(selectedKey)}/subjects/${editingSubject.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            marks: newSubject.marks === '' ? null : Number(newSubject.marks),
          }),
        },
      );
    }

    setSubmitting(false);
    setIsSubjectModalOpen(false);
    setEditingSubject(null);

    notify(
      'success',
      editingSubject
        ? `Saved ${newSubject.titleEn}.`
        : `Created ${newSubject.titleEn} in ${scopeName(newSubject.unitKey)}.`,
    );

    loadPortalDeepData(selectedKey, selectedUnit);
  }

  async function handleCopySyllabus(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetchApi(`/portals/${encodeURIComponent(selectedKey)}/subjects/copy`, {
      method: 'POST',
      body: JSON.stringify({
        fromPortalKey: copyFrom.portalKey,
        fromUnitKey: copyFrom.unitKey || undefined,
        unitKey: selectedUnit || undefined,
      }),
    });

    setSubmitting(false);

    if (res.success) {
      setIsCopyModalOpen(false);
      notify('success', res.data?.message || 'Syllabus copied.');
      loadPortalDeepData(selectedKey, selectedUnit);
    } else {
      notify('error', res.message || 'Could not copy that syllabus.');
    }
  }

  async function handleSaveChapter(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = editingChapter
      ? await fetchApi(`/subjects/topics/${editingChapter.id}`, {
          method: 'PATCH',
          body: JSON.stringify(chapterForm),
        })
      : await fetchApi(`/subjects/${chapterSubject.id}/topics`, {
          method: 'POST',
          body: JSON.stringify({
            titleEn: chapterForm.titleEn,
            titleBn: chapterForm.titleBn || chapterForm.titleEn,
          }),
        });

    setSubmitting(false);

    if (res.success) {
      setIsChapterModalOpen(false);
      setEditingChapter(null);
      notify(
        'success',
        editingChapter
          ? `Renamed the chapter to ${chapterForm.titleEn}.`
          : `Added ${chapterForm.titleEn} to ${chapterSubject?.titleEn}.`,
      );
      loadPortalDeepData(selectedKey, selectedUnit);
    } else {
      notify('error', res.message || 'Failed to save the chapter.');
    }
  }

  async function handleCreateMockTest(e: React.FormEvent) {
    e.preventDefault();

    const validItems = mockBlueprintItems.filter((i) => i.subjectId && i.questionCount > 0);
    if (validItems.length === 0) {
      notify('error', 'Add at least one subject with a question count to the blueprint.');
      return;
    }

    const totalQuestions = validItems.reduce((sum, i) => sum + Number(i.questionCount), 0);
    setSubmitting(true);

    const res = await fetchApi('/exams', {
      method: 'POST',
      body: JSON.stringify({
        ...newMockTest,
        portalKey: selectedKey,
        unitKey: targetUnit || undefined,
        titleEn: newMockTest.titleEn || `${selectedPortal?.title} Model Test`,
        titleBn: newMockTest.titleBn || `${selectedPortal?.bn || selectedKey} মডেল টেস্ট`,
        slug: `${selectedKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-model-test-${Date.now()
          .toString()
          .slice(-6)}`,
        totalQuestions,
        isPublished: true,
        blueprintItems: validItems.map((i) => ({
          subjectId: i.subjectId,
          topicId: i.topicId || undefined,
          questionCount: Number(i.questionCount),
          marks: newMockTest.marksPerQuestion,
          negativeMarks: newMockTest.negativeMark,
          difficulty: i.difficulty,
        })),
      }),
    });

    setSubmitting(false);

    if (res.success) {
      setIsMockModalOpen(false);
      setNewMockTest({ ...newMockTest, titleEn: '', titleBn: '' });
      setMockBlueprintItems([{ subjectId: '', topicId: '', questionCount: 25, difficulty: 'ANY' }]);
      notify('success', `Model test created for ${selectedPortal?.title}.`);
      loadPortalDeepData(selectedKey, selectedUnit);
    } else {
      notify('error', res.message || 'Failed to create the model test.');
    }
  }

  // ---- Destructive actions, each with the facts attached ----

  function confirmClearPaper(yr: PortalYear) {
    deleteFlow.request({
      title: `Delete the ${yr.year} ${scopeLabel} paper?`,
      description:
        'Every question and answer option stored for this portal and year is permanently removed.',
      details: [
        { label: 'Exam portal', value: selectedPortal?.title || selectedKey },
        { label: 'Admission unit', value: activeUnit ? activeUnit.titleBn : 'All units' },
        { label: 'Paper year', value: yr.year },
        { label: 'Questions to delete', value: `${yr.questionCount} MCQs`, danger: yr.questionCount > 0 },
        { label: 'Other units / portals', value: 'Untouched' },
      ],
      warning:
        yr.questionCount > 0
          ? `${yr.questionCount} question(s) and their options will be destroyed. This cannot be undone.`
          : undefined,
      confirmPhrase: yr.questionCount >= 10 ? String(yr.year) : undefined,
      confirmText: 'Delete Questions',
      endpoint:
        `/questions/admin/clear-paper?portalKey=${encodeURIComponent(selectedKey)}&year=${yr.year}` +
        (unitQuery ? `&${unitQuery}` : ''),
      onSuccess: () => loadPortalDeepData(selectedKey, selectedUnit),
    });
  }

  function confirmRemoveYear(yr: PortalYear) {
    deleteFlow.request({
      title: `Remove the ${yr.year} paper card?`,
      description: `${yr.year} disappears from ${scopeLabel}. Nothing else changes because it holds no questions.`,
      details: [
        { label: 'Exam portal', value: selectedPortal?.title || selectedKey },
        { label: 'Admission unit', value: activeUnit ? activeUnit.titleBn : 'All units' },
        { label: 'Paper year', value: yr.year },
        { label: 'Questions stored', value: '0' },
      ],
      confirmText: 'Remove Year',
      endpoint:
        `/portals/${encodeURIComponent(selectedKey)}/years/${yr.year}` +
        (unitQuery ? `?${unitQuery}` : ''),
      onSuccess: () => loadPortalDeepData(selectedKey, selectedUnit),
    });
  }

  function confirmDetachSubject(sub: any) {
    const count = sub.stats?.questionsInPortal ?? 0;

    deleteFlow.request({
      title: `Detach ${sub.titleEn} from ${scopeLabel}?`,
      description:
        count > 0
          ? 'This subject still holds questions in this portal. Detaching deletes them.'
          : 'The subject stays in the system and keeps its chapters; it is only removed from this portal\'s syllabus.',
      details: [
        { label: 'Subject', value: sub.titleEn },
        { label: 'Scope', value: scopeLabel },
        { label: `Questions in ${scopeLabel}`, value: count, danger: count > 0 },
        { label: 'Questions in other portals', value: (sub.stats?.questionsEverywhere ?? 0) - count },
        { label: 'Chapters kept', value: sub.topics?.length || 0 },
      ],
      warning:
        count > 0
          ? `${count} question(s) filed under ${sub.titleEn} in this portal will be deleted.`
          : undefined,
      confirmPhrase: count > 0 ? sub.code : undefined,
      confirmText: count > 0 ? 'Detach & Delete Questions' : 'Detach Subject',
      endpoint:
        `/portals/${encodeURIComponent(selectedKey)}/subjects/${sub.id}?` +
        [count > 0 ? 'force=true' : '', unitQuery].filter(Boolean).join('&'),
      onSuccess: () => loadPortalDeepData(selectedKey, selectedUnit),
    });
  }

  function confirmDeleteSubject(sub: any) {
    const everywhere = sub.stats?.questionsEverywhere ?? 0;
    const otherPortals = (sub.usedByPortals || []).length;

    deleteFlow.request({
      title: `Delete ${sub.titleEn} from ${scopeLabel}?`,
      description:
        'This subject belongs to this exam only, so nothing else is affected. Its chapters and any questions filed under it go with it.',
      details: [
        { label: 'Subject', value: `${sub.titleEn} (${sub.code})` },
        { label: 'Chapters', value: sub.topics?.length || 0, danger: (sub.topics?.length || 0) > 0 },
        { label: 'Questions in this exam', value: everywhere, danger: everywhere > 0 },
        { label: 'Other exams affected', value: 'None' },
      ],
      warning:
        everywhere > 0
          ? `${everywhere} question(s) will be destroyed. This cannot be undone.`
          : 'The subject and its chapters will be removed from this exam.',
      confirmPhrase: sub.code,
      confirmText: 'Delete Subject',
      endpoint: `/portals/${encodeURIComponent(selectedKey)}/subjects/${sub.id}${
        everywhere > 0 ? '?force=true' : ''
      }`,
      onSuccess: () => loadPortalDeepData(selectedKey, selectedUnit),
    });
  }

  function confirmDeleteChapter(sub: any, topic: any) {
    const count = topic._count?.questions || 0;

    deleteFlow.request({
      title: `Delete the chapter ${topic.titleEn}?`,
      description:
        count > 0
          ? 'The questions are kept but become unassigned from any chapter.'
          : 'This chapter holds no questions.',
      details: [
        { label: 'Subject', value: sub.titleEn },
        { label: 'Chapter', value: topic.titleEn },
        { label: 'Questions in this chapter', value: count },
        { label: 'Questions deleted', value: '0 — they are kept' },
      ],
      warning:
        count > 0
          ? `${count} question(s) will remain in the bank but lose their chapter tag.`
          : undefined,
      confirmText: 'Delete Chapter',
      endpoint: `/subjects/topics/${topic.id}`,
      onSuccess: () => loadPortalDeepData(selectedKey, selectedUnit),
    });
  }

  function confirmDeleteModelTest(exam: any) {
    const count = exam._count?.questions || 0;

    deleteFlow.request({
      title: `Delete the model test ${exam.titleEn}?`,
      description:
        'The test and its blueprint are removed. Questions filed under it stay in the portal question bank.',
      details: [
        { label: 'Model test', value: exam.titleEn },
        { label: 'Exam portal', value: selectedPortal?.title || selectedKey },
        { label: 'Questions attached', value: count },
        { label: 'Attempts recorded', value: exam._count?.attempts || 0, danger: (exam._count?.attempts || 0) > 0 },
      ],
      warning:
        (exam._count?.attempts || 0) > 0
          ? `${exam._count.attempts} student attempt(s) will be deleted with this test.`
          : undefined,
      confirmText: 'Delete Model Test',
      endpoint: `/exams/${exam.id}`,
      onSuccess: () => loadPortalDeepData(selectedKey, selectedUnit),
    });
  }

  // The subject every question in the form is filed under; drives the chapter list.
  const batchSubject = portalData.subjects.find((s: any) => s.id === batch.subjectId);

  // Rendered inside each add form when the pill bar is on "All Units".
  const unitPicker = needsUnitChoice ? (
    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 space-y-1.5">
      <label className="font-bold text-amber-900 block uppercase tracking-wider text-[11px]">
        Which unit? <span className="text-rose-600">*</span>
      </label>
      <select
        required
        value={formUnit}
        onChange={(e) => setFormUnit(e.target.value)}
        className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
      >
        <option value="" disabled>
          Select a unit
        </option>
        {units.map((u) => (
          <option key={u.key} value={u.key}>
            {u.titleBn} — {u.titleEn}
            {u.badge ? ` (${u.badge})` : ''}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-amber-800">
        {selectedPortal?.title} is split into units, so this must belong to one of them.
      </p>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-slate-400">Loading exam portals…</div>
    );
  }

  if (allPortals.length === 0) {
    return (
      <div className="p-16 text-center space-y-2">
        <p className="text-sm font-bold text-slate-800">No exam portals exist yet.</p>
        <p className="text-xs text-slate-500">
          Run the database seed, or create a portal from the API, to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header: portal identity + selector + save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl shadow-sm">
            {selectedPortal?.icon || '🎓'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {selectedPortal?.title || selectedKey}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  selectedPortal?.isEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {selectedPortal?.isEnabled ? 'Live on App' : 'Hidden'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              {selectedPortal?.bn} • {selectedPortal?.badge}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[260px]">
            <select
              value={selectedKey}
              onChange={(e) => selectPortal(e.target.value)}
              className="w-full pl-3.5 pr-8 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-800 cursor-pointer shadow-sm"
            >
              {portals.university?.length > 0 && (
                <optgroup label="🎓 University & Admission Exams">
                  {portals.university.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.icon} {p.title} ({p.bn})
                    </option>
                  ))}
                </optgroup>
              )}
              {portals.jobs?.length > 0 && (
                <optgroup label="💼 Job & Career Exams">
                  {portals.jobs.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.icon} {p.title} ({p.bn})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          <button
            onClick={() => {
              setNewPortal({
                key: '',
                titleEn: '',
                titleBn: '',
                icon: '',
                badge: '',
                group: isUniversity ? 'UNIVERSITY' : 'JOBS',
              });
              setIsPortalModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 whitespace-nowrap"
            title="Add a new exam portal"
          >
            <Plus className="w-4 h-4" /> New Exam
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>


      {/* Admission unit selector — only for portals that have units */}
      {/* Every portal can be split into units — the bar is always here so that
          stays discoverable, not buried in Portal Configuration. */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
          Unit
        </span>

        {!portalHasUnits && (
          <>
            <span className="text-xs text-slate-500">
              {selectedPortal?.title} is managed as one bank — no units.
            </span>
            <button
              onClick={() => {
                setEditingUnit(null);
                setUnitForm({ key: '', titleEn: '', titleBn: '', badge: '' });
                setIsUnitModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Split into units
            </button>
          </>
        )}

        {portalHasUnits && (
          <>

          <button
            onClick={() => setSelectedUnit('')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              selectedUnit === ''
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Units
            <span
              className={`ml-1.5 ${selectedUnit === '' ? 'text-emerald-400' : 'text-slate-400'}`}
            >
              {units.reduce((n, u) => n + (u.questionCount ?? 0), 0)}
            </span>
          </button>

          {units.map((u) => {
            const isSelected = selectedUnit === u.key;
            return (
              <button
                key={u.key}
                onClick={() => setSelectedUnit(u.key)}
                title={u.badge || u.titleEn}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {u.titleBn}
                <span className={`ml-1.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {u.questionCount ?? '·'}
                </span>
              </button>
            );
          })}

            <button
              onClick={() => {
                setEditingUnit(null);
                setUnitForm({ key: '', titleEn: '', titleBn: '', badge: '' });
                setIsUnitModalOpen(true);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-dashed border-slate-300 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 flex items-center gap-1"
              title="Add another unit to this portal"
            >
              <Plus className="w-3.5 h-3.5" /> Unit
            </button>

            <span className="ml-auto text-[11px] text-slate-400">
              {selectedUnit
                ? `Every tab below is scoped to ${activeUnit?.titleBn}`
                : 'Every tab below covers all units combined'}
            </span>
          </>
        )}
      </div>

      {selectedPortal && (
        <div className="space-y-6">
          {/* Sub-navigation. Every tab below reads the portal + unit scope above. */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <span className="w-full text-[11px] font-semibold text-slate-400 -mb-1">
              Showing{' '}
              <span className="text-slate-700 font-bold">
                {selectedPortal.title}
                {activeUnit ? ` · ${activeUnit.titleBn}` : portalHasUnits ? ' · all units' : ''}
              </span>
            </span>
            {[
              { id: 'dashboard', label: 'Overview Dashboard', icon: Activity },
              { id: 'years', label: 'Year-by-Year Question Bank', icon: Calendar },
              { id: 'subjects', label: 'Subjects & Chapters', icon: BookOpen },
              { id: 'mocktests', label: 'Model Tests & Blueprints', icon: Award },
              { id: 'settings', label: 'Portal Configuration', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Questions in Bank
                    </span>
                    <div className="text-2xl font-black text-slate-900">
                      {portalData.stats.totalQuestions}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Only {selectedPortal.title}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Enrolled Students
                    </span>
                    <div className="text-2xl font-black text-slate-900">
                      {portalData.stats.enrolledUsers}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {portalData.stats.totalAttempts} tests taken
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Average Score
                    </span>
                    <div className="text-2xl font-black text-slate-900">
                      {portalData.stats.averageScore}%
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      Pass Rate: {portalData.stats.passingRate}%
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Target className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Mobile App Status
                    </span>
                    <div className="text-base font-bold text-slate-900">
                      {selectedPortal.isEnabled ? 'Visible on App' : 'Hidden'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleVisibility}
                    disabled={togglingVisibility}
                    aria-pressed={selectedPortal.isEnabled}
                    title={
                      selectedPortal.isEnabled
                        ? `Hide ${selectedPortal.title} from the app`
                        : `Show ${selectedPortal.title} on the app`
                    }
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 disabled:opacity-60 disabled:cursor-wait ${
                      selectedPortal.isEnabled
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:ring-2 hover:ring-emerald-200'
                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:ring-2 hover:ring-rose-200'
                    }`}
                  >
                    {togglingVisibility ? (
                      <span className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : selectedPortal.isEnabled ? (
                      <Eye className="w-6 h-6" />
                    ) : (
                      <EyeOff className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent attempts */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      Recent Student Attempts ({selectedPortal.title})
                    </h3>
                  </div>

                  {portalData.recentSubmissions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No student test attempts recorded yet for this portal.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {portalData.recentSubmissions.map((att: any) => (
                        <div key={att.id} className="py-3 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900">
                              {att.user?.name || 'Student'}
                            </span>
                            <div className="text-[10px] text-slate-400">{att.user?.email}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-700 text-sm">
                              {att.score || 0} Marks
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {new Date(att.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Papers, straight from the database */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Past Question Papers ({selectedPortal.title})
                    </h3>
                    <button
                      onClick={() => setIsQuestionModalOpen(true)}
                      className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Question
                    </button>
                  </div>

                  {portalData.years.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                      <p>No question paper years registered for this portal yet.</p>
                      <button
                        onClick={() => {
                          setActiveTab('years');
                          setIsYearModalOpen(true);
                        }}
                        className="text-emerald-600 font-bold hover:underline"
                      >
                        Add the first year →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {portalData.years.slice(0, 4).map((yr) => (
                        <div
                          key={yr.year}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{yr.year} Paper</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              {yr.questionCount} MCQs
                            </span>
                          </div>
                          <Link
                            href={`/portals/${encodeURIComponent(selectedPortal.key)}/${yr.year}${
                              selectedUnit ? `?unit=${encodeURIComponent(selectedUnit)}` : ''
                            }`}
                            className="text-[10px] text-emerald-600 font-bold hover:underline block pt-1"
                          >
                            View Paper →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: YEAR-BY-YEAR QUESTION BANK */}
          {activeTab === 'years' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Previous Year Question Papers for {selectedPortal.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {portalData.stats.totalQuestions} question(s) filed under this portal — no other
                    portal can see them.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsYearModalOpen(true)}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Year
                  </button>
                  <button
                    onClick={() => setIsQuestionModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add MCQ
                  </button>
                </div>
              </div>

              {loadingPortal ? (
                <div className="p-10 text-center text-xs text-slate-400">Loading papers…</div>
              ) : portalData.years.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800">No exam years registered yet.</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Add the years {selectedPortal.title} actually has papers for. Adding a question
                    for a new year registers that year automatically.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {portalData.years.map((yr) => (
                    <div
                      key={yr.year}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{yr.year} Paper</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            {yr.questionCount} MCQs
                          </span>
                          {yr.questionCount > 0 ? (
                            <button
                              onClick={() => confirmClearPaper(yr)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title={`Delete all ${yr.year} questions`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => confirmRemoveYear(yr)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title={`Remove the empty ${yr.year} card`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {yr.durationMinutes} mins • {yr.totalMarks} marks
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                        <Link
                          href={`/portals/${encodeURIComponent(selectedPortal.key)}/${yr.year}${
                            selectedUnit ? `?unit=${encodeURIComponent(selectedUnit)}` : ''
                          }`}
                          className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          View →
                        </Link>
                        <button
                          onClick={() => {
                            setBatch((prev) => ({ ...prev, year: yr.year }));
                            setIsQuestionModalOpen(true);
                          }}
                          className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUBJECTS & CHAPTERS */}
          {activeTab === 'subjects' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Syllabus for {selectedPortal.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {portalData.subjects.length} subject(s) ·{' '}
                      {portalData.subjects.reduce(
                        (n: number, s: any) => n + (s.topics?.length || 0),
                        0,
                      )}{' '}
                      chapter(s) · {portalData.stats.totalQuestions} question(s).
                      {needsUnitChoice
                        ? ' Showing every unit together — pick a unit above to add or edit.'
                        : ' These belong to this exam and unit alone; no other exam shares them.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <button
                      disabled={needsUnitChoice}
                      onClick={() => {
                        setCopyFrom({ portalKey: '', unitKey: '' });
                        setIsCopyModalOpen(true);
                      }}
                      className="px-4 py-2.5 bg-white border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
                      title={
                        needsUnitChoice
                          ? 'Pick a unit first'
                          : 'Copy subjects and chapters from another exam or unit'
                      }
                    >
                      <Layers className="w-4 h-4" /> Copy Syllabus
                    </button>


                    <button
                      onClick={() => {
                        setNewSubject({
                          titleEn: '',
                          titleBn: '',
                          code: '',
                          marks: '',
                          unitKey: selectedUnit,
                        });
                        setIsSubjectModalOpen(true);
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> New Subject
                    </button>
                  </div>
                </div>

                {portalData.subjects.length === 0 ? (
                  <div className="p-12 text-center space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      {scopeLabel} has no subjects yet.
                    </p>
                    <p className="text-xs text-slate-500">
                      Create one, or copy a whole syllabus from another exam or unit.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {portalData.subjects.map((sub: any) => {
                      const isExpanded = expandedSubjectId === sub.id;
                      const stats = sub.stats || {};
                      const difficulty = stats.difficulty || {};

                      return (
                        <div
                          key={sub.id}
                          className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                        >
                          {/* Subject header row */}
                          <div className="p-4 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <button
                              onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                              className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                            >
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">
                                  {sub.titleEn}
                                  <span className="ml-2 text-[10px] font-mono font-bold text-slate-400">
                                    {sub.code}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-sans truncate">
                                  {sub.titleBn}
                                  {sub.fromUnit && sub.unit ? (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                                      {sub.unit.titleBn}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                              <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                {stats.questionsInPortal ?? 0} MCQs here
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                                {stats.chapterCount ?? 0} chapters
                              </span>

                              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500">Marks</span>
                                <input
                                  type="number"
                                  min={0}
                                  defaultValue={sub.marks ?? ''}
                                  placeholder="—"
                                  onBlur={(e) => handleUpdateSubjectMarks(sub.id, e.target.value)}
                                  className="w-12 text-[11px] font-bold text-slate-900 bg-transparent outline-none text-center"
                                />
                              </div>

                              <button
                                onClick={() => openEditSubject(sub)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                                title="Rename this subject"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => confirmDetachSubject(sub)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                title={`Delete from ${scopeLabel}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => confirmDeleteSubject(sub)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete this subject everywhere"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-4 space-y-4 border-t border-slate-200">
                              {/* Detail strip */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                  <div className="text-base font-black text-slate-900">
                                    {stats.questionsInPortal ?? 0}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                                    In {selectedPortal.title}
                                  </div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                  <div className="text-base font-black text-slate-900">
                                    {stats.questionsEverywhere ?? 0}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                                    All portals
                                  </div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                  <div className="text-base font-black text-slate-900">
                                    {stats.chaptersWithQuestions ?? 0}/{stats.chapterCount ?? 0}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                                    Chapters used
                                  </div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                  <div className="text-base font-black text-slate-900">
                                    {(stats.years || []).length}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                                    Years covered
                                  </div>
                                </div>
                              </div>

                              {/* Difficulty + year spread */}
                              {(stats.questionsInPortal ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {['EASY', 'MEDIUM', 'HARD'].map((level) =>
                                    difficulty[level] ? (
                                      <span
                                        key={level}
                                        className="text-[10px] px-2 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-600"
                                      >
                                        {level}: {difficulty[level]}
                                      </span>
                                    ) : null,
                                  )}
                                  {(stats.years || []).map((y: any) => (
                                    <span
                                      key={y.year}
                                      className="text-[10px] px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-700"
                                    >
                                      {y.year}: {y.count}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Chapters */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    Chapters
                                  </span>
                                  <button
                                    onClick={() => {
                                      setChapterSubject(sub);
                                      setEditingChapter(null);
                                      setChapterForm({ titleEn: '', titleBn: '' });
                                      setIsChapterModalOpen(true);
                                    }}
                                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add Chapter
                                  </button>
                                </div>

                                {(sub.topics || []).length === 0 ? (
                                  <p className="text-[11px] text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-xl">
                                    No chapters yet for {sub.titleEn}.
                                  </p>
                                ) : (
                                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                                    {sub.topics.map((topic: any) => (
                                      <div
                                        key={topic.id}
                                        className="flex items-center justify-between gap-3 px-3 py-2 bg-white"
                                      >
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-slate-800 truncate">
                                            {topic.titleEn}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-sans truncate">
                                            {topic.titleBn}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                              topic._count?.questions > 0
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-slate-100 text-slate-400'
                                            }`}
                                          >
                                            {topic._count?.questions || 0} MCQs
                                          </span>
                                          <button
                                            onClick={() => {
                                              setChapterSubject(sub);
                                              setEditingChapter(topic);
                                              setChapterForm({
                                                titleEn: topic.titleEn,
                                                titleBn: topic.titleBn || '',
                                              });
                                              setIsChapterModalOpen(true);
                                            }}
                                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                                            title="Rename chapter"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => confirmDeleteChapter(sub, topic)}
                                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                            title="Delete chapter"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MODEL TESTS */}
          {activeTab === 'mocktests' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Live Model Tests for {selectedPortal.title}
                </h3>

                <button
                  onClick={() => setIsMockModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Create New Model Test
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {portalData.exams.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No model tests for this portal yet.
                  </div>
                ) : (
                  portalData.exams.map((ex: any) => (
                    <div key={ex.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{ex.titleEn}</span>
                        <div className="text-xs text-slate-500">
                          {ex.titleBn} • {ex.durationMinutes} Mins • {ex.totalQuestions} MCQs •{' '}
                          {ex._count?.questions || 0} added
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/questions?examId=${ex.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
                        >
                          Manage MCQs →
                        </Link>
                        <button
                          onClick={() => confirmDeleteModelTest(ex)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete this model test"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PORTAL CONFIGURATION */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Portal Info & Display Attributes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">
                    Title (English)
                  </label>
                  <input
                    type="text"
                    value={selectedPortal.title || ''}
                    onChange={(e) => updateSelectedField('title', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">
                    Title (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={selectedPortal.bn || ''}
                    onChange={(e) => updateSelectedField('bn', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">
                    Emoji / Icon
                  </label>
                  <input
                    type="text"
                    value={selectedPortal.icon || ''}
                    onChange={(e) => updateSelectedField('icon', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">
                    Badge Tag / Units
                  </label>
                  <input
                    type="text"
                    value={selectedPortal.badge || ''}
                    onChange={(e) => updateSelectedField('badge', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>


              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Admission Units</h4>
                    <p className="text-[11px] text-slate-500">
                      Each unit keeps its own question bank, papers and syllabus.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingUnit(null);
                      setUnitForm({ key: '', titleEn: '', titleBn: '', badge: '' });
                      setIsUnitModalOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Unit
                  </button>
                </div>

                {units.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">
                    {selectedPortal.title} has no admission units. Questions are filed against the
                    portal directly.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {units.map((u) => (
                      <div
                        key={u.key}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900">
                            {u.titleBn}
                            <span className="ml-2 text-[10px] font-mono font-bold text-slate-400">
                              {u.key}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans truncate">
                            {u.titleEn}
                            {u.badge ? ` · ${u.badge}` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (u.questionCount ?? 0) > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {u.questionCount ?? 0} MCQs
                          </span>
                          <button
                            onClick={() => {
                              setEditingUnit(u);
                              setUnitForm({
                                key: u.key,
                                titleEn: u.titleEn,
                                titleBn: u.titleBn,
                                badge: u.badge || '',
                              });
                              setIsUnitModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                            title="Rename unit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => confirmDeleteUnit(u)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete unit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                The portal key <code className="font-bold">{selectedPortal.key}</code> is what every
                question is filed against, so it is not editable here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add MCQs — one shared header, as many question blocks as you like */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Add Questions to {scopeLabel}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Subject, chapter and year below apply to every question in this form.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            {portalData.subjects.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm font-bold text-slate-800">
                  {scopeLabel} has no subjects yet.
                </p>
                <button
                  onClick={() => {
                    setIsQuestionModalOpen(false);
                    setActiveTab('subjects');
                  }}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  Go to Subjects &amp; Chapters →
                </button>
              </div>
            ) : (
              <form ref={questionFormRef} onSubmit={handleCreateQuestion} className="space-y-5 text-xs">
                {unitPicker}

                {/* ---- shared for every question below ---- */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wider">
                      Subject *
                    </label>
                    <select
                      required
                      value={batch.subjectId}
                      onChange={(e) => setBatch({ ...batch, subjectId: e.target.value, topicId: '' })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {portalData.subjects.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wider">
                      Chapter
                    </label>
                    <select
                      value={batch.topicId}
                      onChange={(e) => setBatch({ ...batch, topicId: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">No specific chapter</option>
                      {(batchSubject?.topics || []).map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wider">
                      Exam Year *
                    </label>
                    <input
                      type="number"
                      required
                      min={1971}
                      max={2100}
                      value={batch.year}
                      onChange={(e) => setBatch({ ...batch, year: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wider">
                      Difficulty
                    </label>
                    <select
                      value={batch.difficulty}
                      onChange={(e) => setBatch({ ...batch, difficulty: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>

                {/* ---- one block per question ---- */}
                {batch.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-4 space-y-3 ${
                      item.error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Question {idx + 1}
                      </span>
                      {batch.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestionItem(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove this question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {item.error && (
                      <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                        {item.error}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                          Question (বাংলা) *
                        </label>
                        <textarea
                          required
                          rows={2}
                          placeholder="'চর্যাপদ' এর আদি কবি কে?"
                          value={item.questionBn}
                          onChange={(e) => updateQuestionItem(idx, { questionBn: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                          Question (English)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Optional English version"
                          value={item.questionEn}
                          onChange={(e) => updateQuestionItem(idx, { questionEn: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-900 block uppercase tracking-wider text-[10px]">
                        Options — select the correct one *
                      </span>
                      {item.options.map((opt, oi) => (
                        <div
                          key={opt.optionKey}
                          className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200"
                        >
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={opt.isCorrect}
                            onChange={() =>
                              updateQuestionItem(idx, {
                                options: item.options.map((o, i) => ({ ...o, isCorrect: i === oi })),
                              })
                            }
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                          />
                          <span className="font-bold text-slate-900 w-4 shrink-0">
                            {opt.optionKey}.
                          </span>
                          <input
                            type="text"
                            required
                            placeholder={`Option ${opt.optionKey} (বাংলা)`}
                            value={opt.textBn}
                            onChange={(e) =>
                              updateQuestionItem(idx, {
                                options: item.options.map((o, i) =>
                                  i === oi ? { ...o, textBn: e.target.value } : o,
                                ),
                              })
                            }
                            className="flex-1 min-w-0 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none"
                          />
                          <input
                            type="text"
                            placeholder={`Option ${opt.optionKey} (English)`}
                            value={opt.textEn}
                            onChange={(e) =>
                              updateQuestionItem(idx, {
                                options: item.options.map((o, i) =>
                                  i === oi ? { ...o, textEn: e.target.value } : o,
                                ),
                              })
                            }
                            className="flex-1 min-w-0 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                          Explanation (বাংলা)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="পাঠ্যবই অনুযায়ী ব্যাখ্যা..."
                          value={item.explanationBn}
                          onChange={(e) => updateQuestionItem(idx, { explanationBn: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                          Explanation (English)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Textbook explanation..."
                          value={item.explanationEn}
                          onChange={(e) => updateQuestionItem(idx, { explanationEn: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addQuestionItem}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add another question
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {batch.items.length} question{batch.items.length === 1 ? '' : 's'} in this form ·
                    all saved to {scopeLabel}
                  </span>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsQuestionModalOpen(false)}
                      className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !canWrite}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                    >
                      {submitting
                        ? 'Saving…'
                        : `Save ${batch.items.length} question${batch.items.length === 1 ? '' : 's'}`}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add year modal */}
      {isYearModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Add a Question Paper Year to {selectedPortal?.title}
            </h2>

            <form onSubmit={handleAddYear} className="space-y-4 text-xs">
              {unitPicker}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Exam Year</label>
                <input
                  type="number"
                  required
                  min={1971}
                  max={2100}
                  value={newYear.year}
                  onChange={(e) => setNewYear({ ...newYear, year: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={newYear.durationMinutes}
                    onChange={(e) =>
                      setNewYear({ ...newYear, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={newYear.totalMarks}
                    onChange={(e) =>
                      setNewYear({ ...newYear, totalMarks: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsYearModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canWrite}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold"
                >
                  {submitting ? 'Adding…' : 'Add Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create model test modal */}
      {isMockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">
              Create Model Test for {selectedPortal?.title}
            </h2>
            <form onSubmit={handleCreateMockTest} className="space-y-4 text-xs">
              {unitPicker}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Test Title (English)</label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${selectedPortal?.title} Grand Model Test`}
                  value={newMockTest.titleEn}
                  onChange={(e) => setNewMockTest({ ...newMockTest, titleEn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={newMockTest.durationMinutes}
                    onChange={(e) =>
                      setNewMockTest({ ...newMockTest, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Marks / Question</label>
                  <input
                    type="number"
                    step="0.25"
                    value={newMockTest.marksPerQuestion}
                    onChange={(e) =>
                      setNewMockTest({ ...newMockTest, marksPerQuestion: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Negative Mark</label>
                  <input
                    type="number"
                    step="0.25"
                    value={newMockTest.negativeMark}
                    onChange={(e) =>
                      setNewMockTest({ ...newMockTest, negativeMark: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Blueprint: which subjects/chapters make up this test, and how
                  many random questions to pull from each — the same engine
                  that powers the main Exams page's blueprint builder. */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">Subject Blueprint</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {mockBlueprintItems.reduce((sum, i) => sum + (Number(i.questionCount) || 0), 0)}{' '}
                    questions total
                  </span>
                </div>

                {mockBlueprintItems.map((item, idx) => {
                  const subject = portalData.subjects.find((s: any) => s.id === item.subjectId);
                  const topics = subject?.topics || [];

                  return (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={item.subjectId}
                        onChange={(e) => {
                          const updated = [...mockBlueprintItems];
                          updated[idx] = { ...updated[idx], subjectId: e.target.value, topicId: '' };
                          setMockBlueprintItems(updated);
                        }}
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="">Select subject…</option>
                        {portalData.subjects.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.titleEn}
                          </option>
                        ))}
                      </select>

                      <select
                        value={item.topicId}
                        disabled={topics.length === 0}
                        onChange={(e) => {
                          const updated = [...mockBlueprintItems];
                          updated[idx] = { ...updated[idx], topicId: e.target.value };
                          setMockBlueprintItems(updated);
                        }}
                        className="w-36 p-2 bg-white border border-slate-200 rounded-lg text-xs disabled:opacity-50"
                      >
                        <option value="">Whole subject</option>
                        {topics.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.titleEn}
                          </option>
                        ))}
                      </select>

                      <select
                        value={item.difficulty}
                        onChange={(e) => {
                          const updated = [...mockBlueprintItems];
                          updated[idx] = { ...updated[idx], difficulty: e.target.value as MockBlueprintItem['difficulty'] };
                          setMockBlueprintItems(updated);
                        }}
                        className="w-24 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="ANY">Any</option>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>

                      <input
                        type="number"
                        placeholder="Qs"
                        value={item.questionCount}
                        onChange={(e) => {
                          const updated = [...mockBlueprintItems];
                          updated[idx] = { ...updated[idx], questionCount: Number(e.target.value) };
                          setMockBlueprintItems(updated);
                        }}
                        className="w-16 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setMockBlueprintItems(mockBlueprintItems.filter((_, i) => i !== idx))
                        }
                        disabled={mockBlueprintItems.length === 1}
                        className="px-2 py-2 text-rose-600 disabled:text-slate-300 font-bold"
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    setMockBlueprintItems([
                      ...mockBlueprintItems,
                      { subjectId: '', topicId: '', questionCount: 25, difficulty: 'ANY' },
                    ])
                  }
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                >
                  + Add subject row
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsMockModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canWrite}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold"
                >
                  {submitting ? 'Creating…' : 'Create Model Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy a whole syllabus into this scope */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Copy a Syllabus into {scopeLabel}</h2>
            <p className="text-xs text-slate-500">
              Duplicates the subjects and their chapters. The copies belong to {scopeLabel} alone —
              editing them never touches the exam they came from. Subjects already here are skipped.
            </p>

            <form onSubmit={handleCopySyllabus} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  Copy from exam <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={copyFrom.portalKey}
                  onChange={(e) => setCopyFrom({ portalKey: e.target.value, unitKey: '' })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="" disabled>
                    Select an exam
                  </option>
                  {allPortals.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.icon} {p.title} ({p.bn})
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const sourceUnits =
                  allPortals.find((p) => p.key === copyFrom.portalKey)?.units || [];
                if (sourceUnits.length === 0) return null;

                return (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 uppercase">
                      From which unit <span className="text-rose-600">*</span>
                    </label>
                    <select
                      required
                      value={copyFrom.unitKey}
                      onChange={(e) => setCopyFrom({ ...copyFrom, unitKey: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    >
                      <option value="" disabled>
                        Select a unit
                      </option>
                      {sourceUnits.map((u) => (
                        <option key={u.key} value={u.key}>
                          {u.titleBn} — {u.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !copyFrom.portalKey}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold"
                >
                  {submitting ? 'Copying…' : 'Copy Syllabus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create a new exam portal */}
      {isPortalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Add a New Exam Portal</h2>
            <p className="text-xs text-slate-500">
              It appears in this dropdown and on the mobile home screen straight away. Add its
              admission units afterwards if it has any.
            </p>

            <form onSubmit={handleCreatePortal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">
                    Key <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BUET"
                    value={newPortal.key}
                    onChange={(e) => setNewPortal({ ...newPortal, key: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Every question is filed against this; it cannot be changed later.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">Group</label>
                  <select
                    value={newPortal.group}
                    onChange={(e) =>
                      setNewPortal({ ...newPortal, group: e.target.value as 'UNIVERSITY' | 'JOBS' })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="UNIVERSITY">🎓 University &amp; Admission</option>
                    <option value="JOBS">💼 Job &amp; Career</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  Title (English) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BUET"
                  value={newPortal.titleEn}
                  onChange={(e) => setNewPortal({ ...newPortal, titleEn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  Title (বাংলা) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. বুয়েট"
                  value={newPortal.titleBn}
                  onChange={(e) => setNewPortal({ ...newPortal, titleBn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">Emoji</label>
                  <input
                    type="text"
                    placeholder="⚙️"
                    value={newPortal.icon}
                    onChange={(e) => setNewPortal({ ...newPortal, icon: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering"
                    value={newPortal.badge}
                    onChange={(e) => setNewPortal({ ...newPortal, badge: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPortalModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold"
                >
                  {submitting ? 'Creating…' : 'Create Exam Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / rename an admission unit */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {editingUnit
                ? `Edit the ${editingUnit.titleBn} unit`
                : `Add a Unit to ${selectedPortal?.title}`}
            </h2>
            <p className="text-xs text-slate-500">
              A unit is a separate scope: its questions, papers and syllabus never appear under any
              other unit.
            </p>

            <form onSubmit={handleSaveUnit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">Key *</label>
                  <input
                    type="text"
                    required
                    placeholder="KA / A"
                    value={unitForm.key}
                    onChange={(e) => setUnitForm({ ...unitForm, key: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">
                    Title (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ka Unit"
                    value={unitForm.titleEn}
                    onChange={(e) => setUnitForm({ ...unitForm, titleEn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  Title (বাংলা) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ক ইউনিট"
                  value={unitForm.titleBn}
                  onChange={(e) => setUnitForm({ ...unitForm, titleBn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">Badge</label>
                <input
                  type="text"
                  placeholder="e.g. বিজ্ঞান"
                  value={unitForm.badge}
                  onChange={(e) => setUnitForm({ ...unitForm, badge: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsUnitModalOpen(false);
                    setEditingUnit(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold"
                >
                  {submitting ? 'Saving…' : editingUnit ? 'Save Changes' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / rename subject */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {editingSubject ? `Rename ${editingSubject.titleEn}` : 'Create a New Subject'}
            </h2>
            <p className="text-xs text-slate-500">
              {editingSubject
                ? 'The title and code change everywhere this subject is used. The scope and marks below apply to this portal only.'
                : `It will be created and attached to ${selectedPortal?.title} straight away.`}
            </p>

            <form onSubmit={handleSaveSubject} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  Title (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher Mathematics"
                  value={newSubject.titleEn}
                  onChange={(e) => setNewSubject({ ...newSubject, titleEn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  Title (বাংলা)
                </label>
                <input
                  type="text"
                  placeholder="e.g. উচ্চতর গণিত"
                  value={newSubject.titleBn}
                  onChange={(e) => setNewSubject({ ...newSubject, titleBn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              {portalHasUnits && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">
                    {editingSubject ? 'Syllabus scope' : 'Attach to unit'}
                  </label>
                  <select
                    value={newSubject.unitKey}
                    onChange={(e) => setNewSubject({ ...newSubject, unitKey: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="">All units — {selectedPortal?.title} default syllabus</option>
                    {units.map((u) => (
                      <option key={u.key} value={u.key}>
                        {u.titleBn} — {u.titleEn}
                        {u.badge ? ` (${u.badge})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {newSubject.unitKey
                      ? `Only ${units.find((u) => u.key === newSubject.unitKey)?.titleBn} gets this subject.`
                      : `Every unit of ${selectedPortal?.title} inherits it until that unit is customised.`}
                    {editingSubject && newSubject.unitKey !== editingSubject.scopeUnitKey
                      ? ' The subject stays in its current scope too — detach it there if you meant to move it.'
                      : ''}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">Code</label>
                  <input
                    type="text"
                    placeholder="Auto from title"
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">
                    Marks in{' '}
                    {units.find((u) => u.key === newSubject.unitKey)?.titleBn ||
                      selectedPortal?.title}
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="optional"
                    value={newSubject.marks}
                    onChange={(e) => setNewSubject({ ...newSubject, marks: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubjectModalOpen(false);
                    setEditingSubject(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold"
                >
                  {submitting ? 'Saving…' : editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / rename chapter */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {editingChapter ? 'Rename Chapter' : `Add a Chapter to ${chapterSubject?.titleEn}`}
            </h2>

            <form onSubmit={handleSaveChapter} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  Chapter (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cell & Genetics"
                  value={chapterForm.titleEn}
                  onChange={(e) => setChapterForm({ ...chapterForm, titleEn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  Chapter (বাংলা)
                </label>
                <input
                  type="text"
                  placeholder="e.g. কোষ ও বংশগতিবিদ্যা"
                  value={chapterForm.titleBn}
                  onChange={(e) => setChapterForm({ ...chapterForm, titleBn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsChapterModalOpen(false);
                    setEditingChapter(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold"
                >
                  {submitting ? 'Saving…' : editingChapter ? 'Save Changes' : 'Add Chapter'}
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
