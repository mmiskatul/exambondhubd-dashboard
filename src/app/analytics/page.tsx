'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchApi } from '@/lib/api';

export default function AnalyticsReportsPage() {
  const [data, setData] = useState<{
    subjectPerformance: { subject: string; questions: number }[];
    difficultyDistribution: { name: string; value: number; color: string }[];
  }>({
    subjectPerformance: [],
    difficultyDistribution: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      const res = await fetchApi('/analytics/dashboard');
      if (res.success && res.data) {
        setData({
          subjectPerformance: res.data.subjectPerformance || [],
          difficultyDistribution: res.data.difficultyDistribution || [],
        });
      }
      setLoading(false);
    }
    loadReports();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics & Difficulty Reports</h1>
        <p className="text-sm text-slate-500">
          In-depth breakdown of question bank taxonomy, difficulty level distribution, and subject question volume.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-Wise Question Bank Volume */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Subject-Wise Question Bank Volume</h2>
          <p className="text-xs text-slate-500 mb-6">Live count of published questions across subjects</p>

          <div className="h-72 w-full">
            {data.subjectPerformance.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                {loading ? 'Loading live subjects...' : 'No subject data available'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjectPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="questions" name="Total Questions" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Question Difficulty Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Question Difficulty Distribution</h2>
          <p className="text-xs text-slate-500 mb-6">Proportion of Easy, Medium, and Hard MCQs</p>

          <div className="h-72 w-full flex items-center justify-center">
            {data.difficultyDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                {loading ? 'Loading difficulty distribution...' : 'No questions in database yet'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.difficultyDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                    {data.difficultyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
