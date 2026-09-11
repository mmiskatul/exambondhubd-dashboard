'use client';

import React, { useEffect, useState } from 'react';
import { StatsCard } from '@/components/StatsCard';
import {
  Users,
  GraduationCap,
  FileQuestion,
  Activity,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';
import { fetchApi } from '@/lib/api';

export default function DashboardOverviewPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [growth, setGrowth] = useState<any>(null);
  const [growthDays, setGrowthDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      const res = await fetchApi('/analytics/dashboard');
      if (res.success && res.data) {
        setMetrics(res.data);
      }
      setLoading(false);
    }
    loadMetrics();
  }, []);

  useEffect(() => {
    fetchApi(`/analytics/user-growth?days=${growthDays}`).then((res) => {
      if (res.success && res.data) setGrowth(res.data);
    });
  }, [growthDays]);

  const chartData = metrics?.monthlyTrends || [];

  // Dates are stored as YYYY-MM-DD; the axis only needs the day and month.
  const growthSeries = (growth?.series || []).map((d: any) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  }));

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-md">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/30">
            Live Database Connected • Supabase PostgreSQL
          </span>
          <h1 className="text-2xl font-bold tracking-tight">ExamBondhuBD Management Center</h1>
          <p className="text-sm text-slate-300 mt-1">
            Real-time monitoring of Bangladesh competitive examinations, blueprints & live question bank.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/exams"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/25"
          >
            Create Blueprint <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Real-time KPI Cards Grid from Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Registered Students"
          value={metrics?.kpis?.totalUsers !== undefined ? metrics.kpis.totalUsers : (loading ? '...' : 0)}
          change="Live Registered Accounts"
          isPositive={true}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatsCard
          title="Active Exams & Blueprints"
          value={metrics?.kpis?.totalExams !== undefined ? metrics.kpis.totalExams : (loading ? '...' : 0)}
          change="BCS, NTRCA, Medical, DU"
          isPositive={true}
          icon={GraduationCap}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatsCard
          title="Verified MCQ Question Bank"
          value={metrics?.kpis?.totalQuestions !== undefined ? metrics.kpis.totalQuestions : (loading ? '...' : 0)}
          change="Bangla & English MCQs"
          isPositive={true}
          icon={FileQuestion}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatsCard
          title="Total Exam Attempts"
          value={metrics?.kpis?.totalAttempts !== undefined ? metrics.kpis.totalAttempts : (loading ? '...' : 0)}
          change={`Completion Rate: ${metrics?.kpis?.completionRate || '0%'}`}
          isPositive={true}
          icon={Activity}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* User growth: daily signups as bars, running total as a line, because
          growth is only legible when you can see both acquisition and scale. */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900">User Growth</h2>
            <p className="text-xs text-slate-500">
              {growth
                ? `${growth.newInPeriod} new account${growth.newInPeriod === 1 ? '' : 's'} in the last ${growth.days} days · ${growth.totalUsers} total`
                : 'Loading registrations…'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setGrowthDays(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                  growthDays === d
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {growthSeries.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-xs text-slate-400">
            No registrations recorded yet.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={growthSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="newUsers"
                  name="New sign-ups"
                  fill="#34d399"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalUsers"
                  name="Total users"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Examination Activity</h2>
              <p className="text-xs text-slate-500">Real-time monthly attempt trends</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                <TrendingUp className="w-3.5 h-3.5" /> Live Growth
              </span>
            </div>
          </div>
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No attempt history yet.
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="attempts" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAttempts)" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Popular Examination Categories */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Popular Examinations</h2>
            <p className="text-xs text-slate-500 mb-6">Ranked by total student attempts</p>

            <div className="space-y-4">
              {metrics?.popularExams && metrics.popularExams.length > 0 ? (
                metrics.popularExams.map((exam: any, idx: number) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{exam.name}</span>
                      <span className="text-emerald-600 font-bold">{exam.attempts} attempts</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(15, (exam.attempts / 10) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Active exams and attempts will appear here as students complete tests.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between text-xs text-slate-500">
            <span>Authoritative DB Engine</span>
            <a href="/exams" className="text-emerald-600 font-bold hover:underline">
              View Catalog →
            </a>
          </div>
        </div>
      </div>

      {/* Live Recent Examination Attempts from PostgreSQL */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Student Examination Attempts</h2>
            <p className="text-xs text-slate-500">Live submissions recorded in PostgreSQL</p>
          </div>
          <a href="/users" className="text-xs font-bold text-emerald-600 hover:underline">
            View All Users →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-6">Student Name</th>
                <th className="py-3 px-6">Exam Title</th>
                <th className="py-3 px-6">Score</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Date / Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {metrics?.recentAttempts && metrics.recentAttempts.length > 0 ? (
                metrics.recentAttempts.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      <div>{row.user?.name || 'Student'}</div>
                      <div className="text-[11px] text-slate-400">{row.user?.email}</div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-700">{row.exam?.titleEn || 'Mock Test'}</td>
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {row.totalScore !== undefined ? `${row.totalScore.toFixed(2)} pts` : '—'}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          row.status === 'SUBMITTED' || row.status === 'AUTO_SUBMITTED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No examination attempts yet. When students complete exams on mobile, records will stream here in real-time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
