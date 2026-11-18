"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Film,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Clock,
  HardDrive,
  FileText,
  DollarSign,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { adminGetOverviewApi } from '@/lib/api';
import { AdminOverviewMetrics } from '@/types';

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      const res = await adminGetOverviewApi();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load admin overview metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-xs text-gray-400">Loading platform operations telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-3 max-w-lg mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-xs text-red-300">{error || "Failed to retrieve metrics."}</p>
        <button
          type="button"
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const freePct = data.users.total > 0 ? Math.round((data.users.free_count / data.users.total) * 100) : 0;
  const paidPct = data.users.total > 0 ? Math.round((data.users.paid_count / data.users.total) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Command Center</h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time infrastructure health, user growth, SaaS billing, and processing pipeline telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-[#121724] hover:bg-[#1A2234] border border-[#202940] text-gray-300 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
          <Link
            href="/admin/health"
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diagnostic Suite</span>
          </Link>
        </div>
      </div>

      {/* TOP 4 METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* USERS */}
        <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Users</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-2 font-mono">{data.users.total}</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 border-t border-[#161D2E] pt-2.5">
            <span className="text-emerald-400 font-bold">+{data.users.new_today} today</span>
            <span>•</span>
            <span className="text-gray-400">+{data.users.new_this_month} this mo</span>
          </div>
        </div>

        {/* MONTHLY RECURRING REVENUE */}
        <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Estimated MRR</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-300 mt-2 font-mono">
            ${data.revenue.monthly_recurring_revenue.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 border-t border-[#161D2E] pt-2.5">
            <span className="text-emerald-400 font-semibold">{data.revenue.active_subscriptions} active paid plans</span>
            <span>•</span>
            <span className="text-gray-400">${data.revenue.total_revenue_collected.toLocaleString()} gross</span>
          </div>
        </div>

        {/* SHORTS & PROCESSING */}
        <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Shorts Generated</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-2 font-mono">{data.content.total_shorts}</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 border-t border-[#161D2E] pt-2.5">
            <span className="text-blue-400 font-semibold">{data.content.total_processing_minutes}m processed</span>
            <span>•</span>
            <span className="text-gray-400">{data.content.total_exports} exports</span>
          </div>
        </div>

        {/* PIPELINE HEALTH */}
        <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Pipeline Status</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-white font-mono">{data.jobs.active}</p>
            <span className="text-xs text-gray-400 font-medium">active jobs</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 border-t border-[#161D2E] pt-2.5">
            <span className="text-purple-400 font-semibold">{data.jobs.queued} queued</span>
            <span>•</span>
            <span className={data.jobs.failed > 0 ? "text-red-400 font-bold" : "text-gray-500"}>
              {data.jobs.failed} failed
            </span>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: FREE VS PAID CONVERSION & STORAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CONVERSION BAR */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">SaaS Plan Distribution</h2>
              <p className="text-xs text-gray-400 mt-0.5">Free tier creators versus active paying subscribers.</p>
            </div>
            <Link
              href="/admin/subscriptions"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              <span>Manage Plans</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-purple-400">{data.users.paid_count} Paid Subscribers ({paidPct}%)</span>
              <span className="text-gray-400">{data.users.free_count} Free Creators ({freePct}%)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-[#161D2E] overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.max(paidPct, 4)}%` }}
              />
              <div
                className="h-full bg-slate-700/60 transition-all duration-500"
                style={{ width: `${Math.max(freePct, 4)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#161D2E] text-center text-xs">
            <div className="p-3 rounded-xl bg-[#111624] border border-[#1C253B]">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Avg Processing</span>
              <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                {data.users.total > 0 ? (data.content.total_processing_minutes / data.users.total).toFixed(1) : 0}m / user
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#111624] border border-[#1C253B]">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Storage Consumption</span>
              <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                {data.content.storage_used_mb} MB
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#111624] border border-[#1C253B]">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Engine Integrity</span>
              <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            </div>
          </div>
        </div>

        {/* RECENT AUDIT SNAPSHOT */}
        <div className="p-6 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight">Audit Trail</h2>
            <Link
              href="/admin/audit-logs"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {data.recent_audit_logs.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No recent administrative actions.</p>
            ) : (
              data.recent_audit_logs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-[#111624] border border-[#1C253B] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 font-mono text-[11px]">{log.action}</span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">
                    by <span className="text-gray-300">{log.admin_email}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RECENT REGISTERED USERS TABLE */}
      <div className="p-6 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Recent User Registrations</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest creator signups across all subscription plans.</p>
          </div>
          <Link
            href="/admin/users"
            className="px-3 py-1.5 rounded-xl bg-[#141A29] hover:bg-[#1B2337] border border-[#232A3E] text-xs font-semibold text-gray-300 flex items-center gap-1.5 transition-colors"
          >
            <span>Full User Directory</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#181F30] text-gray-500 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-bold">User</th>
                <th className="pb-3 font-bold">Role</th>
                <th className="pb-3 font-bold">Plan</th>
                <th className="pb-3 font-bold">Status</th>
                <th className="pb-3 font-bold">Joined</th>
                <th className="pb-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151B2A]">
              {data.recent_users.map((u) => (
                <tr key={u.id} className="hover:bg-[#111624] transition-colors">
                  <td className="py-3">
                    <div className="font-semibold text-white">{u.full_name}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{u.email}</div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      u.role === 'super_admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      u.role === 'admin' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      u.role === 'support_agent' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-gray-300">
                    {u.plan_name || 'Free Starter'}
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      u.account_status === 'suspended' ? 'text-amber-400' :
                      u.account_status === 'disabled' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        u.account_status === 'suspended' ? 'bg-amber-400' :
                        u.account_status === 'disabled' ? 'bg-red-400' : 'bg-emerald-400'
                      }`} />
                      <span className="capitalize">{u.account_status || 'active'}</span>
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 font-mono text-[11px]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/admin/users?search=${encodeURIComponent(u.email)}`}
                      className="text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      Inspect →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

