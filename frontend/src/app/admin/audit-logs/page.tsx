"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Search,
  Filter,
  RotateCw,
  Code,
  X,
  Shield,
  Clock,
  User,
  ArrowRight
} from 'lucide-react';
import { adminListAuditLogsApi } from '@/lib/api';
import { AdminAuditLog } from '@/types';
import { useApp } from '@/context/AppContext';

function AuditLogsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const { addNotification } = useApp();

  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  // JSON Inspector Modal
  const [inspectLog, setInspectLog] = useState<AdminAuditLog | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await adminListAuditLogsApi({
        search: search.trim() || undefined,
        action: actionFilter || undefined,
        resource_type: resourceFilter || undefined,
        limit: 50
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to load audit logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, resourceFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Administrative Audit Trail</h1>
          <p className="text-xs text-gray-400 mt-1">
            Immutable log of staff logins, credit grants, user suspensions, role changes, and platform setting updates.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="px-3.5 py-2 rounded-xl bg-[#121724] hover:bg-[#1A2234] border border-[#202940] text-gray-300 text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl bg-[#0D111A] border border-[#192236] flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); loadLogs(); }} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by admin email, action name, or payload..."
            className="w-full pl-10 pr-24 py-2 rounded-xl bg-[#131926] border border-[#202940] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px]"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#131926] border border-[#202940] text-gray-300 text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="">All Actions</option>
            <option value="user_suspend">User Suspend</option>
            <option value="user_reactivate">User Reactivate</option>
            <option value="user_role_change">Role Change</option>
            <option value="credit_promotional">Credit Promotional</option>
            <option value="credit_add">Credit Add</option>
            <option value="credit_deduct">Credit Deduct</option>
            <option value="plan_create">Plan Create</option>
            <option value="plan_update">Plan Update</option>
            <option value="config_update">Settings Update</option>
            <option value="job_retry">Job Retry</option>
            <option value="job_cancel">Job Cancel</option>
            <option value="announcement_create">Announcement</option>
          </select>

          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#131926] border border-[#202940] text-gray-300 text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="">All Resources</option>
            <option value="user">User</option>
            <option value="subscription_plan">Subscription Plan</option>
            <option value="credit_balance">Credit Balance</option>
            <option value="processing_job">Processing Job</option>
            <option value="platform_settings">Platform Settings</option>
            <option value="announcement">Announcement</option>
          </select>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">
            <RotateCw className="w-5 h-5 animate-spin mx-auto text-purple-500 mb-2" />
            <span>Retrieving audit trail records...</span>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-gray-500 py-12 text-center">No audit logs matching current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#181F30] text-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-bold">Timestamp</th>
                  <th className="pb-3 font-bold">Administrator</th>
                  <th className="pb-3 font-bold">Role</th>
                  <th className="pb-3 font-bold">Action</th>
                  <th className="pb-3 font-bold">Target Resource</th>
                  <th className="pb-3 font-bold">IP Address</th>
                  <th className="pb-3 font-bold text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151B2A]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#111624] transition-colors">
                    <td className="py-3 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3 font-semibold text-white">
                      {log.admin_email}
                    </td>
                    <td className="py-3">
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                        log.admin_role === 'super_admin' ? 'bg-purple-500/20 text-purple-300' :
                        log.admin_role === 'admin' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {log.admin_role}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-purple-300 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 text-gray-400 text-[11px]">
                      <span className="capitalize font-semibold text-gray-300">{log.resource_type}</span>
                      {log.resource_id && (
                        <span className="text-[10px] text-gray-500 font-mono ml-1">
                          ({log.resource_id.slice(0, 12)})
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-gray-500 font-mono text-[10px]">
                      {log.ip_address}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectLog(log)}
                        className="px-2 py-1 rounded bg-[#161C2C] hover:bg-[#1E263D] text-gray-300 text-[11px] font-mono transition-colors"
                      >
                        Inspect JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON INSPECTOR MODAL */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#202940] rounded-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1A2236] pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Code className="w-4 h-4 text-purple-400" />
                <span>Audit Details: {inspectLog.action}</span>
              </div>
              <button type="button" onClick={() => setInspectLog(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#141A28] border border-[#202940] space-y-1 font-mono text-[11px]">
                <p><span className="text-gray-500">Record ID:</span> <span className="text-white">{inspectLog.id}</span></p>
                <p><span className="text-gray-500">Administrator:</span> <span className="text-white">{inspectLog.admin_email}</span></p>
                <p><span className="text-gray-500">Resource:</span> <span className="text-purple-300">{inspectLog.resource_type} ({inspectLog.resource_id || 'N/A'})</span></p>
                <p><span className="text-gray-500">Timestamp:</span> <span className="text-gray-400">{inspectLog.created_at}</span></p>
              </div>

              <div className="p-3 rounded-xl bg-[#090C12] border border-[#1C253B] text-emerald-400 font-mono text-xs overflow-x-auto max-h-60">
                <pre>{JSON.stringify(inspectLog.details, null, 2)}</pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 rounded-xl bg-[#141A28] hover:bg-[#1B2338] text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAuditLogsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500 text-xs">Loading audit trail...</div>}>
      <AuditLogsContent />
    </Suspense>
  );
}

