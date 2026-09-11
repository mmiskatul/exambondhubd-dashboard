'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Users,
  ShieldCheck,
  Edit3,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  X,
  Sparkles,
  ArrowUpRight,
  Check,
  Plus,
  Trash2,
  Eye,
  Copy,
  Tag,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  Layers,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';

type TabType = 'pending' | 'history' | 'plans' | 'gateways';

export default function SubscriptionsManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const toast = useToast();
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [portals, setPortals] = useState<any[]>([]);
  // null shows the exam grid; a key drills into that exam's packages.
  const [selectedPortalKey, setSelectedPortalKey] = useState<string | null>(null);
  const [examSearch, setExamSearch] = useState('');
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  // "Add Tiers": one action that fills in 1 month / 6 months / 1 year
  // packages for every unit of an exam at once. Whole-exam portals (Medical &
  // Dental, GST, BCS…) are deliberately excluded — those stay a single
  // package by design, so this dialog only ever opens for exams with units.
  const [bulkPortal, setBulkPortal] = useState<any | null>(null);
  const [tierPrices, setTierPrices] = useState({ m1: '299', m6: '549', y1: '799' });
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<any | null>(null);
  const [planToDelete, setPlanToDelete] = useState<any | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [deletePlanError, setDeletePlanError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    success: 0,
    failed: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters for History Tab
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [historyProvider, setHistoryProvider] = useState<'ALL' | 'BKASH' | 'NAGAD' | 'ROCKET'>('ALL');

  // Inspection Modal State
  const [inspectedPayment, setInspectedPayment] = useState<any | null>(null);

  // Approval Modal State
  const [paymentToApprove, setPaymentToApprove] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Rejection Modal State
  const [paymentToReject, setPaymentToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Transaction ID not found in statement');
  const [customRejection, setCustomRejection] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Create / Edit Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    code: 'MONTHLY',
    nameEn: '',
    nameBn: '',
    priceBdt: 199,
    discountPriceBdt: 99,
    durationDays: 30,
    descriptionEn: '',
    descriptionBn: '',
    features: [
      'Unlimited Model Tests & Mock Exams',
      'Detailed Textbook Explanations',
      'All University & Job Question Banks',
      'Performance Analytics & Ranking',
    ] as string[],
    isActive: true,
    // Which exam (and unit) this package unlocks. Empty means platform-wide.
    scopePortalKey: '',
    scopeUnitKey: '',
  });
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    const [pendingRes, allRes, plansRes, portalsRes] = await Promise.all([
      fetchApi('/payments/admin/pending'),
      fetchApi('/payments/admin/all'),
      fetchApi('/subscriptions/admin/plans'),
      fetchApi('/categories/portals'),
    ]);

    if (portalsRes.success && portalsRes.data) {
      // Packages are organised under the exam they unlock, so the tree needs
      // the exams and their units.
      setPortals([
        ...(portalsRes.data.university || []),
        ...(portalsRes.data.jobs || []),
      ]);
    }

    if (pendingRes.success && pendingRes.data) {
      setPendingPayments(pendingRes.data);
    } else {
      setPendingPayments([]);
    }

    if (allRes.success && allRes.data) {
      setAllPayments(allRes.data.items || []);
      if (allRes.data.stats) {
        setStats(allRes.data.stats);
      }
    } else {
      setAllPayments([]);
    }

    if (plansRes.success && plansRes.data) {
      setPlans(plansRes.data);
    } else {
      const publicPlansRes = await fetchApi('/subscriptions/plans');
      if (publicPlansRes.success && publicPlansRes.data) {
        setPlans(publicPlansRes.data);
      }
    }

    setLoading(false);
  }

  // Confirm Approve
  async function confirmApprove() {
    if (!paymentToApprove) return;
    setIsApproving(true);

    const res = await fetchApi(`/payments/admin/${paymentToApprove.id}/approve`, {
      method: 'POST',
    });

    setIsApproving(false);
    if (res.success) {
      setPendingPayments((prev) => prev.filter((p) => p.id !== paymentToApprove.id));
      setAllPayments((prev) =>
        prev.map((p) => (p.id === paymentToApprove.id ? { ...p, status: 'SUCCESS' } : p)),
      );
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        success: prev.success + 1,
        totalRevenue: prev.totalRevenue + (paymentToApprove.amount || 0),
      }));
      setPaymentToApprove(null);
      if (inspectedPayment?.id === paymentToApprove.id) {
        setInspectedPayment(null);
      }
    } else {
      toast.error(res.message || 'Approval failed.');
    }
  }

  // Confirm Reject
  async function confirmReject() {
    if (!paymentToReject) return;
    setIsRejecting(true);

    const finalReason = rejectionReason === 'OTHER' ? customRejection : rejectionReason;

    const res = await fetchApi(`/payments/admin/${paymentToReject.id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: finalReason }),
    });

    setIsRejecting(false);
    if (res.success) {
      setPendingPayments((prev) => prev.filter((p) => p.id !== paymentToReject.id));
      setAllPayments((prev) =>
        prev.map((p) => (p.id === paymentToReject.id ? { ...p, status: 'FAILED' } : p)),
      );
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        failed: prev.failed + 1,
      }));
      setPaymentToReject(null);
      setCustomRejection('');
      setRejectionReason('Transaction ID not found in statement');
      if (inspectedPayment?.id === paymentToReject.id) {
        setInspectedPayment(null);
      }
    } else {
      toast.error(res.message || 'Rejection failed.');
    }
  }

  // Open Create Plan Modal

  /** Price and on-sale state change often; a full modal for that is friction. */
  async function quickPatchPlan(planId: string, patch: any) {
    setBusyPlanId(planId);

    // Optimistic, reverted below if the server disagrees.
    const before = plans;
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...patch } : p)));

    const res = await fetchApi(`/subscriptions/admin/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });

    setBusyPlanId(null);

    if (!res.success) {
      setPlans(before);
      alert(res.message || 'Could not update this package.');
      return;
    }

    loadAllData();
  }

  /** 1 month / 6 months / 1 year — the three durations every unit gets. */
  const TIERS = [
    { suffix: '1M', days: 30, labelEn: '1 Month', labelBn: '১ মাস', priceKey: 'm1' as const },
    { suffix: '6M', days: 180, labelEn: '6 Months', labelBn: '৬ মাস', priceKey: 'm6' as const },
    { suffix: 'YEARLY', days: 365, labelEn: '1 Year', labelBn: '১ বছর', priceKey: 'y1' as const },
  ];

  /**
   * Only these exams sell unit-by-unit. Every other exam sells as one
   * whole-exam listing — Medical & Dental still has MBBS/BDS as Unit rows
   * (content is organized under them) but has never been sold per unit, so
   * it gets the same three tiers as a single whole-exam package instead.
   */
  const UNIT_SELLABLE_PORTAL_KEYS = ['DU', 'JU', 'RU', 'CU'];

  /**
   * Which tiers a portal is still missing, by exact duration. For a
   * unit-sellable exam this is per unit; for a whole-exam listing it is the
   * portal itself (scope with no unit).
   */
  function missingTiers(portal: any) {
    const sellsPerUnit = UNIT_SELLABLE_PORTAL_KEYS.includes(portal.key);

    if (sellsPerUnit) {
      const units = portal.units || [];
      const have = new Set(
        plans.flatMap((pl: any) =>
          (pl.scopes || [])
            .filter((sc: any) => sc.portal?.key === portal.key && sc.unit)
            .map((sc: any) => `${sc.unit.key}::${pl.durationDays}`),
        ),
      );

      const todo: { unit: any; tier: (typeof TIERS)[number] }[] = [];
      for (const unit of units) {
        for (const tier of TIERS) {
          if (!have.has(`${unit.key}::${tier.days}`)) todo.push({ unit, tier });
        }
      }
      return todo;
    }

    const have = new Set(
      plans
        .filter((pl: any) =>
          (pl.scopes || []).some((sc: any) => sc.portal?.key === portal.key && !sc.unit),
        )
        .map((pl: any) => pl.durationDays),
    );
    const todo: { unit: any; tier: (typeof TIERS)[number] }[] = [];
    for (const tier of TIERS) {
      if (!have.has(tier.days)) todo.push({ unit: null, tier });
    }
    return todo;
  }

  /**
   * Pricing a new university one unit at a time — three tiers apiece — means
   * filling the same form a dozen times. This fills in whatever combination
   * of unit × duration is still missing in one pass; anything that already
   * exists (say, the unit's existing yearly package) is left untouched, so
   * running it again after deleting one tier just recreates that one.
   */
  async function handleAddTiers() {
    if (!bulkPortal) return;

    const todo = missingTiers(bulkPortal);
    if (todo.length === 0) {
      setBulkPortal(null);
      return;
    }

    setIsBulkSaving(true);
    const slug = bulkPortal.key.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    let made = 0;
    const failures: string[] = [];

    for (const { unit, tier } of todo) {
      const code = unit
        ? `${slug}_${unit.key.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_${tier.suffix}`
        : `${slug}_${tier.suffix}`;
      const res = await fetchApi('/subscriptions/admin/plans', {
        method: 'POST',
        body: JSON.stringify({
          code,
          nameEn: unit
            ? `${bulkPortal.title} ${unit.titleEn} — ${tier.labelEn}`
            : `${bulkPortal.title} — ${tier.labelEn}`,
          nameBn: unit
            ? `${bulkPortal.bn} ${unit.titleBn} — ${tier.labelBn}`
            : `${bulkPortal.bn} — ${tier.labelBn}`,
          priceBdt: Number(tierPrices[tier.priceKey]) || 0,
          durationDays: tier.days,
          descriptionEn: unit
            ? `${bulkPortal.title} ${unit.titleEn} only, ${tier.labelEn.toLowerCase()}.`
            : `Full access to ${bulkPortal.title}, ${tier.labelEn.toLowerCase()}.`,
          descriptionBn: unit
            ? `শুধুমাত্র ${bulkPortal.bn} ${unit.titleBn}, ${tier.labelBn}।`
            : `${bulkPortal.bn} সম্পূর্ণ অ্যাক্সেস, ${tier.labelBn}।`,
          features: ['সব বিষয়ের প্রশ্ন ও ব্যাখ্যা', 'বিগত সালের প্রশ্নপত্র', 'মডেল টেস্ট'],
          isActive: true,
          scopes: unit
            ? [{ portalKey: bulkPortal.key, unitKey: unit.key }]
            : [{ portalKey: bulkPortal.key }],
        }),
      });

      if (res.success) made += 1;
      else failures.push(`${unit ? unit.titleEn : bulkPortal.title} (${tier.labelEn}): ${res.message || 'failed'}`);
    }

    setIsBulkSaving(false);
    setBulkPortal(null);

    if (failures.length) {
      toast.error(`Created ${made}, ${failures.length} failed: ${failures.join('; ')}`);
    } else {
      toast.success(`Created ${made} package${made === 1 ? '' : 's'}.`);
    }
    loadAllData();
  }


  /** The detail view pulls sales figures the list does not carry. */
  async function handleViewPlan(plan: any) {
    setViewingPlan({ ...plan, loading: true });
    const res = await fetchApi(`/subscriptions/admin/plans/${plan.id}`);
    if (res.success && res.data) setViewingPlan(res.data);
    else {
      setViewingPlan(null);
      toast.error(res.message || 'Could not open this package.');
    }
  }

  async function handleDeletePlan() {
    if (!planToDelete) return;

    setIsDeletingPlan(true);
    setDeletePlanError(null);

    const res = await fetchApi(`/subscriptions/admin/plans/${planToDelete.id}`, {
      method: 'DELETE',
    });

    setIsDeletingPlan(false);

    if (!res.success) {
      // The server refuses to delete a package anyone has bought; show why
      // rather than closing as though it worked.
      setDeletePlanError(res.message || 'Could not delete this package.');
      return;
    }

    toast.success(res.data?.message || res.message || 'Package deleted.');
    setPlanToDelete(null);
    setViewingPlan(null);
    loadAllData();
  }

  function handleOpenCreatePlan(portalKey = '', unitKey = '', label = '') {
    setEditingPlanId(null);

    // A code is derived from the exam so packages are identifiable at a glance.
    const slug = [portalKey, unitKey]
      .filter(Boolean)
      .join('_')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    setPlanForm({
      code: slug ? `${slug}_YEARLY` : 'MONTHLY',
      nameEn: label || '',
      nameBn: '',
      priceBdt: portalKey ? 799 : 199,
      discountPriceBdt: 0,
      durationDays: portalKey ? 365 : 30,
      descriptionEn: label ? `Full access to ${label}.` : '',
      descriptionBn: '',
      features: [
        'সব বিষয়ের প্রশ্ন ও ব্যাখ্যা',
        'বিগত সালের প্রশ্নপত্র',
        'মডেল টেস্ট ও ফলাফল বিশ্লেষণ',
      ],
      isActive: true,
      scopePortalKey: portalKey,
      scopeUnitKey: unitKey,
    });
    setIsPlanModalOpen(true);
  }

  // Open Edit Plan Modal
  function handleOpenEditPlan(plan: any) {
    setEditingPlanId(plan.id);
    setPlanForm({
      code: plan.code || 'MONTHLY',
      nameEn: plan.nameEn || '',
      nameBn: plan.nameBn || '',
      priceBdt: plan.priceBdt || 0,
      discountPriceBdt: plan.discountPriceBdt || 0,
      durationDays: plan.durationDays || 30,
      descriptionEn: plan.descriptionEn || '',
      descriptionBn: plan.descriptionBn || '',
      features: Array.isArray(plan.features) && plan.features.length > 0 ? plan.features : [
        'Unlimited Model Tests & Mock Exams',
        'Detailed Textbook Explanations',
        'All University & Job Question Banks',
      ],
      isActive: plan.isActive ?? true,
      scopePortalKey: plan.scopes?.[0]?.portal?.key || '',
      scopeUnitKey: plan.scopes?.[0]?.unit?.key || '',
    });
    setIsPlanModalOpen(true);
  }

  // Save Plan (Create or Update)
  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingPlan(true);

    let res;
    if (editingPlanId) {
      res = await fetchApi(`/subscriptions/admin/plans/${editingPlanId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nameEn: planForm.nameEn,
          nameBn: planForm.nameBn,
          priceBdt: Number(planForm.priceBdt),
          discountPriceBdt: planForm.discountPriceBdt ? Number(planForm.discountPriceBdt) : null,
          durationDays: Number(planForm.durationDays),
          descriptionEn: planForm.descriptionEn,
          descriptionBn: planForm.descriptionBn,
          features: planForm.features,
          isActive: planForm.isActive,
          scopes: planForm.scopePortalKey
            ? [{ portalKey: planForm.scopePortalKey, unitKey: planForm.scopeUnitKey || null }]
            : [],
        }),
      });
    } else {
      res = await fetchApi('/subscriptions/admin/plans', {
        method: 'POST',
        body: JSON.stringify({
          code: planForm.code,
          nameEn: planForm.nameEn,
          nameBn: planForm.nameBn || planForm.nameEn,
          priceBdt: Number(planForm.priceBdt),
          discountPriceBdt: planForm.discountPriceBdt ? Number(planForm.discountPriceBdt) : null,
          durationDays: Number(planForm.durationDays),
          descriptionEn: planForm.descriptionEn,
          descriptionBn: planForm.descriptionBn || planForm.descriptionEn,
          features: planForm.features,
          isActive: planForm.isActive,
          // Without this a package created from a unit row would be sold as
          // platform-wide access.
          scopes: planForm.scopePortalKey
            ? [{ portalKey: planForm.scopePortalKey, unitKey: planForm.scopeUnitKey || null }]
            : [],
        }),
      });
    }

    setIsSavingPlan(false);
    if (res.success) {
      setIsPlanModalOpen(false);
      loadAllData();
    } else {
      toast.error(res.message || 'Failed to save the subscription package.');
    }
  }

  // Toggle Plan Active State
  async function handleTogglePlanStatus(plan: any) {
    const nextState = !plan.isActive;
    const res = await fetchApi(`/subscriptions/admin/plans/${plan.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: nextState }),
    });

    if (res.success) {
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, isActive: nextState } : p)));
    }
  }

  // Feature list item management
  function handleAddFeature() {
    if (!newFeatureInput.trim()) return;
    setPlanForm((prev) => ({
      ...prev,
      features: [...prev.features, newFeatureInput.trim()],
    }));
    setNewFeatureInput('');
  }

  function handleRemoveFeature(index: number) {
    setPlanForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  }

  // Filtered History
  const filteredHistory = useMemo(() => {
    return allPayments.filter((item) => {
      const matchStatus = historyStatus === 'ALL' || item.status === historyStatus;
      const matchProvider = historyProvider === 'ALL' || item.provider === historyProvider;

      if (!historySearch) return matchStatus && matchProvider;

      const s = historySearch.toLowerCase();
      const matchSearch =
        item.transactionId?.toLowerCase().includes(s) ||
        item.user?.name?.toLowerCase().includes(s) ||
        item.user?.email?.toLowerCase().includes(s) ||
        item.user?.phone?.toLowerCase().includes(s) ||
        item.metadata?.senderNumber?.toLowerCase().includes(s);

      return matchStatus && matchProvider && matchSearch;
    });
  }, [allPayments, historySearch, historyStatus, historyProvider]);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Banner Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscriptions & Payments</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Gateway
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl">
            Granular subscription package management, student bKash/Nagad/Rocket Send Money verification, and receiver wallet configuration.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenCreatePlan()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Pricing Package
          </button>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Verification</p>
            <h3 className="text-2xl font-black text-amber-600">{pendingPayments.length}</h3>
            <p className="text-[11px] text-slate-400 font-medium">Awaiting SMS TrxID match</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-black text-emerald-600">৳ {stats.totalRevenue.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 font-medium">From verified student plans</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Payments</p>
            <h3 className="text-2xl font-black text-blue-600">{stats.success}</h3>
            <p className="text-[11px] text-slate-400 font-medium">Plans active on mobile</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Packages Configured</p>
            <h3 className="text-2xl font-black text-purple-600">{plans.length}</h3>
            <p className="text-[11px] text-slate-400 font-medium">Active & tiered subscriptions</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'pending'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Verifications
          {pendingPayments.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'pending' ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {pendingPayments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          All Transactions History
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'plans'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Subscription Packages
        </button>

        <button
          onClick={() => setActiveTab('gateways')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'gateways'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Gateway Receiver Numbers
        </button>
      </div>

      {/* TAB 1: PENDING VERIFICATIONS QUEUE */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-base font-black text-slate-900">Pending Manual Payment Verification</h2>
              <p className="text-xs text-slate-500">
                Matches student SMS statements. Approving activates access immediately on mobile.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Showing {pendingPayments.length} pending requests
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs font-medium">
              Loading pending verification requests...
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">All Caught Up!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are no pending student payments awaiting manual verification right now.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Student</th>
                    <th className="py-3.5 px-5">Provider</th>
                    <th className="py-3.5 px-5">Sender Phone</th>
                    <th className="py-3.5 px-5">Transaction ID (TrxID)</th>
                    <th className="py-3.5 px-5">Amount & Plan</th>
                    <th className="py-3.5 px-5">Submitted</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pendingPayments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900">{item.user?.name || 'Student'}</div>
                        <div className="text-[11px] text-slate-500">{item.user?.email || item.user?.phone}</div>
                      </td>

                      <td className="py-4 px-5">
                        <ProviderBadge provider={item.provider} />
                      </td>

                      <td className="py-4 px-5 font-mono font-bold text-slate-900">
                        {item.metadata?.senderNumber || item.user?.phone || 'N/A'}
                      </td>

                      <td className="py-4 px-5">
                        <span className="font-mono font-black text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900 select-all">
                          {item.transactionId}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <div className="font-black text-emerald-700">৳ {item.amount}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {item.plan?.nameEn || item.metadata?.planName || 'Plan'}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-slate-500 text-[11px]">
                        <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                        <div className="text-slate-400 font-mono">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          onClick={() => setInspectedPayment(item)}
                          className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                          title="View Full Details"
                        >
                          <Eye className="w-3.5 h-3.5 inline" />
                        </button>

                        <button
                          onClick={() => setPaymentToApprove(item)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-sm transition-all shadow-emerald-600/20"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => setPaymentToReject(item)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-all"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL TRANSACTIONS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by TrxID, student name, email, phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>

            <div>
              <select
                value={historyStatus}
                onChange={(e: any) => setHistoryStatus(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Statuses (Pending, Success, Failed)</option>
                <option value="SUCCESS">Approved / Success Only</option>
                <option value="PENDING">Pending Verification Only</option>
                <option value="FAILED">Rejected / Failed Only</option>
              </select>
            </div>

            <div>
              <select
                value={historyProvider}
                onChange={(e: any) => setHistoryProvider(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Payment Providers</option>
                <option value="BKASH">bKash Only</option>
                <option value="NAGAD">Nagad Only</option>
                <option value="ROCKET">Rocket Only</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredHistory.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs font-medium">
                No transactions matched your search or filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Student</th>
                      <th className="py-3.5 px-5">Provider</th>
                      <th className="py-3.5 px-5">Transaction ID</th>
                      <th className="py-3.5 px-5">Sender Phone</th>
                      <th className="py-3.5 px-5">Amount</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900">{item.user?.name || 'Student'}</div>
                          <div className="text-[11px] text-slate-500">{item.user?.email || item.user?.phone}</div>
                        </td>

                        <td className="py-4 px-5">
                          <ProviderBadge provider={item.provider} />
                        </td>

                        <td className="py-4 px-5">
                          <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-900">
                            {item.transactionId}
                          </span>
                        </td>

                        <td className="py-4 px-5 font-mono text-slate-800 font-medium">
                          {item.metadata?.senderNumber || item.user?.phone || 'N/A'}
                        </td>

                        <td className="py-4 px-5 font-black text-slate-900">
                          ৳ {item.amount}
                        </td>

                        <td className="py-4 px-5">
                          <StatusBadge status={item.status} />
                          {item.metadata?.rejectionReason && (
                            <div className="text-[10px] text-rose-600 font-medium mt-0.5 truncate max-w-xs">
                              {item.metadata.rejectionReason}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-5 text-slate-500 text-[11px]">
                          <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                          <div className="text-slate-400 font-mono">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => setInspectedPayment(item)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION PACKAGES WITH DEEP EDITING */}
      {activeTab === 'plans' && (
        <div className="space-y-5">
          {!selectedPortalKey ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-slate-900">Packages by Exam</h2>
                  <p className="text-xs text-slate-500">
                    Open an exam to price its units. Every exam sells separately.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={examSearch}
                      onChange={(e) => setExamSearch(e.target.value)}
                      placeholder="Find an exam…"
                      className="pl-8 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500 w-44"
                    />
                  </div>

                  <button
                    onClick={() => handleOpenCreatePlan()}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Platform-wide
                  </button>
                </div>
              </div>

              {/* Five to a row on a wide screen, fewer as it narrows. */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {portals
                  .filter((pt: any) => {
                    const q = examSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      String(pt.title).toLowerCase().includes(q) ||
                      String(pt.bn).includes(examSearch.trim()) ||
                      String(pt.key).toLowerCase().includes(q)
                    );
                  })
                  .map((portal: any) => {
                  const units = portal.units || [];
                  const mine = plans.filter((pl: any) =>
                    (pl.scopes || []).some((sc: any) => sc.portal?.key === portal.key),
                  );

                  // A unit nobody has priced cannot be bought.
                  const pricedUnits = new Set(
                    mine.flatMap((pl: any) =>
                      (pl.scopes || []).filter((sc: any) => sc.unit).map((sc: any) => sc.unit.key),
                    ),
                  );
                  const coversWholeExam = mine.some((pl: any) =>
                    (pl.scopes || []).some((sc: any) => sc.portal?.key === portal.key && !sc.unit),
                  );
                  const gaps = coversWholeExam
                    ? 0
                    : units.filter((u: any) => !pricedUnits.has(u.key)).length;
                  const unsellable = mine.length === 0 || (units.length > 0 && gaps === units.length);

                  return (
                    <button
                      key={portal.key}
                      onClick={() => setSelectedPortalKey(portal.key)}
                      className={`text-left bg-white rounded-3xl border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${
                        unsellable ? 'border-amber-300' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-2xl">{portal.icon}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            portal.group === 'JOBS'
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {portal.group === 'JOBS' ? 'Job' : 'Admission'}
                        </span>
                      </div>

                      <p className="text-sm font-black text-slate-900 mt-2.5 leading-tight">
                        {portal.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{portal.bn}</p>

                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                          {mine.length} package{mine.length === 1 ? '' : 's'}
                        </span>
                        {units.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">
                            {units.length} units
                          </span>
                        )}
                      </div>

                      {unsellable ? (
                        <p className="text-[10px] font-bold text-amber-700 mt-2">
                          Nothing to sell yet
                        </p>
                      ) : gaps > 0 ? (
                        <p className="text-[10px] font-bold text-amber-600 mt-2">
                          {gaps} unit{gaps === 1 ? '' : 's'} unpriced
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-emerald-600 mt-2">All priced</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Packages that belong to no exam. */}
              {plans.filter((pl: any) => (pl.scopes || []).length === 0).length > 0 && (
                <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/60">
                    <p className="text-sm font-black text-slate-900">Platform-wide packages</p>
                    <p className="text-[11px] text-slate-500">
                      These unlock every exam at once.
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {plans
                      .filter((pl: any) => (pl.scopes || []).length === 0)
                      .map((pl: any) => (
                        <PackageRow
                          key={pl.id}
                          plan={pl}
                          label="Everything"
                          onEdit={() => handleOpenEditPlan(pl)}
                          onQuickPatch={quickPatchPlan}
                      onView={handleViewPlan}
                      onDelete={setPlanToDelete}
                          busy={busyPlanId === pl.id}
                        />
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ---- Inside one exam ---- */
            (() => {
              const portal = portals.find((pt: any) => pt.key === selectedPortalKey);
              if (!portal) return null;

              const units = portal.units || [];
              const sellsPerUnit = UNIT_SELLABLE_PORTAL_KEYS.includes(portal.key);
              const wholeExam = plans.filter((pl: any) =>
                (pl.scopes || []).some((sc: any) => sc.portal?.key === portal.key && !sc.unit),
              );

              return (
                <>
                  <div className="flex items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => setSelectedPortalKey(null)}
                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0"
                        title="Back to all exams"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-700" />
                      </button>
                      <span className="text-2xl">{portal.icon}</span>
                      <div className="min-w-0">
                        <h2 className="text-base font-black text-slate-900 truncate">
                          {portal.title}
                        </h2>
                        <p className="text-[11px] text-slate-500 truncate">
                          {portal.bn}
                          {units.length > 0 ? ` · ${units.length} units` : ' · no units'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          // Suggest defaults from whatever this portal already
                          // charges for a year, so re-opening this after
                          // deleting one tier proposes something sensible
                          // rather than a generic fallback.
                          const existingYearly = plans.find(
                            (pl: any) =>
                              pl.durationDays === 365 &&
                              (pl.scopes || []).some(
                                (sc: any) =>
                                  sc.portal?.key === portal.key && (sellsPerUnit ? sc.unit : !sc.unit),
                              ),
                          );
                          const y1 = existingYearly?.priceBdt || 799;
                          setTierPrices({
                            m1: String(Math.round((y1 * 0.35) / 10) * 10),
                            m6: String(Math.round((y1 * 0.7) / 10) * 10),
                            y1: String(y1),
                          });
                          setBulkPortal(portal);
                        }}
                        className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl flex items-center gap-1.5 shrink-0"
                      >
                        <Layers className="w-4 h-4" /> Add Tiers
                      </button>

                      <button
                        onClick={() => handleOpenCreatePlan(portal.key, '', portal.title)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-sm shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        {units.length > 0 ? 'Whole exam' : 'New package'}
                      </button>
                    </div>
                  </div>

                  {wholeExam.length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <p className="px-5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50/70 border-b border-slate-100">
                        Covers the whole exam
                      </p>
                      <div className="divide-y divide-slate-100">
                        {wholeExam.map((pl: any) => (
                          <PackageRow
                            key={pl.id}
                            plan={pl}
                            label={sellsPerUnit && units.length > 0 ? 'All units' : 'Full access'}
                            onEdit={() => handleOpenEditPlan(pl)}
                            onQuickPatch={quickPatchPlan}
                      onView={handleViewPlan}
                      onDelete={setPlanToDelete}
                            busy={busyPlanId === pl.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {sellsPerUnit && units.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {units.map((unit: any) => {
                        const unitPlans = plans.filter((pl: any) =>
                          (pl.scopes || []).some(
                            (sc: any) => sc.unit?.key === unit.key && sc.portal?.key === portal.key,
                          ),
                        );

                        return (
                          <div
                            key={unit.key}
                            className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${
                              unitPlans.length === 0 ? 'border-amber-300' : 'border-slate-200'
                            }`}
                          >
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">
                                  {unit.titleBn}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {unit.titleEn}
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  handleOpenCreatePlan(
                                    portal.key,
                                    unit.key,
                                    `${portal.title} ${unit.titleEn}`,
                                  )
                                }
                                className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3 h-3" /> New
                              </button>
                            </div>

                            {unitPlans.length === 0 ? (
                              <p className="px-4 py-6 text-center text-[11px] text-amber-700 font-semibold">
                                No package — this unit cannot be bought.
                              </p>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {unitPlans.map((pl: any) => (
                                  <PackageRow
                                    key={pl.id}
                                    plan={pl}
                                    label={unit.titleBn}
                                    onEdit={() => handleOpenEditPlan(pl)}
                                    onQuickPatch={quickPatchPlan}
                      onView={handleViewPlan}
                      onDelete={setPlanToDelete}
                                    busy={busyPlanId === pl.id}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(!sellsPerUnit || units.length === 0) && wholeExam.length === 0 && (
                    <div className="bg-white rounded-3xl border border-amber-300 p-10 text-center">
                      <p className="text-sm font-bold text-slate-800">No package yet</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Students cannot buy access to {portal.title} until one exists.
                      </p>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </div>
      )}

      {/* TAB 4: GRANULAR GATEWAY RECEIVER CONFIGURATION */}
      {activeTab === 'gateways' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Payment Gateway Receiver Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every detail below is displayed in the student mobile checkout for Send Money. Changes take effect immediately.
              </p>
            </div>
          </div>

          <EnhancedGatewayNumbersForm />
        </div>
      )}

      {/* INSPECT PAYMENT MODAL */}
      {inspectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Transaction Details</h3>
                <p className="text-xs text-slate-500">Record ID: {inspectedPayment.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPayment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Student Name</span>
                  <span className="font-black text-slate-900">{inspectedPayment.user?.name || 'Student'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Student Email</span>
                  <span className="font-medium text-slate-900">{inspectedPayment.user?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Registered Phone</span>
                  <span className="font-mono font-bold text-slate-900">{inspectedPayment.user?.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Payment Gateway</span>
                  <ProviderBadge provider={inspectedPayment.provider} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Sender Phone (From App)</span>
                  <span className="font-mono font-black text-slate-900">
                    {inspectedPayment.metadata?.senderNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Transaction ID (TrxID)</span>
                  <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 select-all">
                    {inspectedPayment.transactionId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Amount Paid</span>
                  <span className="text-sm font-black text-emerald-600">৳ {inspectedPayment.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Selected Plan</span>
                  <span className="font-bold text-slate-900">
                    {inspectedPayment.plan?.nameEn || inspectedPayment.metadata?.planName || 'Plan'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Submission Date</span>
                  <span className="font-medium text-slate-700">
                    {new Date(inspectedPayment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Current Status</span>
                  <StatusBadge status={inspectedPayment.status} />
                </div>
              </div>

              {inspectedPayment.metadata?.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <span className="font-bold block mb-0.5">Rejection Reason:</span>
                  <p>{inspectedPayment.metadata.rejectionReason}</p>
                </div>
              )}
            </div>

            {inspectedPayment.status === 'PENDING' && (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentToReject(inspectedPayment);
                  }}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-colors"
                >
                  Reject Submission
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentToApprove(inspectedPayment);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all"
                >
                  Approve & Activate Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Centered Approve Modal using ConfirmModal */}
      <ConfirmModal
        isOpen={paymentToApprove !== null}
        title="Verify & Activate Student Subscription?"
        description="Please ensure you verified this exact Transaction ID and Amount in your bKash/Nagad statement."
        details={
          paymentToApprove
            ? [
                { label: 'Student Name', value: paymentToApprove.user?.name || 'Student' },
                { label: 'Student Phone', value: paymentToApprove.user?.phone || 'N/A' },
                { label: 'Provider', value: paymentToApprove.provider },
                { label: 'Transaction ID', value: paymentToApprove.transactionId },
                { label: 'Amount Paid', value: `৳ ${paymentToApprove.amount}` },
                { label: 'Target Plan', value: paymentToApprove.plan?.nameEn || paymentToApprove.metadata?.planName || 'Plan' },
              ]
            : []
        }
        confirmText="Yes, Approve & Activate"
        cancelText="Cancel"
        isDestructive={false}
        isLoading={isApproving}
        onConfirm={confirmApprove}
        onCancel={() => setPaymentToApprove(null)}
      />

      {/* Centered Rejection Modal */}
      {paymentToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reject Payment Submission</h3>
                  <p className="text-xs text-slate-500">TrxID: {paymentToReject.transactionId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentToReject(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Select Rejection Reason:
              </label>

              <div className="space-y-2">
                {[
                  'Transaction ID not found in statement',
                  'Sent amount does not match plan price',
                  'Duplicate transaction ID already verified',
                  'Invalid sender number or incomplete SMS',
                  'OTHER',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      rejectionReason === reason
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectionReason"
                      value={reason}
                      checked={rejectionReason === reason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-4 h-4 text-rose-600"
                    />
                    <span>{reason === 'OTHER' ? 'Custom Reason...' : reason}</span>
                  </label>
                ))}
              </div>

              {rejectionReason === 'OTHER' && (
                <div className="pt-1">
                  <textarea
                    rows={2}
                    placeholder="Type the exact reason for the student..."
                    value={customRejection}
                    onChange={(e) => setCustomRejection(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentToReject(null)}
                disabled={isRejecting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmReject}
                disabled={isRejecting || (rejectionReason === 'OTHER' && !customRejection.trim())}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 active:scale-95 transition-all"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingPlanId ? 'Edit Subscription Package' : 'Create New Subscription Package'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure package duration, regular price, discount, and student perks
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  What this package unlocks
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Exam</label>
                    <select
                      value={planForm.scopePortalKey}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, scopePortalKey: e.target.value, scopeUnitKey: '' })
                      }
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-emerald-500"
                    >
                      <option value="">Every exam (platform-wide)</option>
                      {portals.map((pt: any) => (
                        <option key={pt.key} value={pt.key}>
                          {pt.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Unit</label>
                    <select
                      value={planForm.scopeUnitKey}
                      disabled={!planForm.scopePortalKey}
                      onChange={(e) => setPlanForm({ ...planForm, scopeUnitKey: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">
                        {planForm.scopePortalKey ? 'All units of this exam' : '—'}
                      </option>
                      {(portals.find((pt: any) => pt.key === planForm.scopePortalKey)?.units || []).map(
                        (u: any) => (
                          <option key={u.key} value={u.key}>
                            {u.titleBn} · {u.titleEn}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500">
                  Leaving the unit blank sells the whole exam in one package — that is how Medical
                  &amp; Dental covers both মেডিকেল and ডেন্টাল.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                    Package Code *
                  </label>
                  <input
                    disabled={editingPlanId !== null}
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                    placeholder="DU_KA_YEARLY"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 disabled:text-slate-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {editingPlanId ? 'A code cannot change once sold.' : 'Unique. Suggested from the exam.'}
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                    Duration in Days *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                    Plan Title (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 Month Full Access"
                    value={planForm.nameEn}
                    onChange={(e) => setPlanForm({ ...planForm, nameEn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                    Plan Title (Bangla)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ১ মাসের আনলিমিটেড প্যাক"
                    value={planForm.nameBn}
                    onChange={(e) => setPlanForm({ ...planForm, nameBn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                    Regular Price (৳ BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={planForm.priceBdt}
                    onChange={(e) => setPlanForm({ ...planForm, priceBdt: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                    Discount Price (৳ BDT) - Optional
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Set lower for promotion"
                    value={planForm.discountPriceBdt || ''}
                    onChange={(e) => setPlanForm({ ...planForm, discountPriceBdt: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {planForm.discountPriceBdt > 0 && planForm.discountPriceBdt < planForm.priceBdt && (
                  <div className="sm:col-span-2 text-xs font-bold text-emerald-700">
                    💡 Student will pay ৳{planForm.discountPriceBdt} (saves ৳{planForm.priceBdt - planForm.discountPriceBdt} —{' '}
                    {Math.round(((planForm.priceBdt - planForm.discountPriceBdt) / planForm.priceBdt) * 100)}% discount)
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-900 block mb-1 uppercase tracking-wider">
                  Description (English) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Complete access to all university & job mock tests, previous question papers, and solutions."
                  value={planForm.descriptionEn}
                  onChange={(e) => setPlanForm({ ...planForm, descriptionEn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {/* Dynamic Feature Checklist Builder */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">
                  Included Perks & Features Checklist
                </label>

                <div className="space-y-1.5">
                  {planForm.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold text-slate-800">{feat}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add new perk (e.g. Instant Negative Marking Analytics)"
                    value={newFeatureInput}
                    onChange={(e) => setNewFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shrink-0 transition-colors"
                  >
                    Add Perk
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalPlanIsActive"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="modalPlanIsActive" className="font-bold text-slate-800 cursor-pointer">
                  Plan is Active (immediately visible to students inside the mobile app)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all"
                >
                  {isSavingPlan ? 'Saving Package...' : editingPlanId ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*
        Fill in 1 month / 6 months / 1 year in a single pass — per unit for
        DU/JU/RU/CU, or for the whole exam itself everywhere else (Medical &
        Dental included, even though it still has MBBS/BDS Unit rows for
        organizing content — it has never sold per unit).
      */}
      {bulkPortal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {(() => {
              const sellsPerUnit = UNIT_SELLABLE_PORTAL_KEYS.includes(bulkPortal.key);
              return (
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {sellsPerUnit
                      ? `Add tiers for every unit of ${bulkPortal.title}`
                      : `Add tiers for ${bulkPortal.title}`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sellsPerUnit
                      ? 'Each unit gets a 1 month, 6 month and 1 year package. Anything a unit already has'
                      : 'The whole exam gets a 1 month, 6 month and 1 year package. Anything it already has'}
                    {' '}— at that exact duration — is left untouched, so this is also how you replace a
                    tier after deleting it.
                  </p>
                </div>
              );
            })()}

            {(() => {
              const todo = missingTiers(bulkPortal);
              const byTier = TIERS.map((tier) => ({
                tier,
                units: todo.filter((t) => t.tier.days === tier.days).map((t) => t.unit),
              }));

              return (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-700">
                    {todo.length === 0
                      ? 'It already has all three tiers.'
                      : `Will create ${todo.length} package${todo.length === 1 ? '' : 's'}:`}
                  </p>
                  {byTier
                    .filter((row) => row.units.length > 0)
                    .map((row) => (
                      <div key={row.tier.suffix}>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {row.tier.labelEn} ({row.units.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {row.units.map((u: any, i: number) => (
                            <span
                              key={u ? u.key : `whole-${i}`}
                              className="px-2 py-0.5 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700"
                            >
                              {u ? u.titleBn : 'সম্পূর্ণ পরীক্ষা'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              );
            })()}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  1 Month (৳)
                </label>
                <input
                  value={tierPrices.m1}
                  onChange={(e) =>
                    setTierPrices((p) => ({ ...p, m1: e.target.value.replace(/[^0-9]/g, '') }))
                  }
                  className="w-full p-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  6 Months (৳)
                </label>
                <input
                  value={tierPrices.m6}
                  onChange={(e) =>
                    setTierPrices((p) => ({ ...p, m6: e.target.value.replace(/[^0-9]/g, '') }))
                  }
                  className="w-full p-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  1 Year (৳)
                </label>
                <input
                  value={tierPrices.y1}
                  onChange={(e) =>
                    setTierPrices((p) => ({ ...p, y1: e.target.value.replace(/[^0-9]/g, '') }))
                  }
                  className="w-full p-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setBulkPortal(null)}
                disabled={isBulkSaving}
                className="flex-1 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTiers}
                disabled={isBulkSaving}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {isBulkSaving ? 'Creating…' : 'Create packages'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Package detail */}
      {viewingPlan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 sticky top-0 bg-white">
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900">{viewingPlan.nameEn}</h3>
                <p className="text-xs text-slate-500 font-sans">{viewingPlan.nameBn}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{viewingPlan.code}</p>
              </div>
              <button
                onClick={() => setViewingPlan(null)}
                className="text-slate-400 hover:text-slate-700 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewingPlan.loading ? (
              <p className="p-10 text-center text-xs text-slate-400">Loading…</p>
            ) : (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Price</p>
                    <p className="text-lg font-black text-slate-900">
                      ৳{viewingPlan.discountPriceBdt ?? viewingPlan.priceBdt}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Duration</p>
                    <p className="text-lg font-black text-slate-900">
                      {viewingPlan.durationDays} days
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-700 uppercase mb-1.5">Unlocks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(viewingPlan.scopes || []).length === 0 ? (
                      <span className="px-2 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                        Every exam (platform-wide)
                      </span>
                    ) : (
                      viewingPlan.scopes.map((sc: any) => (
                        <span
                          key={sc.id}
                          className="px-2 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200"
                        >
                          {sc.portal?.titleEn}
                          {sc.unit ? ` · ${sc.unit.titleBn}` : ' · all units'}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {viewingPlan.stats && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 uppercase mb-1.5">Sales</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                        <p className="text-base font-black text-slate-900">
                          {viewingPlan.stats.activeSubscriptions}
                        </p>
                        <p className="text-[10px] text-slate-500">Active now</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                        <p className="text-base font-black text-slate-900">
                          {viewingPlan.stats.subscriptions}
                        </p>
                        <p className="text-[10px] text-slate-500">Ever sold</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                        <p className="text-base font-black text-emerald-700">
                          ৳{viewingPlan.stats.revenueBdt}
                        </p>
                        <p className="text-[10px] text-slate-500">Revenue</p>
                      </div>
                    </div>
                  </div>
                )}

                {(viewingPlan.features || []).length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                      What students see
                    </p>
                    <ul className="space-y-1">
                      {viewingPlan.features.map((f: string, i: number) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                          <span className="font-sans">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const current = viewingPlan;
                      setViewingPlan(null);
                      handleOpenEditPlan(current);
                    }}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setPlanToDelete(viewingPlan)}
                    className="px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleting a package cascades into subscriptions and payments, so the
          server refuses any that has sold; the reason is shown in place. */}
      <ConfirmModal
        isOpen={planToDelete !== null}
        title={`Delete ${planToDelete?.nameEn || 'this package'}?`}
        description="The package is removed permanently. A package anyone has already bought cannot be deleted, because that would erase their access and their payment record."
        details={[
          { label: 'Code', value: planToDelete?.code || '' },
          { label: 'Price', value: `৳${planToDelete?.priceBdt ?? 0}` },
          {
            label: 'Unlocks',
            value:
              (planToDelete?.scopes || []).length === 0
                ? 'Every exam'
                : (planToDelete?.scopes || [])
                    .map(
                      (sc: any) =>
                        `${sc.portal?.titleEn}${sc.unit ? ' · ' + sc.unit.titleBn : ''}`,
                    )
                    .join(', '),
          },
        ]}
        warning="If anyone has bought this package the server will refuse — take it off sale instead."
        confirmText="Delete package"
        isLoading={isDeletingPlan}
        error={deletePlanError}
        onConfirm={handleDeletePlan}
        onCancel={() => {
          setPlanToDelete(null);
          setDeletePlanError(null);
        }}
      />
    </div>
  );
}

// ----------------------------------------------------
// ENHANCED GRANULAR GATEWAY NUMBERS FORM
// ----------------------------------------------------
function EnhancedGatewayNumbersForm() {
  const toast = useToast();
  const [gateways, setGateways] = useState({
    bkash: {
      number: '',
      type: 'Personal (Send Money)',
      holder: 'ExamBondhuBD Wallet',
      instructions: 'বিকাশ অ্যাপ থেকে Send Money বা Payment করুন এবং Transaction ID দিন।',
      isActive: true,
    },
    nagad: {
      number: '',
      type: 'Personal (Send Money)',
      holder: 'ExamBondhuBD Wallet',
      instructions: 'নগদ অ্যাপ থেকে Send Money করুন এবং Transaction ID দিন।',
      isActive: true,
    },
    rocket: {
      number: '',
      type: 'Personal (Send Money)',
      holder: 'ExamBondhuBD Wallet',
      instructions: 'রকেট অ্যাপ থেকে Send Money করুন এবং Transaction ID দিন।',
      isActive: true,
    },
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchApi('/payments/instructions').then((res) => {
      if (res.success && res.data) {
        setGateways({
          bkash: {
            number: res.data.bkash?.number || '',
            type: res.data.bkash?.type || 'Personal (Send Money)',
            holder: res.data.bkash?.holder || 'ExamBondhuBD Official',
            instructions: res.data.bkash?.instructionsBn || 'বিকাশ অ্যাপ থেকে Send Money বা Payment করুন এবং Transaction ID দিন।',
            isActive: res.data.bkash?.isConfigured ?? true,
          },
          nagad: {
            number: res.data.nagad?.number || '',
            type: res.data.nagad?.type || 'Personal (Send Money)',
            holder: res.data.nagad?.holder || 'ExamBondhuBD Official',
            instructions: res.data.nagad?.instructionsBn || 'নগদ অ্যাপ থেকে Send Money করুন এবং Transaction ID দিন।',
            isActive: res.data.nagad?.isConfigured ?? true,
          },
          rocket: {
            number: res.data.rocket?.number || '',
            type: res.data.rocket?.type || 'Personal (Send Money)',
            holder: res.data.rocket?.holder || 'ExamBondhuBD Official',
            instructions: res.data.rocket?.instructionsBn || 'রকেট অ্যাপ থেকে Send Money করুন এবং Transaction ID দিন।',
            isActive: res.data.rocket?.isConfigured ?? true,
          },
        });
      }
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const res = await fetchApi('/payments/admin/numbers', {
      method: 'POST',
      body: JSON.stringify({
        bkashNumber: gateways.bkash.number,
        nagadNumber: gateways.nagad.number,
        rocketNumber: gateways.rocket.number,
        bkashType: gateways.bkash.type,
        nagadType: gateways.nagad.type,
        rocketType: gateways.rocket.type,
      }),
    });

    setSaving(false);
    if (res.success) {
      setSaved(true);
      toast.success('Payment gateway numbers saved.');
      setTimeout(() => setSaved(false), 3500);
    } else {
      toast.error(res.message || 'Failed to save the gateway numbers.');
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* BKASH CARD */}
        <div className="p-6 rounded-3xl border border-pink-200 bg-pink-50/40 space-y-4">
          <div className="flex items-center justify-between border-b border-pink-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-pink-700">bKash</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-100 text-pink-800">
                বিকাশ
              </span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-pink-600" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Number *
            </label>
            <input
              type="text"
              required
              placeholder="01XXXXXXXXX"
              value={gateways.bkash.number}
              onChange={(e) =>
                setGateways({ ...gateways, bkash: { ...gateways.bkash, number: e.target.value } })
              }
              className="w-full px-3.5 py-2.5 bg-white border border-pink-300 rounded-xl text-sm font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Type *
            </label>
            <select
              value={gateways.bkash.type}
              onChange={(e) =>
                setGateways({ ...gateways, bkash: { ...gateways.bkash, type: e.target.value } })
              }
              className="w-full px-3 py-2 bg-white border border-pink-200 rounded-xl text-xs font-semibold text-slate-900 outline-none"
            >
              <option value="Personal (Send Money)">Personal (Send Money)</option>
              <option value="Merchant (Payment)">Merchant (Payment)</option>
              <option value="Agent (Cash Out)">Agent (Cash Out)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Student Instruction Note
            </label>
            <textarea
              rows={2}
              value={gateways.bkash.instructions}
              onChange={(e) =>
                setGateways({ ...gateways, bkash: { ...gateways.bkash, instructions: e.target.value } })
              }
              className="w-full px-3 py-2 bg-white border border-pink-200 rounded-xl text-xs font-medium text-slate-900 outline-none"
            />
          </div>
        </div>

        {/* NAGAD CARD */}
        <div className="p-6 rounded-3xl border border-orange-200 bg-orange-50/40 space-y-4">
          <div className="flex items-center justify-between border-b border-orange-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-orange-700">Nagad</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                নগদ
              </span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Number *
            </label>
            <input
              type="text"
              required
              placeholder="01XXXXXXXXX"
              value={gateways.nagad.number}
              onChange={(e) =>
                setGateways({ ...gateways, nagad: { ...gateways.nagad, number: e.target.value } })
              }
              className="w-full px-3.5 py-2.5 bg-white border border-orange-300 rounded-xl text-sm font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Type *
            </label>
            <select
              value={gateways.nagad.type}
              onChange={(e) =>
                setGateways({ ...gateways, nagad: { ...gateways.nagad, type: e.target.value } })
              }
              className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-semibold text-slate-900 outline-none"
            >
              <option value="Personal (Send Money)">Personal (Send Money)</option>
              <option value="Merchant (Payment)">Merchant (Payment)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Student Instruction Note
            </label>
            <textarea
              rows={2}
              value={gateways.nagad.instructions}
              onChange={(e) =>
                setGateways({ ...gateways, nagad: { ...gateways.nagad, instructions: e.target.value } })
              }
              className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-medium text-slate-900 outline-none"
            />
          </div>
        </div>

        {/* ROCKET CARD */}
        <div className="p-6 rounded-3xl border border-purple-200 bg-purple-50/40 space-y-4">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-purple-700">Rocket</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                রকেট
              </span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Number *
            </label>
            <input
              type="text"
              required
              placeholder="01XXXXXXXXX-X"
              value={gateways.rocket.number}
              onChange={(e) =>
                setGateways({ ...gateways, rocket: { ...gateways.rocket, number: e.target.value } })
              }
              className="w-full px-3.5 py-2.5 bg-white border border-purple-300 rounded-xl text-sm font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Type *
            </label>
            <select
              value={gateways.rocket.type}
              onChange={(e) =>
                setGateways({ ...gateways, rocket: { ...gateways.rocket, type: e.target.value } })
              }
              className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-semibold text-slate-900 outline-none"
            >
              <option value="Personal (Send Money)">Personal (Send Money)</option>
              <option value="Merchant (Payment)">Merchant (Payment)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Student Instruction Note
            </label>
            <textarea
              rows={2}
              value={gateways.rocket.instructions}
              onChange={(e) =>
                setGateways({ ...gateways, rocket: { ...gateways.rocket, instructions: e.target.value } })
              }
              className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-900 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-sm transition-all"
        >
          {saving ? 'Saving Gateway Settings...' : 'Save All Gateway Settings to Database'}
        </button>

        {saved && (
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" /> Live & Updated on Student Mobile App!
          </span>
        )}
      </div>
    </form>
  );
}

// ----------------------------------------------------
// UI BADGES HELPERS
// ----------------------------------------------------
function ProviderBadge({ provider }: { provider: string }) {
  if (provider === 'BKASH') {
    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-pink-50 text-pink-700 border border-pink-200">
        bKash
      </span>
    );
  }
  if (provider === 'NAGAD') {
    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-orange-50 text-orange-700 border border-orange-200">
        Nagad
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-purple-50 text-purple-700 border border-purple-200">
      Rocket
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'SUCCESS') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        Approved
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        Pending
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
      Rejected
    </span>
  );
}

/**
 * One package line. Price and on-sale state are editable in place, because
 * those are what actually change day to day — opening a ten-field modal to
 * move a price by fifty taka was the friction here.
 */
function PackageRow({
  plan,
  label,
  indented = false,
  onEdit,
  onQuickPatch,
  onView,
  onDelete,
  busy = false,
}: {
  plan: any;
  label: string;
  indented?: boolean;
  onEdit: () => void;
  onQuickPatch?: (planId: string, patch: any) => void;
  onView?: (plan: any) => void;
  onDelete?: (plan: any) => void;
  busy?: boolean;
}) {
  const [editingPrice, setEditingPrice] = React.useState(false);
  const [draftPrice, setDraftPrice] = React.useState(String(plan.priceBdt ?? 0));

  const price = plan.discountPriceBdt ?? plan.priceBdt;
  const hasDiscount = plan.discountPriceBdt && plan.discountPriceBdt < plan.priceBdt;

  function commitPrice() {
    setEditingPrice(false);
    const next = Number(draftPrice);

    if (!Number.isFinite(next) || next < 0 || next === plan.priceBdt) {
      setDraftPrice(String(plan.priceBdt ?? 0));
      return;
    }

    onQuickPatch?.(plan.id, { priceBdt: next });
  }

  return (
    <div
      className={`px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 ${
        indented ? 'pl-10' : ''
      } ${plan.isActive ? '' : 'bg-slate-50/60'} ${busy ? 'opacity-60' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-bold text-slate-900 truncate">{plan.nameEn}</p>
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-slate-100 text-slate-600 rounded">
            {label}
          </span>
          {!plan.isActive && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-700 rounded">
              Off sale
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 font-mono truncate">{plan.code}</p>
      </div>

      {/* Click the price to change it. */}
      <div className="text-right shrink-0 w-24">
        {editingPrice ? (
          <input
            autoFocus
            value={draftPrice}
            onChange={(e) => setDraftPrice(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPrice();
              if (e.key === 'Escape') {
                setDraftPrice(String(plan.priceBdt ?? 0));
                setEditingPrice(false);
              }
            }}
            className="w-full px-2 py-1 text-sm font-black text-right bg-white border border-emerald-500 rounded-lg outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraftPrice(String(plan.priceBdt ?? 0));
              setEditingPrice(true);
            }}
            disabled={busy}
            title="Click to change the price"
            className="w-full text-right group"
          >
            <p className="text-sm font-black text-slate-900 group-hover:text-emerald-700">
              ৳{price}
              {hasDiscount && (
                <span className="ml-1 text-[10px] font-normal text-slate-400 line-through">
                  ৳{plan.priceBdt}
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-500">{plan.durationDays} days</p>
          </button>
        )}
      </div>

      {/* On or off sale, without opening anything. */}
      <button
        onClick={() => onQuickPatch?.(plan.id, { isActive: !plan.isActive })}
        disabled={busy}
        title={plan.isActive ? 'Take off sale' : 'Put on sale'}
        className={`w-10 h-6 rounded-full transition-colors shrink-0 relative ${
          plan.isActive ? 'bg-emerald-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
            plan.isActive ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onView?.(plan)}
          disabled={busy}
          title="View this package"
          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onEdit}
          disabled={busy}
          className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          Edit
        </button>

        <button
          onClick={() => onDelete?.(plan)}
          disabled={busy}
          title="Delete this package"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
