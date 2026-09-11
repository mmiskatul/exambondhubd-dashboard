'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  FileQuestion,
  UploadCloud,
  CheckSquare,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ShieldCheck,
  Bell,
  KeyRound,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'App Portals Hub', href: '/portals', icon: Sparkles },
  { name: 'Exam Blueprints', href: '/exams', icon: GraduationCap },
  { name: 'Question Bank', href: '/questions', icon: FileQuestion },
  { name: 'Bulk Import', href: '/import', icon: UploadCloud },
  { name: 'Review Queue', href: '/review', icon: CheckSquare },
  { name: 'Users & Attempts', href: '/users', icon: Users },
  { name: 'Subscriptions & Billing', href: '/subscriptions', icon: CreditCard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Push Notifications', href: '/notifications', icon: Bell },
  { name: 'Help & FAQ', href: '/faqs', icon: HelpCircle },
  { name: 'Access Control', href: '/access', icon: KeyRound },
  { name: 'Settings & Password', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 h-screen bg-navy-950 text-white flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 shrink-0 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-emerald-500/30">
          E
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-white block">
            ExamBondhu<span className="text-emerald-400">BD</span>
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            Admin Console
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 min-h-0 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Management
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Status */}
      <div className="p-4 shrink-0 border-t border-slate-800 bg-navy-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-700/60 flex items-center justify-center text-xs font-bold text-emerald-200">
            SA
          </div>
          <div className="flex-1 truncate">
            <p className="text-xs font-semibold text-slate-200 truncate">Super Admin</p>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> System Authoritative
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
