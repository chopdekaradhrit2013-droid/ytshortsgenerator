"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  CreditCard,
  Coins,
  Cpu,
  Layers,
  Megaphone,
  Activity,
  FileText,
  Sliders,
  LogOut,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'User Directory', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions & Plans', icon: CreditCard },
  { href: '/admin/credits', label: 'Credits & Quotas', icon: Coins },
  { href: '/admin/ai-services', label: 'AI Pipelines & Models', icon: Cpu },
  { href: '/admin/jobs', label: 'Video Processing', icon: Layers },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/health', label: 'System Health', icon: Activity },
  { href: '/admin/audit-logs', label: 'Audit Trail', icon: FileText },
  { href: '/admin/settings', label: 'Platform Config', icon: Sliders },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid flash of unauthorized content on client
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center text-gray-500 text-xs">
        Verifying administrator credentials...
      </div>
    );
  }

  // Bypass layout protection for the dedicated admin login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const isStaff = user && ['super_admin', 'admin', 'support_agent'].includes(user.role);

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0E121B] border border-red-500/30 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Super Admin Restricted Area</h1>
            <p className="text-xs text-gray-400 leading-relaxed">
              Access to the platform management center is restricted to authorized personnel. You are currently logged in as <span className="font-semibold text-gray-200">{user?.email || 'Anonymous'}</span> with role <span className="text-amber-400 uppercase font-mono">{user?.role || 'creator'}</span>.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/admin/login"
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In with Staff Account</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/account"
              className="w-full py-2.5 rounded-xl bg-[#141A29] hover:bg-[#1B2337] border border-[#232A3E] text-gray-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Creator Studio</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const roleColor =
    user.role === 'super_admin'
      ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 ring-1 ring-purple-500/20'
      : user.role === 'admin'
      ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';

  const roleLabel =
    user.role === 'super_admin'
      ? 'SUPER ADMIN'
      : user.role === 'admin'
      ? 'ADMINISTRATOR'
      : 'SUPPORT AGENT';

  return (
    <div className="min-h-screen bg-[#07090E] text-gray-100 flex flex-col md:flex-row antialiased selection:bg-purple-600 selection:text-white">
      {/* ADMIN SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0B0E17] border-r border-[#181F30] flex flex-col shrink-0">
        {/* BRAND HEADER */}
        <div className="p-4 border-b border-[#181F30] flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-md shadow-purple-600/30">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-white block">
                Shorts Factory
              </span>
              <span className="text-[10px] font-bold text-purple-400 tracking-widest uppercase">
                ADMIN CONTROL
              </span>
            </div>
          </Link>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            v2.4
          </span>
        </div>

        {/* LOGGED IN ADMIN BADGE */}
        <div className="p-3.5 mx-3 my-3 rounded-xl bg-[#101522] border border-[#1E263B] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
              {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">{user.full_name || 'Staff'}</p>
              <span className={`inline-block mt-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${roleColor}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-[#131926]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM QUICK ACTIONS */}
        <div className="p-3 border-t border-[#181F30] space-y-1.5">
          <Link
            href="/account"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#121724] hover:bg-[#192033] border border-[#202940] text-gray-300 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch to Studio View</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN ADMIN WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#07090E] overflow-y-auto">
        {/* TOP STATUS BAR */}
        <header className="h-14 border-b border-[#181F30] bg-[#0A0D15]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-gray-300">Platform Operational</span>
            <span className="text-gray-600 text-xs">•</span>
            <span className="text-[11px] text-gray-500 font-mono">FastAPI + Next.js SaaS</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/health"
              className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-[#121724] border border-[#1F273D] flex items-center gap-1.5 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Diagnostic Live</span>
            </Link>
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-gray-400 font-mono">
                {user.email}
              </span>
            </div>
          </div>
        </header>

        {/* CHILD ROUTE CONTENT */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

